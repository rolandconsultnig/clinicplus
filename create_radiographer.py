"""
Create or repair a radiographer account with facility + role (for radiology workflow).
Run from project root: python create_radiographer.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from src.models.user import db
from src.models.auth import UserAccount, UserRole, Role
from src.models.provider import Facility
import datetime


def ensure_radiographer_role():
    """Role used by @role_required in radiology routes (case-insensitive)."""
    role = Role.query.filter_by(role_name='radiographer').first()
    if not role:
        role = Role(role_name='radiographer', is_active=True)
        db.session.add(role)
        db.session.flush()
    return role


def create_or_update_radiographer():
    with app.app_context():
        facility = Facility.query.filter_by(is_active=True).first()
        if not facility:
            facility = Facility(
                facility_name='Main Clinic',
                facility_type='Clinic',
                city='City',
                state='State',
                country='Nigeria',
                is_active=True,
            )
            db.session.add(facility)
            db.session.flush()

        role = ensure_radiographer_role()
        username = 'radiographer'
        password = 'radiographer123'

        user = UserAccount.query.filter_by(username=username).first()
        if not user:
            user = UserAccount(
                username=username,
                email='radiographer@clinic.com',
                user_type='radiographer',
                is_active=True,
                is_verified=True,
                facility_id=facility.id,
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()
            print('Created radiographer user.')
        else:
            user.user_type = 'radiographer'
            user.email = user.email or 'radiographer@clinic.com'
            user.facility_id = user.facility_id or facility.id
            user.set_password(password)
            print('Updated existing radiographer user (password reset to demo).')

        has_role = UserRole.query.filter_by(
            user_account_id=user.id,
            role_id=role.id,
            is_active=True,
        ).first()
        if not has_role:
            db.session.add(
                UserRole(
                    user_account_id=user.id,
                    role_id=role.id,
                    facility_id=facility.id,
                    is_active=True,
                    assigned_at=datetime.datetime.utcnow(),
                )
            )
            print('Assigned radiographer role at facility', facility.id)
        else:
            if has_role.facility_id is None:
                has_role.facility_id = facility.id
            has_role.is_active = True
            print('Radiographer role already present; ensured facility link.')

        db.session.commit()

        print('\n--- Radiology portal (DigiClinic) ---')
        print('URL:      http://localhost:4305/login  (or your dev URL)')
        print('Username: radiographer')
        print('Password: radiographer123')
        print('After login: Radiology Workflow opens by default for this user type.')
        print('---\n')


if __name__ == '__main__':
    print('Radiographer account setup')
    print('=' * 50)
    create_or_update_radiographer()
    print('=' * 50)
