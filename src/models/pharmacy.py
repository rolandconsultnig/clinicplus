"""
Pharmacy Fulfillment Loop Models
"""
from datetime import datetime
from src.models.user import db

class Pharmacy(db.Model):
    __tablename__ = 'pharmacies'
    
    id = db.Column(db.Integer, primary_key=True)
    pharmacy_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    pharmacy_name = db.Column(db.String(200), nullable=False)
    
    # Contact Information
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    address_line1 = db.Column(db.String(200))
    address_line2 = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zip_code = db.Column(db.String(10))
    country = db.Column(db.String(50), default='USA')
    
    # Location
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    
    # Pharmacy Details
    pharmacy_type = db.Column(db.String(50))  # retail, hospital, mail_order, chain
    npi_number = db.Column(db.String(20))  # National Provider Identifier
    dea_number = db.Column(db.String(20))
    
    # Affiliation
    is_affiliated = db.Column(db.Boolean, default=False)
    affiliation_date = db.Column(db.Date)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    inventory_items = db.relationship('PharmacyInventory', backref='pharmacy', lazy=True)
    prescription_fulfillments = db.relationship('PrescriptionFulfillment', backref='pharmacy', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'pharmacy_id': self.pharmacy_id,
            'pharmacy_name': self.pharmacy_name,
            'phone': self.phone,
            'email': self.email,
            'address_line1': self.address_line1,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'pharmacy_type': self.pharmacy_type,
            'is_affiliated': self.is_affiliated,
            'is_active': self.is_active
        }

class PharmacyInventory(db.Model):
    __tablename__ = 'pharmacy_inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=False)
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=False)
    
    # Stock Information
    stock_quantity = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=10)
    unit_price = db.Column(db.Numeric(10, 2))
    
    # Real-time Updates
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'pharmacy_id': self.pharmacy_id,
            'drug_id': self.drug_id,
            'stock_quantity': self.stock_quantity,
            'reorder_level': self.reorder_level,
            'unit_price': float(self.unit_price) if self.unit_price else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

class PrescriptionFulfillment(db.Model):
    __tablename__ = 'prescription_fulfillments'
    
    id = db.Column(db.Integer, primary_key=True)
    fulfillment_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Prescription and Pharmacy
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'), nullable=False)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Fulfillment Details
    fulfillment_date = db.Column(db.Date, nullable=False)
    quantity_dispensed = db.Column(db.Integer, nullable=False)
    lot_number = db.Column(db.String(50))
    expiration_date = db.Column(db.Date)
    
    # Verification
    verified_by_pharmacist = db.Column(db.Boolean, default=False)
    pharmacist_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    verification_date = db.Column(db.DateTime)
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, verified, dispensed, cancelled
    dispensed_at = db.Column(db.DateTime)
    
    # Patient Pickup
    picked_up_by_patient = db.Column(db.Boolean, default=False)
    pickup_date = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'fulfillment_id': self.fulfillment_id,
            'prescription_id': self.prescription_id,
            'pharmacy_id': self.pharmacy_id,
            'patient_id': self.patient_id,
            'fulfillment_date': self.fulfillment_date.isoformat() if self.fulfillment_date else None,
            'quantity_dispensed': self.quantity_dispensed,
            'verified_by_pharmacist': self.verified_by_pharmacist,
            'status': self.status,
            'picked_up_by_patient': self.picked_up_by_patient,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

