"""
Pharmacy Fulfillment Loop Models
"""
from datetime import datetime
import json
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


class PharmacyPOSTransaction(db.Model):
    __tablename__ = 'pharmacy_pos_transactions'

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    receipt_number = db.Column(db.String(60), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=True)
    payment_method = db.Column(db.String(40), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    tax = db.Column(db.Numeric(12, 2), default=0)
    discount = db.Column(db.Numeric(12, 2), default=0)
    total = db.Column(db.Numeric(12, 2), default=0)
    items_json = db.Column(db.Text, nullable=True)  # OTC + RX lines
    dispensed_prescriptions_json = db.Column(db.Text, nullable=True)
    loyalty_card = db.Column(db.String(80), nullable=True)
    coupon_code = db.Column(db.String(40), nullable=True)
    processed_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    patient = db.relationship('Patient')
    pharmacy = db.relationship('Pharmacy')

    def to_dict(self):
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'receipt_number': self.receipt_number,
            'patient_id': self.patient_id,
            'patient_name': (
                f'{self.patient.first_name} {self.patient.last_name}'
                if self.patient else None
            ),
            'patient_clinic_plus_id': self.patient.universal_patient_id if self.patient else None,
            'pharmacy_id': self.pharmacy_id,
            'pharmacy_name': self.pharmacy.pharmacy_name if self.pharmacy else None,
            'payment_method': self.payment_method,
            'subtotal': float(self.subtotal or 0),
            'tax': float(self.tax or 0),
            'discount': float(self.discount or 0),
            'total': float(self.total or 0),
            'items': json.loads(self.items_json) if self.items_json else [],
            'dispensed_prescriptions': json.loads(self.dispensed_prescriptions_json) if self.dispensed_prescriptions_json else [],
            'loyalty_card': self.loyalty_card,
            'coupon_code': self.coupon_code,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PharmacyOTCItem(db.Model):
    __tablename__ = 'pharmacy_otc_items'

    id = db.Column(db.Integer, primary_key=True)
    item_code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(80), nullable=True)
    unit_price = db.Column(db.Numeric(12, 2), default=0)
    stock_quantity = db.Column(db.Integer, default=0)
    requires_age = db.Column(db.Boolean, default=False)
    age_limit = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'item_code': self.item_code,
            'name': self.name,
            'price': float(self.unit_price or 0),
            'category': self.category,
            'stock': self.stock_quantity or 0,
            'requiresAge': bool(self.requires_age),
            'ageLimit': self.age_limit,
            'is_active': self.is_active,
        }


class PharmacyCoupon(db.Model):
    __tablename__ = 'pharmacy_coupons'

    id = db.Column(db.Integer, primary_key=True)
    coupon_code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), nullable=False)
    discount_percent = db.Column(db.Numeric(5, 2), default=0)
    is_active = db.Column(db.Boolean, default=True)
    starts_at = db.Column(db.DateTime, nullable=True)
    ends_at = db.Column(db.DateTime, nullable=True)
    usage_limit = db.Column(db.Integer, nullable=True)
    usage_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_valid_now(self):
        now = datetime.utcnow()
        if not self.is_active:
            return False
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        if self.usage_limit is not None and (self.usage_count or 0) >= self.usage_limit:
            return False
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'coupon_code': self.coupon_code,
            'description': self.description,
            'discount': float(self.discount_percent or 0),
            'is_active': self.is_active,
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'usage_limit': self.usage_limit,
            'usage_count': self.usage_count or 0,
        }


class PharmacyPatientReminder(db.Model):
    __tablename__ = 'pharmacy_patient_reminders'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    reminder_type = db.Column(db.String(40), nullable=False, default='refill')
    method = db.Column(db.String(20), nullable=False, default='sms')
    days_before = db.Column(db.Integer, default=3)
    medication = db.Column(db.String(200), nullable=True)
    reminder_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, sent, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime, nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)

    patient = db.relationship('Patient')

    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'type': self.reminder_type,
            'method': self.method,
            'days_before': self.days_before,
            'medication': self.medication,
            'date': self.reminder_date.isoformat() if self.reminder_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
        }


class PharmacyLoyaltyAccount(db.Model):
    __tablename__ = 'pharmacy_loyalty_accounts'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, unique=True, index=True)
    points = db.Column(db.Integer, default=0)
    tier = db.Column(db.String(30), default='standard')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = db.relationship('Patient')

    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'points': self.points or 0,
            'tier': self.tier,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class PharmacyPurchaseOrder(db.Model):
    __tablename__ = 'pharmacy_purchase_orders'

    id = db.Column(db.Integer, primary_key=True)
    po_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=True)
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=True)
    vendor_name = db.Column(db.String(160), nullable=False, default='Default Vendor')
    status = db.Column(db.String(30), default='pending')  # pending, approved, ordered, received, cancelled
    item_count = db.Column(db.Integer, default=1)
    quantity = db.Column(db.Integer, default=0)
    unit_price = db.Column(db.Numeric(12, 2), default=0)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pharmacy = db.relationship('Pharmacy')

    def to_dict(self):
        return {
            'id': self.id,
            'po_number': self.po_number,
            'pharmacy_id': self.pharmacy_id,
            'drug_id': self.drug_id,
            'vendor_name': self.vendor_name,
            'status': self.status,
            'item_count': self.item_count,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price or 0),
            'total_amount': float(self.total_amount or 0),
            'date': self.created_at.isoformat() if self.created_at else None,
        }


class PharmacyInventoryAudit(db.Model):
    __tablename__ = 'pharmacy_inventory_audit'

    id = db.Column(db.Integer, primary_key=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=True)
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=True)
    action = db.Column(db.String(40), nullable=False)  # dispensed, received, adjusted
    quantity = db.Column(db.Integer, default=0)  # signed values
    reference = db.Column(db.String(80), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    details_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    pharmacy = db.relationship('Pharmacy')

    def to_dict(self):
        return {
            'id': self.id,
            'pharmacy_id': self.pharmacy_id,
            'drug_id': self.drug_id,
            'action': self.action,
            'quantity': self.quantity,
            'reference': self.reference,
            'user': f'User #{self.user_id}' if self.user_id else 'System',
            'details': json.loads(self.details_json) if self.details_json else {},
            'timestamp': self.created_at.isoformat() if self.created_at else None,
        }


class PharmacyInventoryLot(db.Model):
    __tablename__ = 'pharmacy_inventory_lots'

    id = db.Column(db.Integer, primary_key=True)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=False, index=True)
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=False, index=True)
    lot_number = db.Column(db.String(60), nullable=False, index=True)
    expiry_date = db.Column(db.Date, nullable=True, index=True)
    quantity_on_hand = db.Column(db.Integer, default=0)
    unit_cost = db.Column(db.Numeric(12, 2), default=0)
    received_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    source_reference = db.Column(db.String(80), nullable=True)  # PO number, adjustment ref
    is_active = db.Column(db.Boolean, default=True, index=True)

    pharmacy = db.relationship('Pharmacy')

    def to_dict(self):
        return {
            'id': self.id,
            'pharmacy_id': self.pharmacy_id,
            'drug_id': self.drug_id,
            'lot_number': self.lot_number,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'quantity_on_hand': self.quantity_on_hand or 0,
            'unit_cost': float(self.unit_cost or 0),
            'received_at': self.received_at.isoformat() if self.received_at else None,
            'source_reference': self.source_reference,
            'is_active': bool(self.is_active),
        }


class PharmacyBillingClaim(db.Model):
    __tablename__ = 'pharmacy_billing_claims'

    id = db.Column(db.Integer, primary_key=True)
    claim_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'), nullable=True)
    insurance_name = db.Column(db.String(150), nullable=True)
    amount = db.Column(db.Numeric(12, 2), default=0)
    status = db.Column(db.String(30), default='pending')  # pending, submitted, approved, rejected
    submitted_at = db.Column(db.DateTime, nullable=True)
    adjudicated_at = db.Column(db.DateTime, nullable=True)
    cob_processed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = db.relationship('Patient')

    def to_dict(self):
        return {
            'id': self.id,
            'claimNumber': self.claim_number,
            'patientName': f'{self.patient.first_name} {self.patient.last_name}' if self.patient else 'Unknown',
            'prescription': f'RX #{self.prescription_id}' if self.prescription_id else 'N/A',
            'amount': float(self.amount or 0),
            'insurance': self.insurance_name or 'Self-Pay',
            'status': self.status,
            'submittedDate': self.submitted_at.date().isoformat() if self.submitted_at else None,
            'adjudicatedDate': self.adjudicated_at.date().isoformat() if self.adjudicated_at else None,
        }


class PharmacyBillingPayment(db.Model):
    __tablename__ = 'pharmacy_billing_payments'

    id = db.Column(db.Integer, primary_key=True)
    claim_id = db.Column(db.Integer, db.ForeignKey('pharmacy_billing_claims.id'), nullable=True)
    amount = db.Column(db.Numeric(12, 2), default=0)
    method = db.Column(db.String(40), default='insurance')
    paid_at = db.Column(db.DateTime, default=datetime.utcnow)

    claim = db.relationship('PharmacyBillingClaim')

    def to_dict(self):
        return {
            'id': self.id,
            'claim_id': self.claim_id,
            'amount': float(self.amount or 0),
            'method': self.method,
            'date': self.paid_at.isoformat() if self.paid_at else None,
        }


class PharmacyDocumentRecord(db.Model):
    __tablename__ = 'pharmacy_document_records'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    doc_type = db.Column(db.String(60), default='prescription')
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    size_bytes = db.Column(db.Integer, default=0)
    encrypted = db.Column(db.Boolean, default=True)
    access_level = db.Column(db.String(40), default='restricted')
    signature_data = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)

    patient = db.relationship('Patient')

    def to_dict(self):
        size_kb = round((self.size_bytes or 0) / 1024, 1)
        return {
            'id': self.id,
            'name': self.name,
            'type': self.doc_type,
            'patientName': f'{self.patient.first_name} {self.patient.last_name}' if self.patient else 'Unassigned',
            'uploadDate': self.created_at.date().isoformat() if self.created_at else None,
            'size': f'{size_kb} KB',
            'encrypted': self.encrypted,
            'accessLevel': self.access_level,
        }

