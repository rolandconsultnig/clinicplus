import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Pill, AlertTriangle, CheckCircle } from 'lucide-react';

export default function PrescriptionManager({ patientId, providerId, facilityId, userType = 'provider' }) {
  // Only providers can create prescriptions
  const canCreatePrescription = userType !== 'patient' && (userType === 'provider' || userType === 'physician' || userType === 'nurse');
  const [prescriptions, setPrescriptions] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [interactionWarnings, setInteractionWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dosage: '',
    frequency: '',
    quantity: '',
    refills: '0',
    route: 'oral',
    sig: '',
    days_supply: ''
  });

  useEffect(() => {
    if (patientId) {
      loadPrescriptions();
    }
  }, [patientId]);

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchDrugs();
    }
  }, [searchTerm]);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const result = await apiService.request(`/prescribing/prescriptions?patient_id=${patientId}`);
      if (result.success) {
        setPrescriptions(result.prescriptions || []);
      }
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchDrugs = async () => {
    try {
      const result = await apiService.request(`/prescribing/drugs?search=${encodeURIComponent(searchTerm)}`);
      if (result.success) {
        setDrugs(result.drugs || []);
      }
    } catch (error) {
      console.error('Failed to search drugs:', error);
    }
  };

  const checkInteractions = async (drugId) => {
    try {
      const result = await apiService.request('/prescribing/prescriptions/check-interactions', {
        method: 'POST',
        body: JSON.stringify({
          drug_ids: [...prescriptions.filter(p => p.status === 'active').map(p => p.drug_id), drugId],
          patient_id: patientId
        })
      });

      if (result.success && result.warnings) {
        setInteractionWarnings(result.warnings);
      }
    } catch (error) {
      console.error('Failed to check interactions:', error);
    }
  };

  const createPrescription = async (prescriptionData) => {
    try {
      // Check interactions first
      await checkInteractions(prescriptionData.drug_id);

      const result = await apiService.request('/prescribing/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          ...prescriptionData,
          patient_id: patientId,
          provider_id: providerId,
          facility_id: facilityId
        })
      });

      if (result.success) {
        setShowCreateForm(false);
        setSelectedDrug(null);
        setInteractionWarnings([]);
        setFormData({
          dosage: '',
          frequency: '',
          quantity: '',
          refills: '0',
          route: 'oral',
          sig: '',
          days_supply: ''
        });
        loadPrescriptions();
        alert('Prescription created successfully!');
      } else {
        alert(result.error || 'Failed to create prescription');
      }
    } catch (error) {
      console.error('Failed to create prescription:', error);
      alert('Error creating prescription: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Prescriptions"
      description="Manage patient prescriptions and drug interactions"
      icon={Pill}
      actions={
        canCreatePrescription && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Pill className="w-4 h-4 mr-2" />
            New Prescription
          </Button>
        )
      }
    >

      {/* Interaction Warnings */}
      {interactionWarnings.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">Drug Interaction Warnings</h3>
                <ul className="space-y-2">
                  {interactionWarnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                      <Badge variant={warning.severity === 'severe' ? 'destructive' : 'secondary'} className="mt-0.5">
                        {warning.severity.toUpperCase()}
                      </Badge>
                      <span>{warning.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Prescription Form - Only for Providers */}
      {showCreateForm && canCreatePrescription && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Create New Prescription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search Drug</label>
                <Input
                  placeholder="Search by drug name or RxNorm code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {drugs.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                    {drugs.map(drug => (
                      <div
                        key={drug.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedDrug(drug);
                          checkInteractions(drug.id);
                          setFormData({
                            dosage: '',
                            frequency: '',
                            quantity: '',
                            refills: '0',
                            route: 'oral',
                            sig: '',
                            days_supply: ''
                          });
                        }}
                      >
                        <div className="font-medium">{drug.drug_name}</div>
                        <div className="text-sm text-gray-600">{drug.generic_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedDrug && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="font-medium">{selectedDrug.drug_name}</div>
                  <div className="text-sm text-gray-600">RxNorm: {selectedDrug.rxnorm_code}</div>
                  {selectedDrug.is_controlled && (
                    <div className="text-xs text-red-600 mt-1">Controlled Substance - DEA Required</div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Dosage *</label>
                  <Input 
                    placeholder="e.g., 10mg"
                    value={formData.dosage || ''}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Frequency *</label>
                  <Input 
                    placeholder="e.g., twice daily"
                    value={formData.frequency || ''}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity *</label>
                  <Input 
                    type="number"
                    placeholder="e.g., 30"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Refills</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={formData.refills || '0'}
                    onChange={(e) => setFormData({ ...formData, refills: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Route</label>
                <select
                  value={formData.route || 'oral'}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="oral">Oral</option>
                  <option value="topical">Topical</option>
                  <option value="injection">Injection</option>
                  <option value="inhalation">Inhalation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Patient Instructions (SIG)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[60px]"
                  value={formData.sig || ''}
                  onChange={(e) => setFormData({ ...formData, sig: e.target.value })}
                  placeholder="Instructions for the patient"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Days Supply</label>
                <Input 
                  type="number"
                  placeholder="e.g., 30"
                  value={formData.days_supply || ''}
                  onChange={(e) => setFormData({ ...formData, days_supply: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button"
                  onClick={() => {
                    if (!selectedDrug) {
                      alert('Please select a drug');
                      return;
                    }
                    if (!formData.dosage || !formData.frequency || !formData.quantity) {
                      alert('Please fill in all required fields');
                      return;
                    }
                    createPrescription({ 
                      drug_id: selectedDrug.id,
                      dosage: formData.dosage,
                      frequency: formData.frequency,
                      quantity: parseInt(formData.quantity),
                      refills: parseInt(formData.refills || '0'),
                      route: formData.route || 'oral',
                      sig: formData.sig,
                      days_supply: formData.days_supply ? parseInt(formData.days_supply) : null,
                      start_date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Prescription'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedDrug(null);
                    setInteractionWarnings([]);
                    setFormData({
                      dosage: '',
                      frequency: '',
                      quantity: '',
                      refills: '0',
                      route: 'oral',
                      sig: '',
                      days_supply: ''
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prescriptions List */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Active Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.filter(p => p.status === 'active').map(prescription => (
                <Card key={prescription.id} className="shadow-sm border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Pill className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="font-semibold text-lg text-gray-900">{prescription.drug_name}</h3>
                        </div>
                        <div className="ml-13 space-y-1 text-sm text-gray-600">
                          <p>Dosage: {prescription.dosage} | Frequency: {prescription.frequency}</p>
                          <p>Quantity: {prescription.quantity} | Refills: {prescription.refills_remaining}/{prescription.refills}</p>
                          {prescription.sig && <p>Instructions: {prescription.sig}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          prescription.status === 'active' ? 'default' :
                          prescription.status === 'filled' ? 'secondary' :
                          'outline'
                        }>
                          {prescription.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {prescriptions.filter(p => p.status === 'active').length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-gray-500">
                      <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No active prescriptions</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

