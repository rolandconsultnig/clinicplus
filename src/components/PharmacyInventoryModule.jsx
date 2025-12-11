/**
 * Pharmacy/Inventory Module
 * Complete workflow: Prescription Receipt → Billing → Dispensing → Inventory Management
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Pill,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Printer,
  QrCode,
  TrendingDown,
  TrendingUp,
  FileText,
  ShoppingCart,
  AlertCircle,
  Activity,
  BarChart3,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'
import apiService from '../services/apiService'

export default function PharmacyInventoryModule() {
  const [activeTab, setActiveTab] = useState('pending-prescriptions')
  const [pendingPrescriptions, setPendingPrescriptions] = useState([])
  const [inventory, setInventory] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [expiringItems, setExpiringItems] = useState([])
  const [interactions, setInteractions] = useState([])
  const [dispensingQueue, setDispensingQueue] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPharmacyData()
  }, [])

  const loadPharmacyData = async () => {
    setLoading(true)
    try {
      const [prescriptionsRes, inventoryRes, lowStockRes, expiringRes, queueRes, poRes] = await Promise.all([
        apiService.request('/pharmacy/pending-prescriptions'),
        apiService.request('/pharmacy/inventory'),
        apiService.request('/pharmacy/low-stock'),
        apiService.request('/pharmacy/expiring'),
        apiService.request('/pharmacy/dispensing-queue'),
        apiService.request('/pharmacy/purchase-orders')
      ])
      
      setPendingPrescriptions(prescriptionsRes.prescriptions || [])
      setInventory(inventoryRes.inventory || [])
      setLowStockItems(lowStockRes.lowStock || [])
      setExpiringItems(expiringRes.expiring || [])
      setDispensingQueue(queueRes.queue || [])
      setPurchaseOrders(poRes.orders || [])
    } catch (error) {
      console.error('Error loading pharmacy data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkDrugInteractions = async (prescriptionId) => {
    try {
      const response = await apiService.request(`/pharmacy/check-interactions/${prescriptionId}`)
      setInteractions(response.interactions || [])
      return response.interactions
    } catch (error) {
      console.error('Error checking interactions:', error)
      return []
    }
  }

  const processPrescription = async (prescriptionId) => {
    try {
      // Check interactions first
      const drugInteractions = await checkDrugInteractions(prescriptionId)
      
      if (drugInteractions.length > 0) {
        const proceed = confirm(`${drugInteractions.length} drug interaction(s) detected. Review and proceed?`)
        if (!proceed) return
      }

      await apiService.request(`/pharmacy/process/${prescriptionId}`, {
        method: 'POST'
      })
      
      alert('Prescription processed and added to dispensing queue')
      loadPharmacyData()
    } catch (error) {
      alert('Failed to process prescription: ' + error.message)
    }
  }

  const dispenseMedication = async (queueId) => {
    try {
      await apiService.request(`/pharmacy/dispense/${queueId}`, {
        method: 'POST',
        body: JSON.stringify({ dispensed_by: 'Current Pharmacist' })
      })
      
      alert('Medication dispensed successfully')
      loadPharmacyData()
    } catch (error) {
      alert('Failed to dispense: ' + error.message)
    }
  }

  const generatePurchaseOrder = async (itemId) => {
    try {
      await apiService.request('/pharmacy/generate-po', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId })
      })
      
      alert('Purchase order generated')
      loadPharmacyData()
    } catch (error) {
      alert('Failed to generate PO: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'verified': return 'bg-blue-100 text-blue-800'
      case 'dispensed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'low': return 'bg-red-100 text-red-800'
      case 'adequate': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStockLevel = (current, min, max) => {
    if (current <= min) return { level: 'Critical', color: 'text-red-600' }
    if (current <= min * 1.5) return { level: 'Low', color: 'text-yellow-600' }
    if (current >= max) return { level: 'Overstock', color: 'text-blue-600' }
    return { level: 'Adequate', color: 'text-green-600' }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Pill className="w-8 h-8 text-green-600" />
            Pharmacy & Inventory Management
          </h1>
          <p className="text-gray-600 mt-1">Prescription dispensing, inventory control, and supply chain management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadPharmacyData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      <div className="grid grid-cols-3 gap-4">
        {lowStockItems.length > 0 && (
          <Card className="border-2 border-red-500 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Low Stock Items</p>
                  <p className="text-3xl font-bold text-red-900">{lowStockItems.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        )}
        
        {expiringItems.length > 0 && (
          <Card className="border-2 border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Expiring Soon</p>
                  <p className="text-3xl font-bold text-yellow-900">{expiringItems.length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Pending Prescriptions</p>
                <p className="text-3xl font-bold text-blue-900">{pendingPrescriptions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending-prescriptions">
            Prescriptions ({pendingPrescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="dispensing-queue">
            Dispensing Queue
          </TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            Low Stock
          </TabsTrigger>
          <TabsTrigger value="purchase-orders">
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="reports">
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Pending Prescriptions */}
        <TabsContent value="pending-prescriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prescription Receipt and Verification</CardTitle>
              <CardDescription>e-Prescriptions from CPOE awaiting verification and processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPrescriptions.length > 0 ? (
                  pendingPrescriptions.map((prescription) => (
                    <Card key={prescription.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{prescription.patient_name}</h4>
                              <Badge variant="outline">MRN: {prescription.mrn}</Badge>
                              <Badge className={getStatusColor(prescription.status)}>
                                {prescription.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <span className="text-sm text-gray-600">Prescribed By:</span>
                                <p className="font-medium">{prescription.prescriber}</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Date:</span>
                                <p className="font-medium">{new Date(prescription.date).toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Medications */}
                            <div className="p-3 bg-gray-50 rounded-lg mb-3">
                              <h5 className="font-semibold text-sm mb-2">Medications:</h5>
                              <div className="space-y-2">
                                {prescription.medications?.map((med, i) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <div>
                                      <p className="font-medium">{med.name} {med.strength}</p>
                                      <p className="text-gray-600">{med.dosage} - {med.frequency} - {med.duration}</p>
                                    </div>
                                    <Badge variant="outline">Qty: {med.quantity}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Patient Allergies */}
                            {prescription.allergies && prescription.allergies.length > 0 && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                                <h5 className="font-semibold text-sm text-red-900 flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  Known Allergies
                                </h5>
                                <div className="flex gap-2">
                                  {prescription.allergies.map((allergy, i) => (
                                    <Badge key={i} className="bg-red-100 text-red-800">{allergy}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Drug Interactions */}
                            {prescription.interactions && prescription.interactions.length > 0 && (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h5 className="font-semibold text-sm text-yellow-900 flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-4 h-4" />
                                  Drug Interactions Detected
                                </h5>
                                <ul className="space-y-1 text-sm">
                                  {prescription.interactions.map((interaction, i) => (
                                    <li key={i} className="text-yellow-800">
                                      • {interaction.description}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm"
                              onClick={() => processPrescription(prescription.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify & Process
                            </Button>
                            <Button size="sm" variant="outline">
                              <Search className="w-4 h-4 mr-1" />
                              Check Interactions
                            </Button>
                            <Button size="sm" variant="outline">
                              <DollarSign className="w-4 h-4 mr-1" />
                              Calculate Cost
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No pending prescriptions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dispensing Queue */}
        <TabsContent value="dispensing-queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispensing and Counseling</CardTitle>
              <CardDescription>Verified prescriptions ready for dispensing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dispensingQueue.map((item) => (
                  <Card key={item.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <QrCode className="w-6 h-6 text-green-600" />
                            <div>
                              <h4 className="font-semibold">{item.patient_name}</h4>
                              <p className="text-sm text-gray-600">Queue #: {item.queue_number}</p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">Ready</Badge>
                          </div>

                          <div className="space-y-2 mb-3">
                            {item.medications?.map((med, i) => (
                              <div key={i} className="flex items-center justify-between p-2 border rounded">
                                <div>
                                  <p className="font-medium">{med.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {med.dosage} - Qty: {med.quantity}
                                  </p>
                                </div>
                                <Button size="sm" variant="outline">
                                  <QrCode className="w-4 h-4 mr-1" />
                                  Scan
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="p-3 bg-blue-50 rounded-lg text-sm">
                            <h5 className="font-semibold mb-1">Counseling Points:</h5>
                            <ul className="space-y-1 text-gray-700">
                              <li>• Take with food</li>
                              <li>• Complete full course</li>
                              <li>• Report any side effects</li>
                            </ul>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button onClick={() => dispenseMedication(item.id)}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Dispense
                          </Button>
                          <Button size="sm" variant="outline">
                            <Printer className="w-4 h-4 mr-1" />
                            Print Label
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4 mr-1" />
                            Receipt
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

        {/* Inventory Management */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inventory Management</CardTitle>
                  <CardDescription>Real-time stock levels and batch tracking</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                  <Button size="sm" variant="outline">
                    <Search className="w-4 h-4 mr-1" />
                    Search
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inventory.map((item) => {
                  const stockInfo = getStockLevel(item.current_stock, item.min_stock, item.max_stock)
                  return (
                    <Card key={item.id} className="hover:bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Package className="w-5 h-5 text-blue-600" />
                              <div>
                                <h4 className="font-semibold">{item.drug_name}</h4>
                                <p className="text-sm text-gray-600">{item.generic_name} - {item.strength}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Current Stock:</span>
                                <p className={`font-bold text-lg ${stockInfo.color}`}>
                                  {item.current_stock}
                                </p>
                                <Badge className={getStatusColor(stockInfo.level.toLowerCase())}>
                                  {stockInfo.level}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-gray-600">Min/Max:</span>
                                <p className="font-medium">{item.min_stock} / {item.max_stock}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Batch:</span>
                                <p className="font-medium">{item.batch_number}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Expiry:</span>
                                <p className="font-medium">{new Date(item.expiry_date).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Unit Price:</span>
                                <p className="font-medium">${item.unit_price}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {item.current_stock <= item.min_stock && (
                              <Button 
                                size="sm"
                                onClick={() => generatePurchaseOrder(item.id)}
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Order
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock */}
        <TabsContent value="low-stock" className="space-y-4">
          <Card className="border-2 border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-6 h-6" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>Items requiring immediate reorder</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <h4 className="font-semibold text-red-900">{item.drug_name}</h4>
                      <p className="text-sm text-red-700">
                        Current: {item.current_stock} | Min: {item.min_stock} | Reorder: {item.reorder_quantity}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => generatePurchaseOrder(item.id)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Generate PO
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Automated PO generation and vendor management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <Card key={po.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">PO #{po.po_number}</h4>
                            <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">Vendor: {po.vendor_name}</p>
                          <p className="text-sm text-gray-600">Items: {po.item_count} | Total: ${po.total_amount}</p>
                          <p className="text-sm text-gray-600">Date: {new Date(po.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Printer className="w-4 h-4" />
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

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage & Consumption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                  <BarChart3 className="w-16 h-16 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Financial Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 border rounded">
                    <span>Total Sales</span>
                    <span className="font-bold text-green-600">$45,230</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded">
                    <span>Cost of Goods Sold</span>
                    <span className="font-bold text-red-600">$28,150</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded bg-blue-50">
                    <span className="font-semibold">Gross Profit</span>
                    <span className="font-bold text-blue-600">$17,080</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
