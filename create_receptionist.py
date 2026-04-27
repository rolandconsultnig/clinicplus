"""
Create or repair a receptionist account with facility + role (for JWT / receptionist API).
Run from project root: python create_receptionist.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from src.models.user import db
from src.models.auth import UserAccount, UserRole, Role
from src.models.provider import Facility
import datetime


def ensure_receptionist_role():
    """Role name matches seed users (lowercase); @role_required is case-insensitive."""
    role = Role.query.filter_by(role_name='receptionist').first()
    if not role:
        role = Role(role_name='receptionist', is_active=True)
        db.session.add(role)
        db.session.flush()
    return role


def create_or_update_receptionist():
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

        role = ensure_receptionist_role()
        username = 'receptionist'
        password = 'receptionist123'

        user = UserAccount.query.filter_by(username=username).first()
        if not user:
            user = UserAccount(
                username=username,
                email='receptionist@clinic.com',
                user_type='Receptionist',
                is_active=True,
                is_verified=True,
                facility_id=facility.id,
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()
            print('Created receptionist user.')
        else:
            user.user_type = 'Receptionist'
            user.email = user.email or 'receptionist@clinic.com'
            user.facility_id = user.facility_id or facility.id
            user.set_password(password)
            print('Updated existing receptionist user (password reset to demo).')

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
            print('Assigned Receptionist role at facility', facility.id)
        else:
            if has_role.facility_id is None:
                has_role.facility_id = facility.id
            has_role.is_active = True
            print('Receptionist role already present; ensured facility link.')

        db.session.commit()

        print('\n--- Receptionist portal (DigiClinic) ---')
        print('URL:      http://localhost:4305/login  (or your dev URL)')
        print('Username: receptionist')
        print('Password: receptionist123')
        print('After login: open sidebar -> Reception Desk (full receptionist dashboard).')
        print('---\n')


if __name__ == '__main__':
    print('Receptionist account setup')
    print('=' * 50)
    create_or_update_receptionist()
    print('=' * 50)
