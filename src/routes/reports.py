"""
Reports Routes - Comprehensive OpenEMR-style reporting system
Includes clinical reports, patient reports, visit reports, financial reports, inventory reports
"""
import csv
from io import StringIO

from flask import Blueprint, request, jsonify, Response
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.clinical import ClinicalEncounter, LabResult, LabOrder
from src.models.scheduling import Appointment
from src.models.billing import Charge, Payment, Claim
from src.models.prescribing import Prescription
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime, date, timedelta
from decimal import Decimal

reports_bp = Blueprint('reports', __name__)

# Clinical Reports
@reports_bp.route('/clinical', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_clinical_reports():
    """Get clinical reports"""
    try:
        report_type = request.args.get('type')  # cqm, amc, alerts, etc.
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        if not from_date:
            from_date = date.today() - timedelta(days=30)
        else:
            from_date = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
        
        reports = {
            'date_range': {
                'from_date': from_date.isoformat() if isinstance(from_date, date) else from_date,
                'to_date': to_date.isoformat() if isinstance(to_date, date) else to_date
            },
            'encounters': ClinicalEncounter.query.filter(
                ClinicalEncounter.encounter_date >= datetime.combine(from_date, datetime.min.time()),
                ClinicalEncounter.encounter_date <= datetime.combine(to_date, datetime.max.time())
            ).count(),
            'lab_orders': LabOrder.query.filter(
                LabOrder.order_date >= from_date,
                LabOrder.order_date <= to_date
            ).count() if hasattr(LabOrder, 'order_date') else 0,
            'prescriptions': Prescription.query.filter(
                Prescription.created_at >= datetime.combine(from_date, datetime.min.time()),
                Prescription.created_at <= datetime.combine(to_date, datetime.max.time())
            ).count() if hasattr(Prescription, 'created_at') else 0
        }
        
        return jsonify({'success': True, 'reports': reports}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Patient Reports
@reports_bp.route('/patient-list', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_list():
    """Get patient list report"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        status = request.args.get('status', 'active')  # active, inactive, all
        
        query = Patient.query
        
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        if status == 'active':
            query = query.filter_by(is_active=True)
        elif status == 'inactive':
            query = query.filter_by(is_active=False)
        
        patients = query.limit(1000).all()
        
        return jsonify({
            'success': True,
            'patients': [p.to_dict() for p in patients],
            'count': len(patients)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/prescriptions', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_prescriptions_report():
    """Get prescriptions report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        patient_id = request.args.get('patient_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        
        from src.models.prescribing import Prescription
        
        query = Prescription.query
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        
        if from_date:
            from_date_obj = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
            query = query.filter(Prescription.created_at >= datetime.combine(from_date_obj, datetime.min.time()))
        
        if to_date:
            to_date_obj = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
            query = query.filter(Prescription.created_at <= datetime.combine(to_date_obj, datetime.max.time()))
        
        prescriptions = query.order_by(Prescription.created_at.desc()).limit(500).all()
        
        return jsonify({
            'success': True,
            'prescriptions': [p.to_dict() if hasattr(p, 'to_dict') else {} for p in prescriptions],
            'count': len(prescriptions)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Visit Reports
@reports_bp.route('/appointments', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def get_appointments_report():
    """Get appointments report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        provider_id = request.args.get('provider_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        status = request.args.get('status')
        
        query = Appointment.query
        
        if from_date:
            from_date_obj = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
            query = query.filter(Appointment.appointment_date >= from_date_obj)
        
        if to_date:
            to_date_obj = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
            query = query.filter(Appointment.appointment_date <= to_date_obj)
        
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        if status:
            query = query.filter_by(status=status)
        
        appointments = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).limit(500).all()
        
        return jsonify({
            'success': True,
            'appointments': [a.to_dict() for a in appointments],
            'count': len(appointments)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/encounters', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_encounters_report():
    """Get encounters report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        provider_id = request.args.get('provider_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        encounter_type = request.args.get('encounter_type')
        
        query = ClinicalEncounter.query
        
        if from_date:
            from_date_obj = datetime.fromisoformat(from_date) if isinstance(from_date, str) else from_date
            query = query.filter(ClinicalEncounter.encounter_date >= from_date_obj)
        
        if to_date:
            to_date_obj = datetime.fromisoformat(to_date) if isinstance(to_date, str) else to_date
            query = query.filter(ClinicalEncounter.encounter_date <= to_date_obj)
        
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        if encounter_type:
            query = query.filter_by(encounter_type=encounter_type)
        
        encounters = query.order_by(ClinicalEncounter.encounter_date.desc()).limit(500).all()
        
        return jsonify({
            'success': True,
            'encounters': [e.to_dict() for e in encounters],
            'count': len(encounters)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Financial Reports
@reports_bp.route('/collections', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'System Administrator', 'admin', 'billing', 'receptionist'])
def get_collections_report():
    """Get collections and aging report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        facility_id = request.args.get('facility_id', type=int)
        
        if not from_date:
            from_date = date.today() - timedelta(days=90)
        else:
            from_date = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
        
        # Get charges
        charges_query = Charge.query.filter(
            Charge.charge_date >= from_date,
            Charge.charge_date <= to_date
        )
        
        if facility_id:
            charges_query = charges_query.filter_by(facility_id=facility_id)
        
        charges = charges_query.all()
        
        # Calculate aging
        aging = {
            'current': 0,
            '30_days': 0,
            '60_days': 0,
            '90_days': 0,
            'over_90_days': 0
        }
        
        today = date.today()
        for charge in charges:
            days_old = (today - charge.charge_date).days if charge.charge_date else 0
            amount = float(charge.total_amount)
            
            if days_old <= 30:
                aging['current'] += amount
            elif days_old <= 60:
                aging['30_days'] += amount
            elif days_old <= 90:
                aging['60_days'] += amount
            elif days_old <= 120:
                aging['90_days'] += amount
            else:
                aging['over_90_days'] += amount
        
        return jsonify({
            'success': True,
            'aging': aging,
            'total_outstanding': sum(aging.values())
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/sales-by-item', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'System Administrator', 'admin', 'billing'])
def get_sales_by_item():
    """Get sales by item report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        if not from_date:
            from_date = date.today() - timedelta(days=30)
        else:
            from_date = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
        
        # Get charges grouped by billing code
        charges = Charge.query.filter(
            Charge.charge_date >= from_date,
            Charge.charge_date <= to_date
        ).all()
        
        # Group by billing code
        sales_by_item = {}
        for charge in charges:
            code_id = charge.billing_code_id
            if code_id not in sales_by_item:
                from src.models.billing import BillingCode
                billing_code = BillingCode.query.get(code_id)
                sales_by_item[code_id] = {
                    'code': billing_code.code if billing_code else 'N/A',
                    'description': billing_code.description if billing_code else 'N/A',
                    'quantity': 0,
                    'total_amount': 0
                }
            
            sales_by_item[code_id]['quantity'] += charge.quantity
            sales_by_item[code_id]['total_amount'] += float(charge.total_amount)
        
        return jsonify({
            'success': True,
            'sales_by_item': list(sales_by_item.values()),
            'date_range': {
                'from_date': from_date.isoformat() if isinstance(from_date, date) else from_date,
                'to_date': to_date.isoformat() if isinstance(to_date, date) else to_date
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _build_patient_ledger(patient_id):
    """Return (patient dict, ledger_entries list, current_balance). Oldest-first for running balance."""
    patient = Patient.query.get_or_404(patient_id)
    charges = Charge.query.filter_by(patient_id=patient_id).all()
    payments = Payment.query.filter_by(patient_id=patient_id).all()

    ledger_entries = []
    for charge in charges:
        ledger_entries.append({
            'date': charge.charge_date.isoformat() if charge.charge_date else None,
            'type': 'charge',
            'description': f"Charge #{charge.charge_id} (code {charge.billing_code_id})",
            'debit': float(charge.total_amount),
            'credit': 0.0,
            'balance': 0.0,
        })
    for payment in payments:
        amt = float(payment.payment_amount) if payment.payment_amount else 0.0
        ledger_entries.append({
            'date': payment.payment_date.isoformat() if payment.payment_date else None,
            'type': 'payment',
            'description': f"Payment {payment.payment_id} ({payment.payment_method})",
            'debit': 0.0,
            'credit': amt,
            'balance': 0.0,
        })

    ledger_entries.sort(key=lambda x: x['date'] or '')
    balance = 0.0
    for entry in ledger_entries:
        balance += entry['debit'] - entry['credit']
        entry['balance'] = balance

    return patient.to_dict(), ledger_entries, balance


@reports_bp.route('/patient-ledger/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'System Administrator', 'admin', 'billing', 'receptionist'])
def get_patient_ledger(patient_id):
    """Get patient ledger (account statement)"""
    try:
        patient_dict, ledger_entries, balance = _build_patient_ledger(patient_id)
        return jsonify({
            'success': True,
            'patient': patient_dict,
            'ledger': ledger_entries,
            'current_balance': balance
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reports_bp.route('/patient-ledger/<int:patient_id>/export.csv', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'System Administrator', 'admin', 'billing', 'receptionist'])
def export_patient_ledger_csv(patient_id):
    """Download patient ledger as CSV (spreadsheet-friendly)."""
    try:
        patient_dict, ledger_entries, balance = _build_patient_ledger(patient_id)
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(['Patient ledger export'])
        writer.writerow(['Patient ID', patient_id])
        writer.writerow(['Name', f"{patient_dict.get('first_name', '')} {patient_dict.get('last_name', '')}".strip()])
        writer.writerow(['Current balance', f'{balance:.2f}'])
        writer.writerow([])
        writer.writerow(['Date', 'Type', 'Description', 'Debit', 'Credit', 'Running balance'])
        for row in ledger_entries:
            writer.writerow([
                row['date'] or '',
                row['type'],
                row['description'],
                f"{row['debit']:.2f}",
                f"{row['credit']:.2f}",
                f"{row['balance']:.2f}",
            ])
        csv_data = buf.getvalue()
        fname = f"patient-{patient_id}-ledger.csv"
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename="{fname}"'},
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Inventory Reports
@reports_bp.route('/inventory/list', methods=['GET'])
@token_required
@role_required(['Pharmacist', 'System Administrator'])
def get_inventory_list():
    """Get inventory list report"""
    try:
        from src.models.pharmacy import DrugInventory
        inventory = DrugInventory.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'inventory': [i.to_dict() if hasattr(i, 'to_dict') else {} for i in inventory]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/inventory/activity', methods=['GET'])
@token_required
@role_required(['Pharmacist', 'System Administrator'])
def get_inventory_activity():
    """Get inventory activity report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        if not from_date:
            from_date = date.today() - timedelta(days=30)
        else:
            from_date = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
        
        # Get inventory transactions (if model exists)
        # This would query inventory_transactions table
        
        return jsonify({
            'success': True,
            'date_range': {
                'from_date': from_date.isoformat() if isinstance(from_date, date) else from_date,
                'to_date': to_date.isoformat() if isinstance(to_date, date) else to_date
            },
            'activity': []  # Would be populated from inventory_transactions
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Immunization Reports
@reports_bp.route('/immunization-registry', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_immunization_registry():
    """Get immunization registry report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        # Get immunizations (if model exists)
        immunization_data = []
        
        return jsonify({
            'success': True,
            'immunizations': immunization_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Referrals Report
@reports_bp.route('/referrals', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_referrals_report():
    """Get referrals report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        provider_id = request.args.get('provider_id', type=int)
        
        # Get referrals (if model exists)
        referrals = []
        
        return jsonify({
            'success': True,
            'referrals': referrals
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

