"""
EDI Claims Generation Service
Generates 837P (Professional) and HCFA 1500 format files
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, List
import os

class EDIService:
    """Service for generating EDI claim files"""
    
    def __init__(self):
        self.submitter_id = os.getenv('EDI_SUBMITTER_ID', 'CLINICPLUS')
        self.receiver_id = os.getenv('EDI_RECEIVER_ID', 'CLEARINGHOUSE')
        self.interchange_control_number = 1
    
    def generate_837p(self, claim, patient, provider=None, facility=None) -> str:
        """Generate 837P (Professional) EDI file"""
        lines = []
        
        # ISA Segment (Interchange Header)
        isa_date = datetime.now().strftime('%y%m%d')
        isa_time = datetime.now().strftime('%H%M')
        lines.append(f"ISA*00*          *00*          *ZZ*{self.submitter_id:<15}*ZZ*{self.receiver_id:<15}*{isa_date}*{isa_time}*^*00501*{self.interchange_control_number:09d}*0*P*:~")
        
        # GS Segment (Functional Group Header)
        gs_date = datetime.now().strftime('%Y%m%d')
        gs_time = datetime.now().strftime('%H%M%S')
        lines.append(f"GS*HC*{self.submitter_id}*{self.receiver_id}*{gs_date}*{gs_time}*1*X*005010X222A1~")
        
        # ST Segment (Transaction Set Header)
        lines.append("ST*837*0001*005010X222A1~")
        
        # BHT Segment (Beginning of Hierarchical Transaction)
        bht_date = datetime.now().strftime('%Y%m%d')
        bht_time = datetime.now().strftime('%H%M%S')
        lines.append(f"BHT*0019*00*{claim.claim_id}*{bht_date}*{bht_time}*CH~")
        
        # 1000A Loop (Submitter Name)
        lines.append(f"NM1*41*2*{self.submitter_id}*****46*{self.submitter_id}~")
        lines.append(f"PER*IC*{facility.name}*TE*{facility.phone or ''}~")
        
        # 1000B Loop (Receiver Name)
        lines.append(f"NM1*40*2*{self.receiver_id}*****46*{self.receiver_id}~")
        
        # 2000A Loop (Billing Provider)
        lines.append("HL*1**20*1~")
        if provider:
            lines.append(f"PRV*BI*PXC*{provider.npi_number or ''}~")
            lines.append(f"NM1*85*2*{provider.last_name or ''}*{provider.first_name or ''}*****XX*{provider.npi_number or ''}~")
            if provider.address_line1:
                lines.append(f"N3*{provider.address_line1}~")
                if provider.city:
                    lines.append(f"N4*{provider.city}*{provider.state or ''}*{provider.zip_code or ''}~")
        else:
            # Use facility as provider if provider not available
            if facility:
                lines.append(f"PRV*BI*PXC*{facility.npi_number or ''}~")
                lines.append(f"NM1*85*2*{facility.name or 'Facility'}*****XX*{facility.npi_number or ''}~")
                if facility.address_line1:
                    lines.append(f"N3*{facility.address_line1}~")
                    if facility.city:
                        lines.append(f"N4*{facility.city}*{facility.state or ''}*{facility.zip_code or ''}~")
        
        # 2000B Loop (Subscriber/Patient)
        lines.append("HL*2*1*22*0~")
        lines.append(f"SBR*P*18*{patient.universal_patient_id}****AC~")
        lines.append(f"NM1*IL*1*{patient.last_name}*{patient.first_name}****MI*{patient.universal_patient_id}~")
        if patient.date_of_birth:
            dob = patient.date_of_birth.strftime('%Y%m%d')
            lines.append(f"DMG*D8*{dob}*{patient.gender or 'U'}~")
        if patient.address_line1:
            lines.append(f"N3*{patient.address_line1}~")
            if patient.city:
                lines.append(f"N4*{patient.city}*{patient.state or ''}*{patient.zip_code or ''}~")
        
        # 2000C Loop (Patient)
        lines.append("HL*3*2*23*0~")
        lines.append(f"PAT*19~")
        
        # 2300 Loop (Claim Information)
        lines.append("HL*4*3*23*0~")
        clm_date = datetime.now().strftime('%Y%m%d')
        lines.append(f"CLM*{claim.claim_id}*{claim.total_charge_amount}***11:B:1*Y*A*Y*I~")
        
        # DTP Segment (Service Date)
        svc_date = datetime.now().strftime('%Y%m%d')
        lines.append(f"DTP*431*D8*{svc_date}~")
        
        # CL1 Segment (Claim Codes)
        lines.append("CL1*1*1*01~")
        
        # Claim Items (2400 Loop)
        from src.models.billing import ClaimItem
        claim_items = ClaimItem.query.filter_by(claim_id=claim.id).all()
        for idx, item in enumerate(claim_items, 1):
            lines.append(f"LX*{idx}~")
            lines.append(f"SV2*0450*HC*{item.procedure_code}*{item.charge_amount}*UN*{item.quantity}~")
            if item.diagnosis_code:
                lines.append(f"HI*BK:{item.diagnosis_code}~")
        
        # SE Segment (Transaction Set Trailer)
        lines.append(f"SE*{len(lines) + 1}*0001~")
        
        # GE Segment (Functional Group Trailer)
        lines.append("GE*1*1~")
        
        # IEA Segment (Interchange Trailer)
        lines.append(f"IEA*1*{self.interchange_control_number:09d}~")
        
        self.interchange_control_number += 1
        
        return '\n'.join(lines)
    
    def generate_hcfa1500(self, claim, patient, provider=None, facility=None) -> str:
        """Generate HCFA 1500 format (text representation)"""
        lines = []
        lines.append("=" * 80)
        lines.append("HCFA 1500 CLAIM FORM")
        lines.append("=" * 80)
        lines.append(f"Claim ID: {claim.claim_id}")
        lines.append(f"Patient: {patient.first_name} {patient.last_name}")
        lines.append(f"DOB: {patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else 'N/A'}")
        if provider:
            lines.append(f"Provider: {provider.first_name} {provider.last_name}")
            lines.append(f"NPI: {provider.npi_number or 'N/A'}")
        elif facility:
            lines.append(f"Facility: {facility.name}")
            lines.append(f"NPI: {facility.npi_number or 'N/A'}")
        lines.append(f"Service Date: {datetime.now().strftime('%Y-%m-%d')}")
        lines.append(f"Total Amount: ${claim.total_charge_amount}")
        lines.append("=" * 80)
        
        from src.models.billing import ClaimItem
        claim_items = ClaimItem.query.filter_by(claim_id=claim.id).all()
        for item in claim_items:
            lines.append(f"Procedure: {item.procedure_code} | Amount: ${item.charge_amount} | Diagnosis: {item.diagnosis_code or 'N/A'}")
        
        return '\n'.join(lines)
    
    def save_edi_file(self, edi_content: str, claim_id: str, format_type: str = '837P') -> str:
        """Save EDI file to disk"""
        file_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'edi_files')
        os.makedirs(file_dir, exist_ok=True)
        
        file_extension = '837' if format_type == '837P' else 'txt'
        filename = f"{format_type}_{claim_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        filepath = os.path.join(file_dir, filename)
        
        with open(filepath, 'w') as f:
            f.write(edi_content)
        
        return filepath

# Singleton instance
edi_service = EDIService()

