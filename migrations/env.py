from logging.config import fileConfig
import os
import sys

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import Flask app and database
from main import app
from src.models.user import db

# Import all models to ensure they're registered with SQLAlchemy
from src.models.user import User
from src.models.auth import UserAccount, Role, Permission, UserRole, RolePermission, PatientDataAccess, AuditLog, PatientOTP
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.provider import Provider, Facility, ProviderFacility
from src.models.clinical import ClinicalEncounter, VitalSigns, ClinicalNote, LabOrder, LabResult, CrossFacilityAccess
from src.models.scheduling import Appointment, QueueEntry, ProviderSchedule
from src.models.billing import BillingCode, FeeSchedule, FeeScheduleItem, Charge, Claim, ClaimItem, Payment, PaymentAllocation, Statement
from src.models.prescribing import Drug, DrugInteraction, DrugAllergyInteraction, Prescription, PrescriptionRefill
from src.models.pharmacy import Pharmacy, PharmacyInventory, PrescriptionFulfillment
from src.models.insurance import InsurancePlan, InsuranceSubscription, InsuranceClaim, InsurancePayment, PassengerAccidentCover
from src.models.professional import ProfessionalCredential, ProfessionalToken, ProfessionalTokenRenewal, CredentialVerificationLog
from src.models.rpm import RPMDevice, RPMVitalReading, RPMAlert, RPMAlertRule, TelehealthSession
from src.models.emergency import EmergencyAccess, EmergencyDataView, HospitalHandoff, EMSDevice
from src.models.cds import CDSRule, CDSAlert, CareGap
from src.models.organization import Organization, OperationalProcess, OrganizationApproval, OrganizationHierarchy
from src.models.soap_notes import SOAPNote
from src.models.physical_exam import PhysicalExam
from src.models.review_of_systems import ReviewOfSystems
from src.models.clinical_reminders import ClinicalReminder, ReminderRule
from src.models.patient_portal import PortalMessage, PortalAccessLog
from src.models.documents import Document, DocumentCategory, DocumentTemplate
from src.models.messaging import Message, MessageTemplate
from src.models.billing_tracker import BillingTracker
from src.models.era import ERA, ERAClaim
from src.models.ub04 import UB04Form
from src.models.care_plans import CarePlan, CarePlanTemplate
from src.models.treatment_plans import TreatmentPlan
from src.models.insurance_company import InsuranceCompany
from src.models.health_data import HealthDataPoint, HealthDataSummary, WearableDevice

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target_metadata to the database metadata
target_metadata = db.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Use Flask app's database URL
    url = app.config.get("SQLALCHEMY_DATABASE_URI")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Use Flask app's database engine
    with app.app_context():
        connectable = db.engine

        with connectable.connect() as connection:
            context.configure(
                connection=connection, target_metadata=target_metadata
            )

            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
