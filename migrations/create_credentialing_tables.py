"""
Database Migration Script for Professional Credentialing Module
Creates all tables for comprehensive credentialing features
"""
from src.models.user import db
from src.models.credentialing import (
    CredentialingApplication, PrimarySourceVerification, CredentialDocument,
    ClinicalPrivilege, ProviderPrivilege, CMETracking, SanctionExclusion,
    RecredentialingCycle, CredentialingAuditLog, CredentialingTemplate
)

def create_credentialing_tables():
    """Create all credentialing tables"""
    try:
        # Create all tables
        db.create_all()
        print("✅ Successfully created all credentialing tables")
        print("\nCreated tables:")
        print("  - credentialing_applications")
        print("  - primary_source_verifications")
        print("  - credential_documents")
        print("  - clinical_privileges")
        print("  - provider_privileges")
        print("  - cme_tracking")
        print("  - sanction_exclusions")
        print("  - recredentialing_cycles")
        print("  - credentialing_audit_logs")
        print("  - credentialing_templates")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == '__main__':
    from main import app
    with app.app_context():
        create_credentialing_tables()

