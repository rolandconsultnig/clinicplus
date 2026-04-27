/**
 * Pharmacy Point-of-Sale (POS) Module
 * Handles retail sales, payment processing, loyalty programs, and OTC items
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import {
  ShoppingCart,
  CreditCard,
  User,
  Search,
  Plus,
  Minus,
  Trash2,
  Tag,
  Calendar
} from 'lucide-react'
import { apiService } from '../services/apiService'
import { formatCurrency } from '../utils/currency.js'

export default function PharmacyPOS() {
  const [cart, setCart] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [clinicPlusId, setClinicPlusId] = useState('')
  const [pharmacyId, setPharmacyId] = useState('')
  const [prescriptions, setPrescriptions] = useState([])
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState([])
  const [otcSearchQuery, setOtcSearchQuery] = useState('')
  const [otcItems, setOtcItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loyaltyCard, setLoyaltyCard] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [tax, setTax] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [restrictedItem, setRestrictedItem] = useState(null)
  const [historyClinicPlusId, setHistoryClinicPlusId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => {
    loadOTCItems()
  }, [])

  useEffect(() => {
    if (pharmacyId) {
      loadTransactions()
    } else {
      setTransactions([])
    }
  }, [pharmacyId])

  useEffect(() => {
    calculateTotals()
  }, [cart, discount, prescriptions, selectedPrescriptionIds])

  const loadOTCItems = async () => {
    try {
      const response = await apiService.request('/pharmacy/pos/otc-items')
      setOtcItems(response.items || [])
    } catch (error) {
      console.error('Error loading OTC items:', error)
      setOtcItems([])
    }
  }

  const calculateTotals = () => {
    const otcSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const rxSubtotal = prescriptions
      .filter((rx) => selectedPrescriptionIds.includes(rx.id))
      .reduce((sum, rx) => sum + Number(rx.line_total || 0), 0)
    const sub = otcSubtotal + rxSubtotal
    const discountAmount = (sub * discount) / 100
    const afterDiscount = sub - discountAmount
    const taxAmount = afterDiscount * 0.08 // 8% tax
    const finalTotal = afterDiscount + taxAmount

    setSubtotal(sub)
    setTax(taxAmount)
    setTotal(finalTotal)
  }

  const addToCart = (item) => {
    if (item.requiresAge && !selectedPatient) {
      setRestrictedItem(item)
      setShowAgeVerification(true)
      return
    }

    const existingItem = cart.find(cartItem => cartItem.id === item.id)
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change
        if (newQuantity <= 0) return null
        return { ...item, quantity: newQuantity }
      }
      return item
    }).filter(Boolean))
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  const verifyAge = (dateOfBirth) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1
    }
    return age
  }

  const handleAgeVerification = (patient) => {
    if (restrictedItem) {
      const age = verifyAge(patient.date_of_birth)
      if (age >= restrictedItem.ageLimit) {
        setSelectedPatient(patient)
        addToCart(restrictedItem)
        setShowAgeVerification(false)
        setRestrictedItem(null)
      } else {
        alert(`Age verification failed. Customer must be ${restrictedItem.ageLimit} or older.`)
      }
    }
  }

  const applyCoupon = async () => {
    if (!couponCode) return
    
    try {
      const response = await apiService.request(`/pharmacy/pos/coupons/${couponCode}`, {
        method: 'GET'
      })
      if (response.success) {
        setDiscount(response.discount || 0)
        alert(`Coupon applied: ${response.description}`)
      } else {
        alert('Invalid coupon code')
      }
    } catch (error) {
      console.error('Error applying coupon:', error)
      alert('Invalid coupon code')
    }
  }

  const processPayment = async () => {
    if (cart.length === 0 && selectedPrescriptionIds.length === 0) {
      alert('Cart and prescription selection are empty')
      return
    }

    setLoading(true)
    try {
      const paymentData = {
        items: cart,
        patient_id: selectedPatient?.id,
        pharmacy_id: pharmacyId ? Number(pharmacyId) : null,
        prescription_ids: selectedPrescriptionIds,
        payment_method: paymentMethod,
        loyalty_card: loyaltyCard,
        coupon_code: couponCode,
        discount: discount,
        subtotal: subtotal,
        tax: tax,
        total: total
      }

      const response = await apiService.request('/pharmacy/pos/process-payment', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      })

      if (response.success) {
        // Print receipt
        printReceipt(response.receipt)
        
        // Clear cart
        setCart([])
        setSelectedPrescriptionIds([])
        setPrescriptions([])
        setCouponCode('')
        setDiscount(0)
        setLoyaltyCard('')
        loadTransactions(historyClinicPlusId)
        
        alert('Payment processed successfully!')
      } else {
        alert(response.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Payment processing failed')
    } finally {
      setLoading(false)
    }
  }

  const printReceipt = (receiptData) => {
    // In a real implementation, this would send to a receipt printer
    console.log('Printing receipt:', receiptData)
    // You could open a print dialog or send to a printer API
  }

  const reprintTransactionReceipt = (transaction) => {
    const receiptData = {
      receipt_number: transaction.receipt_number,
      date: transaction.created_at,
      items: transaction.items || [],
      subtotal: transaction.subtotal,
      tax: transaction.tax,
      discount: transaction.discount,
      total: transaction.total,
      payment_method: transaction.payment_method,
      patient_id: transaction.patient_id,
      pharmacy_id: transaction.pharmacy_id,
      dispensed_prescriptions: transaction.dispensed_prescriptions || []
    }
    printReceipt(receiptData)
    alert(`Receipt ${transaction.receipt_number} sent to printer`)
  }

  const lookupPatientPrescriptions = async () => {
    if (!clinicPlusId.trim()) return
    if (!pharmacyId) {
      alert('Enter Pharmacy ID first')
      return
    }
    
    try {
      const response = await apiService.request(
        `/pharmacy/pos/patient-lookup/${encodeURIComponent(clinicPlusId.trim())}?pharmacy_id=${Number(pharmacyId)}`
      )
      if (response.success) {
        setSelectedPatient(response.patient || null)
        setPrescriptions(response.prescriptions || [])
        setSelectedPrescriptionIds([])
      } else {
        setSelectedPatient(null)
        setPrescriptions([])
        setSelectedPrescriptionIds([])
        alert(response.error || 'Patient lookup failed')
      }
    } catch (error) {
      console.error('Error looking up patient:', error)
      alert(error.message || 'Patient lookup failed')
    }
  }

  const togglePrescriptionSelection = (prescriptionId) => {
    setSelectedPrescriptionIds((current) =>
      current.includes(prescriptionId)
        ? current.filter((id) => id !== prescriptionId)
        : [...current, prescriptionId]
    )
  }

  const loadTransactions = async (clinicPlusFilter = '') => {
    if (!pharmacyId) return
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({
        pharmacy_id: String(Number(pharmacyId)),
        limit: '20'
      })
      if (clinicPlusFilter.trim()) {
        params.set('clinic_plus_id', clinicPlusFilter.trim())
      }
      const response = await apiService.request(`/pharmacy/pos/transactions?${params.toString()}`)
      if (response.success) {
        setTransactions(response.transactions || [])
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const filteredItems = otcItems.filter(item =>
    item.name.toLowerCase().includes(otcSearchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(otcSearchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <p className="text-gray-600">Process retail sales and payments</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Calendar className="w-4 h-4 mr-2" />
          {new Date().toLocaleDateString()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Search and Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Pharmacy ID (e.g. 1)"
                  value={pharmacyId}
                  onChange={(e) => setPharmacyId(e.target.value)}
                />
                <Input
                  placeholder="Enter Clinic+ ID..."
                  value={clinicPlusId}
                  onChange={(e) => setClinicPlusId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && lookupPatientPrescriptions()}
                />
                <Button onClick={lookupPatientPrescriptions}>
                  <Search className="w-4 h-4 mr-2" />
                  Lookup
                </Button>
              </div>
              {selectedPatient && (
                <div className="mt-4 p-3 bg-teal-50 rounded-lg">
                  <p className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                  <p className="text-sm text-gray-600">DOB: {selectedPatient.date_of_birth}</p>
                  <p className="text-sm text-gray-600">ID: {selectedPatient.universal_patient_id}</p>
                </div>
              )}
              {selectedPatient && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold">Active Prescriptions</p>
                  {prescriptions.length === 0 && (
                    <p className="text-sm text-gray-500">No active prescriptions found</p>
                  )}
                  {prescriptions.map((rx) => (
                    <label key={rx.id} className={`flex items-start gap-2 p-2 border rounded ${rx.available ? 'bg-white' : 'bg-gray-100'}`}>
                      <input
                        type="checkbox"
                        checked={selectedPrescriptionIds.includes(rx.id)}
                        disabled={!rx.available}
                        onChange={() => togglePrescriptionSelection(rx.id)}
                      />
                      <div className="text-sm">
                        <div className="font-medium">{rx.drug_name} ({rx.quantity})</div>
                        <div className="text-gray-600">{rx.dosage} | {rx.frequency}</div>
                        <div className="text-gray-600">
                          Stock: {rx.stock_quantity ?? 'N/A'} | Price: {formatCurrency(Number(rx.unit_price || 0))}
                        </div>
                        {!rx.available && <div className="text-red-600">Insufficient stock</div>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* OTC Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Over-the-Counter Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <Input
                  placeholder="Search OTC by name/category"
                  value={otcSearchQuery}
                  onChange={(e) => setOtcSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      {item.requiresAge && (
                        <Badge variant="destructive" className="mt-1">
                          Age Restricted ({item.ageLimit}+)
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(item.price)}</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cart and Payment */}
        <div className="space-y-4">
          {/* Shopping Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Cart is empty</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs text-gray-600">{formatCurrency(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coupon Code */}
              <div>
                <Label>Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                  />
                  <Button onClick={applyCoupon} variant="outline">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Loyalty Card */}
              <div>
                <Label>Loyalty Card</Label>
                <Input
                  value={loyaltyCard}
                  onChange={(e) => setLoyaltyCard(e.target.value)}
                  placeholder="Scan or enter loyalty card"
                />
              </div>

              {/* Payment Method */}
              <div>
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className="w-full"
                  >
                    Cash
                  </Button>
                  <Button
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('card')}
                    className="w-full"
                  >
                    Card
                  </Button>
                  <Button
                    variant={paymentMethod === 'fsa' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('fsa')}
                    className="w-full"
                  >
                    FSA/HSA
                  </Button>
                  <Button
                    variant={paymentMethod === 'insurance' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('insurance')}
                    className="w-full"
                  >
                    Insurance
                  </Button>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {selectedPrescriptionIds.length > 0 && (
                  <div className="flex justify-between text-teal-800">
                    <span>Prescriptions:</span>
                    <span>{selectedPrescriptionIds.length} selected</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%):</span>
                    <span>-{formatCurrency((subtotal * discount) / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Process Payment Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={processPayment}
                disabled={loading || (cart.length === 0 && selectedPrescriptionIds.length === 0)}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {loading ? 'Processing...' : 'Process Payment'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dispensed / Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Filter by Clinic+ ID"
                  value={historyClinicPlusId}
                  onChange={(e) => setHistoryClinicPlusId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadTransactions(historyClinicPlusId)}
                />
                <Button variant="outline" onClick={() => loadTransactions(historyClinicPlusId)}>
                  Search
                </Button>
              </div>
              {!pharmacyId && (
                <p className="text-sm text-gray-500">Enter Pharmacy ID to load history.</p>
              )}
              {historyLoading && (
                <p className="text-sm text-gray-500">Loading transactions...</p>
              )}
              {!historyLoading && transactions.length === 0 && pharmacyId && (
                <p className="text-sm text-gray-500">No transactions found.</p>
              )}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.transaction_id} className="border rounded p-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{tx.receipt_number}</span>
                      <span>{formatCurrency(tx.total)}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {tx.patient_name || 'Walk-in'} | {tx.patient_clinic_plus_id || 'No ID'} | {new Date(tx.created_at).toLocaleString()}
                    </div>
                    {(tx.dispensed_prescriptions || []).length > 0 && (
                      <div className="text-xs text-teal-800 mt-1">
                        RX: {tx.dispensed_prescriptions.map((rx) => rx.drug_name).join(', ')}
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedReceipt(tx)}>
                        View Receipt
                      </Button>
                      <Button size="sm" onClick={() => reprintTransactionReceipt(tx)}>
                        Reprint
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[680px] max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Receipt {selectedReceipt.receipt_number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-700">
                <div>Date: {new Date(selectedReceipt.created_at).toLocaleString()}</div>
                <div>Patient: {selectedReceipt.patient_name || 'Walk-in'}</div>
                <div>Clinic+ ID: {selectedReceipt.patient_clinic_plus_id || 'N/A'}</div>
                <div>Payment Method: {(selectedReceipt.payment_method || '').toUpperCase()}</div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {(selectedReceipt.items || []).map((item, index) => (
                    <div key={`${item.id || item.name}-${index}`} className="border rounded p-2 text-sm flex justify-between">
                      <div>
                        <div className="font-medium">{item.name || item.drug_name || 'Item'}</div>
                        <div className="text-gray-600">Qty: {item.quantity || 1}</div>
                      </div>
                      <div className="text-right">
                        {item.price !== undefined && <div>{formatCurrency(Number(item.price || 0))}</div>}
                        {item.line_total !== undefined && <div>{formatCurrency(Number(item.line_total || 0))}</div>}
                        {item.source && <div className="text-xs text-gray-500">{item.source}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(selectedReceipt.dispensed_prescriptions || []).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Dispensed Prescriptions</h3>
                  <div className="space-y-1 text-sm">
                    {selectedReceipt.dispensed_prescriptions.map((rx) => (
                      <div key={rx.prescription_id} className="border rounded p-2">
                        {rx.prescription_number} - {rx.drug_name} (Qty: {rx.quantity})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selectedReceipt.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(selectedReceipt.discount)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(selectedReceipt.tax)}</span></div>
                <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{formatCurrency(selectedReceipt.total)}</span></div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                  Close
                </Button>
                <Button onClick={() => reprintTransactionReceipt(selectedReceipt)}>
                  Reprint
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Age Verification Modal */}
      {showAgeVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Age Verification Required</CardTitle>
              <CardDescription>
                This item requires age verification. Please search for the customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search customer..."
                  value={clinicPlusId}
                  onChange={(e) => setClinicPlusId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && lookupPatientPrescriptions()}
                />
                <div className="flex gap-2">
                  <Button onClick={lookupPatientPrescriptions} className="flex-1">
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAgeVerification(false)
                      setRestrictedItem(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {selectedPatient && (
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <p className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                    <p className="text-sm">DOB: {selectedPatient.date_of_birth}</p>
                    <Button
                      className="w-full mt-2"
                      onClick={() => handleAgeVerification(selectedPatient)}
                    >
                      Verify Age
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}



