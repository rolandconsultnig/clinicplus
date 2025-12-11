/**
 * Laboratory/Investigation Module (LIS)
 * Complete workflow: Pre-Analytical → Analytical → Post-Analytical
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  TestTube,
  Beaker,
  Microscope,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  Download,
  RefreshCw,
  QrCode,
  TrendingUp,
  FileText,
  Bell,
  XCircle,
  Activity,
  Package,
  BarChart3
} from 'lucide-react'
import apiService from '../services/apiService'

export default function LaboratoryModule() {
  const [activeTab, setActiveTab] = useState('pending-orders')
  const [pendingOrders, setPendingOrders] = useState([])
  const [specimens, setSpecimens] = useState([])
  const [worklist, setWorklist] = useState([])
  const [results, setResults] = useState([])
  const [criticalValues, setCriticalValues] = useState([])
  const [qcData, setQcData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLabData()
  }, [])

  const loadLabData = async () => {
    setLoading(true)
    try {
      const [ordersRes, specimensRes, worklistRes, resultsRes, criticalRes, qcRes] = await Promise.all([
        apiService.request('/labs/pending-orders'),
        apiService.request('/labs/specimens'),
        apiService.request('/labs/worklist'),
        apiService.request('/labs/results'),
        apiService.request('/labs/critical-values'),
        apiService.request('/labs/qc-data')
      ])
      
      setPendingOrders(ordersRes.orders || [])
      setSpecimens(specimensRes.specimens || [])
      setWorklist(worklistRes.worklist || [])
      setResults(resultsRes.results || [])
      setCriticalValues(criticalRes.critical || [])
      setQcData(qcRes.qc || [])
    } catch (error) {
      console.error('Error loading lab data:', error)
    } finally {
      setLoading(false)
    }
  }

  const accessionSpecimen = async (orderId) => {
    try {
      const response = await apiService.request('/labs/accession', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId })
      })
      
      if (response.success) {
        alert(`Specimen accessioned! Accession #: ${response.accession_number}`)
        loadLabData()
      }
    } catch (error) {
      alert('Accession failed: ' + error.message)
    }
  }

  const validateResult = async (resultId) => {
    try {
      await apiService.request(`/labs/results/${resultId}/validate`, {
        method: 'POST'
      })
      alert('Result validated successfully')
      loadLabData()
    } catch (error) {
      alert('Validation failed: ' + error.message)
    }
  }

  const printBarcode = (specimen) => {
    window.print()
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'collected': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'pre-analytical': return <TestTube className="w-5 h-5 text-blue-600" />
      case 'analytical': return <Microscope className="w-5 h-5 text-purple-600" />
      case 'post-analytical': return <FileText className="w-5 h-5 text-green-600" />
      default: return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Microscope className="w-8 h-8 text-purple-600" />
            Laboratory Information System (LIS)
          </h1>
          <p className="text-gray-600 mt-1">Pre-Analytical → Analytical → Post-Analytical Workflow</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadLabData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalValues.length > 0 && (
        <Card className="border-2 border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-red-600 animate-pulse" />
              <h3 className="text-lg font-bold text-red-900">Critical Values Alert</h3>
            </div>
            <div className="space-y-2">
              {criticalValues.map((critical) => (
                <div key={critical.id} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-red-900">{critical.patient_name} - {critical.test_name}</p>
                    <p className="text-sm text-red-700">
                      Value: <strong>{critical.value} {critical.unit}</strong> (Normal: {critical.reference_range})
                    </p>
                  </div>
                  <Button size="sm" variant="destructive">
                    <Bell className="w-4 h-4 mr-1" />
                    Notify Physician
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending-orders">
            Pending Orders ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="collection">
            Sample Collection
          </TabsTrigger>
          <TabsTrigger value="worklist">
            Worklist ({worklist.length})
          </TabsTrigger>
          <TabsTrigger value="results">
            Results Validation
          </TabsTrigger>
          <TabsTrigger value="qc">
            Quality Control
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Phase I: Pre-Analytical - Pending Orders */}
        <TabsContent value="pending-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPhaseIcon('pre-analytical')}
                  <div>
                    <CardTitle>Phase I: Pre-Analytical - Order Receipt</CardTitle>
                    <CardDescription>Orders received from CPOE awaiting billing clearance</CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Pre-Analytical</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingOrders.length > 0 ? (
                  pendingOrders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{order.patient_name}</h4>
                              <Badge variant="outline">MRN: {order.mrn}</Badge>
                              <Badge className={getStatusColor(order.payment_status)}>
                                {order.payment_status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Tests Ordered:</span>
                                <p className="font-medium">{order.tests?.join(', ')}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Ordered By:</span>
                                <p className="font-medium">{order.ordering_physician}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Order Date:</span>
                                <p className="font-medium">{new Date(order.order_date).toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Specimen Type:</span>
                                <p className="font-medium">{order.specimen_type}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {order.payment_status === 'paid' ? (
                              <Button onClick={() => accessionSpecimen(order.id)}>
                                <QrCode className="w-4 h-4 mr-1" />
                                Accession
                              </Button>
                            ) : (
                              <Button variant="outline" disabled>
                                <Clock className="w-4 h-4 mr-1" />
                                Awaiting Payment
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Printer className="w-4 h-4 mr-1" />
                              Print Label
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <TestTube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No pending orders</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phase I: Pre-Analytical - Sample Collection */}
        <TabsContent value="collection" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPhaseIcon('pre-analytical')}
                  <div>
                    <CardTitle>Sample Collection & Accessioning</CardTitle>
                    <CardDescription>Specimen tracking and chain of custody</CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Pre-Analytical</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {specimens.map((specimen) => (
                  <Card key={specimen.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <QrCode className="w-8 h-8 text-purple-600" />
                            <div>
                              <h4 className="font-semibold text-lg">Accession #: {specimen.accession_number}</h4>
                              <p className="text-sm text-gray-600">{specimen.patient_name} - MRN: {specimen.mrn}</p>
                            </div>
                            <Badge className={getStatusColor(specimen.status)}>
                              {specimen.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Specimen Type:</span>
                              <p className="font-medium">{specimen.specimen_type}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Collection Time:</span>
                              <p className="font-medium">{new Date(specimen.collection_time).toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Collected By:</span>
                              <p className="font-medium">{specimen.collected_by}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Tests:</span>
                              <p className="font-medium">{specimen.tests?.join(', ')}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Location:</span>
                              <p className="font-medium">{specimen.current_location}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Temperature:</span>
                              <p className="font-medium">{specimen.storage_temp}°C</p>
                            </div>
                          </div>
                          
                          {/* Chain of Custody */}
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <h5 className="font-semibold text-sm mb-2">Chain of Custody</h5>
                            <div className="space-y-1 text-xs">
                              {specimen.custody_log?.map((log, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span>{log.timestamp} - {log.action} by {log.user}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => printBarcode(specimen)}>
                            <Printer className="w-4 h-4 mr-1" />
                            Print Barcode
                          </Button>
                          <Button size="sm" variant="outline">
                            <Activity className="w-4 h-4 mr-1" />
                            Track
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phase II: Analytical - Worklist */}
        <TabsContent value="worklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPhaseIcon('analytical')}
                  <div>
                    <CardTitle>Phase II: Analytical - Daily Worklist</CardTitle>
                    <CardDescription>Samples ready for testing with instrument integration</CardDescription>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-800">Analytical</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {worklist.map((item) => (
                  <Card key={item.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Microscope className="w-6 h-6 text-purple-600" />
                            <div>
                              <h4 className="font-semibold">Accession #: {item.accession_number}</h4>
                              <p className="text-sm text-gray-600">{item.patient_name}</p>
                            </div>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Test:</span>
                              <p className="font-medium">{item.test_name}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Analyzer:</span>
                              <p className="font-medium">{item.analyzer}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Priority:</span>
                              <Badge variant={item.priority === 'STAT' ? 'destructive' : 'outline'}>
                                {item.priority}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-gray-600">TAT:</span>
                              <p className="font-medium">{item.turnaround_time}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm">
                            <Beaker className="w-4 h-4 mr-1" />
                            Run Test
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4 mr-1" />
                            Protocol
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phase III: Post-Analytical - Results */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPhaseIcon('post-analytical')}
                  <div>
                    <CardTitle>Phase III: Post-Analytical - Result Validation</CardTitle>
                    <CardDescription>Review, validate, and publish results</CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Post-Analytical</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((result) => (
                  <Card key={result.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-semibold text-lg">{result.patient_name}</h4>
                            <Badge variant="outline">Acc #: {result.accession_number}</Badge>
                            <Badge className={getStatusColor(result.validation_status)}>
                              {result.validation_status}
                            </Badge>
                            {result.is_critical && (
                              <Badge variant="destructive">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                CRITICAL
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Test:</span>
                                <p className="font-medium">{result.test_name}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Result:</span>
                                <p className={`font-bold text-lg ${result.is_abnormal ? 'text-red-600' : 'text-green-600'}`}>
                                  {result.value} {result.unit}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Reference Range:</span>
                                <p className="font-medium">{result.reference_range}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Method:</span>
                                <p className="font-medium">{result.method}</p>
                              </div>
                            </div>
                            
                            {/* QC Checks */}
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <h5 className="font-semibold text-sm mb-2">Quality Control Checks</h5>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span>Reference Range: {result.qc_checks?.reference_range ? 'Pass' : 'Fail'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span>Delta Check: {result.qc_checks?.delta_check ? 'Pass' : 'Fail'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <span>Instrument QC: {result.qc_checks?.instrument_qc ? 'Pass' : 'Fail'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Previous Results */}
                            {result.previous_results && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <h5 className="font-semibold text-sm mb-2">Historical Trend</h5>
                                <div className="flex items-center gap-2 text-xs">
                                  <TrendingUp className="w-4 h-4 text-blue-600" />
                                  {result.previous_results.map((prev, i) => (
                                    <span key={i}>{prev.date}: {prev.value}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {result.validation_status === 'pending' && (
                            <Button onClick={() => validateResult(result.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Validate
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Printer className="w-4 h-4 mr-1" />
                            Print Report
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Control */}
        <TabsContent value="qc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Management</CardTitle>
              <CardDescription>Daily QC logs, reference ranges, and compliance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Today's QC Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['Hematology Analyzer', 'Chemistry Analyzer', 'Immunology Analyzer'].map((analyzer, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{analyzer}</p>
                            <p className="text-sm text-gray-600">Last QC: 2 hours ago</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pass
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Inventory Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { item: 'CBC Reagent', stock: 45, reorder: 20, status: 'ok' },
                        { item: 'LFT Reagent', stock: 12, reorder: 20, status: 'low' },
                        { item: 'EDTA Tubes', stock: 150, reorder: 50, status: 'ok' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{item.item}</p>
                            <p className="text-sm text-gray-600">Reorder level: {item.reorder}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${item.status === 'low' ? 'text-red-600' : 'text-green-600'}`}>
                              {item.stock} units
                            </p>
                            {item.status === 'low' && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laboratory Analytics & TAT Monitoring</CardTitle>
              <CardDescription>Turnaround time tracking and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Average TAT</p>
                      <p className="text-3xl font-bold text-blue-600">2.5 hrs</p>
                      <p className="text-xs text-gray-500">Target: 4 hrs</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Tests Today</p>
                      <p className="text-3xl font-bold text-green-600">247</p>
                      <p className="text-xs text-gray-500">+12% vs yesterday</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Critical Values</p>
                      <p className="text-3xl font-bold text-red-600">5</p>
                      <p className="text-xs text-gray-500">All notified</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">TAT Trend Chart</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
