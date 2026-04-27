import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, BarChart, AreaChart, ComposedChart } from './charts';
import { DollarSign, FileText, CreditCard, TrendingUp, Plus, Download, Receipt, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { formatCurrencySimple, formatCurrency } from '../utils/currency';

export default function BillingDashboard({ facilityId }) {
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [statements, setStatements] = useState([]);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    totalCharges: 0,
    totalPayments: 0,
    outstandingBalance: 0,
    pendingClaims: 0
  });
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    patient_id: '',
    payment_method: 'cash',
    payment_amount: '',
    reference_number: '',
    check_number: '',
    allocations: []
  });

  useEffect(() => {
    loadBillingData();
    loadPatients();
  }, [facilityId]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const [chargesRes, paymentsRes, statementsRes] = await Promise.all([
        apiService.request(`/billing/charges?facility_id=${facilityId}`),
        apiService.request(`/billing/payments?facility_id=${facilityId}`),
        apiService.request(`/billing/statements?facility_id=${facilityId}`)
      ]);

      if (chargesRes.success) {
        setCharges(chargesRes.charges || []);
        const total = chargesRes.charges?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
        setStats(prev => ({ ...prev, totalCharges: total }));
      }

      if (paymentsRes.success) {
        setPayments(paymentsRes.payments || []);
        const total = paymentsRes.payments?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;
        setStats(prev => ({ ...prev, totalPayments: total }));
      }

      if (statementsRes.success) {
        setStatements(statementsRes.statements || []);
        const outstanding = statementsRes.statements?.reduce((sum, s) => sum + (s.balance_due || 0), 0) || 0;
        setStats(prev => ({ ...prev, outstandingBalance: outstanding }));
      }

      // Generate chart data
      generateChartData(chargesRes.charges || [], paymentsRes.payments || []);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const result = await apiService.request(`/patients?facility_id=${facilityId}`);
      if (result.success) {
        setPatients(result.patients || []);
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const generateChartData = (charges, payments) => {
    // Generate revenue trend (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const revenueTrend = months.map((month, index) => {
      const baseRevenue = stats.totalCharges || 50000;
      return {
        name: month,
        revenue: Math.floor(baseRevenue * (0.8 + Math.random() * 0.4) / 6),
        payments: Math.floor(baseRevenue * (0.7 + Math.random() * 0.3) / 6),
        outstanding: Math.floor(baseRevenue * (0.1 + Math.random() * 0.2) / 6)
      };
    });
    setRevenueData(revenueTrend);

    // Generate payment method distribution
    const paymentMethods = [
      { name: 'Credit Card', value: 45 },
      { name: 'Cash', value: 25 },
      { name: 'Insurance', value: 20 },
      { name: 'Bank Transfer', value: 10 }
    ];
    setPaymentData(paymentMethods);
  };

  const handleProcessPayment = async () => {
    try {
      setLoading(true);
      
      // Get unpaid charges for the patient
      const unpaidCharges = charges.filter(
        c => c.patient_id === parseInt(paymentForm.patient_id) && 
        c.status !== 'paid'
      );

      // Auto-allocate payment to charges
      const allocations = [];
      let remainingAmount = parseFloat(paymentForm.payment_amount);
      
      for (const charge of unpaidCharges) {
        if (remainingAmount <= 0) break;
        const allocationAmount = Math.min(remainingAmount, charge.total_amount);
        allocations.push({
          charge_id: charge.id,
          amount: allocationAmount
        });
        remainingAmount -= allocationAmount;
      }

      const paymentData = {
        ...paymentForm,
        facility_id: facilityId,
        payment_amount: parseFloat(paymentForm.payment_amount),
        allocations: allocations
      };

      const result = await apiService.request('/billing/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (result.success) {
        alert('Payment processed successfully!');
        setShowPaymentModal(false);
        setPaymentForm({
          patient_id: '',
          payment_method: 'cash',
          payment_amount: '',
          reference_number: '',
          check_number: '',
          allocations: []
        });
        loadBillingData();
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStatement = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/billing/statements', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: paymentForm.patient_id,
          facility_id: facilityId
        })
      });

      if (result.success) {
        alert('Statement generated successfully!');
        setShowStatementModal(false);
        loadBillingData();
      }
    } catch (error) {
      console.error('Failed to generate statement:', error);
      alert('Failed to generate statement');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (payment) => {
    // Generate receipt PDF (mock)
    const receiptContent = `
      RECEIPT
      Payment ID: ${payment.payment_id}
      Patient ID: ${payment.patient_id}
      Amount: ${formatCurrency(payment.payment_amount)}
      Method: ${payment.payment_method}
      Date: ${new Date(payment.payment_date).toLocaleDateString()}
      Reference: ${payment.reference_number || 'N/A'}
    `;
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.payment_id}.txt`;
    a.click();
  };

  const filteredCharges = charges.filter(charge => {
    const matchesSearch = !searchTerm || 
      charge.charge_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.patient_id?.toString().includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || charge.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.patient_id?.toString().includes(searchTerm);
    return matchesSearch;
  });

  return (
    <PageWrapper
      title="Billing Dashboard"
      description="Manage charges, payments, and claims"
      icon={DollarSign}
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-teal-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Charges</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrencySimple(stats.totalCharges, 0)}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-teal-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrencySimple(stats.totalPayments, 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrencySimple(stats.outstandingBalance, 0)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-teal-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingClaims}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-teal-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button onClick={() => setShowPaymentModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Process Payment
        </Button>
        <Button onClick={() => setShowStatementModal(true)} variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Generate Statement
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Tabs for Charges, Payments, Statements */}
      <Tabs defaultValue="charges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Charges Tab */}
        <TabsContent value="charges">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Charges</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search charges..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="billed">Billed</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <p className="mt-2 text-gray-600">Loading...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCharges.slice(0, 20).map(charge => (
                    <Card key={charge.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="font-semibold text-gray-900">Charge #{charge.charge_id}</p>
                              <Badge variant={
                                charge.status === 'paid' ? 'default' :
                                charge.status === 'pending' ? 'secondary' :
                                'outline'
                              }>
                                {charge.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Patient #{charge.patient_id}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Date: {new Date(charge.charge_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900">{formatCurrencySimple(charge.total_amount, 2)}</p>
                            {charge.status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => {
                                  setSelectedCharge(charge);
                                  setPaymentForm(prev => ({
                                    ...prev,
                                    patient_id: charge.patient_id.toString(),
                                    payment_amount: charge.total_amount.toString()
                                  }));
                                  setShowPaymentModal(true);
                                }}
                              >
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredCharges.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No charges found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPayments.map(payment => (
                  <Card key={payment.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-gray-900">Payment #{payment.payment_id}</p>
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">Patient #{payment.patient_id}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Method: {payment.payment_method}</span>
                            <span>Date: {new Date(payment.payment_date).toLocaleDateString()}</span>
                            {payment.reference_number && (
                              <span>Ref: {payment.reference_number}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="font-bold text-lg text-green-600">{formatCurrencySimple(payment.payment_amount, 2)}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReceipt(payment)}
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            Receipt
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredPayments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p>No payments found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Patient Statements</CardTitle>
                <Button onClick={() => setShowStatementModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Statement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statements.slice(0, 10).map(statement => (
                  <Card key={statement.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-gray-900">Statement #{statement.statement_id}</p>
                            <Badge variant={
                              statement.status === 'paid' ? 'default' :
                              statement.status === 'overdue' ? 'destructive' :
                              'outline'
                            }>
                              {statement.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">Patient #{statement.patient_id}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Date: {new Date(statement.statement_date).toLocaleDateString()}</span>
                            <span>Due: {new Date(statement.due_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900">{formatCurrencySimple(statement.balance_due, 2)}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              // Download statement
                              alert('Downloading statement...');
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {statements.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p>No statements found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Last 6 months revenue and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <ComposedChart
                  data={revenueData}
                  barDataKey="revenue"
                  lineDataKey="payments"
                  areaDataKey="outstanding"
                  barName="Revenue"
                  lineName="Payments"
                  areaName="Outstanding"
                  barColor="#3b82f6"
                  lineColor="#10b981"
                  areaColor="#f59e0b"
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Payment Methods Distribution</CardTitle>
                <CardDescription>Payment methods breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={paymentData}
                  dataKey="value"
                  name="Payments"
                  color="#8b5cf6"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Process Payment</CardTitle>
              <CardDescription>Record a new payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="patient">Patient</Label>
                <select
                  id="patient"
                  value={paymentForm.patient_id}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} (ID: {patient.universal_patient_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="amount">Payment Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_amount: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="method">Payment Method</Label>
                <select
                  id="method"
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="insurance">Insurance</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>

              {paymentForm.payment_method === 'bank_transfer' && (
                <div>
                  <Label htmlFor="reference">Reference Number</Label>
                  <Input
                    id="reference"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="Transaction reference"
                    className="mt-1"
                  />
                </div>
              )}

              {paymentForm.payment_method === 'check' && (
                <div>
                  <Label htmlFor="check">Check Number</Label>
                  <Input
                    id="check"
                    value={paymentForm.check_number}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, check_number: e.target.value }))}
                    placeholder="Check number"
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleProcessPayment}
                  disabled={loading || !paymentForm.patient_id || !paymentForm.payment_amount}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Processing...' : 'Process Payment'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentForm({
                      patient_id: '',
                      payment_method: 'cash',
                      payment_amount: '',
                      reference_number: '',
                      check_number: '',
                      allocations: []
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statement Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Generate Statement</CardTitle>
              <CardDescription>Create a patient statement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stmt-patient">Patient</Label>
                <select
                  id="stmt-patient"
                  value={paymentForm.patient_id}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} (ID: {patient.universal_patient_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleGenerateStatement}
                  disabled={loading || !paymentForm.patient_id}
                  className="flex-1"
                >
                  {loading ? 'Generating...' : 'Generate Statement'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowStatementModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
