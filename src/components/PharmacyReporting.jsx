/**
 * Pharmacy Reporting and Analytics Module
 * Sales reports, inventory turnover, profit margins, compliance reports, and performance metrics
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Pill,
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react'
import { apiService } from '../services/apiService'
import { formatCurrency, formatCurrencySimple, CURRENCY_SYMBOL } from '../utils/currency.js'

export default function PharmacyReporting() {
  const [activeTab, setActiveTab] = useState('sales')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [salesData, setSalesData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [complianceData, setComplianceData] = useState(null)
  const [performanceData, setPerformanceData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReports()
  }, [dateRange, activeTab])

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = `?start_date=${dateRange.start}&end_date=${dateRange.end}`
      
      switch (activeTab) {
        case 'sales':
          const salesRes = await apiService.request(`/pharmacy/reports/sales${params}`)
          setSalesData(salesRes)
          break
        case 'inventory':
          const invRes = await apiService.request(`/pharmacy/reports/inventory${params}`)
          setInventoryData(invRes)
          break
        case 'compliance':
          const compRes = await apiService.request(`/pharmacy/reports/compliance${params}`)
          setComplianceData(compRes)
          break
        case 'performance':
          const perfRes = await apiService.request(`/pharmacy/reports/performance${params}`)
          setPerformanceData(perfRes)
          break
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      setSalesData(null)
      setInventoryData(null)
      setComplianceData(null)
      setPerformanceData(null)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format = 'pdf') => {
    try {
      const params = `?start_date=${dateRange.start}&end_date=${dateRange.end}&format=${format}`
      await apiService.request(`/pharmacy/reports/export/${activeTab}${params}`)
      
      // In a real implementation, this would download the file
      alert(`Report exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights for business decisions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadReports()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => exportReport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales Reports</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Sales Reports */}
        <TabsContent value="sales" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : salesData ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold">{formatCurrencySimple(salesData.totalSales || 0, 0)}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Prescription Sales</p>
                        <p className="text-2xl font-bold">{formatCurrencySimple(salesData.prescriptionSales || 0, 0)}</p>
                      </div>
                      <Pill className="w-8 h-8 text-teal-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">OTC Sales</p>
                        <p className="text-2xl font-bold">{formatCurrencySimple(salesData.otcSales || 0, 0)}</p>
                      </div>
                      <Package className="w-8 h-8 text-teal-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Profit Margin</p>
                        <p className="text-2xl font-bold">{salesData.profitMargin?.toFixed(1) || '0'}%</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Medications */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Medications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesData.topMedications?.map((med, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold">{med.name}</p>
                          <p className="text-sm text-gray-600">Quantity: {med.quantity} units</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrencySimple(med.sales, 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Sales Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesData.dailySales?.length > 0 ? (
                    (() => {
                      const maxAmount = Math.max(...salesData.dailySales.map(day => Number(day.amount || 0)), 1)
                      return (
                  <div className="h-64 flex items-end justify-between gap-1">
                    {salesData.dailySales?.map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-teal-500 rounded-t hover:bg-teal-600 transition-colors"
                          style={{ height: `${(Number(day.amount || 0) / maxAmount) * 100}%` }}
                          title={`${day.date}: ${formatCurrencySimple(day.amount, 0)}`}
                        />
                        <span className="text-xs text-gray-600 mt-1">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                      )
                    })()
                  ) : (
                    <div className="text-center text-gray-500 py-8">No daily sales trend data</div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No sales data available</div>
          )}
        </TabsContent>

        {/* Inventory Analytics */}
        <TabsContent value="inventory" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : inventoryData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Inventory Turnover</p>
                    <p className="text-2xl font-bold">{inventoryData.turnoverRate || '0'}x</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Total Inventory Value</p>
                    <p className="text-2xl font-bold">{formatCurrencySimple(inventoryData.totalValue || 0, 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-bold">{inventoryData.lowStockCount || '0'}</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Detail</CardTitle>
                </CardHeader>
                <CardContent>
                  {(inventoryData.lowStockItems || []).length > 0 ? (
                    <div className="space-y-2">
                      {(inventoryData.lowStockItems || []).slice(0, 10).map((item, index) => (
                        <div key={`${item.id || index}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Drug #{item.drug_id}</p>
                            <p className="text-sm text-gray-600">Reorder level: {item.reorder_level || 0}</p>
                          </div>
                          <Badge variant="destructive">{item.stock_quantity || 0} left</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6">No low stock items</div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No inventory data available</div>
          )}
        </TabsContent>

        {/* Compliance Reports */}
        <TabsContent value="compliance" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : complianceData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>HIPAA Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Status: {complianceData.hipaa_status || 'unknown'}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Controlled Substances</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Tracking: {complianceData.controlled_substance_tracking || 'unknown'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Actions logged: {complianceData.controlled_actions || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Compliance Audits</CardTitle>
                  <CardDescription>Total logs: {complianceData.audit_count || 0}</CardDescription>
                </CardHeader>
                <CardContent>
                  {(complianceData.recentAudits || []).length > 0 ? (
                    <div className="space-y-2">
                      {(complianceData.recentAudits || []).slice(0, 10).map((log, index) => (
                        <div key={`${log.id || index}`} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="font-medium">{log.action || 'action'}</p>
                            <p className="text-xs text-gray-600">{log.reference || ''}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6">No audit logs available</div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No compliance data available</div>
          )}
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="performance" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : performanceData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Prescription Volume</p>
                    <p className="text-2xl font-bold">{performanceData.prescriptionVolume || '0'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Average Fill Time</p>
                    <p className="text-2xl font-bold">{performanceData.avgFillTime || '0'} min</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Patient Adherence Rate</p>
                    <p className="text-2xl font-bold">{performanceData.adherenceRate || '0'}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Customer Satisfaction</p>
                    <p className="text-2xl font-bold">{performanceData.satisfactionScore || '0'}/5</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Verified Queue</p>
                    <p className="text-2xl font-bold">{performanceData.verifiedQueue || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Dispensed Count</p>
                    <p className="text-2xl font-bold">{performanceData.dispensedCount || 0}</p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No performance data available</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

