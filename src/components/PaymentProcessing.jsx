/**
 * Payment Processing Component - Enhanced
 * Handle payment transactions, refunds, and payment methods with gateway integration
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Receipt,
  Printer,
  Download,
  AlertCircle,
  Lock,
  Shield,
  Wallet,
  Building,
  Banknote,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { apiService } from '../services/apiService.js'

export default function PaymentProcessing({ patientId, invoiceId }) {
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showCardDetails, setShowCardDetails] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'card',
    card_number: '',
    card_holder: '',
    expiry: '',
    cvv: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    notes: '',
    save_payment_method: false
  })
  const [paymentGateways, setPaymentGateways] = useState([
    { id: 'stripe', name: 'Stripe', status: 'active', icon: '💳' },
    { id: 'paypal', name: 'PayPal', status: 'active', icon: '🔵' },
    { id: 'square', name: 'Square', status: 'inactive', icon: '⬜' }
  ])

  useEffect(() => {
    if (patientId) {
      loadPayments()
      loadInvoices()
      loadSavedPaymentMethods()
    }
  }, [patientId])

  const loadPayments = async () => {
    try {
      const response = await apiService.request(`/payments/patient/${patientId}`)
      if (response.success) {
        setPayments(response.payments || [])
      }
    } catch (error) {
      console.error('Error loading payments:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      const response = await apiService.request(`/billing/invoices?patient_id=${patientId}`)
      if (response.success) {
        setInvoices(response.invoices || [])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    }
  }

  const loadSavedPaymentMethods = async () => {
    try {
      const response = await apiService.request(`/payments/methods?patient_id=${patientId}`)
      if (response.success) {
        setSavedPaymentMethods(response.methods || [])
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
    }
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const processPayment = async (e) => {
    e.preventDefault()
    setProcessing(true)
    
    try {
      const paymentData = {
        patient_id: patientId,
        invoice_id: invoiceId,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        ...(paymentForm.method === 'card' && {
          card_number: paymentForm.card_number.replace(/\s/g, ''),
          card_holder: paymentForm.card_holder,
          expiry: paymentForm.expiry,
          cvv: paymentForm.cvv,
          billing_address: paymentForm.billing_address,
          billing_city: paymentForm.billing_city,
          billing_state: paymentForm.billing_state,
          billing_zip: paymentForm.billing_zip
        }),
        notes: paymentForm.notes,
        save_payment_method: paymentForm.save_payment_method && paymentForm.method === 'card'
      }

      const response = await apiService.request('/payments/process', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      })
      
      if (response.success) {
        alert('Payment processed successfully!')
        setPaymentForm({
          amount: '',
          method: 'card',
          card_number: '',
          card_holder: '',
          expiry: '',
          cvv: '',
          billing_address: '',
          billing_city: '',
          billing_state: '',
          billing_zip: '',
          notes: '',
          save_payment_method: false
        })
        loadPayments()
        loadInvoices()
        if (paymentForm.save_payment_method) {
          loadSavedPaymentMethods()
        }
      }
    } catch (error) {
      alert('Payment failed: ' + (error.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  const processPaymentWithSavedMethod = async (methodId, amount) => {
    setProcessing(true)
    try {
      const response = await apiService.request('/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          invoice_id: invoiceId,
          amount: parseFloat(amount),
          payment_method_id: methodId
        })
      })
      
      if (response.success) {
        alert('Payment processed successfully!')
        loadPayments()
        loadInvoices()
      }
    } catch (error) {
      alert('Payment failed: ' + (error.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  const refundPayment = async (paymentId) => {
    if (!confirm('Are you sure you want to refund this payment?')) return
    
    try {
      const response = await apiService.request(`/payments/${paymentId}/refund`, {
        method: 'POST'
      })
      if (response.success) {
        alert('Refund processed successfully')
        loadPayments()
      }
    } catch (error) {
      alert('Refund failed: ' + (error.message || 'Unknown error'))
    }
  }

  const deletePaymentMethod = async (methodId) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return
    
    try {
      const response = await apiService.request(`/payments/methods/${methodId}`, {
        method: 'DELETE'
      })
      if (response.success) {
        alert('Payment method deleted')
        loadSavedPaymentMethods()
      }
    } catch (error) {
      alert('Failed to delete payment method')
    }
  }

  const printReceipt = (payment) => {
    const receiptWindow = window.open('', '_blank')
    receiptWindow.document.write(`
      <html>
        <head><title>Receipt</title></head>
        <body style="font-family: Arial; padding: 20px;">
          <h2>Payment Receipt</h2>
          <p><strong>Transaction ID:</strong> ${payment.transaction_id}</p>
          <p><strong>Amount:</strong> ₦${payment.amount?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Method:</strong> ${payment.method}</p>
          <p><strong>Date:</strong> ${new Date(payment.created_at).toLocaleString()}</p>
          <p><strong>Status:</strong> ${payment.status}</p>
        </body>
      </html>
    `)
    receiptWindow.document.close()
    receiptWindow.print()
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCardType = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, '')
    if (/^4/.test(number)) return 'Visa'
    if (/^5[1-5]/.test(number)) return 'Mastercard'
    if (/^3[47]/.test(number)) return 'Amex'
    if (/^6/.test(number)) return 'Discover'
    return 'Card'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-green-600" />
            Payment Processing
          </h1>
          <p className="text-gray-600 mt-1">Process payments and manage transactions</p>
        </div>
        <Button onClick={() => { loadPayments(); loadInvoices(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Payment Gateways Status */}
      <div className="grid grid-cols-3 gap-4">
        {paymentGateways.map((gateway) => (
          <Card key={gateway.id} className={gateway.status === 'active' ? 'border-green-200 bg-green-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{gateway.icon} {gateway.name}</p>
                  <Badge variant={gateway.status === 'active' ? 'default' : 'outline'}>
                    {gateway.status}
                  </Badge>
                </div>
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="process" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="process">Process Payment</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Process Payment */}
        <TabsContent value="process" className="space-y-4">
          {/* Quick Pay from Invoice */}
          {invoices.length > 0 && (
            <Card className="bg-teal-50 border-teal-200">
              <CardHeader>
                <CardTitle className="text-teal-900">Quick Pay</CardTitle>
                <CardDescription>Pay an outstanding invoice</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invoices.filter(inv => inv.status !== 'paid').slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <p className="font-semibold">Invoice #{invoice.id}</p>
                        <p className="text-sm text-gray-600">₦{invoice.amount?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • Due {new Date(invoice.due_date).toLocaleDateString()}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPaymentForm({...paymentForm, amount: invoice.amount?.toFixed(2), invoice_id: invoice.id})
                          setActiveTab('process')
                        }}
                      >
                        Pay Now
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Payment Methods Quick Pay */}
          {savedPaymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pay with Saved Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedPaymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-semibold">{getCardType(method.card_last4)} •••• {method.card_last4}</p>
                          <p className="text-xs text-gray-600">Expires {method.expiry}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          className="w-24"
                          id={`amount-${method.id}`}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const amount = document.getElementById(`amount-${method.id}`).value
                            if (amount) {
                              processPaymentWithSavedMethod(method.id, amount)
                            }
                          }}
                          disabled={processing}
                        >
                          Pay
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>New Payment</CardTitle>
              <CardDescription>Process a payment transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={processPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Payment Method *</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                    >
                      <option value="card">Credit/Debit Card</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="ach">ACH/Bank Transfer</option>
                      <option value="insurance">Insurance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {paymentForm.method === 'card' && (
                  <>
                    <div>
                      <Label>Card Number *</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          required
                          value={paymentForm.card_number}
                          onChange={(e) => setPaymentForm({...paymentForm, card_number: formatCardNumber(e.target.value)})}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                          className="pr-10"
                        />
                        <div className="absolute right-3 top-2.5">
                          {paymentForm.card_number && (
                            <span className="text-xs font-semibold">{getCardType(paymentForm.card_number)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Card Holder *</Label>
                        <Input
                          required
                          value={paymentForm.card_holder}
                          onChange={(e) => setPaymentForm({...paymentForm, card_holder: e.target.value})}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label>Expiry (MM/YY) *</Label>
                        <Input
                          required
                          value={paymentForm.expiry}
                          onChange={(e) => setPaymentForm({...paymentForm, expiry: formatExpiry(e.target.value)})}
                          placeholder="12/25"
                          maxLength="5"
                        />
                      </div>
                      <div>
                        <Label>CVV *</Label>
                        <div className="relative">
                          <Input
                            type={showCardDetails ? "text" : "password"}
                            required
                            value={paymentForm.cvv}
                            onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value.replace(/\D/g, '').substring(0, 4)})}
                            placeholder="123"
                            maxLength="4"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCardDetails(!showCardDetails)}
                            className="absolute right-2 top-2.5"
                          >
                            {showCardDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Billing Address</Label>
                        <Input
                          value={paymentForm.billing_address}
                          onChange={(e) => setPaymentForm({...paymentForm, billing_address: e.target.value})}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          value={paymentForm.billing_city}
                          onChange={(e) => setPaymentForm({...paymentForm, billing_city: e.target.value})}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={paymentForm.billing_state}
                          onChange={(e) => setPaymentForm({...paymentForm, billing_state: e.target.value})}
                          placeholder="State"
                          maxLength="2"
                        />
                      </div>
                      <div>
                        <Label>ZIP Code</Label>
                        <Input
                          value={paymentForm.billing_zip}
                          onChange={(e) => setPaymentForm({...paymentForm, billing_zip: e.target.value.replace(/\D/g, '').substring(0, 5)})}
                          placeholder="12345"
                          maxLength="5"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="savePaymentMethod"
                        checked={paymentForm.save_payment_method}
                        onChange={(e) => setPaymentForm({...paymentForm, save_payment_method: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="savePaymentMethod" className="cursor-pointer">
                        Save this payment method for future use
                      </Label>
                    </div>
                  </>
                )}

                {paymentForm.method === 'ach' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Bank Account Number *</Label>
                      <Input
                        type="text"
                        required
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <Label>Routing Number *</Label>
                      <Input
                        type="text"
                        required
                        placeholder="9-digit routing number"
                        maxLength="9"
                      />
                    </div>
                    <div>
                      <Label>Account Type *</Label>
                      <select className="w-full px-3 py-2 border rounded-md" required>
                        <option value="">Select</option>
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Notes</Label>
                  <Input
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Payment notes..."
                  />
                </div>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-teal-700" />
                    <h4 className="font-semibold text-teal-900">Payment Security</h4>
                  </div>
                  <p className="text-sm text-teal-800">
                    All payment information is encrypted and processed securely. 
                    We comply with PCI DSS standards for payment security.
                  </p>
                </div>

                <Button type="submit" disabled={processing} className="w-full bg-green-600 hover:bg-green-700">
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Process Payment
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="space-y-4">
          {invoices.length > 0 ? (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">Invoice #{invoice.id}</h3>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Amount:</span> ₦{invoice.amount?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div>
                          <span className="font-medium">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(invoice.date).toLocaleDateString()}
                        </div>
                        {invoice.description && (
                          <div className="col-span-2">
                            <span className="font-medium">Description:</span> {invoice.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {invoice.status !== 'paid' && (
                      <Button
                        onClick={() => {
                          setPaymentForm({...paymentForm, amount: invoice.amount?.toFixed(2), invoice_id: invoice.id})
                          setActiveTab('process')
                        }}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No invoices found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment History */}
        <TabsContent value="history" className="space-y-4">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-green-600">
                          ₦{payment.amount?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        <Badge variant="outline">{payment.method}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Transaction ID:</span>
                          <span className="ml-2 font-mono text-xs">{payment.transaction_id}</span>
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>
                          <span className="ml-2">{new Date(payment.created_at).toLocaleString()}</span>
                        </div>
                        {payment.card_last4 && (
                          <div>
                            <span className="font-medium">Card:</span>
                            <span className="ml-2">****{payment.card_last4}</span>
                          </div>
                        )}
                        {payment.notes && (
                          <div className="col-span-2">
                            <span className="font-medium">Notes:</span>
                            <span className="ml-2">{payment.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => printReceipt(payment)}>
                        <Printer className="w-4 h-4 mr-1" />
                        Print
                      </Button>
                      {payment.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => refundPayment(payment.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Refund
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No payment history</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment Methods */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Payment Methods</CardTitle>
              <CardDescription>Manage your saved payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              {savedPaymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {savedPaymentMethods.map((method) => (
                    <Card key={method.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-6 h-6 text-teal-700" />
                            <div>
                              <p className="font-semibold">{getCardType(method.card_last4)} •••• {method.card_last4}</p>
                              <p className="text-sm text-gray-600">Expires {method.expiry}</p>
                              {method.billing_name && (
                                <p className="text-xs text-gray-500">{method.billing_name}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deletePaymentMethod(method.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No saved payment methods</p>
                  <p className="text-sm mt-2">Save a payment method during checkout to use it here</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accepted Payment Methods</CardTitle>
              <CardDescription>Configure payment options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-teal-700" />
                    <div>
                      <h4 className="font-semibold">Credit/Debit Cards</h4>
                      <p className="text-sm text-gray-600">Visa, Mastercard, Amex, Discover</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold">Cash</h4>
                      <p className="text-sm text-gray-600">Cash payments</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-6 h-6 text-teal-700" />
                    <div>
                      <h4 className="font-semibold">Check</h4>
                      <p className="text-sm text-gray-600">Personal and business checks</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="w-6 h-6 text-teal-700" />
                    <div>
                      <h4 className="font-semibold">ACH/Bank Transfer</h4>
                      <p className="text-sm text-gray-600">Direct bank transfers</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-teal-700" />
                    <div>
                      <h4 className="font-semibold">Insurance</h4>
                      <p className="text-sm text-gray-600">Insurance payments</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
