"""
Finance and Accounting models for Clinic+
"""
from datetime import datetime, date
from decimal import Decimal
from src.models.user import db


class GLAccount(db.Model):
    """General ledger account (chart of accounts)."""
    __tablename__ = 'gl_accounts'

    id = db.Column(db.Integer, primary_key=True)
    account_code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    account_name = db.Column(db.String(255), nullable=False)
    account_type = db.Column(db.String(50), nullable=False)  # asset, liability, equity, revenue, expense
    sub_type = db.Column(db.String(80), nullable=True)
    normal_balance = db.Column(db.String(10), nullable=False, default='debit')  # debit|credit
    opening_balance = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    current_balance = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    is_active = db.Column(db.Boolean, default=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'account_code': self.account_code,
            'account_name': self.account_name,
            'account_type': self.account_type,
            'sub_type': self.sub_type,
            'normal_balance': self.normal_balance,
            'opening_balance': float(self.opening_balance or 0),
            'current_balance': float(self.current_balance or 0),
            'is_active': self.is_active,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class JournalEntry(db.Model):
    """Journal entry header."""
    __tablename__ = 'journal_entries'

    id = db.Column(db.Integer, primary_key=True)
    entry_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    entry_date = db.Column(db.Date, nullable=False, default=date.today)
    reference = db.Column(db.String(120), nullable=True)
    memo = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), nullable=False, default='draft')  # draft, posted, reversed
    posted_at = db.Column(db.DateTime, nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    approved_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lines = db.relationship('JournalLine', backref='journal_entry', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'entry_number': self.entry_number,
            'entry_date': self.entry_date.isoformat() if self.entry_date else None,
            'reference': self.reference,
            'memo': self.memo,
            'status': self.status,
            'posted_at': self.posted_at.isoformat() if self.posted_at else None,
            'created_by': self.created_by,
            'approved_by': self.approved_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'lines': [line.to_dict() for line in self.lines],
        }


class JournalLine(db.Model):
    """Journal entry line item."""
    __tablename__ = 'journal_lines'

    id = db.Column(db.Integer, primary_key=True)
    journal_entry_id = db.Column(db.Integer, db.ForeignKey('journal_entries.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('gl_accounts.id'), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    debit = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    credit = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    line_order = db.Column(db.Integer, default=1)

    account = db.relationship('GLAccount')

    def to_dict(self):
        return {
            'id': self.id,
            'journal_entry_id': self.journal_entry_id,
            'account_id': self.account_id,
            'account_code': self.account.account_code if self.account else None,
            'account_name': self.account.account_name if self.account else None,
            'description': self.description,
            'debit': float(self.debit or 0),
            'credit': float(self.credit or 0),
            'line_order': self.line_order,
        }


class ExpenseRecord(db.Model):
    """Operating expense record."""
    __tablename__ = 'expense_records'

    id = db.Column(db.Integer, primary_key=True)
    expense_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    expense_date = db.Column(db.Date, nullable=False, default=date.today)
    vendor_name = db.Column(db.String(255), nullable=False)
    department = db.Column(db.String(120), nullable=True)
    category = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    total_amount = db.Column(db.Numeric(14, 2), nullable=False)
    payment_status = db.Column(db.String(30), default='unpaid')  # unpaid, partial, paid
    payment_method = db.Column(db.String(40), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'expense_number': self.expense_number,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'vendor_name': self.vendor_name,
            'department': self.department,
            'category': self.category,
            'amount': float(self.amount or 0),
            'tax_amount': float(self.tax_amount or 0),
            'total_amount': float(self.total_amount or 0),
            'payment_status': self.payment_status,
            'payment_method': self.payment_method,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class BudgetPlan(db.Model):
    """Budget by department and period."""
    __tablename__ = 'budget_plans'

    id = db.Column(db.Integer, primary_key=True)
    budget_code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    fiscal_year = db.Column(db.Integer, nullable=False)
    period = db.Column(db.String(20), nullable=False, default='annual')  # annual, quarterly, monthly
    department = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(120), nullable=True)
    allocated_amount = db.Column(db.Numeric(14, 2), nullable=False)
    used_amount = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    remaining_amount = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    status = db.Column(db.String(30), default='active')
    created_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'budget_code': self.budget_code,
            'fiscal_year': self.fiscal_year,
            'period': self.period,
            'department': self.department,
            'category': self.category,
            'allocated_amount': float(self.allocated_amount or 0),
            'used_amount': float(self.used_amount or 0),
            'remaining_amount': float(self.remaining_amount or 0),
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ARInvoice(db.Model):
    """Accounts Receivable invoice."""
    __tablename__ = 'ar_invoices'

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    customer_name = db.Column(db.String(255), nullable=False)
    issue_date = db.Column(db.Date, nullable=False, default=date.today)
    due_date = db.Column(db.Date, nullable=False)
    subtotal = db.Column(db.Numeric(14, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    total_amount = db.Column(db.Numeric(14, 2), nullable=False)
    paid_amount = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    balance_amount = db.Column(db.Numeric(14, 2), nullable=False)
    status = db.Column(db.String(30), default='open')  # open, partial, paid, overdue
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'customer_name': self.customer_name,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'subtotal': float(self.subtotal or 0),
            'tax_amount': float(self.tax_amount or 0),
            'total_amount': float(self.total_amount or 0),
            'paid_amount': float(self.paid_amount or 0),
            'balance_amount': float(self.balance_amount or 0),
            'status': self.status,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class APBill(db.Model):
    """Accounts Payable bill."""
    __tablename__ = 'ap_bills'

    id = db.Column(db.Integer, primary_key=True)
    bill_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    vendor_name = db.Column(db.String(255), nullable=False)
    bill_date = db.Column(db.Date, nullable=False, default=date.today)
    due_date = db.Column(db.Date, nullable=False)
    subtotal = db.Column(db.Numeric(14, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    total_amount = db.Column(db.Numeric(14, 2), nullable=False)
    paid_amount = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    balance_amount = db.Column(db.Numeric(14, 2), nullable=False)
    status = db.Column(db.String(30), default='open')  # open, partial, paid, overdue
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'bill_number': self.bill_number,
            'vendor_name': self.vendor_name,
            'bill_date': self.bill_date.isoformat() if self.bill_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'subtotal': float(self.subtotal or 0),
            'tax_amount': float(self.tax_amount or 0),
            'total_amount': float(self.total_amount or 0),
            'paid_amount': float(self.paid_amount or 0),
            'balance_amount': float(self.balance_amount or 0),
            'status': self.status,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

