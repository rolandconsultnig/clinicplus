import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from src.models.user import db
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.provider import Provider, Facility, ProviderFacility
from src.models.clinical import ClinicalEncounter, VitalSigns, ClinicalNote, LabOrder, LabResult
from src.models.auth import UserAccount, Role, Permission, UserRole, RolePermission, PatientDataAccess, AuditLog
from src.models.notification_preferences import NotificationPreferences
from src.models.organization import Organization, OperationalProcess, OrganizationApproval, OrganizationHierarchy
from src.models.insurance_company import InsuranceCompany
from src.routes.user import user_bp
from src.routes.patient import patient_bp
from src.routes.provider import provider_bp
from src.routes.clinical import clinical_bp
from src.routes.auth import auth_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'medical_app_secret_key_change_in_production'

# Enable CORS for all routes with proper preflight handling
# Allow both development and production origins
allowed_origins = [
    "http://localhost:5173", 
    "http://localhost:5174", 
    "http://localhost:3000",
    "https://charming-otter-6124d0.netlify.app"
]

# Add Railway URL if available
railway_url = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
if railway_url:
    allowed_origins.append(f"https://{railway_url}")

CORS(app, 
     origins=allowed_origins,
     methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Origin"],
     supports_credentials=True,
     expose_headers=["Content-Type", "Authorization"],
     automatic_options=True,
     max_age=3600)

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(patient_bp, url_prefix='/api')
app.register_blueprint(provider_bp, url_prefix='/api')
app.register_blueprint(clinical_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')

# Import and register JWT authentication blueprint
from src.routes.auth_jwt import auth_jwt_bp
app.register_blueprint(auth_jwt_bp, url_prefix='/api/auth/jwt')

# Import and register secure patient data routes
from src.routes.patient_secure import patient_secure_bp
app.register_blueprint(patient_secure_bp, url_prefix='/api/secure/patients')

# Import and register medical data routes
from src.routes.medical_data import medical_data_bp
app.register_blueprint(medical_data_bp, url_prefix='/api/secure/medical')

# Import and register provider workflows routes
from src.routes.provider_workflows import provider_workflows_bp
app.register_blueprint(provider_workflows_bp, url_prefix='/api/provider-workflows')

# Import and register Clinic+ comprehensive module routes
from src.routes.scheduling import scheduling_bp
app.register_blueprint(scheduling_bp, url_prefix='/api/scheduling')

from src.routes.billing import billing_bp
app.register_blueprint(billing_bp, url_prefix='/api/billing')

from src.routes.prescribing import prescribing_bp
app.register_blueprint(prescribing_bp, url_prefix='/api/prescribing')

from src.routes.pharmacy import pharmacy_bp
app.register_blueprint(pharmacy_bp, url_prefix='/api/pharmacy')

from src.routes.insurance import insurance_bp
app.register_blueprint(insurance_bp, url_prefix='/api/insurance')

from src.routes.professional import professional_bp
app.register_blueprint(professional_bp, url_prefix='/api/professional')

from src.routes.rpm import rpm_bp
app.register_blueprint(rpm_bp, url_prefix='/api/rpm')

from src.routes.emergency import emergency_bp
app.register_blueprint(emergency_bp, url_prefix='/api/emergency')

# Import and register remaining modules
from src.routes.cds import cds_bp
app.register_blueprint(cds_bp, url_prefix='/api/cds')

from src.routes.fhir import fhir_bp
app.register_blueprint(fhir_bp, url_prefix='')

from src.routes.ai_consultation import ai_consultation_bp
app.register_blueprint(ai_consultation_bp, url_prefix='/api/ai')

from src.routes.payments import payments_bp
app.register_blueprint(payments_bp, url_prefix='/api/payments')

from src.routes.health import health_bp
app.register_blueprint(health_bp, url_prefix='/api')

from src.routes.labs_hl7 import labs_hl7_bp
app.register_blueprint(labs_hl7_bp, url_prefix='/api/labs')

# Import and register EPCS routes
from src.routes.epcs import epcs_bp
app.register_blueprint(epcs_bp, url_prefix='/api/epcs')

# Import and register CQM routes
from src.routes.cqm import cqm_bp
app.register_blueprint(cqm_bp, url_prefix='/api/cqm')

# Import and register ONC Certification routes
from src.routes.onc_certification import onc_bp
app.register_blueprint(onc_bp, url_prefix='/api/onc')

# Import and register GDPR Compliance routes
from src.routes.gdpr import gdpr_bp
app.register_blueprint(gdpr_bp, url_prefix='/api/gdpr')

# Import and register SMART on FHIR routes
from src.routes.smart_fhir import smart_bp
app.register_blueprint(smart_bp, url_prefix='')

# Import and register HL7 v2.x routes
from src.routes.hl7_v2 import hl7_v2_bp
app.register_blueprint(hl7_v2_bp, url_prefix='/api/hl7')

from src.routes.laboratory import laboratory_bp
app.register_blueprint(laboratory_bp, url_prefix='/api/labs')

from src.routes.pharmacy_inventory import pharmacy_inventory_bp
app.register_blueprint(pharmacy_inventory_bp, url_prefix='/api/pharmacy')

from src.routes.seed_users import seed_bp
app.register_blueprint(seed_bp, url_prefix='/api/dev')

from src.routes.data_import_export import data_import_export_bp
app.register_blueprint(data_import_export_bp, url_prefix='/api/data')

# Import and register organization management routes
from src.routes.organization import organization_bp
app.register_blueprint(organization_bp, url_prefix='/api/organization')

# Import and register admin dashboard routes
from src.routes.admin_dashboard import admin_dashboard_bp
app.register_blueprint(admin_dashboard_bp, url_prefix='/api/admin')

# Import and register audit and settings routes
from src.routes.audit import audit_bp
app.register_blueprint(audit_bp, url_prefix='/api')

from src.routes.settings import settings_bp
app.register_blueprint(settings_bp, url_prefix='/api')

# Import and register SOAP Notes routes
from src.routes.soap_notes import soap_bp
app.register_blueprint(soap_bp, url_prefix='/api')

# Import and register Physical Exam routes
from src.routes.physical_exam import physical_exam_bp
app.register_blueprint(physical_exam_bp, url_prefix='/api')

# Import and register Review of Systems routes
from src.routes.review_of_systems import ros_bp
app.register_blueprint(ros_bp, url_prefix='/api')

# Import and register Clinical Reminders routes
from src.routes.clinical_reminders import reminders_bp
app.register_blueprint(reminders_bp, url_prefix='/api')

# Import and register Document Management routes
from src.routes.documents import documents_bp
app.register_blueprint(documents_bp, url_prefix='/api')

# Import and register Messaging routes
from src.routes.messaging import messaging_bp
app.register_blueprint(messaging_bp, url_prefix='/api')

# Import and register Patient Portal routes
from src.routes.patient_portal import portal_bp
app.register_blueprint(portal_bp, url_prefix='/api')

# Payments routes already registered above (line 92-93)

# Import and register Billing Tracker routes
from src.routes.billing_tracker import billing_tracker_bp
app.register_blueprint(billing_tracker_bp, url_prefix='/api')

# Import and register ERA routes
from src.routes.era import era_bp
app.register_blueprint(era_bp, url_prefix='/api')

# Import and register UB-04 routes
from src.routes.ub04 import ub04_bp
app.register_blueprint(ub04_bp, url_prefix='/api')

# Import and register Care Plans routes
from src.routes.care_plans import care_plans_bp
app.register_blueprint(care_plans_bp, url_prefix='/api')

# Import and register Treatment Plans routes
from src.routes.treatment_plans import treatment_plans_bp
app.register_blueprint(treatment_plans_bp, url_prefix='/api')

# Import and register profile management routes
from src.routes.profile import profile_bp
app.register_blueprint(profile_bp, url_prefix='/api')

# Import and register health data routes
from src.routes.health_data import health_data_bp
app.register_blueprint(health_data_bp, url_prefix='/api')

# Import and register OPD workflow routes
from src.routes.opd import opd_bp
app.register_blueprint(opd_bp, url_prefix='/api/opd')

# Import and register Receptionist routes
from src.routes.receptionist import receptionist_bp
app.register_blueprint(receptionist_bp, url_prefix='/api/receptionist')

# Import and register Doctor Consultation routes
from src.routes.doctor_consultation import doctor_bp
app.register_blueprint(doctor_bp, url_prefix='/api/doctor')

# Import and register OTP authorization routes
from src.routes.otp import otp_bp
app.register_blueprint(otp_bp, url_prefix='/api/otp')

from src.routes.patient_file import patient_file_bp
app.register_blueprint(patient_file_bp, url_prefix='/api/patient-file')

from src.routes.clinical_forms import clinical_forms_bp
app.register_blueprint(clinical_forms_bp, url_prefix='/api/clinical-forms')

from src.routes.encounter_management import encounter_mgmt_bp
app.register_blueprint(encounter_mgmt_bp, url_prefix='/api/encounter')

from src.routes.patient_flow_board import flow_board_bp
app.register_blueprint(flow_board_bp, url_prefix='/api/flow-board')

from src.routes.billing_management import billing_mgmt_bp
app.register_blueprint(billing_mgmt_bp, url_prefix='/api/billing-mgmt')

from src.routes.lab_management import lab_mgmt_bp
app.register_blueprint(lab_mgmt_bp, url_prefix='/api/lab-mgmt')

from src.routes.eprescribing import eprescribing_bp
app.register_blueprint(eprescribing_bp, url_prefix='/api/eprescribing')

from src.routes.reports import reports_bp
app.register_blueprint(reports_bp, url_prefix='/api/reports')

from src.routes.admin_management import admin_mgmt_bp
app.register_blueprint(admin_mgmt_bp, url_prefix='/api/admin-mgmt')

from src.routes.messaging_management import messaging_mgmt_bp
app.register_blueprint(messaging_mgmt_bp, url_prefix='/api/messaging-mgmt')

from src.routes.document_management import document_mgmt_bp
app.register_blueprint(document_mgmt_bp, url_prefix='/api/document-mgmt')

from src.routes.specialized_features import specialized_bp
app.register_blueprint(specialized_bp, url_prefix='/api/specialized')

from src.routes.advanced_features import advanced_bp
app.register_blueprint(advanced_bp, url_prefix='/api/advanced')

from src.routes.patient_finder import patient_finder_bp
app.register_blueprint(patient_finder_bp, url_prefix='/api/patient-finder')

from src.routes.utilities import utilities_bp
app.register_blueprint(utilities_bp, url_prefix='/api/utilities')

# Import and register IoT Vitals routes
from src.routes.iot_vitals import iot_vitals_bp
app.register_blueprint(iot_vitals_bp, url_prefix='/api/iot-vitals')

# Import and register Dashboard routes
from src.routes.dashboard import dashboard_bp
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

# Add admin stats route alias
@app.route('/api/admin/stats', methods=['GET'])
def admin_stats_alias():
    """Alias for dashboard stats endpoint"""
    from flask import redirect
    return redirect('/api/dashboard/stats', code=307)

# Database configuration
database_dir = os.path.join(os.path.dirname(__file__), 'database')
os.makedirs(database_dir, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(database_dir, 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
# Use migrations instead of create_all() to avoid foreign key issues
# with app.app_context():
#     db.create_all()

@app.route('/favicon.ico')
@app.route('/logo.png')
def favicon():
    """Serve favicon and logo"""
    logo_path = os.path.join(app.static_folder or '', 'logo.png')
    if os.path.exists(logo_path):
        return send_from_directory(app.static_folder, 'logo.png', mimetype='image/png')
    favicon_path = os.path.join(app.static_folder or '', 'favicon.ico')
    if os.path.exists(favicon_path):
        return send_from_directory(app.static_folder, 'favicon.ico')
    # Return empty 204 No Content if favicon doesn't exist
    return '', 204

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve React app - catch all routes and serve index.html for frontend routing"""
    static_folder_path = app.static_folder
    
    # Don't serve API routes through static file handler
    if path.startswith('api/'):
        return jsonify({
            'success': False,
            'error': 'API route not found',
            'message': f'The requested API endpoint /{path} does not exist'
        }), 404
    
    # In development, proxy src/ and @vite/ requests to Vite dev server
    # Check if Vite dev server is running (port 5173)
    if path.startswith('src/') or path.startswith('@vite/') or path.endswith('.jsx') or path.endswith('.tsx') or path.endswith('.js'):
        try:
            import requests
            vite_url = f"http://localhost:5173/{path}"
            response = requests.get(vite_url, timeout=2)
            if response.status_code == 200:
                from flask import Response
                # Determine correct MIME type
                mimetype = 'application/javascript'
                if path.endswith('.jsx') or path.endswith('.tsx'):
                    mimetype = 'application/javascript'
                elif path.endswith('.css'):
                    mimetype = 'text/css'
                elif path.endswith('.json'):
                    mimetype = 'application/json'
                else:
                    mimetype = response.headers.get('Content-Type', 'application/javascript')
                
                return Response(
                    response.content,
                    mimetype=mimetype
                )
        except Exception as e:
            # Vite dev server not running - redirect user to use Vite
            if path.startswith('src/'):
                return f"""
                <html>
                <body>
                    <h1>Development Mode Required</h1>
                    <p>Vite dev server is not running. Please start it with:</p>
                    <pre>npm run dev</pre>
                    <p>Then access the app at: <a href="http://localhost:5173">http://localhost:5173</a></p>
                    <p>Or build for production: <pre>npm run build</pre></p>
                </body>
                </html>
                """, 503
    
    if static_folder_path is None:
        return "Static folder not configured", 404

    # Serve static files if they exist
    if path != "" and path != "favicon.ico":
        file_path = os.path.join(static_folder_path, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(static_folder_path, path)
    
    # For all other routes (including root), serve index.html for React Router
    index_path = os.path.join(static_folder_path, 'index.html')
    
    # Check if Vite dev server is running
    vite_running = False
    try:
        import requests
        vite_check = requests.get("http://localhost:5173", timeout=1)
        vite_running = vite_check.status_code == 200
    except:
        vite_running = False
    
    if os.path.exists(index_path) and not vite_running:
        # Serve index.html but warn about Vite
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Clinic+ - Development Mode</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .info { background: #d1ecf1; border: 1px solid #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
                code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
                a { color: #007bff; }
            </style>
        </head>
        <body>
            <h1>🚀 Clinic+ Backend API</h1>
            
            <div class="warning">
                <h2>⚠️ Vite Dev Server Not Running</h2>
                <p>You're accessing Flask directly. For frontend development, use Vite dev server.</p>
            </div>
            
            <div class="info">
                <h3>📋 Quick Start:</h3>
                <ol>
                    <li><strong>Terminal 1:</strong> Flask is already running ✅</li>
                    <li><strong>Terminal 2:</strong> Run <code>npm run dev</code></li>
                    <li><strong>Access:</strong> <a href="http://localhost:5173">http://localhost:5173</a></li>
                </ol>
            </div>
            
            <h3>🔗 API Endpoints:</h3>
            <ul>
                <li><a href="/api/health">Health Check</a></li>
                <li><a href="/api/auth">Auth Info</a></li>
            </ul>
            
            <p><strong>Backend Status:</strong> ✅ Running on port 5000</p>
        </body>
        </html>
        """, 200
    elif os.path.exists(index_path):
        return send_from_directory(static_folder_path, 'index.html')
    else:
        return """
        <html>
        <body>
            <h1>Frontend Not Built</h1>
            <p>Please run one of the following:</p>
            <ul>
                <li><strong>Development:</strong> <code>npm run dev</code> (then access http://localhost:5173)</li>
                <li><strong>Production:</strong> <code>npm run build</code> (then refresh this page)</li>
            </ul>
        </body>
        </html>
        """, 404


if __name__ == '__main__':
    # Check if running in production (Railway/Heroku/etc.)
    if os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('DYNO'):
        # Production mode - use gunicorn
        pass  # Gunicorn will handle this via Procfile
    else:
        # Development mode
        app.run(host='0.0.0.0', port=5000, debug=True)
