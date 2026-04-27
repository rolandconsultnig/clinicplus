"""
Finance Department and Accounting API routes.
"""
from datetime import date, datetime
from decimal import Decimal
import uuid

from flask import Blueprint, jsonify, request

from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.finance import (
    GLAccount,
    JournalEntry,
    JournalLine,
    ExpenseRecord,
    BudgetPlan,
    ARInvoice,
    APBill,
)


finance_bp = Blueprint('finance', __name__)
_tables_ready = False


def _to_decimal(value, default='0.00'):
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _ensure_finance_tables():
    global _tables_ready
    if _tables_ready:
        return

    # Create only finance tables if missing to avoid interfering
    # with the rest of the migration flow.
    tables = [
        GLAccount.__table__,
        JournalEntry.__table__,
        JournalLine.__table__,
        ExpenseRecord.__table__,
        BudgetPlan.__table__,
        ARInvoice.__table__,
        APBill.__table__,
    ]
    for table in tables:
        table.create(bind=db.engine, checkfirst=True)
    _tables_ready = True


def _status_with_overdue(status, due_date):
    if status == 'paid':
        return status
    if due_date and due_date < date.today():
        return 'overdue'
    return status


@finance_bp.before_request
def initialize_finance_module():
    _ensure_finance_tables()


@finance_bp.route('/dashboard', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def get_finance_dashboard():
    """Finance summary dashboard metrics."""
    try:
        accounts = GLAccount.query.filter_by(is_active=True).count()
        open_ar = ARInvoice.query.filter(ARInvoice.balance_amount > 0).all()
        open_ap = APBill.query.filter(APBill.balance_amount > 0).all()

        total_ar = sum(float(inv.balance_amount or 0) for inv in open_ar)
        total_ap = sum(float(bill.balance_amount or 0) for bill in open_ap)
        total_expenses = sum(float(exp.total_amount or 0) for exp in ExpenseRecord.query.all())
        total_revenue = sum(float(inv.total_amount or 0) for inv in ARInvoice.query.all())

        budgets = BudgetPlan.query.filter_by(status='active').all()
        budget_allocated = sum(float(b.allocated_amount or 0) for b in budgets)
        budget_used = sum(float(b.used_amount or 0) for b in budgets)

        trial_debit = sum(float(line.debit or 0) for line in JournalLine.query.all())
        trial_credit = sum(float(line.credit or 0) for line in JournalLine.query.all())

        return jsonify({
            'success': True,
            'dashboard': {
                'chart_of_accounts_count': accounts,
                'total_revenue': total_revenue,
                'total_expenses': total_expenses,
                'net_income': total_revenue - total_expenses,
                'accounts_receivable': total_ar,
                'accounts_payable': total_ap,
                'budget_allocated': budget_allocated,
                'budget_used': budget_used,
                'budget_remaining': budget_allocated - budget_used,
                'trial_balance': {
                    'total_debits': trial_debit,
                    'total_credits': trial_credit,
                    'is_balanced': abs(trial_debit - trial_credit) < 0.0001,
                }
            }
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/chart-of-accounts', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def list_chart_of_accounts():
    """List general ledger accounts."""
    try:
        account_type = request.args.get('account_type')
        active_only = request.args.get('active_only', 'true').lower() == 'true'

        query = GLAccount.query
        if account_type:
            query = query.filter(GLAccount.account_type == account_type)
        if active_only:
            query = query.filter(GLAccount.is_active.is_(True))

        accounts = query.order_by(GLAccount.account_code.asc()).all()
        return jsonify({'success': True, 'accounts': [a.to_dict() for a in accounts]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/chart-of-accounts', methods=['POST'])
@token_required
@role_required(['admin', 'finance', 'accountant', 'root_admin'])
def create_account():
    """Create a chart of account entry."""
    try:
        data = request.get_json() or {}
        code = (data.get('account_code') or '').strip()
        name = (data.get('account_name') or '').strip()
        acc_type = (data.get('account_type') or '').strip().lower()

        if not code or not name or not acc_type:
            return jsonify({'success': False, 'error': 'account_code, account_name, account_type are required'}), 400

        if GLAccount.query.filter_by(account_code=code).first():
            return jsonify({'success': False, 'error': 'Account code already exists'}), 400

        account = GLAccount(
            account_code=code,
            account_name=name,
            account_type=acc_type,
            sub_type=data.get('sub_type'),
            normal_balance=(data.get('normal_balance') or 'debit').lower(),
            opening_balance=_to_decimal(data.get('opening_balance', 0)),
            current_balance=_to_decimal(data.get('opening_balance', 0)),
            is_active=bool(data.get('is_active', True)),
            description=data.get('description'),
        )
        db.session.add(account)
        db.session.commit()
        return jsonify({'success': True, 'account': account.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/chart-of-accounts/<int:account_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'finance', 'accountant', 'root_admin'])
def update_account(account_id):
    """Update chart of account entry."""
    try:
        account = GLAccount.query.get_or_404(account_id)
        data = request.get_json() or {}

        for field in ['account_name', 'sub_type', 'description']:
            if field in data:
                setattr(account, field, data[field])

        if 'is_active' in data:
            account.is_active = bool(data['is_active'])
        if 'normal_balance' in data:
            account.normal_balance = str(data['normal_balance']).lower()

        db.session.commit()
        return jsonify({'success': True, 'account': account.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/journal-entries', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def list_journal_entries():
    """List journal entries."""
    try:
        status = request.args.get('status')
        query = JournalEntry.query
        if status:
            query = query.filter(JournalEntry.status == status)

        entries = query.order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc()).all()
        return jsonify({'success': True, 'entries': [entry.to_dict() for entry in entries]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/journal-entries', methods=['POST'])
@token_required
@role_required(['admin', 'finance', 'accountant', 'root_admin'])
def create_journal_entry():
    """Create and optionally post a journal entry."""
    try:
        data = request.get_json() or {}
        lines = data.get('lines', [])
        if not lines or len(lines) < 2:
            return jsonify({'success': False, 'error': 'At least two journal lines are required'}), 400

        total_debit = sum(_to_decimal(line.get('debit', 0)) for line in lines)
        total_credit = sum(_to_decimal(line.get('credit', 0)) for line in lines)
        if total_debit != total_credit:
            return jsonify({'success': False, 'error': 'Total debits must equal total credits'}), 400

        entry = JournalEntry(
            entry_number=f"JE-{uuid.uuid4().hex[:10].upper()}",
            entry_date=date.fromisoformat(data.get('entry_date', date.today().isoformat())),
            reference=data.get('reference'),
            memo=data.get('memo'),
            status=(data.get('status') or 'draft').lower(),
            created_by=getattr(request.current_user, 'id', None),
        )
        db.session.add(entry)
        db.session.flush()

        for idx, line in enumerate(lines, 1):
            account = GLAccount.query.get(line.get('account_id'))
            if not account:
                db.session.rollback()
                return jsonify({'success': False, 'error': f"Invalid account_id on line {idx}"}), 400

            line_item = JournalLine(
                journal_entry_id=entry.id,
                account_id=account.id,
                description=line.get('description'),
                debit=_to_decimal(line.get('debit', 0)),
                credit=_to_decimal(line.get('credit', 0)),
                line_order=idx,
            )
            db.session.add(line_item)

            # Auto-post impact for non-draft entries
            if entry.status == 'posted':
                account.current_balance = _to_decimal(account.current_balance) + _to_decimal(line.get('debit', 0)) - _to_decimal(line.get('credit', 0))

        if entry.status == 'posted':
            entry.posted_at = datetime.utcnow()
            entry.approved_by = getattr(request.current_user, 'id', None)

        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/expenses', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def list_expenses():
    """List expense records."""
    try:
        expenses = ExpenseRecord.query.order_by(ExpenseRecord.expense_date.desc(), ExpenseRecord.created_at.desc()).all()
        return jsonify({'success': True, 'expenses': [exp.to_dict() for exp in expenses]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/expenses', methods=['POST'])
@token_required
@role_required(['admin', 'finance', 'accountant', 'root_admin'])
def create_expense():
    """Create expense record."""
    try:
        data = request.get_json() or {}
        amount = _to_decimal(data.get('amount', 0))
        tax_amount = _to_decimal(data.get('tax_amount', 0))
        total = amount + tax_amount
        expense = ExpenseRecord(
            expense_number=f"EXP-{uuid.uuid4().hex[:10].upper()}",
            expense_date=date.fromisoformat(data.get('expense_date', date.today().isoformat())),
            vendor_name=data.get('vendor_name') or 'Unknown Vendor',
            department=data.get('department'),
            category=data.get('category') or 'General',
            amount=amount,
            tax_amount=tax_amount,
            total_amount=total,
            payment_status=(data.get('payment_status') or 'unpaid').lower(),
            payment_method=data.get('payment_method'),
            notes=data.get('notes'),
            created_by=getattr(request.current_user, 'id', None),
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify({'success': True, 'expense': expense.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/budgets', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def list_budgets():
    """List budgets."""
    try:
        fiscal_year = request.args.get('fiscal_year', type=int)
        query = BudgetPlan.query
        if fiscal_year:
            query = query.filter(BudgetPlan.fiscal_year == fiscal_year)
        budgets = query.order_by(BudgetPlan.fiscal_year.desc(), BudgetPlan.department.asc()).all()
        return jsonify({'success': True, 'budgets': [b.to_dict() for b in budgets]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/budgets', methods=['POST'])
@token_required
@role_required(['admin', 'finance', 'accountant', 'root_admin'])
def create_budget():
    """Create budget plan."""
    try:
        data = request.get_json() or {}
        allocated = _to_decimal(data.get('allocated_amount', 0))
        used = _to_decimal(data.get('used_amount', 0))
        remaining = allocated - used

        budget = BudgetPlan(
            budget_code=f"BUD-{uuid.uuid4().hex[:10].upper()}",
            fiscal_year=int(data.get('fiscal_year', date.today().year)),
            period=data.get('period') or 'annual',
            department=data.get('department') or 'General',
            category=data.get('category'),
            allocated_amount=allocated,
            used_amount=used,
            remaining_amount=remaining,
            status=data.get('status') or 'active',
            created_by=getattr(request.current_user, 'id', None),
        )
        db.session.add(budget)
        db.session.commit()
        return jsonify({'success': True, 'budget': budget.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/accounts-receivable', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def list_accounts_receivable():
    """List AR invoices."""
    try:
        invoices = ARInvoice.query.order_by(ARInvoice.issue_date.desc(), ARInvoice.created_at.desc()).all()
        payload = []
        for inv in invoices:
            item = inv.to_dict()
            item['status'] = _status_with_overdue(item['status'], inv.due_date)
            payload.append(item)
        return jsonify({'success': True, 'invoices': payload}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/accounts-receivable', methods=['POST'])
@token_required
@role_required(['admin', 'finance', 'accountant', 'root_admin'])
def create_accounts_receivable():
    """Create AR invoice."""
    try:
        data = request.get_json() or {}
        subtotal = _to_decimal(data.get('subtotal', 0))
        tax = _to_decimal(data.get('tax_amount', 0))
        total = subtotal + tax
        paid = _to_decimal(data.get('paid_amount', 0))

        inv = ARInvoice(
            invoice_number=f"AR-{uuid.uuid4().hex[:10].upper()}",
            customer_name=data.get('customer_name') or 'Unknown Customer',
            issue_date=date.fromisoformat(data.get('issue_date', date.today().isoformat())),
            due_date=date.fromisoformat(data.get('due_date', date.today().isoformat())),
            subtotal=subtotal,
            tax_amount=tax,
            total_amount=total,
            paid_amount=paid,
            balance_amount=total - paid,
            status='paid' if total - paid <= 0 else ('partial' if paid > 0 else 'open'),
            notes=data.get('notes'),
            created_by=getattr(request.current_user, 'id', None),
        )
        db.session.add(inv)
        db.session.commit()
        return jsonify({'success': True, 'invoice': inv.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/accounts-payable', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def list_accounts_payable():
    """List AP bills."""
    try:
        bills = APBill.query.order_by(APBill.bill_date.desc(), APBill.created_at.desc()).all()
        payload = []
        for bill in bills:
            item = bill.to_dict()
            item['status'] = _status_with_overdue(item['status'], bill.due_date)
            payload.append(item)
        return jsonify({'success': True, 'bills': payload}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/accounts-payable', methods=['POST'])
@token_required
@role_required(['admin', 'finance', 'accountant', 'root_admin'])
def create_accounts_payable():
    """Create AP bill."""
    try:
        data = request.get_json() or {}
        subtotal = _to_decimal(data.get('subtotal', 0))
        tax = _to_decimal(data.get('tax_amount', 0))
        total = subtotal + tax
        paid = _to_decimal(data.get('paid_amount', 0))

        bill = APBill(
            bill_number=f"AP-{uuid.uuid4().hex[:10].upper()}",
            vendor_name=data.get('vendor_name') or 'Unknown Vendor',
            bill_date=date.fromisoformat(data.get('bill_date', date.today().isoformat())),
            due_date=date.fromisoformat(data.get('due_date', date.today().isoformat())),
            subtotal=subtotal,
            tax_amount=tax,
            total_amount=total,
            paid_amount=paid,
            balance_amount=total - paid,
            status='paid' if total - paid <= 0 else ('partial' if paid > 0 else 'open'),
            notes=data.get('notes'),
            created_by=getattr(request.current_user, 'id', None),
        )
        db.session.add(bill)
        db.session.commit()
        return jsonify({'success': True, 'bill': bill.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@finance_bp.route('/reports/trial-balance', methods=['GET'])
@token_required
@role_required(['admin', 'billing', 'finance', 'accountant', 'root_admin'])
def trial_balance_report():
    """Generate trial balance report from chart of accounts."""
    try:
        accounts = GLAccount.query.filter_by(is_active=True).order_by(GLAccount.account_code.asc()).all()
        rows = []
        total_debit = Decimal('0.00')
        total_credit = Decimal('0.00')

        for account in accounts:
            balance = _to_decimal(account.current_balance)
            debit = Decimal('0.00')
            credit = Decimal('0.00')
            if account.normal_balance == 'debit':
                debit = balance if balance >= 0 else Decimal('0.00')
            else:
                credit = balance if balance >= 0 else Decimal('0.00')

            total_debit += debit
            total_credit += credit
            rows.append({
                'account_code': account.account_code,
                'account_name': account.account_name,
                'account_type': account.account_type,
                'debit': float(debit),
                'credit': float(credit),
            })

        return jsonify({
            'success': True,
            'report': {
                'generated_at': datetime.utcnow().isoformat(),
                'rows': rows,
                'total_debit': float(total_debit),
                'total_credit': float(total_credit),
                'is_balanced': total_debit == total_credit,
            }
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500

