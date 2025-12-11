import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { MapPin, Package, DollarSign, CheckCircle, XCircle, AlertTriangle, ShoppingCart, FileText, Clock, Search, Filter, TrendingDown, TrendingUp } from 'lucide-react';

export default function PharmacySearch({ prescriptionId, drugId, onSelectPharmacy }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [useLocation, setUseLocation] = useState(false);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [showDispensingModal, setShowDispensingModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [dispensingForm, setDispensingForm] = useState({
    prescription_id: prescriptionId || '',
    quantity: '',
    notes: ''
  });
  const [inventoryForm, setInventoryForm] = useState({
    drug_id: '',
    quantity: '',
    unit_price: '',
    expiry_date: '',
    batch_number: ''
  });
  const [filterStock, setFilterStock] = useState('all'); // all, in_stock, low_stock, out_of_stock

  useEffect(() => {
    if (useLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, [useLocation]);

  useEffect(() => {
    if (drugId) {
      searchPharmacies();
    }
  }, [drugId, location, searchTerm]);

  const searchPharmacies = async () => {
    setLoading(true);
    try {
      let url = `/pharmacy/pharmacies`;
      
      if (drugId) {
        url += `?drug_id=${drugId}`;
      }
      
      if (location.latitude && location.longitude) {
        url += `${drugId ? '&' : '?'}latitude=${location.latitude}&longitude=${location.longitude}&max_distance=10`;
      }
      
      if (searchTerm) {
        url += `${drugId || location.latitude ? '&' : '?'}search=${encodeURIComponent(searchTerm)}`;
      }

      const result = await apiService.request(url);
      
      if (result.success) {
        setPharmacies(result.pharmacies || []);
      }
    } catch (error) {
      console.error('Failed to search pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacyInventory = async (pharmacyId) => {
    try {
      setLoading(true);
      const result = await apiService.request(`/pharmacy/pharmacies/${pharmacyId}/inventory`);
      if (result.success) {
        setInventory(result.inventory || []);
        setShowInventoryModal(true);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFulfillments = async () => {
    try {
      const result = await apiService.request('/pharmacy/fulfillments');
      if (result.success) {
        setFulfillments(result.fulfillments || []);
      }
    } catch (error) {
      console.error('Failed to load fulfillments:', error);
    }
  };

  useEffect(() => {
    loadFulfillments();
  }, []);

  const handleFulfillPrescription = async () => {
    try {
      setLoading(true);
      const result = await apiService.request(`/pharmacy/prescriptions/${prescriptionId}/fulfill`, {
        method: 'POST',
        body: JSON.stringify({
          pharmacy_id: selectedPharmacy?.id,
          quantity: parseInt(dispensingForm.quantity),
          notes: dispensingForm.notes
        })
      });

      if (result.success) {
        alert('Prescription fulfilled successfully!');
        setShowDispensingModal(false);
        loadFulfillments();
      }
    } catch (error) {
      console.error('Failed to fulfill prescription:', error);
      alert('Failed to fulfill prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInventory = async (pharmacyId) => {
    try {
      setLoading(true);
      const result = await apiService.request(`/pharmacy/pharmacies/${pharmacyId}/inventory`, {
        method: 'POST',
        body: JSON.stringify({
          drug_id: inventoryForm.drug_id,
          quantity: parseInt(inventoryForm.quantity),
          unit_price: parseFloat(inventoryForm.unit_price),
          expiry_date: inventoryForm.expiry_date,
          batch_number: inventoryForm.batch_number
        })
      });

      if (result.success) {
        alert('Inventory updated successfully!');
        setShowInventoryModal(false);
        loadPharmacyInventory(pharmacyId);
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
      alert('Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  const checkInsuranceAdjudication = async (prescriptionId, pharmacyId) => {
    try {
      // Mock insurance adjudication check
      const result = await apiService.request(`/pharmacy/prescriptions/${prescriptionId}/adjudicate`, {
        method: 'POST',
        body: JSON.stringify({ pharmacy_id: pharmacyId })
      });
      return result;
    } catch (error) {
      console.error('Insurance adjudication failed:', error);
      return null;
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy => {
    if (filterStock === 'in_stock') {
      return pharmacy.stock_available > 0;
    } else if (filterStock === 'low_stock') {
      return pharmacy.stock_available > 0 && pharmacy.stock_available < 10;
    } else if (filterStock === 'out_of_stock') {
      return pharmacy.stock_available === 0;
    }
    return true;
  });

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive', icon: XCircle };
    if (stock < 10) return { label: 'Low Stock', variant: 'secondary', icon: AlertTriangle };
    return { label: 'In Stock', variant: 'default', icon: CheckCircle };
  };

  return (
    <PageWrapper
      title="Pharmacy Search & Inventory"
      description="Search pharmacies, manage inventory, and fulfill prescriptions"
      icon={Package}
    >
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search Pharmacies</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
          <TabsTrigger value="fulfillments">Prescription Fulfillments</TabsTrigger>
        </TabsList>

        {/* Search Pharmacies Tab */}
        <TabsContent value="search">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Pharmacy Search
              </CardTitle>
              <CardDescription>Find pharmacies with available medications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, location, or drug..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setUseLocation(!useLocation)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {useLocation ? 'Using Location' : 'Use My Location'}
                  </Button>
                  <select
                    value={filterStock}
                    onChange={(e) => setFilterStock(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Stock</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                  <Button onClick={searchPharmacies}>
                    Search
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Searching pharmacies...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPharmacies.map(pharmacy => {
                      const stockStatus = getStockStatus(pharmacy.stock_available || 0);
                      const StockIcon = stockStatus.icon;
                      
                      return (
                        <Card
                          key={pharmacy.id}
                          className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-blue-500"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-gray-900">{pharmacy.pharmacy_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant={stockStatus.variant}>
                                        <StockIcon className="w-3 h-3 mr-1" />
                                        {stockStatus.label}
                                      </Badge>
                                      {pharmacy.stock_available !== undefined && (
                                        <span className="text-sm text-gray-600">
                                          ({pharmacy.stock_available} units)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 ml-13">
                                  <MapPin className="w-4 h-4" />
                                  <span>{pharmacy.address_line1}, {pharmacy.city}, {pharmacy.state}</span>
                                </div>
                                {pharmacy.distance_km && (
                                  <Badge variant="outline" className="mt-2 ml-13">
                                    {pharmacy.distance_km.toFixed(2)} km away
                                  </Badge>
                                )}
                                {pharmacy.phone && (
                                  <p className="text-sm text-gray-600 mt-1 ml-13">Phone: {pharmacy.phone}</p>
                                )}
                              </div>
                              <div className="text-right flex flex-col gap-2">
                                {pharmacy.unit_price && (
                                  <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{pharmacy.unit_price}</span>
                                  </div>
                                )}
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedPharmacy(pharmacy);
                                      setShowDispensingModal(true);
                                    }}
                                    disabled={!prescriptionId || pharmacy.stock_available === 0}
                                  >
                                    <ShoppingCart className="w-4 h-4 mr-1" />
                                    Fulfill
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedPharmacy(pharmacy);
                                      loadPharmacyInventory(pharmacy.id);
                                    }}
                                  >
                                    <Package className="w-4 h-4 mr-1" />
                                    Inventory
                                  </Button>
                                  {prescriptionId && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        const result = await checkInsuranceAdjudication(prescriptionId, pharmacy.id);
                                        if (result) {
                                          alert(`Insurance Coverage: ${result.coverage_percentage || 0}%\nPatient Pays: ${result.patient_pays || 0}`);
                                        }
                                      }}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      Check Insurance
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {filteredPharmacies.length === 0 && !loading && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p>No pharmacies found</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Management Tab */}
        <TabsContent value="inventory">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inventory Management</CardTitle>
                  <CardDescription>View and manage pharmacy inventory</CardDescription>
                </div>
                {selectedPharmacy && (
                  <Button onClick={() => {
                    setShowInventoryModal(true);
                    setInventoryForm({
                      drug_id: drugId || '',
                      quantity: '',
                      unit_price: '',
                      expiry_date: '',
                      batch_number: ''
                    });
                  }}>
                    <Package className="w-4 h-4 mr-2" />
                    Add Inventory
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedPharmacy ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">{selectedPharmacy.pharmacy_name}</h3>
                  </div>
                  {inventory.length > 0 ? (
                    <div className="space-y-2">
                      {inventory.map(item => {
                        const stockStatus = getStockStatus(item.quantity || 0);
                        const StockIcon = stockStatus.icon;
                        
                        return (
                          <Card key={item.id} className="shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{item.drug_name || `Drug #${item.drug_id}`}</h4>
                                    <Badge variant={stockStatus.variant}>
                                      <StockIcon className="w-3 h-3 mr-1" />
                                      {stockStatus.label}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                    <span>Quantity: {item.quantity}</span>
                                    {item.unit_price && (
                                      <span>Price: {item.unit_price}</span>
                                    )}
                                    {item.expiry_date && (
                                      <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                                    )}
                                    {item.batch_number && (
                                      <span>Batch: {item.batch_number}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.quantity < 10 && (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                      <TrendingDown className="w-3 h-3 mr-1" />
                                      Low Stock Alert
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No inventory data available</p>
                      <p className="text-sm mt-2">Select a pharmacy to view inventory</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>Select a pharmacy from the search tab to view inventory</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescription Fulfillments Tab */}
        <TabsContent value="fulfillments">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Prescription Fulfillments</CardTitle>
              <CardDescription>Track prescription fulfillment status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fulfillments.map(fulfillment => (
                  <Card key={fulfillment.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">Fulfillment #{fulfillment.fulfillment_id}</h4>
                            <Badge variant={
                              fulfillment.status === 'completed' ? 'default' :
                              fulfillment.status === 'pending' ? 'secondary' :
                              'outline'
                            }>
                              {fulfillment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>Prescription: #{fulfillment.prescription_id}</span>
                            <span>Pharmacy: {fulfillment.pharmacy_name}</span>
                            <span>Quantity: {fulfillment.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Fulfilled: {new Date(fulfillment.fulfilled_at).toLocaleDateString()}</span>
                            {fulfillment.picked_up_at && (
                              <>
                                <CheckCircle className="w-3 h-3 ml-2" />
                                <span>Picked up: {new Date(fulfillment.picked_up_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {fulfillment.status === 'fulfilled' && !fulfillment.picked_up_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const result = await apiService.request(`/pharmacy/fulfillments/${fulfillment.id}/pickup`, {
                                  method: 'POST'
                                });
                                if (result.success) {
                                  loadFulfillments();
                                }
                              } catch (error) {
                                console.error('Failed to mark as picked up:', error);
                              }
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Picked Up
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {fulfillments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p>No fulfillments found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dispensing Modal */}
      {showDispensingModal && selectedPharmacy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Fulfill Prescription</CardTitle>
              <CardDescription>{selectedPharmacy.pharmacy_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={dispensingForm.quantity}
                  onChange={(e) => setDispensingForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  className="mt-1"
                  max={selectedPharmacy.stock_available}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {selectedPharmacy.stock_available} units
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={dispensingForm.notes}
                  onChange={(e) => setDispensingForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleFulfillPrescription}
                  disabled={loading || !dispensingForm.quantity}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Processing...' : 'Fulfill Prescription'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDispensingModal(false);
                    setDispensingForm({
                      prescription_id: prescriptionId || '',
                      quantity: '',
                      notes: ''
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

      {/* Inventory Modal */}
      {showInventoryModal && selectedPharmacy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Update Inventory</CardTitle>
              <CardDescription>{selectedPharmacy.pharmacy_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="inv-drug">Drug ID</Label>
                <Input
                  id="inv-drug"
                  value={inventoryForm.drug_id}
                  onChange={(e) => setInventoryForm(prev => ({ ...prev, drug_id: e.target.value }))}
                  placeholder="Drug ID"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="inv-quantity">Quantity</Label>
                <Input
                  id="inv-quantity"
                  type="number"
                  value={inventoryForm.quantity}
                  onChange={(e) => setInventoryForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="inv-price">Unit Price</Label>
                <Input
                  id="inv-price"
                  type="number"
                  value={inventoryForm.unit_price}
                  onChange={(e) => setInventoryForm(prev => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="inv-expiry">Expiry Date</Label>
                <Input
                  id="inv-expiry"
                  type="date"
                  value={inventoryForm.expiry_date}
                  onChange={(e) => setInventoryForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="inv-batch">Batch Number</Label>
                <Input
                  id="inv-batch"
                  value={inventoryForm.batch_number}
                  onChange={(e) => setInventoryForm(prev => ({ ...prev, batch_number: e.target.value }))}
                  placeholder="Batch number"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleUpdateInventory(selectedPharmacy.id)}
                  disabled={loading || !inventoryForm.drug_id || !inventoryForm.quantity}
                  className="flex-1"
                >
                  {loading ? 'Updating...' : 'Update Inventory'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInventoryModal(false);
                    setInventoryForm({
                      drug_id: '',
                      quantity: '',
                      unit_price: '',
                      expiry_date: '',
                      batch_number: ''
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
    </PageWrapper>
  );
}
