import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import PatientSearch from './PatientSearch';
import { 
  TestTube, 
  Plus, 
  Search, 
  Calendar,
  X,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

const LabOrders = ({ patientId: initialPatientId }) => {
  const [orders, setOrders] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    test_name: '',
    test_code: '',
    test_type: 'laboratory',
    priority: 'routine',
    order_date: new Date().toISOString().split('T')[0],
    clinical_indication: '',
    special_instructions: '',
    fasting_required: false,
    specimen_type: 'blood'
  });

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatient({ id: initialPatientId });
      loadOrders(initialPatientId);
    } else if (selectedPatient?.id) {
      loadOrders(selectedPatient.id);
    }
  }, [initialPatientId, selectedPatient]);

  const loadOrders = async (patientId) => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      const result = await apiService.request('/clinical/lab-orders', { method: 'GET' }, { patient_id: patientId });
      if (result.success) {
        setOrders(result.lab_orders || []);
      }
    } catch (error) {
      console.error('Error loading lab orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    setLoading(true);
    try {
        const orderData = {
          patient_id: selectedPatient.id || selectedPatient.universal_patient_id,
          test_name: formData.test_name,
          test_code: formData.test_code,
          test_type: formData.test_type,
          priority: formData.priority,
          order_date: formData.order_date,
          clinical_indication: formData.clinical_indication,
          special_instructions: formData.special_instructions,
          fasting_required: formData.fasting_required,
          specimen_type: formData.specimen_type,
          encounter_id: formData.encounter_id ? parseInt(formData.encounter_id) : null,
          status: 'pending',
          order_status: 'pending'
        };

      // Try provider workflows endpoint first, then fallback to clinical endpoint
      let result;
      try {
        result = await apiService.request('/provider-workflows/physician/lab-order', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
      } catch (error) {
        // Fallback to clinical endpoint
        result = await apiService.request('/clinical/lab-orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
      }

      if (result.success) {
        alert('Lab order created successfully!');
        setShowCreateForm(false);
        setFormData({
          test_name: '',
          test_code: '',
          test_type: 'laboratory',
          priority: 'routine',
          order_date: new Date().toISOString().split('T')[0],
          clinical_indication: '',
          special_instructions: '',
          fasting_required: false,
          specimen_type: 'blood',
          encounter_id: ''
        });
        if (selectedPatient?.id) {
          loadOrders(selectedPatient.id);
        }
      }
    } catch (error) {
      console.error('Error creating lab order:', error);
      alert('Error creating lab order: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-teal-100 text-teal-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'stat': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'routine': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageWrapper
      title="Lab Orders"
      description="Create and manage laboratory orders"
      icon={TestTube}
      actions={
        <Button onClick={() => setShowCreateForm(true)} disabled={!selectedPatient && !initialPatientId}>
          <Plus className="w-4 h-4 mr-2" />
          New Lab Order
        </Button>
      }
    >
      {/* Patient Selection (if not provided) */}
      {!initialPatientId && (
        <div className="mb-6">
          <PatientSearch 
            onSelectPatient={(patient) => {
              setSelectedPatient(patient);
              if (patient) {
                loadOrders(patient.id || patient.universal_patient_id);
              }
            }}
          />
        </div>
      )}

      {/* Create Lab Order Form */}
      {showCreateForm && (selectedPatient || initialPatientId) && (
        <Card className="mb-6 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create Lab Order</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Test Name *</Label>
                  <Input
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    placeholder="e.g., Complete Blood Count"
                    required
                  />
                </div>
                <div>
                  <Label>Test Code</Label>
                  <Input
                    value={formData.test_code}
                    onChange={(e) => setFormData({ ...formData, test_code: e.target.value })}
                    placeholder="LOINC code"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Test Type</Label>
                  <select
                    value={formData.test_type}
                    onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="laboratory">Laboratory</option>
                    <option value="imaging">Imaging</option>
                    <option value="pathology">Pathology</option>
                    <option value="radiology">Radiology</option>
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order Date *</Label>
                  <Input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Encounter ID (Optional)</Label>
                  <Input
                    value={formData.encounter_id}
                    onChange={(e) => setFormData({ ...formData, encounter_id: e.target.value })}
                    placeholder="Link to encounter"
                  />
                </div>
                <div>
                  <Label>Specimen Type</Label>
                  <select
                    value={formData.specimen_type}
                    onChange={(e) => setFormData({ ...formData, specimen_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="blood">Blood</option>
                    <option value="urine">Urine</option>
                    <option value="stool">Stool</option>
                    <option value="sputum">Sputum</option>
                    <option value="tissue">Tissue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Clinical Indication</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                  value={formData.clinical_indication}
                  onChange={(e) => setFormData({ ...formData, clinical_indication: e.target.value })}
                  placeholder="Reason for ordering this test"
                />
              </div>
              <div>
                <Label>Special Instructions</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[60px]"
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  placeholder="Any special instructions for the lab"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fasting_required"
                  checked={formData.fasting_required}
                  onChange={(e) => setFormData({ ...formData, fasting_required: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="fasting_required">Fasting Required</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Order'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lab Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Orders ({orders.length})</CardTitle>
          <CardDescription>
            {selectedPatient || initialPatientId 
              ? `Lab orders for selected patient`
              : 'Select a patient to view lab orders'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p>No lab orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="shadow-sm border-l-4 border-l-teal-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <TestTube className="w-5 h-5 text-teal-700" />
                          <h3 className="font-semibold text-gray-900">{order.test_name}</h3>
                          <Badge className={getStatusColor(order.status || order.order_status)}>
                            {order.status || order.order_status}
                          </Badge>
                          <Badge className={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                          {order.order_id && (
                            <div>
                              <p className="font-semibold text-gray-700">Order ID</p>
                              <p>{order.order_id}</p>
                            </div>
                          )}
                          {order.order_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <div>
                                <p className="font-semibold text-gray-700">Order Date</p>
                                <p>{new Date(order.order_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          )}
                          {order.specimen_type && (
                            <div>
                              <p className="font-semibold text-gray-700">Specimen</p>
                              <p>{order.specimen_type}</p>
                            </div>
                          )}
                          {order.test_type && (
                            <div>
                              <p className="font-semibold text-gray-700">Type</p>
                              <p>{order.test_type}</p>
                            </div>
                          )}
                        </div>
                        {order.clinical_indication && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p><strong>Indication:</strong> {order.clinical_indication}</p>
                          </div>
                        )}
                        {order.fasting_required && (
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-yellow-50">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Fasting Required
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
};

export default LabOrders;

