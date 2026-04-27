import React, { useEffect, useMemo, useState } from 'react'
import { apiService } from '../services/apiService'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { DollarSign, Building2, BookOpen, Receipt, Wallet, BarChart3 } from 'lucide-react'

const currency = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function FinanceDepartment() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [entries, setEntries] = useState([])
  const [expenses, setExpenses] = useState([])
  const [budgets, setBudgets] = useState([])
  const [invoices, setInvoices] = useState([])
  const [bills, setBills] = useState([])
  const [trialBalance, setTrialBalance] = useState(null)

  const [newAccount, setNewAccount] = useState({
    account_code: '',
    account_name: '',
    account_type: 'asset',
    sub_type: '',
    normal_balance: 'debit',
    opening_balance: 0
  })

  const [newJournal, setNewJournal] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    reference: '',
    memo: '',
    status: 'posted',
    lines: [
      { account_id: '', description: '', debit: 0, credit: 0 },
      { account_id: '', description: '', debit: 0, credit: 0 }
    ]
  })

  const [newExpense, setNewExpense] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    department: 'Finance',
    category: 'Operations',
    amount: 0,
    tax_amount: 0,
    payment_status: 'unpaid',
    notes: ''
  })

  const [newBudget, setNewBudget] = useState({
    fiscal_year: new Date().getFullYear(),
    period: 'annual',
    department: 'Finance',
    category: 'General',
    allocated_amount: 0,
    used_amount: 0
  })

  const [newInvoice, setNewInvoice] = useState({
    customer_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 0,
    tax_amount: 0,
    paid_amount: 0,
    notes: ''
  })

  const [newBill, setNewBill] = useState({
    vendor_name: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 0,
    tax_amount: 0,
    paid_amount: 0,
    notes: ''
  })

  const journalTotals = useMemo(() => {
    const debit = newJournal.lines.reduce((acc, line) => acc + Number(line.debit || 0), 0)
    const credit = newJournal.lines.reduce((acc, line) => acc + Number(line.credit || 0), 0)
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.0001 }
  }, [newJournal.lines])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [
        dashboardRes,
        accountsRes,
        entriesRes,
        expensesRes,
        budgetsRes,
        arRes,
        apRes,
        trialRes
      ] = await Promise.allSettled([
        apiService.request('/finance/dashboard', { method: 'GET' }),
        apiService.request('/finance/chart-of-accounts', { method: 'GET' }),
        apiService.request('/finance/journal-entries', { method: 'GET' }),
        apiService.request('/finance/expenses', { method: 'GET' }),
        apiService.request('/finance/budgets', { method: 'GET' }),
        apiService.request('/finance/accounts-receivable', { method: 'GET' }),
        apiService.request('/finance/accounts-payable', { method: 'GET' }),
        apiService.request('/finance/reports/trial-balance', { method: 'GET' }),
      ])

      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.success) setDashboard(dashboardRes.value.dashboard)
      if (accountsRes.status === 'fulfilled' && accountsRes.value.success) setAccounts(accountsRes.value.accounts || [])
      if (entriesRes.status === 'fulfilled' && entriesRes.value.success) setEntries(entriesRes.value.entries || [])
      if (expensesRes.status === 'fulfilled' && expensesRes.value.success) setExpenses(expensesRes.value.expenses || [])
      if (budgetsRes.status === 'fulfilled' && budgetsRes.value.success) setBudgets(budgetsRes.value.budgets || [])
      if (arRes.status === 'fulfilled' && arRes.value.success) setInvoices(arRes.value.invoices || [])
      if (apRes.status === 'fulfilled' && apRes.value.success) setBills(apRes.value.bills || [])
      if (trialRes.status === 'fulfilled' && trialRes.value.success) setTrialBalance(trialRes.value.report)
    } catch (e) {
      console.error('Finance module load error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const createAccount = async () => {
    await apiService.request('/finance/chart-of-accounts', { method: 'POST', body: JSON.stringify(newAccount) })
    setNewAccount({ account_code: '', account_name: '', account_type: 'asset', sub_type: '', normal_balance: 'debit', opening_balance: 0 })
    loadAll()
  }

  const createJournal = async () => {
    if (!journalTotals.balanced) return
    await apiService.request('/finance/journal-entries', { method: 'POST', body: JSON.stringify(newJournal) })
    setNewJournal({
      entry_date: new Date().toISOString().split('T')[0],
      reference: '',
      memo: '',
      status: 'posted',
      lines: [{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }]
    })
    loadAll()
  }

  const createExpense = async () => {
    await apiService.request('/finance/expenses', { method: 'POST', body: JSON.stringify(newExpense) })
    setNewExpense({
      expense_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      department: 'Finance',
      category: 'Operations',
      amount: 0,
      tax_amount: 0,
      payment_status: 'unpaid',
      notes: ''
    })
    loadAll()
  }

  const createBudget = async () => {
    await apiService.request('/finance/budgets', { method: 'POST', body: JSON.stringify(newBudget) })
    setNewBudget({
      fiscal_year: new Date().getFullYear(),
      period: 'annual',
      department: 'Finance',
      category: 'General',
      allocated_amount: 0,
      used_amount: 0
    })
    loadAll()
  }

  const createARInvoice = async () => {
    await apiService.request('/finance/accounts-receivable', { method: 'POST', body: JSON.stringify(newInvoice) })
    setNewInvoice({
      customer_name: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 0,
      tax_amount: 0,
      paid_amount: 0,
      notes: ''
    })
    loadAll()
  }

  const createAPBill = async () => {
    await apiService.request('/finance/accounts-payable', { method: 'POST', body: JSON.stringify(newBill) })
    setNewBill({
      vendor_name: '',
      bill_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 0,
      tax_amount: 0,
      paid_amount: 0,
      notes: ''
    })
    loadAll()
  }

  const updateJournalLine = (idx, field, value) => {
    const lines = [...newJournal.lines]
    lines[idx] = { ...lines[idx], [field]: value }
    setNewJournal({ ...newJournal, lines })
  }

  if (loading) return <div className="p-6">Loading Finance Department...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance Department</h1>
        <p className="text-gray-600">Accounting, budgeting, receivables, payables, and financial reporting.</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="accounts">COA</TabsTrigger>
          <TabsTrigger value="journals">Journals</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="arap">AR/AP</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Revenue</div><div className="text-2xl font-bold">{currency(dashboard?.total_revenue)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Expenses</div><div className="text-2xl font-bold">{currency(dashboard?.total_expenses)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Net Income</div><div className="text-2xl font-bold">{currency(dashboard?.net_income)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Chart of Accounts</div><div className="text-2xl font-bold">{dashboard?.chart_of_accounts_count || 0}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Accounts Receivable</div><div className="text-xl font-semibold">{currency(dashboard?.accounts_receivable)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Accounts Payable</div><div className="text-xl font-semibold">{currency(dashboard?.accounts_payable)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Budget Remaining</div><div className="text-xl font-semibold">{currency(dashboard?.budget_remaining)}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Create GL Account</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Input placeholder="Code" value={newAccount.account_code} onChange={(e) => setNewAccount({ ...newAccount, account_code: e.target.value })} />
              <Input placeholder="Name" value={newAccount.account_name} onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })} />
              <Input placeholder="Type" value={newAccount.account_type} onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })} />
              <Input placeholder="Sub-type" value={newAccount.sub_type} onChange={(e) => setNewAccount({ ...newAccount, sub_type: e.target.value })} />
              <Input placeholder="Normal balance" value={newAccount.normal_balance} onChange={(e) => setNewAccount({ ...newAccount, normal_balance: e.target.value })} />
              <Input type="number" placeholder="Opening balance" value={newAccount.opening_balance} onChange={(e) => setNewAccount({ ...newAccount, opening_balance: Number(e.target.value) })} />
              <Button className="md:col-span-6" onClick={createAccount}>Add Account</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Chart of Accounts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between border rounded p-3">
                  <div>
                    <div className="font-medium">{acc.account_code} - {acc.account_name}</div>
                    <div className="text-xs text-gray-500">{acc.account_type} / {acc.sub_type || 'n/a'}</div>
                  </div>
                  <div className="text-right">
                    <Badge>{acc.normal_balance}</Badge>
                    <div className="font-semibold">{currency(acc.current_balance)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>New Journal Entry</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input type="date" value={newJournal.entry_date} onChange={(e) => setNewJournal({ ...newJournal, entry_date: e.target.value })} />
                <Input placeholder="Reference" value={newJournal.reference} onChange={(e) => setNewJournal({ ...newJournal, reference: e.target.value })} />
                <Input placeholder="Memo" value={newJournal.memo} onChange={(e) => setNewJournal({ ...newJournal, memo: e.target.value })} />
                <Input placeholder="Status (draft|posted)" value={newJournal.status} onChange={(e) => setNewJournal({ ...newJournal, status: e.target.value })} />
              </div>
              {newJournal.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <select className="px-3 py-2 border rounded" value={line.account_id} onChange={(e) => updateJournalLine(idx, 'account_id', Number(e.target.value))}>
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                  </select>
                  <Input placeholder="Description" value={line.description} onChange={(e) => updateJournalLine(idx, 'description', e.target.value)} />
                  <Input type="number" placeholder="Debit" value={line.debit} onChange={(e) => updateJournalLine(idx, 'debit', Number(e.target.value))} />
                  <Input type="number" placeholder="Credit" value={line.credit} onChange={(e) => updateJournalLine(idx, 'credit', Number(e.target.value))} />
                  <Button variant="outline" onClick={() => setNewJournal({ ...newJournal, lines: [...newJournal.lines, { account_id: '', description: '', debit: 0, credit: 0 }] })}>Add Line</Button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <div className={`text-sm ${journalTotals.balanced ? 'text-green-600' : 'text-red-600'}`}>
                  Debits: {currency(journalTotals.debit)} | Credits: {currency(journalTotals.credit)} | {journalTotals.balanced ? 'Balanced' : 'Not Balanced'}
                </div>
                <Button disabled={!journalTotals.balanced} onClick={createJournal}>Post Journal Entry</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Journal Ledger</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded p-3">
                  <div className="flex justify-between">
                    <div className="font-medium">{entry.entry_number} - {entry.reference || 'No reference'}</div>
                    <Badge>{entry.status}</Badge>
                  </div>
                  <div className="text-xs text-gray-500">{entry.entry_date} | {entry.memo || ''}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Record Expense</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input type="date" value={newExpense.expense_date} onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })} />
              <Input placeholder="Vendor" value={newExpense.vendor_name} onChange={(e) => setNewExpense({ ...newExpense, vendor_name: e.target.value })} />
              <Input placeholder="Department" value={newExpense.department} onChange={(e) => setNewExpense({ ...newExpense, department: e.target.value })} />
              <Input placeholder="Category" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} />
              <Input type="number" placeholder="Amount" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} />
              <Input type="number" placeholder="Tax" value={newExpense.tax_amount} onChange={(e) => setNewExpense({ ...newExpense, tax_amount: Number(e.target.value) })} />
              <Input placeholder="Payment status" value={newExpense.payment_status} onChange={(e) => setNewExpense({ ...newExpense, payment_status: e.target.value })} />
              <Input placeholder="Notes" value={newExpense.notes} onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })} />
              <Button className="md:col-span-4" onClick={createExpense}>Save Expense</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Expense Register</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between border rounded p-3">
                  <div>
                    <div className="font-medium">{exp.expense_number} - {exp.vendor_name}</div>
                    <div className="text-xs text-gray-500">{exp.expense_date} | {exp.department} | {exp.category}</div>
                  </div>
                  <div className="text-right">
                    <Badge>{exp.payment_status}</Badge>
                    <div className="font-semibold">{currency(exp.total_amount)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Create Budget</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Input type="number" placeholder="Fiscal year" value={newBudget.fiscal_year} onChange={(e) => setNewBudget({ ...newBudget, fiscal_year: Number(e.target.value) })} />
              <Input placeholder="Period" value={newBudget.period} onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })} />
              <Input placeholder="Department" value={newBudget.department} onChange={(e) => setNewBudget({ ...newBudget, department: e.target.value })} />
              <Input placeholder="Category" value={newBudget.category} onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })} />
              <Input type="number" placeholder="Allocated" value={newBudget.allocated_amount} onChange={(e) => setNewBudget({ ...newBudget, allocated_amount: Number(e.target.value) })} />
              <Input type="number" placeholder="Used" value={newBudget.used_amount} onChange={(e) => setNewBudget({ ...newBudget, used_amount: Number(e.target.value) })} />
              <Button className="md:col-span-6" onClick={createBudget}>Save Budget</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Budget Tracker</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {budgets.map((b) => (
                <div key={b.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{b.budget_code} - {b.department} ({b.fiscal_year})</div>
                    <Badge>{b.status}</Badge>
                  </div>
                  <div className="text-sm">Allocated: {currency(b.allocated_amount)} | Used: {currency(b.used_amount)} | Remaining: {currency(b.remaining_amount)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arap" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Create AR Invoice</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="Customer" value={newInvoice.customer_name} onChange={(e) => setNewInvoice({ ...newInvoice, customer_name: e.target.value })} />
                <Input type="date" value={newInvoice.issue_date} onChange={(e) => setNewInvoice({ ...newInvoice, issue_date: e.target.value })} />
                <Input type="date" value={newInvoice.due_date} onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })} />
                <Input type="number" placeholder="Subtotal" value={newInvoice.subtotal} onChange={(e) => setNewInvoice({ ...newInvoice, subtotal: Number(e.target.value) })} />
                <Input type="number" placeholder="Tax" value={newInvoice.tax_amount} onChange={(e) => setNewInvoice({ ...newInvoice, tax_amount: Number(e.target.value) })} />
                <Input type="number" placeholder="Paid amount" value={newInvoice.paid_amount} onChange={(e) => setNewInvoice({ ...newInvoice, paid_amount: Number(e.target.value) })} />
                <Button onClick={createARInvoice}>Create AR Invoice</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Create AP Bill</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="Vendor" value={newBill.vendor_name} onChange={(e) => setNewBill({ ...newBill, vendor_name: e.target.value })} />
                <Input type="date" value={newBill.bill_date} onChange={(e) => setNewBill({ ...newBill, bill_date: e.target.value })} />
                <Input type="date" value={newBill.due_date} onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })} />
                <Input type="number" placeholder="Subtotal" value={newBill.subtotal} onChange={(e) => setNewBill({ ...newBill, subtotal: Number(e.target.value) })} />
                <Input type="number" placeholder="Tax" value={newBill.tax_amount} onChange={(e) => setNewBill({ ...newBill, tax_amount: Number(e.target.value) })} />
                <Input type="number" placeholder="Paid amount" value={newBill.paid_amount} onChange={(e) => setNewBill({ ...newBill, paid_amount: Number(e.target.value) })} />
                <Button onClick={createAPBill}>Create AP Bill</Button>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Accounts Receivable</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {invoices.map((inv) => (
                  <div key={inv.id} className="border rounded p-2 flex justify-between">
                    <div><div className="font-medium">{inv.invoice_number}</div><div className="text-xs text-gray-500">{inv.customer_name}</div></div>
                    <div className="text-right"><Badge>{inv.status}</Badge><div>{currency(inv.balance_amount)}</div></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Accounts Payable</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {bills.map((bill) => (
                  <div key={bill.id} className="border rounded p-2 flex justify-between">
                    <div><div className="font-medium">{bill.bill_number}</div><div className="text-xs text-gray-500">{bill.vendor_name}</div></div>
                    <div className="text-right"><Badge>{bill.status}</Badge><div>{currency(bill.balance_amount)}</div></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Trial Balance</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 text-sm">
                Total Debits: <span className="font-semibold">{currency(trialBalance?.total_debit)}</span> | Total Credits: <span className="font-semibold">{currency(trialBalance?.total_credit)}</span> |{' '}
                <Badge className={trialBalance?.is_balanced ? 'bg-green-600' : 'bg-red-600'}>
                  {trialBalance?.is_balanced ? 'Balanced' : 'Out of balance'}
                </Badge>
              </div>
              <div className="space-y-1">
                {(trialBalance?.rows || []).map((row, idx) => (
                  <div key={`${row.account_code}-${idx}`} className="grid grid-cols-4 gap-2 border-b py-1 text-sm">
                    <div>{row.account_code}</div>
                    <div>{row.account_name}</div>
                    <div className="text-right">{currency(row.debit)}</div>
                    <div className="text-right">{currency(row.credit)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

