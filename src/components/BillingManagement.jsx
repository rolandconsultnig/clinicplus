/**
 * Billing Management - Comprehensive billing management interface
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DollarSign, Plus, Search, FileText, Calendar, TrendingUp } from 'lucide-react';

export default function BillingManagement({ facilityId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0]
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadBillingReport();
  }, [dateRange, facilityId]);

  const loadBillingReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
        ...(facilityId && { facility_id: facilityId })
      });
      
      const result = await apiService.request(`/api/billing-mgmt/report?${params}`, 'GET');
      if (result.success) {
        setReport(result.report);
      }
    } catch (err) {
      console.error('Error loading billing report:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData) => {
    try {
      const result = await apiService.request('/api/billing-mgmt/payment/new', 'POST', paymentData);
      if (result.success) {
        loadBillingReport();
        setShowPaymentForm(false);
      }
    } catch (err) {
      console.error('Error creating payment:', err);
    }
  };

  if (loading) {
    return <div className="p-4">Loading billing data...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Billing Management</CardTitle>
            <Button onClick={() => setShowPaymentForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.from_date}
                onChange={(e) => setDateRange({ ...dateRange, from_date: e.target.value })}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.to_date}
                onChange={(e) => setDateRange({ ...dateRange, to_date: e.target.value })}
              />
            </div>
            <Button onClick={loadBillingReport} className="mt-6">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {showPaymentForm && (
            <div className="mb-4 p-4 border rounded">
              <h3 className="font-semibold mb-2">Create Payment</h3>
              <div className="space-y-2">
                <div>
                  <Label>Patient ID</Label>
                  <Input type="number" id="patient_id" />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" id="amount" />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <select className="w-full px-3 py-2 border rounded" id="payment_method">
                    <option>cash</option>
                    <option>check</option>
                    <option>credit_card</option>
                    <option>debit_card</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    const data = {
                      patient_id: parseInt(document.getElementById('patient_id').value),
                      amount: parseFloat(document.getElementById('amount').value),
                      payment_method: document.getElementById('payment_method').value
                    };
                    createPayment(data);
                  }}>Create Payment</Button>
                  <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {report && (
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="charges">Charges</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="claims">Claims</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Total Charges</p>
                      <p className="text-2xl font-bold">${report.summary?.total_charges?.toFixed(2) || '0.00'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Total Payments</p>
                      <p className="text-2xl font-bold">${report.summary?.total_payments?.toFixed(2) || '0.00'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Outstanding</p>
                      <p className="text-2xl font-bold">${report.summary?.total_outstanding?.toFixed(2) || '0.00'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Total Claims</p>
                      <p className="text-2xl font-bold">{report.summary?.total_claims || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="charges" className="mt-4">
                <div className="space-y-2">
                  {report.charges?.map((charge) => (
                    <Card key={charge.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Charge #{charge.charge_id}</p>
                          <p className="text-sm text-gray-600">
                            {charge.charge_date && new Date(charge.charge_date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-bold">${charge.total_amount}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <div className="space-y-2">
                  {report.payments?.map((payment) => (
                    <Card key={payment.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Payment #{payment.payment_id}</p>
                          <p className="text-sm text-gray-600">
                            {payment.payment_date && new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                          </p>
                        </div>
                        <p className="font-bold text-green-600">${payment.amount}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="claims" className="mt-4">
                <div className="space-y-2">
                  {report.claims?.map((claim) => (
                    <Card key={claim.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Claim #{claim.claim_id}</p>
                          <p className="text-sm text-gray-600">
                            {claim.created_at && new Date(claim.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge>{claim.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

