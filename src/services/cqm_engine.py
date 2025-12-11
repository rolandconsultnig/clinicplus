"""
Clinical Quality Measures (CQM) Calculation Engine
Calculates CQM performance rates and identifies care gaps
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from src.models.user import db
from src.models.cqm import CQMMeasure, CQMResult, CQMPatientEligibility, CQMGapAnalysis
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.clinical import ClinicalEncounter, LabResult, VitalSigns
from src.models.prescribing import Prescription
from src.models.scheduling import Appointment
import json
import uuid

class CQMEngine:
    """CQM Calculation Engine"""
    
    def __init__(self):
        self.measures_cache = {}
    
    def calculate_measure(self, measure_id, facility_id=None, provider_id=None,
                        period_start=None, period_end=None):
        """
        Calculate CQM measure for a specific period
        
        Args:
            measure_id: CQM Measure ID
            facility_id: Optional facility filter
            provider_id: Optional provider filter
            period_start: Reporting period start date
            period_end: Reporting period end date
        
        Returns:
            Tuple of (success, result_id, result_data)
        """
        try:
            measure = CQMMeasure.query.get(measure_id)
            if not measure:
                return False, None, {'error': 'Measure not found'}
            
            # Use measure's default period if not provided
            if not period_start:
                period_start = measure.reporting_period_start or date.today().replace(month=1, day=1)
            if not period_end:
                period_end = measure.reporting_period_end or date.today()
            
            # Get calculation logic
            calculation_logic = json.loads(measure.calculation_logic) if measure.calculation_logic else {}
            
            # Calculate based on measure type
            if measure.measure_category == 'preventive_care':
                result = self._calculate_preventive_care_measure(
                    measure, facility_id, provider_id, period_start, period_end, calculation_logic
                )
            elif measure.measure_category == 'chronic_disease':
                result = self._calculate_chronic_disease_measure(
                    measure, facility_id, provider_id, period_start, period_end, calculation_logic
                )
            elif measure.measure_category == 'patient_safety':
                result = self._calculate_patient_safety_measure(
                    measure, facility_id, provider_id, period_start, period_end, calculation_logic
                )
            else:
                result = self._calculate_generic_measure(
                    measure, facility_id, provider_id, period_start, period_end, calculation_logic
                )
            
            # Create CQM Result record
            cqm_result = CQMResult(
                result_id=f"CQM-{uuid.uuid4().hex[:12].upper()}",
                measure_id=measure_id,
                facility_id=facility_id,
                provider_id=provider_id,
                reporting_period_start=period_start,
                reporting_period_end=period_end,
                denominator=result['denominator'],
                numerator=result['numerator'],
                exclusions=result['exclusions'],
                calculation_status='calculated',
                calculated_at=datetime.utcnow()
            )
            
            cqm_result.calculate_performance_rate()
            
            # Compare to benchmark if available
            if measure.cms_measure_number:
                benchmark = self._get_benchmark_rate(measure.cms_measure_number)
                if benchmark:
                    cqm_result.benchmark_rate = Decimal(str(benchmark))
                    if cqm_result.performance_rate > cqm_result.benchmark_rate:
                        cqm_result.performance_vs_benchmark = 'above'
                    elif cqm_result.performance_rate == cqm_result.benchmark_rate:
                        cqm_result.performance_vs_benchmark = 'at'
                    else:
                        cqm_result.performance_vs_benchmark = 'below'
            
            db.session.add(cqm_result)
            db.session.commit()
            
            return True, cqm_result.id, {
                'result_id': cqm_result.result_id,
                'measure_name': measure.measure_name,
                'denominator': cqm_result.denominator,
                'numerator': cqm_result.numerator,
                'exclusions': cqm_result.exclusions,
                'performance_rate': float(cqm_result.performance_rate),
                'benchmark_rate': float(cqm_result.benchmark_rate) if cqm_result.benchmark_rate else None,
                'performance_vs_benchmark': cqm_result.performance_vs_benchmark
            }
            
        except Exception as e:
            db.session.rollback()
            return False, None, {'error': str(e)}
    
    def _calculate_preventive_care_measure(self, measure, facility_id, provider_id,
                                          period_start, period_end, logic):
        """Calculate preventive care measure (e.g., immunizations, screenings)"""
        # Example: CMS125 - Breast Cancer Screening
        # Denominator: Women 50-74 years
        # Numerator: Women with mammogram in past 2 years
        
        query = Patient.query.filter(
            Patient.date_of_birth.isnot(None),
            Patient.gender.in_(['Female', 'F', 'female'])
        )
        
        if facility_id:
            query = query.filter(Patient.facility_id == facility_id)
        
        patients = query.all()
        
        denominator = 0
        numerator = 0
        exclusions = 0
        
        for patient in patients:
            age = self._calculate_age(patient.date_of_birth, period_end)
            
            # Check if in age range (50-74)
            if 50 <= age <= 74:
                denominator += 1
                
                # Check for mammogram in past 2 years
                # In production, would check LabResult or Procedure records
                # For now, simplified check
                has_screening = False  # Would check actual records
                
                if has_screening:
                    numerator += 1
        
        return {
            'denominator': denominator,
            'numerator': numerator,
            'exclusions': exclusions
        }
    
    def _calculate_chronic_disease_measure(self, measure, facility_id, provider_id,
                                          period_start, period_end, logic):
        """Calculate chronic disease management measure"""
        # Example: CMS122 - Diabetes: Hemoglobin A1c Poor Control
        # Denominator: Patients with diabetes
        # Numerator: Patients with A1c > 9%
        
        # Get patients with diabetes diagnosis
        diabetes_condition = MedicalHistory.query.filter(
            MedicalHistory.condition.ilike('%diabetes%'),
            MedicalHistory.is_active == True
        )
        
        if facility_id:
            # Would need to join with Patient
            pass
        
        patients_with_diabetes = diabetes_condition.all()
        
        denominator = 0
        numerator = 0
        exclusions = 0
        
        for condition in patients_with_diabetes:
            patient = Patient.query.get(condition.patient_id)
            if not patient:
                continue
            
            # Check if patient had encounter during period
            encounters = ClinicalEncounter.query.filter(
                ClinicalEncounter.patient_id == patient.id,
                ClinicalEncounter.encounter_date >= period_start,
                ClinicalEncounter.encounter_date <= period_end
            ).count()
            
            if encounters > 0:
                denominator += 1
                
                # Check for A1c > 9%
                a1c_results = LabResult.query.filter(
                    LabResult.patient_id == patient.id,
                    LabResult.test_code.ilike('%A1C%'),
                    LabResult.result_date >= period_start - timedelta(days=365),
                    LabResult.result_date <= period_end
                ).all()
                
                for result in a1c_results:
                    try:
                        a1c_value = float(result.result_value)
                        if a1c_value > 9.0:
                            numerator += 1
                            break
                    except:
                        pass
        
        return {
            'denominator': denominator,
            'numerator': numerator,
            'exclusions': exclusions
        }
    
    def _calculate_patient_safety_measure(self, measure, facility_id, provider_id,
                                         period_start, period_end, logic):
        """Calculate patient safety measure"""
        # Example: Medication reconciliation
        # Denominator: Patients with medication list
        # Numerator: Patients with reconciled medication list
        
        encounters = ClinicalEncounter.query.filter(
            ClinicalEncounter.encounter_date >= period_start,
            ClinicalEncounter.encounter_date <= period_end
        )
        
        if facility_id:
            encounters = encounters.filter(ClinicalEncounter.facility_id == facility_id)
        if provider_id:
            encounters = encounters.filter(ClinicalEncounter.provider_id == provider_id)
        
        encounters_list = encounters.all()
        
        denominator = 0
        numerator = 0
        exclusions = 0
        
        for encounter in encounters_list:
            # Check if patient has medications
            medications = Medication.query.filter_by(patient_id=encounter.patient_id).count()
            
            if medications > 0:
                denominator += 1
                
                # Check if medications were reconciled (simplified)
                # In production, would check for medication reconciliation documentation
                is_reconciled = False  # Would check actual reconciliation records
                
                if is_reconciled:
                    numerator += 1
        
        return {
            'denominator': denominator,
            'numerator': numerator,
            'exclusions': exclusions
        }
    
    def _calculate_generic_measure(self, measure, facility_id, provider_id,
                                    period_start, period_end, logic):
        """Generic measure calculation"""
        # Default implementation
        return {
            'denominator': 0,
            'numerator': 0,
            'exclusions': 0
        }
    
    def _calculate_age(self, birth_date, reference_date):
        """Calculate age from birth date"""
        if not birth_date:
            return 0
        return (reference_date - birth_date).days // 365
    
    def _get_benchmark_rate(self, cms_measure_number):
        """Get benchmark rate for CMS measure"""
        # In production, would fetch from CMS benchmark database
        # For now, return None
        benchmarks = {
            'CMS125': 75.0,  # Breast Cancer Screening
            'CMS122': 30.0,  # Diabetes A1c Poor Control (lower is better)
            'CMS130': 80.0,  # Colorectal Cancer Screening
        }
        return benchmarks.get(cms_measure_number)
    
    def identify_care_gaps(self, measure_id, patient_id=None, facility_id=None):
        """
        Identify care gaps for a CQM measure
        
        Args:
            measure_id: CQM Measure ID
            patient_id: Optional patient filter
            facility_id: Optional facility filter
        
        Returns:
            List of gap analysis records
        """
        try:
            measure = CQMMeasure.query.get(measure_id)
            if not measure:
                return []
            
            gaps = []
            
            # Get patients in denominator but not in numerator
            eligibilities = CQMPatientEligibility.query.filter(
                CQMPatientEligibility.measure_id == measure_id,
                CQMPatientEligibility.is_in_denominator == True,
                CQMPatientEligibility.is_in_numerator == False,
                CQMPatientEligibility.is_excluded == False
            )
            
            if patient_id:
                eligibilities = eligibilities.filter(CQMPatientEligibility.patient_id == patient_id)
            
            for eligibility in eligibilities.all():
                gap = CQMGapAnalysis(
                    gap_id=f"GAP-{uuid.uuid4().hex[:12].upper()}",
                    measure_id=measure_id,
                    patient_id=eligibility.patient_id,
                    gap_type='care_gap',
                    gap_description=f"Patient eligible for {measure.measure_name} but criteria not met",
                    gap_severity='medium',
                    action_required=f"Complete {measure.measure_name} requirements",
                    action_priority='medium',
                    status='open'
                )
                
                db.session.add(gap)
                gaps.append(gap)
            
            db.session.commit()
            
            return [gap.to_dict() for gap in gaps]
            
        except Exception as e:
            db.session.rollback()
            return []

# Global instance
cqm_engine = CQMEngine()

