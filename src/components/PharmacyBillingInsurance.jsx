/**
 * Pharmacy Billing and Insurance Processing Module
 * Insurance claim submission, adjudication, COB, split billing, and reconciliation
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
  FileText,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Receipt,
  TrendingUp,
  Search,
  RefreshCw,
  Download,
  Send,
  Shield
} from 'lucide-react'
import { apiService } from '../services/apiService'
import { formatCurrency, formatCurrencySimple, CURRENCY_SYMBOL } from '../utils/currency.js'

export default function PharmacyBillingInsurance() {
  const [activeTab, setActiveTab] = useState('claims')
  const [claims, setClaims] = useState([])
  const [pendingClaims, setPendingClaims] = useState([])
  const [payments, setPayments] = useState([])
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadBillingData()
  }, [activeTab])

  const loadBillingData = async () => {
    setLoading(true)
    try {
      switch (activeTab) {
        case 'claims':
          const claimsRes = await apiService.request('/pharmacy/billing/claims')
          setClaims(claimsRes.claims || [])
          setPendingClaims(claimsRes.pending || [])
          break
        case 'payments':
          const paymentsRes = await apiService.request('/pharmacy/billing/payments')
          setPayments(paymentsRes.payments || [])
          break
        case 'reconciliation':
          // Load reconciliation data
          break
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
      setClaims([])
      setPendingClaims([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const submitClaim = async (claimId) => {
    try {
      const response = await apiService.request(`/pharmacy/billing/claims/${claimId}/submit`, {
        method: 'POST'
      })
      
      if (response.success) {
        alert('Claim submitted successfully')
        loadBillingData()
      }
    } catch (error) {
      console.error('Error submitting claim:', error)
      alert('Failed to submit claim')
    }
  }

  const checkAdjudication = async (claimId) => {
    try {
      const response = await apiService.request(`/pharmacy/billing/claims/${claimId}/adjudicate`, {
        method: 'POST'
      })
      
      if (response.success) {
        alert('Adjudication status updated')
        loadBillingData()
      }
    } catch (error) {
      console.error('Error checking adjudication:', error)
      alert('Failed to check adjudication')
    }
  }

  const processCOB = async (claimId) => {
    try {
      const response = await apiService.request(`/pharmacy/billing/claims/${claimId}/cob`, {
        method: 'POST'
      })
      
      if (response.success) {
        alert('Coordination of Benefits processed')
        loadBillingData()
      }
    } catch (error) {
      console.error('Error processing COB:', error)
      alert('Failed to process COB')
    }
  }

  const splitBilling = async (claimId, splitData) => {
    try {
      const response = await apiService.request(`/pharmacy/billing/claims/${claimId}/split`, {
        method: 'POST',
        body: JSON.stringify(splitData)
      })
      
      if (response.success) {
        alert('Billing split successfully')
        loadBillingData()
      }
    } catch (error) {
      console.error('Error splitting billing:', error)
      alert('Failed to split billing')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Insurance</h1>
          <p className="text-gray-600">Manage insurance claims, adjudication, and payments</p>
        </div>
        <Button variant="outline" onClick={() => loadBillingData()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="claims">Insurance Claims</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="cob">Coordination of Benefits</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        {/* Insurance Claims */}
        <TabsContent value="claims" className="space-y-4">
          {/* Pending Claims */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Claims</CardTitle>
              <CardDescription>Claims awaiting submission or adjudication</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {pendingClaims.map(claim => (
                    <div key={claim.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">{claim.claimNumber}</p>
                            <Badge variant="secondary">{claim.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">Patient: {claim.patientName}</p>
                          <p className="text-sm text-gray-600">Prescription: {claim.prescription}</p>
                          <p className="text-sm text-gray-600">Insurance: {claim.insurance}</p>
                          <p className="text-sm font-semibold mt-2">Amount: {formatCurrency(claim.amount)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => submitClaim(claim.id)}>
                            <Send className="w-4 h-4 mr-2" />
                            Submit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => checkAdjudication(claim.id)}>
                            Check Status
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Claims */}
          <Card>
            <CardHeader>
              <CardTitle>All Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search claims..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                {claims
                  .filter(claim => 
                    claim.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    claim.patientName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(claim => (
                    <div key={claim.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">{claim.claimNumber}</p>
                            <Badge 
                              variant={
                                claim.status === 'approved' ? 'default' :
                                claim.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {claim.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">Patient: {claim.patientName}</p>
                          <p className="text-sm text-gray-600">Prescription: {claim.prescription}</p>
                          <p className="text-sm text-gray-600">Insurance: {claim.insurance}</p>
                          <p className="text-sm">Submitted: {claim.submittedDate}</p>
                          {claim.adjudicatedDate && (
                            <p className="text-sm">Adjudicated: {claim.adjudicatedDate}</p>
                          )}
                          <p className="text-sm font-semibold mt-2">Amount: {formatCurrency(claim.amount)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {claim.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => submitClaim(claim.id)}>
                                Submit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => processCOB(claim.id)}>
                                Process COB
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No payments found</div>
                  ) : (
                    payments.map(payment => (
                      <div key={payment.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-gray-600">{payment.date}</p>
                            <p className="text-sm text-gray-600">{payment.method}</p>
                          </div>
                          <Badge variant="default">Paid</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coordination of Benefits */}
        <TabsContent value="cob" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coordination of Benefits</CardTitle>
              <CardDescription>Manage multiple insurance coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Select a claim to process Coordination of Benefits
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>End-of-Day Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Total Claims</p>
                    <p className="text-2xl font-bold">0</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Total Payments</p>
                    <p className="text-2xl font-bold">{formatCurrency(0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold">{formatCurrency(0)}</p>
                  </CardContent>
                </Card>
              </div>
              <Button className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Generate Reconciliation Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

