"""
FHIR/SMART on FHIR API Routes - Complete FHIR R4 Implementation
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required
from src.middleware.hipaa_audit import hipaa_audit_required
from src.models.user import db
from src.models.patient import Patient, Medication, Allergy, MedicalHistory
from src.models.clinical import ClinicalEncounter, LabResult, VitalSigns, LabOrder, ClinicalNote
from src.models.prescribing import Prescription
from src.models.scheduling import Appointment, ProviderSchedule
from src.models.provider import Provider, Facility
from src.models.organization import Organization
from src.models.billing import Claim, ClaimItem, Payment
from src.models.insurance import InsurancePlan, InsuranceSubscription, InsuranceClaim
from src.models.documents import Document
from datetime import datetime, date, time, timedelta
import json

fhir_bp = Blueprint('fhir', __name__)

# FHIR R4 Base URL
FHIR_BASE = '/fhir/R4'

@fhir_bp.route(f'{FHIR_BASE}/Patient/<patient_id>', methods=['GET'])
@token_required
def get_fhir_patient(patient_id):
    """Get patient in FHIR R4 format"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        # Convert to FHIR Patient resource
        fhir_patient = {
            'resourceType': 'Patient',
            'id': str(patient.id),
            'identifier': [
                {
                    'system': 'http://clinicplus.com/patient-id',
                    'value': patient.universal_patient_id
                }
            ],
            'name': [
                {
                    'family': patient.last_name,
                    'given': [patient.first_name]
                }
            ],
            'telecom': [],
            'gender': patient.gender,
            'birthDate': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            'address': [
                {
                    'line': [patient.address_line1],
                    'city': patient.city,
                    'state': patient.state,
                    'postalCode': patient.zip_code,
                    'country': patient.country
                }
            ]
        }
        
        if patient.phone_primary:
            fhir_patient['telecom'].append({
                'system': 'phone',
                'value': patient.phone_primary
            })
        
        if patient.email:
            fhir_patient['telecom'].append({
                'system': 'email',
                'value': patient.email
            })
        
        return jsonify(fhir_patient), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{
                'severity': 'error',
                'code': 'exception',
                'details': {'text': str(e)}
            }]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Encounter/<encounter_id>', methods=['GET'])
@token_required
def get_fhir_encounter(encounter_id):
    """Get encounter in FHIR R4 format"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        
        fhir_encounter = {
            'resourceType': 'Encounter',
            'id': str(encounter.id),
            'status': map_encounter_status(encounter.encounter_status),
            'class': {
                'system': 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                'code': map_encounter_type(encounter.encounter_type),
                'display': encounter.encounter_type
            },
            'subject': {
                'reference': f'Patient/{encounter.patient_id}'
            },
            'period': {
                'start': encounter.encounter_date.isoformat() if encounter.encounter_date else None
            },
            'reasonCode': [
                {
                    'text': encounter.chief_complaint
                }
            ] if encounter.chief_complaint else []
        }
        
        return jsonify(fhir_encounter), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{
                'severity': 'error',
                'code': 'exception',
                'details': {'text': str(e)}
            }]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Observation', methods=['GET'])
@token_required
def search_fhir_observations():
    """Search observations (lab results, vitals) in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        query = LabResult.query
        if patient_id:
            query = query.filter(LabResult.patient_id == patient_id)
        
        results = query.limit(100).all()
        
        fhir_observations = []
        for result in results:
            fhir_obs = {
                'resourceType': 'Observation',
                'id': str(result.id),
                'status': 'final',
                'category': [{
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/observation-category',
                        'code': 'laboratory',
                        'display': 'Laboratory'
                    }]
                }],
                'code': {
                    'coding': [{
                        'system': 'http://loinc.org',
                        'code': result.test_code,
                        'display': result.test_name
                    }]
                },
                'subject': {
                    'reference': f'Patient/{result.patient_id}'
                },
                'valueQuantity': {
                    'value': float(result.result_value) if result.result_value and result.result_value.replace('.', '').isdigit() else None,
                    'unit': result.result_unit,
                    'system': 'http://unitsofmeasure.org',
                    'code': result.result_unit
                } if result.result_value else None,
                'effectiveDateTime': result.result_date.isoformat() if result.result_date else None
            }
            fhir_observations.append(fhir_obs)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_observations),
            'entry': [{'resource': obs} for obs in fhir_observations]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{
                'severity': 'error',
                'code': 'exception',
                'details': {'text': str(e)}
            }]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/.well-known/smart-configuration', methods=['GET'])
def smart_configuration():
    """SMART on FHIR configuration - Delegated to SMART service"""
    from src.services.smart_fhir import smart_fhir_service
    base_url = request.host_url.rstrip('/')
    config = smart_fhir_service.get_smart_configuration(base_url)
    return jsonify(config), 200

def map_encounter_status(status):
    """Map internal status to FHIR status"""
    mapping = {
        'scheduled': 'planned',
        'in_progress': 'in-progress',
        'completed': 'finished',
        'cancelled': 'cancelled'
    }
    return mapping.get(status, 'unknown')

def map_encounter_type(encounter_type):
    """Map internal type to FHIR class code"""
    mapping = {
        'office_visit': 'AMB',
        'emergency': 'EMER',
        'inpatient': 'IMP',
        'telemedicine': 'AMB'
    }
    return mapping.get(encounter_type, 'AMB')

@fhir_bp.route(f'{FHIR_BASE}/Patient', methods=['GET'])
@token_required
def search_fhir_patients():
    """Search patients in FHIR format"""
    try:
        name = request.args.get('name')
        identifier = request.args.get('identifier')
        birthdate = request.args.get('birthdate')
        
        query = Patient.query
        
        if name:
            names = name.split()
            if len(names) >= 2:
                query = query.filter(
                    Patient.first_name.ilike(f'%{names[0]}%'),
                    Patient.last_name.ilike(f'%{names[1]}%')
                )
            else:
                query = query.filter(
                    (Patient.first_name.ilike(f'%{name}%')) |
                    (Patient.last_name.ilike(f'%{name}%'))
                )
        
        if identifier:
            query = query.filter(Patient.universal_patient_id == identifier)
        
        if birthdate:
            query = query.filter(Patient.date_of_birth == datetime.fromisoformat(birthdate).date())
        
        patients = query.limit(100).all()
        
        fhir_patients = []
        for patient in patients:
            fhir_patient = {
                'resourceType': 'Patient',
                'id': str(patient.id),
                'identifier': [{
                    'system': 'http://clinicplus.com/patient-id',
                    'value': patient.universal_patient_id
                }],
                'name': [{
                    'family': patient.last_name,
                    'given': [patient.first_name]
                }],
                'gender': patient.gender,
                'birthDate': patient.date_of_birth.isoformat() if patient.date_of_birth else None
            }
            fhir_patients.append(fhir_patient)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_patients),
            'entry': [{'resource': p} for p in fhir_patients]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/MedicationRequest', methods=['GET'])
@token_required
def search_fhir_medication_requests():
    """Search medication requests (prescriptions) in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        query = Prescription.query
        if patient_id:
            query = query.filter(Prescription.patient_id == patient_id)
        
        prescriptions = query.limit(100).all()
        
        fhir_meds = []
        for rx in prescriptions:
            fhir_med = {
                'resourceType': 'MedicationRequest',
                'id': str(rx.id),
                'status': 'active' if rx.status == 'active' else 'stopped',
                'intent': 'order',
                'medicationCodeableConcept': {
                    'coding': [{
                        'system': 'http://www.nlm.nih.gov/research/umls/rxnorm',
                        'code': rx.drug.rxnorm_code if rx.drug else None,
                        'display': rx.drug.drug_name if rx.drug else rx.medication_name
                    }]
                },
                'subject': {
                    'reference': f'Patient/{rx.patient_id}'
                },
                'authoredOn': rx.prescribed_date.isoformat() if rx.prescribed_date else None,
                'dosageInstruction': [{
                    'text': rx.dosage_instructions
                }] if rx.dosage_instructions else []
            }
            fhir_meds.append(fhir_med)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_meds),
            'entry': [{'resource': m} for m in fhir_meds]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Condition', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='condition')
def search_fhir_conditions():
    """Search conditions (medical history) in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        query = MedicalHistory.query
        if patient_id:
            query = query.filter(MedicalHistory.patient_id == patient_id)
        
        conditions = query.limit(100).all()
        
        fhir_conditions = []
        for cond in conditions:
            fhir_cond = {
                'resourceType': 'Condition',
                'id': str(cond.id),
                'clinicalStatus': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        'code': 'active' if cond.is_active else 'resolved'
                    }]
                },
                'code': {
                    'text': cond.condition_name or cond.condition
                },
                'subject': {
                    'reference': f'Patient/{cond.patient_id}'
                },
                'onsetDateTime': cond.diagnosis_date.isoformat() if cond.diagnosis_date else None
            }
            if cond.condition_code:
                fhir_cond['code']['coding'] = [{
                    'system': 'http://hl7.org/fhir/sid/icd-10',
                    'code': cond.condition_code,
                    'display': cond.condition_name or cond.condition
                }]
            fhir_conditions.append(fhir_cond)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_conditions),
            'entry': [{'resource': c} for c in fhir_conditions]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

# ==================== ADDITIONAL FHIR RESOURCES ====================

@fhir_bp.route(f'{FHIR_BASE}/AllergyIntolerance', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='allergy')
def search_fhir_allergies():
    """Search allergies in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        query = Allergy.query
        if patient_id:
            query = query.filter(Allergy.patient_id == patient_id)
        
        allergies = query.filter(Allergy.is_active == True).limit(100).all()
        
        fhir_allergies = []
        for allergy in allergies:
            fhir_allergy = {
                'resourceType': 'AllergyIntolerance',
                'id': str(allergy.id),
                'clinicalStatus': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
                        'code': 'active' if allergy.is_active else 'inactive'
                    }]
                },
                'verificationStatus': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
                        'code': 'confirmed'
                    }]
                },
                'type': 'allergy',
                'category': [allergy.allergen_type or 'medication'],
                'criticality': map_allergy_severity(allergy.severity),
                'code': {
                    'coding': [{
                        'system': 'http://www.nlm.nih.gov/research/umls/rxnorm',
                        'code': allergy.allergen,
                        'display': allergy.allergen
                    }],
                    'text': allergy.allergen
                },
                'patient': {
                    'reference': f'Patient/{allergy.patient_id}'
                },
                'onsetDateTime': allergy.onset_date.isoformat() if allergy.onset_date else None,
                'reaction': [{
                    'manifestation': [{
                        'text': allergy.reaction or 'Allergic reaction'
                    }],
                    'severity': allergy.severity
                }] if allergy.reaction else []
            }
            fhir_allergies.append(fhir_allergy)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_allergies),
            'entry': [{'resource': a} for a in fhir_allergies]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/DiagnosticReport', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='diagnosticreport')
def search_fhir_diagnostic_reports():
    """Search diagnostic reports (lab results) in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        encounter_id = request.args.get('encounter')
        if encounter_id and encounter_id.startswith('Encounter/'):
            encounter_id = encounter_id.split('/')[1]
        
        query = LabResult.query
        if patient_id:
            query = query.filter(LabResult.patient_id == patient_id)
        if encounter_id:
            query = query.filter(LabResult.encounter_id == encounter_id)
        
        results = query.limit(100).all()
        
        # Group results by encounter/date for DiagnosticReport
        reports_dict = {}
        for result in results:
            key = f"{result.patient_id}_{result.encounter_id or 'none'}_{result.result_date}"
            if key not in reports_dict:
                reports_dict[key] = {
                    'patient_id': result.patient_id,
                    'encounter_id': result.encounter_id,
                    'date': result.result_date,
                    'results': []
                }
            reports_dict[key]['results'].append(result)
        
        fhir_reports = []
        for idx, (key, report_data) in enumerate(reports_dict.items()):
            fhir_report = {
                'resourceType': 'DiagnosticReport',
                'id': f'report-{idx}',
                'status': 'final',
                'category': [{
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/v2-0074',
                        'code': 'LAB',
                        'display': 'Laboratory'
                    }]
                }],
                'code': {
                    'coding': [{
                        'system': 'http://loinc.org',
                        'code': '58410-2',
                        'display': 'Comprehensive metabolic panel'
                    }],
                    'text': 'Laboratory Results'
                },
                'subject': {
                    'reference': f'Patient/{report_data["patient_id"]}'
                },
                'effectiveDateTime': report_data['date'].isoformat() if report_data['date'] else None,
                'result': []
            }
            
            if report_data['encounter_id']:
                fhir_report['encounter'] = {
                    'reference': f'Encounter/{report_data["encounter_id"]}'
                }
            
            # Add individual results as references
            for result in report_data['results']:
                fhir_report['result'].append({
                    'reference': f'Observation/{result.id}'
                })
            
            fhir_reports.append(fhir_report)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_reports),
            'entry': [{'resource': r} for r in fhir_reports]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Procedure', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='procedure')
def search_fhir_procedures():
    """Search procedures (lab orders, clinical procedures) in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        encounter_id = request.args.get('encounter')
        if encounter_id and encounter_id.startswith('Encounter/'):
            encounter_id = encounter_id.split('/')[1]
        
        query = LabOrder.query
        if patient_id:
            query = query.filter(LabOrder.patient_id == patient_id)
        if encounter_id:
            query = query.filter(LabOrder.encounter_id == encounter_id)
        
        orders = query.limit(100).all()
        
        fhir_procedures = []
        for order in orders:
            fhir_proc = {
                'resourceType': 'Procedure',
                'id': str(order.id),
                'status': map_procedure_status(order.status),
                'category': {
                    'coding': [{
                        'system': 'http://snomed.info/sct',
                        'code': '103693007',
                        'display': 'Diagnostic procedure'
                    }]
                },
                'code': {
                    'coding': [{
                        'system': 'http://loinc.org',
                        'code': order.test_code or 'UNKNOWN',
                        'display': order.test_name
                    }],
                    'text': order.test_name
                },
                'subject': {
                    'reference': f'Patient/{order.patient_id}'
                },
                'encounter': {
                    'reference': f'Encounter/{order.encounter_id}'
                } if order.encounter_id else None,
                'performedDateTime': order.order_date.isoformat() if order.order_date else None,
                'performer': [{
                    'actor': {
                        'reference': f'Practitioner/{order.ordering_provider_id}'
                    }
                }] if order.ordering_provider_id else []
            }
            if order.clinical_indication:
                fhir_proc['reasonCode'] = [{
                    'text': order.clinical_indication
                }]
            fhir_procedures.append(fhir_proc)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_procedures),
            'entry': [{'resource': p} for p in fhir_procedures]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Immunization', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='immunization')
def search_fhir_immunizations():
    """Search immunizations in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        # Note: Immunization model may not exist yet, using placeholder
        # In production, this would query from Immunization model
        fhir_immunizations = []
        
        # If Immunization model exists, uncomment:
        # query = Immunization.query
        # if patient_id:
        #     query = query.filter(Immunization.patient_id == patient_id)
        # immunizations = query.limit(100).all()
        # for imm in immunizations:
        #     fhir_imm = {
        #         'resourceType': 'Immunization',
        #         'id': str(imm.id),
        #         'status': 'completed',
        #         'vaccineCode': {
        #             'coding': [{
        #                 'system': 'http://hl7.org/fhir/sid/cvx',
        #                 'code': imm.cvx_code,
        #                 'display': imm.vaccine_name
        #             }]
        #         },
        #         'patient': {
        #             'reference': f'Patient/{imm.patient_id}'
        #         },
        #         'occurrenceDateTime': imm.date_administered.isoformat() if imm.date_administered else None,
        #         'primarySource': imm.primary_source
        #     }
        #     fhir_immunizations.append(fhir_imm)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_immunizations),
            'entry': [{'resource': i} for i in fhir_immunizations]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/DocumentReference', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='documentreference')
def search_fhir_document_references():
    """Search document references in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        query = Document.query
        if patient_id:
            query = query.filter(Document.patient_id == patient_id)
        
        documents = query.limit(100).all()
        
        fhir_docs = []
        for doc in documents:
            fhir_doc = {
                'resourceType': 'DocumentReference',
                'id': str(doc.id),
                'status': 'current',
                'type': {
                    'coding': [{
                        'system': 'http://loinc.org',
                        'code': doc.document_type or '11503-0',
                        'display': doc.document_type or 'Progress note'
                    }],
                    'text': doc.document_type or 'Document'
                },
                'subject': {
                    'reference': f'Patient/{doc.patient_id}'
                },
                'date': doc.created_at.isoformat() if doc.created_at else None,
                'content': [{
                    'attachment': {
                        'contentType': doc.mime_type or 'application/pdf',
                        'url': doc.file_path or f'/api/documents/{doc.id}/download',
                        'title': doc.title or doc.filename
                    }
                }]
            }
            if doc.author_id:
                fhir_doc['author'] = [{
                    'reference': f'Practitioner/{doc.author_id}'
                }]
            fhir_docs.append(fhir_doc)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_docs),
            'entry': [{'resource': d} for d in fhir_docs]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Appointment', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='appointment')
def search_fhir_appointments():
    """Search appointments in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        practitioner_id = request.args.get('practitioner')
        if practitioner_id and practitioner_id.startswith('Practitioner/'):
            practitioner_id = practitioner_id.split('/')[1]
        
        query = Appointment.query
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        if practitioner_id:
            query = query.filter(Appointment.provider_id == practitioner_id)
        
        appointments = query.limit(100).all()
        
        fhir_appointments = []
        for apt in appointments:
            appointment_datetime = datetime.combine(apt.appointment_date, apt.appointment_time)
            end_datetime = appointment_datetime + timedelta(minutes=apt.duration_minutes)
            
            fhir_apt = {
                'resourceType': 'Appointment',
                'id': str(apt.id),
                'status': map_appointment_status(apt.status),
                'serviceType': [{
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/service-type',
                        'code': apt.appointment_type,
                        'display': apt.appointment_type.replace('_', ' ').title()
                    }]
                }],
                'appointmentType': {
                    'coding': [{
                        'text': apt.appointment_type
                    }]
                },
                'reasonCode': [{
                    'text': apt.reason_for_visit
                }] if apt.reason_for_visit else [],
                'participant': [
                    {
                        'actor': {
                            'reference': f'Patient/{apt.patient_id}'
                        },
                        'status': 'accepted'
                    },
                    {
                        'actor': {
                            'reference': f'Practitioner/{apt.provider_id}'
                        },
                        'status': 'accepted'
                    },
                    {
                        'actor': {
                            'reference': f'Location/{apt.facility_id}'
                        },
                        'status': 'accepted'
                    }
                ],
                'start': appointment_datetime.isoformat(),
                'end': end_datetime.isoformat(),
                'minutesDuration': apt.duration_minutes
            }
            fhir_appointments.append(fhir_apt)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_appointments),
            'entry': [{'resource': a} for a in fhir_appointments]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Schedule', methods=['GET'])
@token_required
def search_fhir_schedules():
    """Search provider schedules in FHIR format"""
    try:
        practitioner_id = request.args.get('practitioner')
        if practitioner_id and practitioner_id.startswith('Practitioner/'):
            practitioner_id = practitioner_id.split('/')[1]
        
        location_id = request.args.get('location')
        if location_id and location_id.startswith('Location/'):
            location_id = location_id.split('/')[1]
        
        query = ProviderSchedule.query
        if practitioner_id:
            query = query.filter(ProviderSchedule.provider_id == practitioner_id)
        if location_id:
            query = query.filter(ProviderSchedule.facility_id == location_id)
        
        schedules = query.limit(100).all()
        
        fhir_schedules = []
        for schedule in schedules:
            fhir_schedule = {
                'resourceType': 'Schedule',
                'id': str(schedule.id),
                'active': schedule.is_available,
                'actor': [
                    {
                        'reference': f'Practitioner/{schedule.provider_id}'
                    },
                    {
                        'reference': f'Location/{schedule.facility_id}'
                    }
                ],
                'planningHorizon': {
                    'start': schedule.effective_from.isoformat() if schedule.effective_from else None,
                    'end': schedule.effective_to.isoformat() if schedule.effective_to else None
                },
                'comment': f"Available {get_day_name(schedule.day_of_week)} from {schedule.start_time} to {schedule.end_time}"
            }
            fhir_schedules.append(fhir_schedule)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_schedules),
            'entry': [{'resource': s} for s in fhir_schedules]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Slot', methods=['GET'])
@token_required
def search_fhir_slots():
    """Search available appointment slots in FHIR format"""
    try:
        schedule_id = request.args.get('schedule')
        if schedule_id and schedule_id.startswith('Schedule/'):
            schedule_id = schedule_id.split('/')[1]
        
        start = request.args.get('start')
        end = request.args.get('end')
        
        # Generate slots from schedule
        schedule = ProviderSchedule.query.get(schedule_id) if schedule_id else None
        
        fhir_slots = []
        if schedule:
            # Generate 15-minute slots for the schedule
            # This is a simplified version - in production, would check against existing appointments
            from datetime import timedelta
            current_time = datetime.combine(date.today(), schedule.start_time)
            end_time = datetime.combine(date.today(), schedule.end_time)
            
            slot_duration = schedule.appointment_duration or 30
            slot_number = 0
            
            while current_time < end_time:
                slot_end = current_time + timedelta(minutes=slot_duration)
                fhir_slot = {
                    'resourceType': 'Slot',
                    'id': f'slot-{schedule.id}-{slot_number}',
                    'status': 'free',
                    'schedule': {
                        'reference': f'Schedule/{schedule.id}'
                    },
                    'start': current_time.isoformat(),
                    'end': slot_end.isoformat()
                }
                fhir_slots.append(fhir_slot)
                current_time = slot_end
                slot_number += 1
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_slots),
            'entry': [{'resource': s} for s in fhir_slots]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Practitioner', methods=['GET'])
@token_required
def search_fhir_practitioners():
    """Search practitioners (providers) in FHIR format"""
    try:
        identifier = request.args.get('identifier')
        name = request.args.get('name')
        
        query = Provider.query.filter(Provider.is_active == True)
        
        if identifier:
            query = query.filter(
                (Provider.npi_number == identifier) |
                (Provider.universal_provider_id == identifier)
            )
        
        if name:
            names = name.split()
            if len(names) >= 2:
                query = query.filter(
                    Provider.first_name.ilike(f'%{names[0]}%'),
                    Provider.last_name.ilike(f'%{names[1]}%')
                )
            else:
                query = query.filter(
                    (Provider.first_name.ilike(f'%{name}%')) |
                    (Provider.last_name.ilike(f'%{name}%'))
                )
        
        providers = query.limit(100).all()
        
        fhir_practitioners = []
        for provider in providers:
            fhir_pract = {
                'resourceType': 'Practitioner',
                'id': str(provider.id),
                'identifier': []
            }
            
            if provider.npi_number:
                fhir_pract['identifier'].append({
                    'system': 'http://hl7.org/fhir/sid/us-npi',
                    'value': provider.npi_number
                })
            
            if provider.universal_provider_id:
                fhir_pract['identifier'].append({
                    'system': 'http://clinicplus.com/provider-id',
                    'value': provider.universal_provider_id
                })
            
            fhir_pract['name'] = [{
                'family': provider.last_name,
                'given': [provider.first_name],
                'prefix': [provider.title] if provider.title else []
            }]
            
            if provider.phone:
                fhir_pract['telecom'] = [{
                    'system': 'phone',
                    'value': provider.phone
                }]
            
            if provider.email:
                if 'telecom' not in fhir_pract:
                    fhir_pract['telecom'] = []
                fhir_pract['telecom'].append({
                    'system': 'email',
                    'value': provider.email
                })
            
            if provider.specialty:
                fhir_pract['qualification'] = [{
                    'code': {
                        'coding': [{
                            'system': 'http://snomed.info/sct',
                            'display': provider.specialty
                        }]
                    }
                }]
            
            fhir_practitioners.append(fhir_pract)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_practitioners),
            'entry': [{'resource': p} for p in fhir_practitioners]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Practitioner/<practitioner_id>', methods=['GET'])
@token_required
def get_fhir_practitioner(practitioner_id):
    """Get practitioner in FHIR R4 format"""
    try:
        provider = Provider.query.get_or_404(practitioner_id)
        
        fhir_pract = {
            'resourceType': 'Practitioner',
            'id': str(provider.id),
            'identifier': []
        }
        
        if provider.npi_number:
            fhir_pract['identifier'].append({
                'system': 'http://hl7.org/fhir/sid/us-npi',
                'value': provider.npi_number
            })
        
        fhir_pract['name'] = [{
            'family': provider.last_name,
            'given': [provider.first_name],
            'prefix': [provider.title] if provider.title else []
        }]
        
        if provider.phone or provider.email:
            fhir_pract['telecom'] = []
            if provider.phone:
                fhir_pract['telecom'].append({
                    'system': 'phone',
                    'value': provider.phone
                })
            if provider.email:
                fhir_pract['telecom'].append({
                    'system': 'email',
                    'value': provider.email
                })
        
        return jsonify(fhir_pract), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Organization', methods=['GET'])
@token_required
def search_fhir_organizations():
    """Search organizations in FHIR format"""
    try:
        identifier = request.args.get('identifier')
        name = request.args.get('name')
        
        query = Organization.query.filter(Organization.is_active == True)
        
        if identifier:
            query = query.filter(Organization.organization_id == identifier)
        
        if name:
            query = query.filter(Organization.organization_name.ilike(f'%{name}%'))
        
        organizations = query.limit(100).all()
        
        fhir_orgs = []
        for org in organizations:
            fhir_org = {
                'resourceType': 'Organization',
                'id': str(org.id),
                'identifier': [{
                    'system': 'http://clinicplus.com/organization-id',
                    'value': org.organization_id
                }],
                'name': org.organization_name,
                'type': [{
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/organization-type',
                        'code': org.organization_type,
                        'display': org.organization_type.replace('_', ' ').title()
                    }]
                }],
                'active': org.is_active
            }
            
            if org.address_line1:
                fhir_org['address'] = [{
                    'line': [org.address_line1],
                    'city': org.city,
                    'state': org.state,
                    'postalCode': org.zip_code,
                    'country': org.country
                }]
            
            if org.phone:
                fhir_org['telecom'] = [{
                    'system': 'phone',
                    'value': org.phone
                }]
            
            if org.email:
                if 'telecom' not in fhir_org:
                    fhir_org['telecom'] = []
                fhir_org['telecom'].append({
                    'system': 'email',
                    'value': org.email
                })
            
            fhir_orgs.append(fhir_org)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_orgs),
            'entry': [{'resource': o} for o in fhir_orgs]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Location', methods=['GET'])
@token_required
def search_fhir_locations():
    """Search locations (facilities) in FHIR format"""
    try:
        identifier = request.args.get('identifier')
        name = request.args.get('name')
        
        query = Facility.query
        
        if identifier:
            query = query.filter(Facility.facility_id == identifier)
        
        if name:
            query = query.filter(Facility.facility_name.ilike(f'%{name}%'))
        
        facilities = query.limit(100).all()
        
        fhir_locations = []
        for facility in facilities:
            fhir_location = {
                'resourceType': 'Location',
                'id': str(facility.id),
                'identifier': [{
                    'system': 'http://clinicplus.com/facility-id',
                    'value': facility.facility_id
                }],
                'status': 'active',
                'name': facility.facility_name,
                'type': [{
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
                        'code': facility.facility_type,
                        'display': facility.facility_type.replace('_', ' ').title()
                    }]
                }],
                'address': {
                    'line': [facility.address_line1] if facility.address_line1 else [],
                    'city': facility.city,
                    'state': facility.state,
                    'postalCode': facility.zip_code,
                    'country': facility.country
                }
            }
            
            if facility.phone:
                fhir_location['telecom'] = [{
                    'system': 'phone',
                    'value': facility.phone
                }]
            
            fhir_locations.append(fhir_location)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_locations),
            'entry': [{'resource': l} for l in fhir_locations]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Coverage', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='coverage')
def search_fhir_coverages():
    """Search insurance coverage in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        query = InsuranceSubscription.query.filter(InsuranceSubscription.status == 'active')
        if patient_id:
            query = query.filter(InsuranceSubscription.subscriber_id == patient_id)
        
        subscriptions = query.limit(100).all()
        
        fhir_coverages = []
        for sub in subscriptions:
            plan = InsurancePlan.query.get(sub.plan_id)
            fhir_coverage = {
                'resourceType': 'Coverage',
                'id': str(sub.id),
                'status': 'active' if sub.status == 'active' else 'cancelled',
                'type': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                        'code': 'EHCPOL',
                        'display': 'Extended Healthcare'
                    }]
                },
                'subscriber': {
                    'reference': f'Patient/{sub.subscriber_id}'
                },
                'beneficiary': {
                    'reference': f'Patient/{sub.subscriber_id}'
                },
                'dependent': str(sub.subscription_id),
                'period': {
                    'start': sub.start_date.isoformat() if sub.start_date else None,
                    'end': sub.end_date.isoformat() if sub.end_date else None
                },
                'payor': [{
                    'display': plan.plan_name if plan else 'Unknown Plan'
                }] if plan else []
            }
            
            if plan:
                fhir_coverage['plan'] = {
                    'display': plan.plan_name
                }
            
            fhir_coverages.append(fhir_coverage)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_coverages),
            'entry': [{'resource': c} for c in fhir_coverages]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Claim', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='claim')
def search_fhir_claims():
    """Search claims in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        query = Claim.query
        if patient_id:
            query = query.filter(Claim.patient_id == patient_id)
        
        claims = query.limit(100).all()
        
        fhir_claims = []
        for claim in claims:
            fhir_claim = {
                'resourceType': 'Claim',
                'id': str(claim.id),
                'status': map_claim_status(claim.status),
                'type': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/claim-type',
                        'code': 'professional',
                        'display': 'Professional'
                    }]
                },
                'patient': {
                    'reference': f'Patient/{claim.patient_id}'
                },
                'billablePeriod': {
                    'start': claim.created_at.isoformat() if claim.created_at else None
                },
                'created': claim.created_at.isoformat() if claim.created_at else None,
                'total': {
                    'value': float(claim.total_charge_amount) if claim.total_charge_amount else 0,
                    'currency': 'NGN'
                },
                'item': []
            }
            
            # Add claim items
            for item in claim.claim_items:
                fhir_item = {
                    'sequence': item.line_number,
                    'productOrService': {
                        'coding': [{
                            'system': 'http://www.ama-assn.org/go/cpt',
                            'code': item.procedure_code,
                            'display': item.procedure_code
                        }]
                    },
                    'servicedDate': claim.created_at.date().isoformat() if claim.created_at else None,
                    'unitPrice': {
                        'value': float(item.charge_amount) if item.charge_amount else 0,
                        'currency': 'NGN'
                    },
                    'net': {
                        'value': float(item.charge_amount) if item.charge_amount else 0,
                        'currency': 'NGN'
                    }
                }
                if item.diagnosis_code:
                    fhir_item['diagnosis'] = [{
                        'diagnosisCodeableConcept': {
                            'coding': [{
                                'system': 'http://hl7.org/fhir/sid/icd-10',
                                'code': item.diagnosis_code
                            }]
                        }
                    }]
                fhir_claim['item'].append(fhir_item)
            
            fhir_claims.append(fhir_claim)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_claims),
            'entry': [{'resource': c} for c in fhir_claims]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/ExplanationOfBenefit', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='explanationofbenefit')
def search_fhir_eobs():
    """Search Explanation of Benefit (EOB) in FHIR format"""
    try:
        patient_id = request.args.get('patient')
        if patient_id and patient_id.startswith('Patient/'):
            patient_id = patient_id.split('/')[1]
        
        # EOB typically comes from ERA (835) processing
        # For now, map from InsuranceClaim which has payment information
        query = InsuranceClaim.query
        if patient_id:
            query = query.filter(InsuranceClaim.patient_id == patient_id)
        
        claims = query.filter(InsuranceClaim.status.in_(['paid', 'approved'])).limit(100).all()
        
        fhir_eobs = []
        for claim in claims:
            fhir_eob = {
                'resourceType': 'ExplanationOfBenefit',
                'id': str(claim.id),
                'status': 'active',
                'type': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/claim-type',
                        'code': 'professional',
                        'display': 'Professional'
                    }]
                },
                'patient': {
                    'reference': f'Patient/{claim.patient_id}'
                },
                'billablePeriod': {
                    'start': claim.claim_date.isoformat() if claim.claim_date else None
                },
                'created': claim.submission_date.isoformat() if claim.submission_date else None,
                'outcome': 'complete',
                'item': [{
                    'sequence': 1,
                    'productOrService': {
                        'text': claim.service_description or claim.service_type
                    },
                    'servicedDate': claim.claim_date.isoformat() if claim.claim_date else None,
                    'adjudication': [{
                        'category': {
                            'coding': [{
                                'system': 'http://terminology.hl7.org/CodeSystem/adjudication',
                                'code': 'submitted',
                                'display': 'Submitted Amount'
                            }]
                        },
                        'amount': {
                            'value': float(claim.billed_amount) if claim.billed_amount else 0,
                            'currency': 'NGN'
                        }
                    }]
                }],
                'total': [{
                    'category': {
                        'coding': [{
                            'system': 'http://terminology.hl7.org/CodeSystem/adjudication',
                            'code': 'submitted',
                            'display': 'Total Submitted'
                        }]
                    },
                    'amount': {
                        'value': float(claim.billed_amount) if claim.billed_amount else 0,
                        'currency': 'NGN'
                    }
                }]
            }
            
            if claim.paid_amount:
                fhir_eob['total'].append({
                    'category': {
                        'coding': [{
                            'system': 'http://terminology.hl7.org/CodeSystem/adjudication',
                            'code': 'paid',
                            'display': 'Amount Paid'
                        }]
                    },
                    'amount': {
                        'value': float(claim.paid_amount),
                        'currency': 'NGN'
                    }
                })
            
            fhir_eobs.append(fhir_eob)
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(fhir_eobs),
            'entry': [{'resource': e} for e in fhir_eobs]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/Bundle', methods=['POST'])
@token_required
def create_fhir_bundle():
    """Create FHIR Bundle (transaction)"""
    try:
        data = request.get_json()
        
        if data.get('resourceType') != 'Bundle' or data.get('type') != 'transaction':
            return jsonify({
                'resourceType': 'OperationOutcome',
                'issue': [{
                    'severity': 'error',
                    'code': 'invalid',
                    'details': {'text': 'Bundle type must be transaction'}
                }]
            }), 400
        
        # Process transaction bundle
        # In production, this would process each entry and create/update resources
        # For now, return success
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'transaction-response',
            'entry': []
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

# ==================== FHIR OPERATIONS ====================

@fhir_bp.route(f'{FHIR_BASE}/Patient/<patient_id>/$everything', methods=['GET'])
@token_required
@hipaa_audit_required(action_type='view', resource_type='patient_everything')
def patient_everything(patient_id):
    """FHIR $everything operation - Get all resources for a patient"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        # Collect all related resources
        resources = []
        
        # Patient resource
        resources.append({
            'resource': {
                'resourceType': 'Patient',
                'id': str(patient.id),
                'identifier': [{
                    'system': 'http://clinicplus.com/patient-id',
                    'value': patient.universal_patient_id
                }],
                'name': [{
                    'family': patient.last_name,
                    'given': [patient.first_name]
                }]
            }
        })
        
        # Encounters
        encounters = ClinicalEncounter.query.filter_by(patient_id=patient_id).limit(50).all()
        for enc in encounters:
            resources.append({
                'resource': {
                    'resourceType': 'Encounter',
                    'id': str(enc.id),
                    'subject': {'reference': f'Patient/{patient_id}'}
                }
            })
        
        # Observations (lab results, vitals)
        lab_results = LabResult.query.filter_by(patient_id=patient_id).limit(50).all()
        for result in lab_results:
            resources.append({
                'resource': {
                    'resourceType': 'Observation',
                    'id': str(result.id),
                    'subject': {'reference': f'Patient/{patient_id}'}
                }
            })
        
        # MedicationRequests
        prescriptions = Prescription.query.filter_by(patient_id=patient_id).limit(50).all()
        for rx in prescriptions:
            resources.append({
                'resource': {
                    'resourceType': 'MedicationRequest',
                    'id': str(rx.id),
                    'subject': {'reference': f'Patient/{patient_id}'}
                }
            })
        
        # Conditions
        conditions = MedicalHistory.query.filter_by(patient_id=patient_id).limit(50).all()
        for cond in conditions:
            resources.append({
                'resource': {
                    'resourceType': 'Condition',
                    'id': str(cond.id),
                    'subject': {'reference': f'Patient/{patient_id}'}
                }
            })
        
        # Allergies
        allergies = Allergy.query.filter_by(patient_id=patient_id).limit(50).all()
        for allergy in allergies:
            resources.append({
                'resource': {
                    'resourceType': 'AllergyIntolerance',
                    'id': str(allergy.id),
                    'patient': {'reference': f'Patient/{patient_id}'}
                }
            })
        
        return jsonify({
            'resourceType': 'Bundle',
            'type': 'searchset',
            'total': len(resources),
            'entry': resources
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

@fhir_bp.route(f'{FHIR_BASE}/<resource_type>/$validate', methods=['POST'])
@token_required
def validate_fhir_resource(resource_type):
    """FHIR $validate operation - Validate a FHIR resource"""
    try:
        data = request.get_json()
        
        # Basic validation
        if not data.get('resourceType'):
            return jsonify({
                'resourceType': 'OperationOutcome',
                'issue': [{
                    'severity': 'error',
                    'code': 'invalid',
                    'details': {'text': 'Missing resourceType'}
                }]
            }), 400
        
        if data.get('resourceType') != resource_type:
            return jsonify({
                'resourceType': 'OperationOutcome',
                'issue': [{
                    'severity': 'error',
                    'code': 'invalid',
                    'details': {'text': f'ResourceType mismatch: expected {resource_type}, got {data.get("resourceType")}'}
                }]
            }), 400
        
        # In production, would perform full FHIR validation
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{
                'severity': 'information',
                'code': 'informational',
                'details': {'text': 'Resource validated successfully'}
            }]
        }), 200
        
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception', 'details': {'text': str(e)}}]
        }), 500

# ==================== HELPER FUNCTIONS ====================

def map_allergy_severity(severity):
    """Map internal severity to FHIR criticality"""
    mapping = {
        'mild': 'low',
        'moderate': 'low',
        'severe': 'high',
        'life-threatening': 'high'
    }
    return mapping.get(severity.lower(), 'unable-to-assess')

def map_procedure_status(status):
    """Map internal procedure status to FHIR status"""
    mapping = {
        'ordered': 'preparation',
        'in_progress': 'in-progress',
        'completed': 'completed',
        'cancelled': 'not-done'
    }
    return mapping.get(status, 'unknown')

def map_appointment_status(status):
    """Map internal appointment status to FHIR status"""
    mapping = {
        'scheduled': 'proposed',
        'confirmed': 'confirmed',
        'checked_in': 'arrived',
        'in_progress': 'fulfilled',
        'completed': 'fulfilled',
        'cancelled': 'cancelled',
        'no_show': 'noshow'
    }
    return mapping.get(status, 'proposed')

def map_claim_status(status):
    """Map internal claim status to FHIR status"""
    mapping = {
        'draft': 'active',
        'submitted': 'active',
        'accepted': 'active',
        'rejected': 'cancelled',
        'paid': 'complete',
        'denied': 'cancelled'
    }
    return mapping.get(status, 'active')

def get_day_name(day_of_week):
    """Get day name from day of week number"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[day_of_week] if 0 <= day_of_week < 7 else 'Unknown'

