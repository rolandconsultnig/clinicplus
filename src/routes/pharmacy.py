"""
Pharmacy Fulfillment Loop API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.pharmacy import Pharmacy, PharmacyInventory, PrescriptionFulfillment
from src.models.prescribing import Prescription
from src.models.patient import Patient
from datetime import datetime, date
import uuid
import math

pharmacy_bp = Blueprint('pharmacy', __name__)

@pharmacy_bp.route('/pharmacies', methods=['GET'])
@token_required
def search_pharmacies():
    """Search for pharmacies"""
    try:
        search = request.args.get('search', '')
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        max_distance = request.args.get('max_distance', type=float, default=10.0)  # km
        drug_id = request.args.get('drug_id', type=int)
        
        query = Pharmacy.query.filter(Pharmacy.is_active == True)
        
        if search:
            query = query.filter(
                db.or_(
                    Pharmacy.pharmacy_name.contains(search),
                    Pharmacy.city.contains(search),
                    Pharmacy.state.contains(search)
                )
            )
        
        pharmacies = query.all()
        
        # Filter by location if provided
        if latitude and longitude:
            filtered_pharmacies = []
            for pharmacy in pharmacies:
                if pharmacy.latitude and pharmacy.longitude:
                    distance = calculate_distance(
                        latitude, longitude,
                        pharmacy.latitude, pharmacy.longitude
                    )
                    if distance <= max_distance:
                        pharmacy_dict = pharmacy.to_dict()
                        pharmacy_dict['distance_km'] = round(distance, 2)
                        filtered_pharmacies.append(pharmacy_dict)
            pharmacies = filtered_pharmacies
        else:
            pharmacies = [p.to_dict() for p in pharmacies]
        
        # Filter by drug availability if drug_id provided
        if drug_id:
            available_pharmacies = []
            for pharmacy in pharmacies:
                if isinstance(pharmacy, dict):
                    pharmacy_id = pharmacy['id']
                else:
                    pharmacy_id = pharmacy.id
                
                inventory = PharmacyInventory.query.filter(
                    PharmacyInventory.pharmacy_id == pharmacy_id,
                    PharmacyInventory.drug_id == drug_id,
                    PharmacyInventory.stock_quantity > 0
                ).first()
                
                if inventory:
                    if isinstance(pharmacy, dict):
                        pharmacy['stock_available'] = inventory.stock_quantity
                        pharmacy['unit_price'] = float(inventory.unit_price) if inventory.unit_price else None
                    else:
                        pharmacy_dict = pharmacy.to_dict()
                        pharmacy_dict['stock_available'] = inventory.stock_quantity
                        pharmacy_dict['unit_price'] = float(inventory.unit_price) if inventory.unit_price else None
                        pharmacy = pharmacy_dict
                    available_pharmacies.append(pharmacy)
            
            pharmacies = available_pharmacies
        
        # Sort by distance if location provided
        if latitude and longitude:
            pharmacies = sorted(pharmacies, key=lambda x: x.get('distance_km', float('inf')))
        
        return jsonify({
            'success': True,
            'pharmacies': pharmacies,
            'total': len(pharmacies)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km (Haversine formula)"""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

@pharmacy_bp.route('/pharmacies/<int:pharmacy_id>/inventory/<int:drug_id>', methods=['GET'])
@token_required
def get_pharmacy_inventory(pharmacy_id, drug_id):
    """Get inventory for a specific drug at a pharmacy"""
    try:
        inventory = PharmacyInventory.query.filter(
            PharmacyInventory.pharmacy_id == pharmacy_id,
            PharmacyInventory.drug_id == drug_id
        ).first()
        
        if not inventory:
            return jsonify({
                'success': True,
                'inventory': {
                    'pharmacy_id': pharmacy_id,
                    'drug_id': drug_id,
                    'stock_quantity': 0,
                    'available': False
                }
            }), 200
        
        return jsonify({
            'success': True,
            'inventory': {
                **inventory.to_dict(),
                'available': inventory.stock_quantity > 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_bp.route('/prescriptions/<int:prescription_id>/fulfill', methods=['POST'])
@token_required
@role_required(['pharmacist'])
def fulfill_prescription(prescription_id):
    """Fulfill a prescription at a pharmacy"""
    try:
        prescription = Prescription.query.get_or_404(prescription_id)
        data = request.get_json()
        pharmacy_id = data['pharmacy_id']
        
        # Verify prescription is active
        if prescription.status != 'active':
            return jsonify({'error': 'Prescription is not active'}), 400
        
        # Check inventory
        inventory = PharmacyInventory.query.filter(
            PharmacyInventory.pharmacy_id == pharmacy_id,
            PharmacyInventory.drug_id == prescription.drug_id
        ).first()
        
        if not inventory or inventory.stock_quantity < prescription.quantity:
            return jsonify({
                'error': 'Insufficient stock',
                'available': inventory.stock_quantity if inventory else 0
            }), 400
        
        # Create fulfillment
        fulfillment = PrescriptionFulfillment(
            fulfillment_id=f"FUL-{uuid.uuid4().hex[:12].upper()}",
            prescription_id=prescription_id,
            pharmacy_id=pharmacy_id,
            patient_id=prescription.patient_id,
            fulfillment_date=date.today(),
            quantity_dispensed=prescription.quantity,
            lot_number=data.get('lot_number'),
            expiration_date=date.fromisoformat(data['expiration_date']) if data.get('expiration_date') else None,
            verified_by_pharmacist=True,
            pharmacist_id=request.current_user.provider_id,
            verification_date=datetime.utcnow(),
            status='verified'
        )
        
        # Update inventory
        inventory.stock_quantity -= prescription.quantity
        
        # Update prescription
        prescription.status = 'filled'
        prescription.filled_date = date.today()
        prescription.pharmacy_id = pharmacy_id
        
        db.session.add(fulfillment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'fulfillment': fulfillment.to_dict(),
            'prescription': prescription.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@pharmacy_bp.route('/fulfillments/<int:fulfillment_id>/pickup', methods=['POST'])
@token_required
def mark_pickup(fulfillment_id):
    """Mark prescription as picked up by patient"""
    try:
        fulfillment = PrescriptionFulfillment.query.get_or_404(fulfillment_id)
        
        fulfillment.picked_up_by_patient = True
        fulfillment.pickup_date = datetime.utcnow()
        fulfillment.status = 'dispensed'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'fulfillment': fulfillment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@pharmacy_bp.route('/pharmacies/<int:pharmacy_id>/inventory', methods=['POST'])
@token_required
@role_required(['pharmacist', 'admin'])
def update_inventory(pharmacy_id):
    """Update pharmacy inventory"""
    try:
        data = request.get_json()
        
        inventory = PharmacyInventory.query.filter(
            PharmacyInventory.pharmacy_id == pharmacy_id,
            PharmacyInventory.drug_id == data['drug_id']
        ).first()
        
        if not inventory:
            inventory = PharmacyInventory(
                pharmacy_id=pharmacy_id,
                drug_id=data['drug_id'],
                stock_quantity=data.get('stock_quantity', 0),
                reorder_level=data.get('reorder_level', 10),
                unit_price=data.get('unit_price')
            )
            db.session.add(inventory)
        else:
            inventory.stock_quantity = data.get('stock_quantity', inventory.stock_quantity)
            inventory.reorder_level = data.get('reorder_level', inventory.reorder_level)
            if 'unit_price' in data:
                inventory.unit_price = data['unit_price']
            inventory.last_updated = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'inventory': inventory.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

