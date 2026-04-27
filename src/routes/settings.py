"""
System Settings Routes for Clinic+
Manages system-wide configuration and settings
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
import json

settings_bp = Blueprint('settings', __name__)


def _extract_user_roles():
    roles = request.token_payload.get('roles', [])
    extracted = []
    for role in roles:
        if isinstance(role, dict):
            extracted.append(str(role.get('role_name', '')).lower())
        else:
            extracted.append(str(role).lower())
    return [r for r in extracted if r]


def _is_admin_user():
    user_type = str(request.token_payload.get('user_type', '')).lower()
    admin_roles = {'system administrator', 'admin', 'administrator', 'facility administrator'}
    user_roles = set(_extract_user_roles())
    return user_type == 'admin' or not user_roles.isdisjoint(admin_roles)

# Comprehensive timezone list
TIMEZONES = [
    {'value': 'UTC', 'label': 'UTC (Coordinated Universal Time)', 'offset': '+00:00'},
    {'value': 'America/New_York', 'label': 'Eastern Time (US & Canada)', 'offset': '-05:00'},
    {'value': 'America/Chicago', 'label': 'Central Time (US & Canada)', 'offset': '-06:00'},
    {'value': 'America/Denver', 'label': 'Mountain Time (US & Canada)', 'offset': '-07:00'},
    {'value': 'America/Phoenix', 'label': 'Arizona', 'offset': '-07:00'},
    {'value': 'America/Los_Angeles', 'label': 'Pacific Time (US & Canada)', 'offset': '-08:00'},
    {'value': 'America/Anchorage', 'label': 'Alaska', 'offset': '-09:00'},
    {'value': 'America/Honolulu', 'label': 'Hawaii', 'offset': '-10:00'},
    {'value': 'America/Toronto', 'label': 'Toronto', 'offset': '-05:00'},
    {'value': 'America/Vancouver', 'label': 'Vancouver', 'offset': '-08:00'},
    {'value': 'America/Mexico_City', 'label': 'Mexico City', 'offset': '-06:00'},
    {'value': 'America/Monterrey', 'label': 'Monterrey', 'offset': '-06:00'},
    {'value': 'America/Guatemala', 'label': 'Guatemala', 'offset': '-06:00'},
    {'value': 'America/Bogota', 'label': 'Bogota', 'offset': '-05:00'},
    {'value': 'America/Lima', 'label': 'Lima', 'offset': '-05:00'},
    {'value': 'America/Caracas', 'label': 'Caracas', 'offset': '-04:00'},
    {'value': 'America/Santiago', 'label': 'Santiago', 'offset': '-03:00'},
    {'value': 'America/Buenos_Aires', 'label': 'Buenos Aires', 'offset': '-03:00'},
    {'value': 'America/Sao_Paulo', 'label': 'Sao Paulo', 'offset': '-03:00'},
    {'value': 'Europe/London', 'label': 'London', 'offset': '+00:00'},
    {'value': 'Europe/Dublin', 'label': 'Dublin', 'offset': '+00:00'},
    {'value': 'Europe/Paris', 'label': 'Paris', 'offset': '+01:00'},
    {'value': 'Europe/Berlin', 'label': 'Berlin', 'offset': '+01:00'},
    {'value': 'Europe/Rome', 'label': 'Rome', 'offset': '+01:00'},
    {'value': 'Europe/Madrid', 'label': 'Madrid', 'offset': '+01:00'},
    {'value': 'Europe/Amsterdam', 'label': 'Amsterdam', 'offset': '+01:00'},
    {'value': 'Europe/Brussels', 'label': 'Brussels', 'offset': '+01:00'},
    {'value': 'Europe/Vienna', 'label': 'Vienna', 'offset': '+01:00'},
    {'value': 'Europe/Zurich', 'label': 'Zurich', 'offset': '+01:00'},
    {'value': 'Europe/Stockholm', 'label': 'Stockholm', 'offset': '+01:00'},
    {'value': 'Europe/Oslo', 'label': 'Oslo', 'offset': '+01:00'},
    {'value': 'Europe/Copenhagen', 'label': 'Copenhagen', 'offset': '+01:00'},
    {'value': 'Europe/Helsinki', 'label': 'Helsinki', 'offset': '+02:00'},
    {'value': 'Europe/Warsaw', 'label': 'Warsaw', 'offset': '+01:00'},
    {'value': 'Europe/Prague', 'label': 'Prague', 'offset': '+01:00'},
    {'value': 'Europe/Budapest', 'label': 'Budapest', 'offset': '+01:00'},
    {'value': 'Europe/Bucharest', 'label': 'Bucharest', 'offset': '+02:00'},
    {'value': 'Europe/Athens', 'label': 'Athens', 'offset': '+02:00'},
    {'value': 'Europe/Istanbul', 'label': 'Istanbul', 'offset': '+03:00'},
    {'value': 'Europe/Moscow', 'label': 'Moscow', 'offset': '+03:00'},
    {'value': 'Europe/Kiev', 'label': 'Kiev', 'offset': '+02:00'},
    {'value': 'Europe/Lisbon', 'label': 'Lisbon', 'offset': '+00:00'},
    {'value': 'Asia/Dubai', 'label': 'Dubai', 'offset': '+04:00'},
    {'value': 'Asia/Karachi', 'label': 'Karachi', 'offset': '+05:00'},
    {'value': 'Asia/Kolkata', 'label': 'Mumbai, New Delhi', 'offset': '+05:30'},
    {'value': 'Asia/Dhaka', 'label': 'Dhaka', 'offset': '+06:00'},
    {'value': 'Asia/Bangkok', 'label': 'Bangkok', 'offset': '+07:00'},
    {'value': 'Asia/Singapore', 'label': 'Singapore', 'offset': '+08:00'},
    {'value': 'Asia/Hong_Kong', 'label': 'Hong Kong', 'offset': '+08:00'},
    {'value': 'Asia/Shanghai', 'label': 'Beijing, Shanghai', 'offset': '+08:00'},
    {'value': 'Asia/Taipei', 'label': 'Taipei', 'offset': '+08:00'},
    {'value': 'Asia/Tokyo', 'label': 'Tokyo', 'offset': '+09:00'},
    {'value': 'Asia/Seoul', 'label': 'Seoul', 'offset': '+09:00'},
    {'value': 'Asia/Manila', 'label': 'Manila', 'offset': '+08:00'},
    {'value': 'Asia/Jakarta', 'label': 'Jakarta', 'offset': '+07:00'},
    {'value': 'Asia/Kuala_Lumpur', 'label': 'Kuala Lumpur', 'offset': '+08:00'},
    {'value': 'Asia/Ho_Chi_Minh', 'label': 'Ho Chi Minh', 'offset': '+07:00'},
    {'value': 'Asia/Riyadh', 'label': 'Riyadh', 'offset': '+03:00'},
    {'value': 'Asia/Jerusalem', 'label': 'Jerusalem', 'offset': '+02:00'},
    {'value': 'Asia/Baghdad', 'label': 'Baghdad', 'offset': '+03:00'},
    {'value': 'Asia/Tehran', 'label': 'Tehran', 'offset': '+03:30'},
    {'value': 'Asia/Kabul', 'label': 'Kabul', 'offset': '+04:30'},
    {'value': 'Africa/Cairo', 'label': 'Cairo', 'offset': '+02:00'},
    {'value': 'Africa/Johannesburg', 'label': 'Johannesburg', 'offset': '+02:00'},
    {'value': 'Africa/Lagos', 'label': 'Lagos', 'offset': '+01:00'},
    {'value': 'Africa/Nairobi', 'label': 'Nairobi', 'offset': '+03:00'},
    {'value': 'Africa/Casablanca', 'label': 'Casablanca', 'offset': '+01:00'},
    {'value': 'Australia/Sydney', 'label': 'Sydney', 'offset': '+10:00'},
    {'value': 'Australia/Melbourne', 'label': 'Melbourne', 'offset': '+10:00'},
    {'value': 'Australia/Brisbane', 'label': 'Brisbane', 'offset': '+10:00'},
    {'value': 'Australia/Perth', 'label': 'Perth', 'offset': '+08:00'},
    {'value': 'Australia/Adelaide', 'label': 'Adelaide', 'offset': '+09:30'},
    {'value': 'Australia/Darwin', 'label': 'Darwin', 'offset': '+09:30'},
    {'value': 'Australia/Hobart', 'label': 'Hobart', 'offset': '+10:00'},
    {'value': 'Pacific/Auckland', 'label': 'Auckland', 'offset': '+12:00'},
    {'value': 'Pacific/Fiji', 'label': 'Fiji', 'offset': '+12:00'},
    {'value': 'Pacific/Guam', 'label': 'Guam', 'offset': '+10:00'},
    {'value': 'Pacific/Honolulu', 'label': 'Honolulu', 'offset': '-10:00'},
    {'value': 'Pacific/Samoa', 'label': 'Samoa', 'offset': '+13:00'},
    {'value': 'Atlantic/Azores', 'label': 'Azores', 'offset': '-01:00'},
    {'value': 'Atlantic/Cape_Verde', 'label': 'Cape Verde', 'offset': '-01:00'},
    {'value': 'Atlantic/Bermuda', 'label': 'Bermuda', 'offset': '-04:00'},
    {'value': 'Atlantic/Canary', 'label': 'Canary Islands', 'offset': '+00:00'},
    {'value': 'Atlantic/Reykjavik', 'label': 'Reykjavik', 'offset': '+00:00'},
    {'value': 'Indian/Mauritius', 'label': 'Mauritius', 'offset': '+04:00'},
    {'value': 'Indian/Maldives', 'label': 'Maldives', 'offset': '+05:00'},
    {'value': 'Indian/Colombo', 'label': 'Colombo', 'offset': '+05:30'},
    {'value': 'Asia/Kathmandu', 'label': 'Kathmandu', 'offset': '+05:45'},
    {'value': 'Asia/Yangon', 'label': 'Yangon', 'offset': '+06:30'},
]

# In-memory settings store (in production, use database or config file)
SYSTEM_SETTINGS = {
    'general': {
        'app_name': 'Clinic+',
        'app_version': '1.0.0',
        'timezone': 'UTC',
        'date_format': 'YYYY-MM-DD',
        'time_format': '24h',
        'language': 'en',
        'default_language': 'en',
        'supported_languages': ['en', 'es', 'fr', 'de', 'zh', 'ar'],
        'supported_countries': [
            'Nigeria', 'United States', 'United Kingdom', 'Canada', 'Ghana', 
            'South Africa', 'Kenya', 'India', 'China', 'Germany', 'France', 
            'Australia', 'United Arab Emirates', 'Saudi Arabia', 'Brazil', 
            'Russia', 'Japan', 'South Korea', 'Singapore', 'Malaysia', 
            'Egypt', 'Rwanda', 'Ethiopia', 'Uganda', 'Tanzania'
        ],
        'maintenance_mode': False,
        'maintenance_message': 'System is under maintenance. Please check back later.',
        'max_file_upload_size_mb': 10,
        'allowed_file_types': ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        'session_timeout_warning_minutes': 5,
        'enable_audit_logging': True,
        'enable_analytics': True,
        'support_email': 'support@clinicplus.com',
        'support_phone': '+1-800-CLINIC',
        'organization_name': 'Clinic+',
        'organization_address': '',
        'organization_website': 'https://clinicplus.com'
    },
    'security': {
        'password_min_length': 8,
        'password_max_length': 128,
        'password_require_uppercase': True,
        'password_require_lowercase': True,
        'password_require_numbers': True,
        'password_require_special': True,
        'password_expiry_days': 90,
        'password_history_count': 5,
        'session_timeout_minutes': 30,
        'session_idle_timeout_minutes': 15,
        'max_login_attempts': 5,
        'lockout_duration_minutes': 15,
        'require_mfa': False,
        'mfa_method': 'email',  # email, sms, app
        'mfa_required_for_admin': True,
        'mfa_required_for_providers': False,
        'enable_device_fingerprinting': True,
        'enable_ip_whitelist': False,
        'allowed_ip_addresses': [],
        'enable_ssl': True,
        'enable_encryption_at_rest': True,
        'enable_encryption_in_transit': True,
        'audit_log_retention_days': 365,
        'enable_account_lockout': True,
        'enable_password_complexity': True,
        'enable_session_management': True,
        'enable_secure_cookies': True,
        'cookie_secure_flag': True,
        'cookie_http_only': True,
        'enable_csrf_protection': True,
        'enable_rate_limiting': True,
        'rate_limit_per_minute': 60
    },
    'notifications': {
        'email_enabled': True,
        'email_provider': 'smtp',  # smtp, sendgrid, ses
        'smtp_host': '',
        'smtp_port': 587,
        'smtp_username': '',
        'smtp_password': '',
        'smtp_use_tls': True,
        'email_from_address': 'noreply@clinicplus.com',
        'email_from_name': 'Clinic+',
        'sms_enabled': True,
        'sms_provider': 'twilio',  # twilio, aws_sns
        'twilio_account_sid': '',
        'twilio_auth_token': '',
        'twilio_phone_number': '',
        'push_enabled': False,
        'push_provider': 'firebase',  # firebase, onesignal
        'firebase_server_key': '',
        'appointment_reminder_hours': 24,
        'appointment_reminder_enabled': True,
        'lab_result_notification': True,
        'lab_result_notification_immediate': True,
        'prescription_ready_notification': True,
        'billing_statement_notification': True,
        'billing_payment_reminder_days': 7,
        'patient_portal_notifications': True,
        'provider_notifications': True,
        'admin_notifications': True,
        'notification_retry_attempts': 3,
        'notification_queue_enabled': True,
        'enable_notification_logging': True
    },
    'billing': {
        'currency': 'NGN',  # Primary currency
        'currency_symbol': '₦',
        'supported_currencies': ['NGN', 'USD', 'EUR', 'RUB', 'GBP'],  # Multi-currency support
        'currency_symbols': {
            'NGN': '₦',
            'USD': '$',
            'EUR': '€',
            'RUB': '₽',
            'GBP': '£'
        },
        'tax_rate': 0.0,
        'tax_enabled': False,
        'tax_inclusive': False,
        'payment_gateway': 'paystack',  # paystack, stripe, flutterwave
        'paystack_public_key': '',
        'paystack_secret_key': '',
        'stripe_public_key': '',
        'stripe_secret_key': '',
        'flutterwave_public_key': '',
        'flutterwave_secret_key': '',
        'auto_generate_statements': True,
        'statement_due_days': 30,
        'statement_generation_day': 1,  # Day of month
        'enable_payment_plans': True,
        'enable_insurance_claims': True,
        'enable_edi_claims': True,
        'edi_claim_format': '837P',  # 837P, HCFA1500
        'enable_automatic_payment_retry': True,
        'payment_retry_attempts': 3,
        'payment_retry_interval_days': 7,
        'enable_discounts': True,
        'max_discount_percentage': 50,
        'enable_payment_reminders': True,
        'payment_reminder_days_before': [7, 3, 1],
        'enable_receipt_generation': True,
        'receipt_template': 'default',
        'enable_invoice_numbering': True,
        'invoice_prefix': 'INV-',
        'enable_credit_notes': True,
        'enable_refunds': True,
        'refund_approval_required': True,
        'enable_fee_schedules': True,
        'default_fee_schedule': 'standard',
        'enable_cpt_coding': True,
        'enable_icd10_coding': True,
        'enable_hcpcs_coding': True
    },
    'clinical': {
        'default_encounter_type': 'office_visit',
        'encounter_types': ['office_visit', 'telehealth', 'emergency', 'inpatient', 'outpatient'],
        'require_vital_signs': False,
        'vital_signs_required': ['blood_pressure', 'temperature', 'heart_rate'],
        'auto_save_notes': True,
        'auto_save_interval_seconds': 30,
        'cds_enabled': True,
        'cds_alert_level': 'warning',  # info, warning, critical
        'drug_interaction_check': True,
        'drug_interaction_severity': 'moderate',  # minor, moderate, major, contraindicated
        'allergy_check_enabled': True,
        'enable_clinical_notes_templates': True,
        'enable_soap_notes': True,
        'enable_progress_notes': True,
        'enable_discharge_summaries': True,
        'require_provider_signature': True,
        'enable_electronic_signatures': True,
        'signature_expiry_days': 90,
        'enable_lab_orders': True,
        'enable_radiology_orders': True,
        'enable_prescription_management': True,
        'prescription_expiry_days': 365,
        'enable_medication_reconciliation': True,
        'enable_care_plans': True,
        'enable_problem_lists': True,
        'enable_allergy_tracking': True,
        'enable_immunization_tracking': True,
        'enable_family_history': True,
        'enable_social_history': True,
        'enable_risk_assessments': True,
        'enable_clinical_quality_measures': True,
        'enable_meaningful_use_tracking': True,
        'enable_clinical_documentation_improvement': True,
        'enable_telehealth': True,
        'telehealth_provider': 'zoom',  # zoom, teams, custom
        'enable_remote_patient_monitoring': True,
        'rpm_alert_thresholds': {
            'blood_pressure_high': 140,
            'blood_pressure_low': 90,
            'heart_rate_high': 100,
            'heart_rate_low': 60,
            'temperature_high': 38.5,
            'spo2_low': 95
        }
    },
    'integration': {
        'hl7_enabled': True,
        'hl7_version': '2.5',
        'hl7_message_types': ['ADT', 'ORM', 'ORU', 'MDM'],
        'hl7_endpoint': '/api/labs/hl7',
        'hl7_authentication_required': True,
        'fhir_enabled': True,
        'fhir_version': 'R4',
        'fhir_base_url': '/fhir',
        'fhir_resources_enabled': ['Patient', 'Encounter', 'Observation', 'MedicationRequest', 'Condition'],
        'fhir_authentication_required': True,
        'fhir_smart_on_fhir': True,
        'edi_enabled': True,
        'edi_claim_format': '837P',
        'edi_remittance_format': '835',
        'edi_eligibility_format': '270/271',
        'edi_authentication_required': True,
        'api_rate_limit': 1000,
        'api_rate_limit_per_user': 100,
        'api_rate_limit_window_minutes': 60,
        'enable_api_key_authentication': True,
        'enable_webhook_support': True,
        'webhook_secret': '',
        'enable_third_party_integrations': True,
        'integrations': {
            'lab_interface': False,
            'pharmacy_interface': False,
            'imaging_interface': False,
            'insurance_verification': False,
            'credit_bureau': False,
            'identity_verification': False
        },
        'lab_interface_provider': '',  # quest, labcorp, custom
        'pharmacy_interface_provider': '',  # surecripts, custom
        'imaging_interface_provider': '',  # dicom, custom
        'enable_data_export': True,
        'export_formats': ['csv', 'json', 'xml', 'fhir'],
        'enable_data_import': True,
        'import_formats': ['csv', 'json', 'xml', 'hl7', 'fhir'],
        'enable_backup': True,
        'backup_frequency': 'daily',  # daily, weekly, monthly
        'backup_retention_days': 30,
        'enable_audit_trail': True,
        'audit_trail_retention_days': 365
    },
    'patient_portal': {
        'allow_registration': True,
        'require_email_verification': True,
        'allow_document_upload': True,
        'allow_message_sending': True,
        'allow_appointment_booking': True,
        'allow_prescription_refills': True,
        'allow_lab_result_viewing': True,
        'allow_billing_access': True,
        'allow_health_metrics_tracking': True,
        'enable_two_factor_auth': False,
        'session_timeout_minutes': 30,
        'max_file_upload_size_mb': 10,
        'allowed_file_types': ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
    },
    'appearance': {
        'theme': 'MediTrust',  # MediTrust, Clinic, MediLab-1.0.0, MediNest
        'primary_color': '#049ebb',
        'secondary_color': '#18444c',
        'accent_color': '#049ebb',
        'font_family': 'Roboto',
        'heading_font': 'Raleway',
        'enable_dark_mode': False,
        'logo_path': '/images/logo.png',
        'favicon_path': '/images/clinicplus-favicon-32.png',
        'custom_css': '',
        'enable_custom_colors': False
    },
    'landing_page': {
        # Hero (defaults mirror src/config/landingPageDefaults.js)
        'hero_title': 'Advanced Medical Care for Your Family\'s Health',
        'hero_subtitle': 'Universal Patient-Owned Health Ecosystem',
        'hero_description': (
            'Clinic+ is a comprehensive, patient-centered healthcare platform that puts you in control of '
            'your medical records while connecting you with trusted healthcare providers. From registration '
            'and scheduling to labs, imaging, and billing, your information stays organized, secure, and ready '
            'when you need it.'
        ),
        'hero_image': '/themes/MediTrust/assets/img/health/showcase-1.webp',
        'hero_primary_button_text': 'Get Started',
        'hero_primary_button_link': '/login',
        'hero_secondary_button_text': 'Explore Services',
        'hero_secondary_button_link': '/services',
        'badge_1_icon': 'bi-shield-check-fill',
        'badge_1_title': 'HIPAA Compliant',
        'badge_1_subtitle': (
            'Secure & Private — role-based access, encryption in transit, audit-friendly activity, and consent '
            'workflows aligned with how regulated organizations expect to operate.'
        ),
        'badge_2_icon': 'bi-telephone-fill',
        'badge_2_title': 'Emergency Line',
        'badge_2_subtitle': (
            '24/7 Support Available — after-hours escalation paths for urgent clinical or access issues so your '
            'facility is never without a lifeline when minutes matter.'
        ),
        'badge_3_icon': 'bi-star-fill',
        'badge_3_title': 'Patient-Centered',
        'badge_3_subtitle': (
            'Designed around the care journey — clear timelines, transparent billing touchpoints, and tools that '
            'keep patients, families, and care teams aligned.'
        ),
        'feature_1_icon': 'bi-heart-pulse-fill',
        'feature_1_title': 'Patient Records',
        'feature_1_description': (
            'Own and control your complete medical history with secure, encrypted storage. View allergies, '
            'medications, immunizations, visit summaries, and documents in one place; share what you choose with '
            'new providers without repeating your story from scratch.'
        ),
        'feature_2_icon': 'bi-calendar-check-fill',
        'feature_2_title': 'Appointments',
        'feature_2_description': (
            'Schedule and manage appointments with healthcare providers seamlessly. See real-time availability, '
            'receive reminders, reschedule when plans change, and keep OPD, telehealth, and follow-up visits '
            'organized from a single calendar-aware workflow.'
        ),
        'feature_3_icon': 'bi-capsule',
        'feature_3_title': 'ePrescribing',
        'feature_3_description': (
            'Digital prescriptions with drug interaction checks and pharmacy integration. Reduce handwriting '
            'errors, support renewals and substitutions where policy allows, and give patients a clearer path from '
            'diagnosis to dispense.'
        ),
        'about_title': 'Why Choose Clinic+?',
        'about_description': (
            'Complete control over your medical records with enterprise-grade security and seamless healthcare '
            'provider integration — so you spend less time on paperwork and more time on care.'
        ),
        'about_image': '/themes/MediTrust/assets/img/health/facilities-1.webp',
        'meta_title': 'Clinic+ - Advanced Healthcare Management Platform',
        'meta_description': 'Comprehensive healthcare platform with patient-centered design',
        'meta_keywords': 'healthcare, medical records, patient portal, clinic management'
    }
}

@settings_bp.route('/settings', methods=['GET'])
@token_required
def get_settings():
    """Get all system settings"""
    try:
        if not _is_admin_user():
            return jsonify({'error': 'Insufficient permissions', 'message': 'You do not have permission to access system settings'}), 403
        
        category = request.args.get('category')
        
        if category and category in SYSTEM_SETTINGS:
            return jsonify({
                'success': True,
                'category': category,
                'settings': SYSTEM_SETTINGS[category]
            }), 200
        
        return jsonify({
            'success': True,
            'settings': SYSTEM_SETTINGS
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/landing-page', methods=['GET'])
def get_landing_page_content():
    """Get landing page content (public endpoint, no auth required)"""
    try:
        landing_page_content = SYSTEM_SETTINGS.get('landing_page', {})
        return jsonify({
            'success': True,
            'content': landing_page_content
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/<category>', methods=['GET'])
@token_required
def get_category_settings(category):
    """Get settings for a specific category"""
    try:
        # Appearance theme data is safe for any authenticated user.
        if category != 'appearance' and not _is_admin_user():
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        if category not in SYSTEM_SETTINGS:
            return jsonify({'error': f'Category {category} not found'}), 404
        
        return jsonify({
            'success': True,
            'category': category,
            'settings': SYSTEM_SETTINGS[category]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/<category>', methods=['PUT'])
@token_required
def update_category_settings(category):
    """Update settings for a specific category"""
    try:
        if category not in SYSTEM_SETTINGS:
            return jsonify({'error': f'Category {category} not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        is_admin = _is_admin_user()
        if not is_admin:
            # Non-admin users can only update their theme preference.
            if category != 'appearance':
                return jsonify({'error': 'Insufficient permissions'}), 403
            allowed_keys = {'theme'}
            disallowed = [k for k in data.keys() if k not in allowed_keys]
            if disallowed:
                return jsonify({'error': f'Non-admin can only update: {", ".join(sorted(allowed_keys))}'}), 403
        
        # Update settings
        SYSTEM_SETTINGS[category].update(data)
        
        return jsonify({
            'success': True,
            'category': category,
            'settings': SYSTEM_SETTINGS[category],
            'message': 'Settings updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/settings/<category>/<key>', methods=['PUT'])
@token_required
def update_setting(category, key):
    """Update a specific setting"""
    try:
        is_admin = _is_admin_user()
        if not is_admin:
            # Allow users to persist only the appearance theme setting.
            if not (category == 'appearance' and key == 'theme'):
                return jsonify({'error': 'Insufficient permissions'}), 403
        
        if category not in SYSTEM_SETTINGS:
            return jsonify({'error': f'Category {category} not found'}), 404
        
        if key not in SYSTEM_SETTINGS[category]:
            return jsonify({'error': f'Setting {key} not found in category {category}'}), 404
        
        data = request.get_json()
        if not data or 'value' not in data:
            return jsonify({'error': 'Value not provided'}), 400

        if not is_admin and category == 'appearance' and key == 'theme':
            allowed_themes = {'MediTrust', 'Clinic', 'MediLab-1.0.0', 'MediNest'}
            if str(data['value']) not in allowed_themes:
                return jsonify({'error': 'Invalid theme value'}), 400
        
        # Update setting
        SYSTEM_SETTINGS[category][key] = data['value']
        
        return jsonify({
            'success': True,
            'category': category,
            'key': key,
            'value': SYSTEM_SETTINGS[category][key],
            'message': 'Setting updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/timezones', methods=['GET'])
def list_timezones():
    """Get list of all available timezones (public endpoint)"""
    try:
        return jsonify({
            'success': True,
            'timezones': TIMEZONES,
            'total': len(TIMEZONES)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

