/**
 * Encounter Management - Comprehensive encounter management interface
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, Plus, FileText, DollarSign, CheckCircle, XCircle } from 'lucide-react';

export default function EncounterManagement({ patientId, encounterId }) {
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounter, setSelectedEncounter] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (encounterId) {
      loadEncounterDetails();
    } else if (patientId) {
      loadPatientEncounters();
    }
  }, [patientId, encounterId]);

  const loadPatientEncounters = async () => {
    try {
      setLoading(true);
      const result = await apiService.request(`/api/encounter?patient_id=${patientId}`, 'GET');
      if (result.success) {
        setEncounters(result.encounters || []);
      }
    } catch (err) {
      console.error('Error loading encounters:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEncounterDetails = async () => {
    try {
      setLoading(true);
      const result = await apiService.request(`/api/encounter/${encounterId}/forms`, 'GET');
      if (result.success) {
        setSelectedEncounter(result.encounter);
        setForms(result.forms || []);
      }
    } catch (err) {
      console.error('Error loading encounter details:', err);
    } finally {
      setLoading(false);
    }
  };

  const createEncounter = async (data) => {
    try {
      const result = await apiService.request('/api/encounter/create', 'POST', {
        patient_id: patientId,
        ...data
      });
      if (result.success) {
        loadPatientEncounters();
        setShowCreateForm(false);
      }
    } catch (err) {
      console.error('Error creating encounter:', err);
    }
  };

  const loadForm = async (formType) => {
    try {
      const result = await apiService.request(`/api/encounter/${selectedEncounter.id}/load-form/${formType}`, 'POST');
      if (result.success) {
        loadEncounterDetails();
      }
    } catch (err) {
      console.error('Error loading form:', err);
    }
  };

  const completeEncounter = async () => {
    try {
      const result = await apiService.request(`/api/encounter/${selectedEncounter.id}/complete`, 'PUT', {
        assessment: 'Completed',
        plan: 'Follow up as needed'
      });
      if (result.success) {
        loadEncounterDetails();
      }
    } catch (err) {
      console.error('Error completing encounter:', err);
    }
  };

  if (loading) {
    return <div className="p-4">Loading encounters...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Encounter Management</CardTitle>
            {patientId && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Encounter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="mb-4 p-4 border rounded">
              <h3 className="font-semibold mb-2">Create New Encounter</h3>
              <div className="space-y-2">
                <div>
                  <Label>Encounter Type</Label>
                  <select className="w-full px-3 py-2 border rounded">
                    <option>office_visit</option>
                    <option>emergency</option>
                    <option>inpatient</option>
                    <option>telemedicine</option>
                  </select>
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => createEncounter({ encounter_type: 'office_visit' })}>Create</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {selectedEncounter ? (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="forms">Forms</TabsTrigger>
                <TabsTrigger value="coding">Coding</TabsTrigger>
                <TabsTrigger value="superbill">Superbill</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Encounter ID</p>
                    <p className="font-medium">{selectedEncounter.encounter_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">
                      {selectedEncounter.encounter_date && new Date(selectedEncounter.encounter_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge>{selectedEncounter.encounter_status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Chief Complaint</p>
                    <p className="font-medium">{selectedEncounter.chief_complaint || 'N/A'}</p>
                  </div>
                  {selectedEncounter.encounter_status !== 'completed' && (
                    <Button onClick={completeEncounter}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Encounter
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="forms" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['soap', 'physical_exam', 'ros', 'vitals', 'clinical_notes', 'care_plan'].map((formType) => (
                      <Button
                        key={formType}
                        variant="outline"
                        onClick={() => loadForm(formType)}
                        className="justify-start"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {formType.replace('_', ' ').toUpperCase()}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Loaded Forms</h4>
                    {forms.map((form) => (
                      <Card key={form.id} className="p-3 mb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{form.form_name}</p>
                            <p className="text-sm text-gray-600">
                              {form.form_date && new Date(form.form_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge>{form.form_status}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="coding" className="mt-4">
                <p className="text-gray-500">Coding interface coming soon...</p>
              </TabsContent>

              <TabsContent value="superbill" className="mt-4">
                <p className="text-gray-500">Superbill interface coming soon...</p>
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              <h3 className="font-semibold mb-2">Recent Encounters</h3>
              {encounters.length > 0 ? (
                <div className="space-y-2">
                  {encounters.map((enc) => (
                    <Card key={enc.id} className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => setSelectedEncounter(enc)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{enc.encounter_type}</p>
                          <p className="text-sm text-gray-600">
                            {enc.encounter_date && new Date(enc.encounter_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge>{enc.encounter_status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No encounters found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

