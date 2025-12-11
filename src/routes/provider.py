"""
Provider Routes
Basic provider routes (workflows are in provider_workflows.py)
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.provider import Provider, Facility, ProviderFacility
import datetime

provider_bp = Blueprint('provider', __name__)

@provider_bp.route('/providers', methods=['GET', 'POST'])
@token_required
def providers():
    """Get providers with filtering or create a new provider"""
    if request.method == 'GET':
        try:
            facility_id = request.args.get('facility_id', type=int)
            specialty = request.args.get('specialty')
            is_active = request.args.get('is_active', type=bool, default=True)
            
            query = Provider.query
            
            if facility_id:
                # Get providers associated with facility
                provider_facilities = ProviderFacility.query.filter_by(facility_id=facility_id).all()
                provider_ids = [pf.provider_id for pf in provider_facilities]
                query = query.filter(Provider.id.in_(provider_ids))
            
            if specialty:
                query = query.filter(Provider.specialty == specialty)
            
            if is_active is not None:
                query = query.filter(Provider.is_active == is_active)
            
            providers = query.all()
            
            return jsonify({
                'success': True,
                'providers': [p.to_dict() for p in providers],
                'total': len(providers)
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        """Create a new provider"""
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('first_name'):
                return jsonify({'error': 'First name is required'}), 400
            if not data.get('last_name'):
                return jsonify({'error': 'Last name is required'}), 400
            if not data.get('provider_type'):
                return jsonify({'error': 'Provider type is required'}), 400
            
            # Generate universal_provider_id if not provided
            universal_provider_id = data.get('universal_provider_id')
            if not universal_provider_id:
                import random
                import string
                # Generate unique ID: PROV + random alphanumeric
                random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                universal_provider_id = f"PROV{random_part}"
            
            # Check if universal_provider_id already exists
            existing = Provider.query.filter_by(universal_provider_id=universal_provider_id).first()
            if existing:
                return jsonify({'error': 'Provider ID already exists'}), 400
            
            # Create new provider
            provider = Provider(
                universal_provider_id=universal_provider_id,
                first_name=data['first_name'],
                last_name=data['last_name'],
                middle_name=data.get('middle_name'),
                title=data.get('title'),
                provider_type=data['provider_type'],
                specialty=data.get('specialty'),
                sub_specialty=data.get('sub_specialty'),
                medical_license_number=data.get('medical_license_number') or data.get('license_number'),
                license_number=data.get('license_number') or data.get('medical_license_number'),
                medical_license_state=data.get('medical_license_state'),
                medical_license_expiry=data.get('medical_license_expiry'),
                dea_number=data.get('dea_number'),
                npi_number=data.get('npi_number'),
                board_certifications=data.get('board_certifications'),
                phone=data.get('phone'),
                email=data.get('email'),
                employment_status=data.get('employment_status', 'active'),
                hire_date=data.get('hire_date'),
                termination_date=data.get('termination_date'),
                is_active=data.get('is_active', True),
                user_account_id=data.get('user_account_id')
            )
            
            db.session.add(provider)
            db.session.commit()
            
            # If facility_id is provided, create provider-facility affiliation
            facility_id = data.get('facility_id')
            if facility_id:
                provider_facility = ProviderFacility(
                    provider_id=provider.id,
                    facility_id=facility_id,
                    role=data.get('role', 'attending'),
                    department=data.get('department'),
                    is_primary_facility=data.get('is_primary_facility', False),
                    start_date=data.get('hire_date') or datetime.datetime.utcnow().date(),
                    is_active=True
                )
                db.session.add(provider_facility)
                db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Provider created successfully',
                'provider': provider.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to create provider: {str(e)}'}), 500

@provider_bp.route('/providers/<int:provider_id>', methods=['GET'])
@token_required
def get_provider(provider_id):
    """Get provider details"""
    try:
        provider = Provider.query.get_or_404(provider_id)
        return jsonify({
            'success': True,
            'provider': provider.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_bp.route('/providers/facilities', methods=['GET', 'POST'])
@token_required
def facilities():
    """Get facilities or create a new facility"""
    if request.method == 'GET':
        try:
            facility_type = request.args.get('facility_type')
            is_active = request.args.get('is_active', type=bool, default=True)
            
            query = Facility.query
            
            if facility_type:
                query = query.filter(Facility.facility_type == facility_type)
            
            if is_active is not None:
                query = query.filter(Facility.is_active == is_active)
            
            facilities = query.all()
            
            return jsonify({
                'success': True,
                'facilities': [f.to_dict() for f in facilities],
                'total': len(facilities)
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        """Create a new facility"""
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('facility_name'):
                return jsonify({'error': 'Facility name is required'}), 400
            if not data.get('facility_type'):
                return jsonify({'error': 'Facility type is required'}), 400
            
            # Generate facility_id if not provided
            facility_id = data.get('facility_id')
            if not facility_id:
                # Generate unique facility_id based on name
                base_id = data['facility_name'].upper().replace(' ', '_')[:20]
                import random
                facility_id = f"{base_id}_{random.randint(1000, 9999)}"
            
            # Check if facility_id already exists
            existing = Facility.query.filter_by(facility_id=facility_id).first()
            if existing:
                return jsonify({'error': 'Facility ID already exists'}), 400
            
            # Create new facility
            facility = Facility(
                facility_id=facility_id,
                facility_name=data['facility_name'],
                facility_type=data['facility_type'],
                address_line1=data.get('address_line1'),
                address_line2=data.get('address_line2'),
                city=data.get('city'),
                state=data.get('state'),
                zip_code=data.get('zip_code'),
                country=data.get('country', 'USA'),
                phone=data.get('phone'),
                fax=data.get('fax'),
                email=data.get('email'),
                website=data.get('website'),
                license_number=data.get('license_number'),
                accreditation_body=data.get('accreditation_body'),
                accreditation_status=data.get('accreditation_status'),
                accreditation_expiry=data.get('accreditation_expiry'),
                operating_hours=data.get('operating_hours'),
                services_offered=data.get('services_offered'),
                is_active=data.get('is_active', True),
                organization_id=data.get('organization_id')
            )
            
            db.session.add(facility)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Facility created successfully',
                'facility': facility.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to create facility: {str(e)}'}), 500

@provider_bp.route('/providers/facilities/<int:facility_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def facility_detail(facility_id):
    """Get, update, or delete a specific facility"""
    facility = Facility.query.get_or_404(facility_id)
    
    if request.method == 'GET':
        try:
            return jsonify({
                'success': True,
                'facility': facility.to_dict()
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'PUT':
        """Update facility"""
        try:
            data = request.get_json()
            
            # Update fields
            if 'facility_name' in data:
                facility.facility_name = data['facility_name']
            if 'facility_type' in data:
                facility.facility_type = data['facility_type']
            if 'address_line1' in data:
                facility.address_line1 = data['address_line1']
            if 'address_line2' in data:
                facility.address_line2 = data['address_line2']
            if 'city' in data:
                facility.city = data['city']
            if 'state' in data:
                facility.state = data['state']
            if 'zip_code' in data:
                facility.zip_code = data['zip_code']
            if 'country' in data:
                facility.country = data['country']
            if 'phone' in data:
                facility.phone = data['phone']
            if 'fax' in data:
                facility.fax = data['fax']
            if 'email' in data:
                facility.email = data['email']
            if 'website' in data:
                facility.website = data['website']
            if 'license_number' in data:
                facility.license_number = data['license_number']
            if 'accreditation_body' in data:
                facility.accreditation_body = data['accreditation_body']
            if 'accreditation_status' in data:
                facility.accreditation_status = data['accreditation_status']
            if 'is_active' in data:
                facility.is_active = data['is_active']
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Facility updated successfully',
                'facility': facility.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to update facility: {str(e)}'}), 500
    
    elif request.method == 'DELETE':
        """Delete facility"""
        try:
            # Check if facility has associated providers or encounters
            if facility.provider_affiliations:
                return jsonify({
                    'error': 'Cannot delete facility with associated providers. Please remove provider affiliations first.'
                }), 400
            
            db.session.delete(facility)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Facility deleted successfully'
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to delete facility: {str(e)}'}), 500

