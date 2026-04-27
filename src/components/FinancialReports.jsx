import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, BarChart, PieChart, AreaChart } from './charts';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiService } from '../services/apiService';
import { formatCurrencySimple } from '../utils/currency';

const FinancialReports = ({ userId, role, facilityId }) => {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // month, quarter, year

  useEffect(() => {
    loadFinancialData();
  }, [userId, facilityId, period]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      // Try to load financial data from API
      try {
        const result = await apiService.request(
          `/billing/reports?period=${period}${facilityId != null ? `&facility_id=${facilityId}` : ''}`,
          { method: 'GET' }
        );
        if (result.success) {
          setFinancialData(result.data);
        }
      } catch (error) {
        // If API fails, use mock data
        console.log('Using mock financial data');
        setFinancialData(generateMockFinancialData());
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
      setFinancialData(generateMockFinancialData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockFinancialData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1);

    return {
      summary: {
        totalRevenue: 125000,
        totalExpenses: 85000,
        netProfit: 40000,
        revenueChange: 12.5,
        expenseChange: -5.2,
        profitChange: 18.3
      },
      revenue: last6Months.map((month, idx) => ({
        month,
        amount: Math.floor(Math.random() * 20000) + 15000,
        claims: Math.floor(Math.random() * 50) + 30
      })),
      expenses: last6Months.map((month, idx) => ({
        month,
        amount: Math.floor(Math.random() * 15000) + 10000,
        category: ['Staff', 'Supplies', 'Equipment', 'Utilities'][idx % 4]
      })),
      paymentMethods: [
        { name: 'Insurance', value: 45, amount: 56250 },
        { name: 'Cash', value: 30, amount: 37500 },
        { name: 'Credit Card', value: 20, amount: 25000 },
        { name: 'Other', value: 5, amount: 6250 }
      ],
      outstanding: {
        total: 25000,
        overdue: 8500,
        current: 16500
      }
    };
  };

  if (loading && !financialData) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8 text-sm text-slate-600">Loading financial reports…</CardContent>
      </Card>
    );
  }

  if (!financialData) {
    return null;
  }

  const { summary, revenue, expenses, paymentMethods, outstanding } = financialData;

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Financial Reports
            </CardTitle>
            <CardDescription className="mt-1">Revenue, expenses, and financial insights</CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    {summary.revenueChange > 0 ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ArrowUpRight className="w-4 h-4" />
                        <span className="text-sm font-semibold">+{summary.revenueChange}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <ArrowDownRight className="w-4 h-4" />
                        <span className="text-sm font-semibold">{summary.revenueChange}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrencySimple(summary.totalRevenue, 0)}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Receipt className="w-6 h-6 text-white" />
                    </div>
                    {summary.expenseChange > 0 ? (
                      <div className="flex items-center gap-1 text-red-600">
                        <ArrowUpRight className="w-4 h-4" />
                        <span className="text-sm font-semibold">+{summary.expenseChange}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ArrowDownRight className="w-4 h-4" />
                        <span className="text-sm font-semibold">{summary.expenseChange}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Expenses</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrencySimple(summary.totalExpenses, 0)}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50/60 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    {summary.profitChange > 0 ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ArrowUpRight className="w-4 h-4" />
                        <span className="text-sm font-semibold">+{summary.profitChange}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <ArrowDownRight className="w-4 h-4" />
                        <span className="text-sm font-semibold">{summary.profitChange}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Net Profit</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrencySimple(summary.netProfit, 0)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods Pie Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Payment Methods Distribution</CardTitle>
                <CardDescription>Revenue breakdown by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart data={paymentMethods} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart data={revenue} dataKey="amount" name="Revenue" color="#10b981" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Expenses Trend</CardTitle>
                <CardDescription>Monthly expenses breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart data={expenses} dataKey="amount" name="Expenses" color="#ef4444" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outstanding Tab */}
          <TabsContent value="outstanding" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Outstanding</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrencySimple(outstanding.total, 0)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Overdue</p>
                  <p className="text-3xl font-bold text-amber-600">{formatCurrencySimple(outstanding.overdue, 0)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg border-l-4 border-l-teal-500">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current</p>
                  <p className="text-3xl font-bold text-teal-700">{formatCurrencySimple(outstanding.current, 0)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FinancialReports;

