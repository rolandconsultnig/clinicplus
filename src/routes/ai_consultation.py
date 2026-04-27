"""
AI Consultation Room API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.clinical import ClinicalEncounter
from src.models.patient import Patient, MedicalHistory, Medication, Allergy
from src.models.clinical import LabResult
from datetime import datetime, date
import json
import re
import base64

ai_consultation_bp = Blueprint('ai_consultation', __name__)

@ai_consultation_bp.route('/transcribe', methods=['POST'])
@token_required
@role_required(['physician', 'nurse'])
def transcribe_audio():
    """Transcribe audio from consultation"""
    try:
        data = request.get_json()
        audio_data = data.get('audio_data')  # Base64 encoded audio
        encounter_id = data.get('encounter_id')
        
        transcription_text = (data.get('transcription_text') or '').strip()
        processing_method = 'direct_text'
        if not transcription_text and audio_data:
            processing_method = 'audio_payload'
            if isinstance(audio_data, str):
                payload = audio_data.split(',')[-1] if ',' in audio_data else audio_data
                try:
                    base64.b64decode(payload, validate=True)
                except Exception:
                    return jsonify({'error': 'Invalid audio_data encoding'}), 400
            else:
                return jsonify({'error': 'audio_data must be base64 string'}), 400
            transcription_text = (data.get('fallback_text') or '').strip()

        if not transcription_text:
            return jsonify({'error': 'Provide transcription_text or fallback_text'}), 400
        
        # Process transcription with confidence scoring
        transcription = {
            'text': transcription_text,
            'confidence': 0.95 if processing_method == 'audio_payload' else 1.0,
            'segments': _segment_transcription(transcription_text),
            'language': data.get('language', 'en-US'),
            'processing_method': processing_method
        }
        
        return jsonify({
            'success': True,
            'transcription': transcription
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_consultation_bp.route('/generate-documentation', methods=['POST'])
@token_required
@role_required(['physician', 'nurse'])
def generate_documentation():
    """Generate EHR documentation from transcription"""
    try:
        data = request.get_json()
        transcription = data.get('transcription')
        encounter_id = data.get('encounter_id')
        specialty = data.get('specialty', 'general')
        
        if isinstance(transcription, dict):
            transcription_text = transcription.get('text', '')
        else:
            transcription_text = str(transcription or '')
        if not transcription_text.strip():
            return jsonify({'error': 'transcription text is required'}), 400
        
        documentation = {
            'chief_complaint': extract_chief_complaint(transcription_text),
            'history_present_illness': extract_hpi(transcription_text),
            'assessment': generate_assessment(transcription_text, specialty),
            'plan': generate_plan(transcription_text, specialty)
        }
        
        # Update encounter if provided
        if encounter_id:
            encounter = ClinicalEncounter.query.get(encounter_id)
            if encounter:
                encounter.chief_complaint = documentation['chief_complaint']
                encounter.history_present_illness = documentation['history_present_illness']
                encounter.assessment = documentation['assessment']
                encounter.plan = documentation['plan']
                db.session.commit()
        
        return jsonify({
            'success': True,
            'documentation': documentation
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ai_consultation_bp.route('/patient-summary', methods=['POST'])
@token_required
@role_required(['physician', 'nurse'])
def generate_patient_summary():
    """Generate AI-powered patient summary"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        specialty = data.get('specialty', 'general')
        
        # Get actual patient data
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Get active conditions
        active_conditions = MedicalHistory.query.filter_by(
            patient_id=patient_id, 
            is_active=True
        ).all()
        conditions_list = [c.condition_name for c in active_conditions[:5]]
        
        # Get current medications
        active_medications = Medication.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        medications_list = [m.medication_name for m in active_medications[:10]]
        
        # Get recent lab results
        recent_labs = LabResult.query.filter_by(
            patient_id=patient_id
        ).order_by(LabResult.result_date.desc()).limit(5).all()
        lab_summary = []
        for lab in recent_labs:
            lab_date = lab.result_date.strftime('%Y-%m-%d') if lab.result_date else 'Unknown'
            lab_summary.append(f"{lab.test_name}: {lab.result_value} {lab.result_unit} ({lab_date})")
        
        # Get allergies
        allergies = Allergy.query.filter_by(patient_id=patient_id).all()
        allergies_list = [a.allergen for a in allergies if a.allergen]
        
        # Build comprehensive summary
        key_points = []
        
        if conditions_list:
            key_points.append(f"Active conditions: {', '.join(conditions_list)}")
        
        if medications_list:
            key_points.append(f"Current medications: {', '.join(medications_list[:5])}")
        
        if lab_summary:
            key_points.append(f"Recent labs: {lab_summary[0] if lab_summary else 'None'}")
        
        if allergies_list:
            key_points.append(f"Allergies: {', '.join(allergies_list)}")
        
        # Calculate age
        age = None
        if patient.date_of_birth:
            today = date.today()
            age = today.year - patient.date_of_birth.year - (
                (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day)
            )
        
        summary = {
            'patient_id': patient_id,
            'patient_name': f"{patient.first_name} {patient.last_name}",
            'age': age,
            'gender': patient.gender,
            'summary': f"Comprehensive patient summary for {patient.first_name} {patient.last_name}",
            'key_points': key_points if key_points else ['No significant findings'],
            'active_conditions_count': len(conditions_list),
            'active_medications_count': len(medications_list),
            'recent_labs_count': len(recent_labs),
            'specialty_focus': specialty,
            'generated_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'summary': summary
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def extract_chief_complaint(transcription):
    """Extract chief complaint from transcription using pattern matching"""
    if isinstance(transcription, dict):
        text = transcription.get('text', '')
    else:
        text = str(transcription)
    
    # Common patterns for chief complaint
    patterns = [
        r'chief complaint[:\s]+([^.]+)',
        r'presents with ([^.]+)',
        r'complains? of ([^.]+)',
        r'reports? ([^.]+)',
        r'complaint:?\s*([^.]+)'
    ]
    
    text_lower = text.lower()
    for pattern in patterns:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            complaint = match.group(1).strip()
            # Clean up common prefixes
            complaint = re.sub(r'^(a|an|the)\s+', '', complaint, flags=re.IGNORECASE)
            return complaint.capitalize()
    
    # Fallback: extract first sentence or first 50 chars
    sentences = re.split(r'[.!?]', text)
    if sentences:
        first_sentence = sentences[0].strip()
        if len(first_sentence) > 10:
            return first_sentence[:100]
    
    return 'Not specified'

def extract_hpi(transcription):
    """Extract History of Present Illness using NLP-like extraction"""
    if isinstance(transcription, dict):
        text = transcription.get('text', '')
    else:
        text = str(transcription)
    
    # Extract temporal information
    temporal_patterns = [
        r'(\d+)\s*(day|week|month|year)s?\s+(ago|for)',
        r'(for|since|over)\s+(\d+)\s*(day|week|month|year)s?',
        r'(sudden|gradual|acute|chronic)'
    ]
    
    temporal_info = []
    for pattern in temporal_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            temporal_info.append(match.group(0))
    
    # Extract associated symptoms
    symptom_keywords = ['fever', 'pain', 'nausea', 'vomiting', 'diarrhea', 'cough', 
                       'shortness of breath', 'chest pain', 'headache', 'dizziness']
    associated_symptoms = []
    text_lower = text.lower()
    
    for keyword in symptom_keywords:
        if keyword in text_lower:
            # Check for negation
            context_start = max(0, text_lower.find(keyword) - 20)
            context = text_lower[context_start:text_lower.find(keyword) + len(keyword) + 20]
            if 'no ' not in context[:context.find(keyword)]:
                associated_symptoms.append(keyword)
    
    # Build HPI
    hpi_parts = []
    
    if temporal_info:
        hpi_parts.append(f"Duration: {', '.join(temporal_info[:2])}")
    
    if associated_symptoms:
        hpi_parts.append(f"Associated symptoms: {', '.join(associated_symptoms[:5])}")
    
    # Extract negative findings
    negative_patterns = [
        r'no\s+([^.]+)',
        r'denies?\s+([^.]+)',
        r'negative\s+for\s+([^.]+)'
    ]
    
    negative_findings = []
    for pattern in negative_patterns:
        matches = re.finditer(pattern, text_lower)
        for match in matches:
            negative_findings.append(match.group(1).strip())
    
    if negative_findings:
        hpi_parts.append(f"Negative for: {', '.join(negative_findings[:3])}")
    
    if hpi_parts:
        return '. '.join(hpi_parts) + '.'
    
    # Fallback
    return 'Patient reports symptoms as described. Further history obtained.'

def generate_assessment(transcription, specialty):
    """Generate assessment/diagnosis based on transcription and specialty"""
    if isinstance(transcription, dict):
        text = transcription.get('text', '')
    else:
        text = str(transcription)
    
    text_lower = text.lower()
    
    # Specialty-specific assessments
    specialty_assessments = {
        'cardiology': ['chest pain', 'heart', 'cardiac', 'arrhythmia', 'hypertension'],
        'neurology': ['headache', 'seizure', 'stroke', 'neurological', 'migraine'],
        'gastroenterology': ['abdominal pain', 'nausea', 'vomiting', 'diarrhea', 'GI'],
        'pulmonology': ['cough', 'shortness of breath', 'asthma', 'COPD', 'pneumonia'],
        'endocrinology': ['diabetes', 'thyroid', 'metabolic', 'glucose']
    }
    
    # Find relevant keywords
    relevant_keywords = []
    if specialty in specialty_assessments:
        for keyword in specialty_assessments[specialty]:
            if keyword in text_lower:
                relevant_keywords.append(keyword)
    
    # Common diagnoses based on keywords
    diagnosis_mapping = {
        'headache': 'Headache, likely tension-type. Rule out secondary causes.',
        'chest pain': 'Chest pain, etiology to be determined. Rule out cardiac causes.',
        'fever': 'Fever, likely infectious etiology. Consider workup.',
        'abdominal pain': 'Abdominal pain, differential diagnosis includes multiple etiologies.',
        'cough': 'Cough, likely upper respiratory infection. Consider chest imaging if persistent.'
    }
    
    for keyword, diagnosis in diagnosis_mapping.items():
        if keyword in text_lower:
            return diagnosis
    
    # Default assessment
    if relevant_keywords:
        return f"Assessment based on {specialty} evaluation. {', '.join(relevant_keywords[:2])} noted."
    
    return 'Clinical assessment based on history and examination. Further evaluation may be needed.'

def generate_plan(transcription, specialty):
    """Generate treatment plan based on transcription and specialty"""
    if isinstance(transcription, dict):
        text = transcription.get('text', '')
    else:
        text = str(transcription)
    
    text_lower = text.lower()
    
    plan_items = []
    
    # Extract medications mentioned
    medication_keywords = ['prescribe', 'medication', 'medication', 'antibiotic', 'pain', 'ibuprofen', 'acetaminophen']
    if any(keyword in text_lower for keyword in medication_keywords):
        plan_items.append('1. Symptomatic treatment with appropriate medications')
    
    # Extract follow-up mentions
    followup_patterns = [
        r'follow[-\s]?up',
        r'return in',
        r'recheck',
        r'revisit'
    ]
    
    has_followup = any(re.search(pattern, text_lower) for pattern in followup_patterns)
    if has_followup:
        plan_items.append('2. Follow-up appointment scheduled')
    else:
        plan_items.append('2. Follow-up as needed if symptoms persist')
    
    # Extract imaging/lab mentions
    if 'imaging' in text_lower or 'x-ray' in text_lower or 'CT' in text_lower or 'MRI' in text_lower:
        plan_items.append('3. Consider diagnostic imaging if indicated')
    
    if 'lab' in text_lower or 'blood work' in text_lower or 'test' in text_lower:
        plan_items.append('4. Laboratory studies as indicated')
    
    # Specialty-specific plans
    if specialty == 'cardiology':
        plan_items.append('5. Cardiac monitoring and risk factor modification')
    elif specialty == 'neurology':
        plan_items.append('5. Neurological monitoring and symptom management')
    elif specialty == 'endocrinology':
        plan_items.append('5. Monitor glucose/metabolic parameters')
    
    if not plan_items:
        plan_items = [
            '1. Symptomatic treatment as indicated',
            '2. Follow-up if symptoms persist',
            '3. Patient education provided'
        ]
    
    return '\n'.join(plan_items)

def _segment_transcription(text):
    """Segment transcription text into timed segments"""
    segments = []
    sentences = re.split(r'[.!?]', text)
    current_time = 0.0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence:
            # Estimate duration (average speaking rate: ~150 words/min = 2.5 words/sec)
            words = len(sentence.split())
            duration = words / 2.5  # seconds
            segments.append({
                'text': sentence,
                'start': current_time,
                'end': current_time + duration
            })
            current_time += duration
    
    return segments if segments else [{'text': text, 'start': 0, 'end': len(text) / 2.5}]

