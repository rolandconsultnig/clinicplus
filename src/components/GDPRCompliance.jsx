import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Shield, FileText, AlertTriangle, Download, CheckCircle2, Clock, User } from 'lucide-react';

const GDPRCompliance = () => {
  const [dashboard, setDashboard] = useState(null);
  const [consents, setConsents] = useState([]);
  const [dataRequests, setDataRequests] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showBreachForm, setShowBreachForm] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/api/gdpr/compliance/dashboard', { method: 'GET' });
      if (result.success) {
        setDashboard(result.dashboard);
      }
    } catch (error) {
      console.error('Error loading GDPR dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConsents = async (patientId) => {
    try {
      const result = await apiService.request(`/api/gdpr/consent/patient/${patientId}`, { method: 'GET' });
      if (result.success) {
        setConsents(result.consents);
      }
    } catch (error) {
      console.error('Error loading consents:', error);
    }
  };

  const loadDataRequests = async (patientId) => {
    try {
      const result = await apiService.request(`/api/gdpr/data-request/patient/${patientId}`, { method: 'GET' });
      if (result.success) {
        setDataRequests(result.requests);
      }
    } catch (error) {
      console.error('Error loading data requests:', error);
    }
  };

  const loadBreaches = async () => {
    try {
      const result = await apiService.request('/api/gdpr/breaches', { method: 'GET' });
      if (result.success) {
        setBreaches(result.breaches);
      }
    } catch (error) {
      console.error('Error loading breaches:', error);
    }
  };

  const createConsent = async () => {
    try {
      const result = await apiService.request('/api/gdpr/consent', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        alert('Consent created successfully');
        setShowConsentForm(false);
        setFormData({});
        loadDashboard();
      }
    } catch (error) {
      alert('Failed to create consent: ' + (error.message || 'Unknown error'));
    }
  };

  const withdrawConsent = async (consentId, patientId) => {
    if (!confirm('Are you sure you want to withdraw this consent?')) return;
    
    try {
      const result = await apiService.request(`/api/gdpr/consent/${consentId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId })
      });
      
      if (result.success) {
        alert('Consent withdrawn successfully');
        loadDashboard();
      }
    } catch (error) {
      alert('Failed to withdraw consent: ' + (error.message || 'Unknown error'));
    }
  };

  const createDataRequest = async () => {
    try {
      const result = await apiService.request('/api/gdpr/data-request', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        alert('Data request created successfully');
        setShowRequestForm(false);
        setFormData({});
        loadDashboard();
      }
    } catch (error) {
      alert('Failed to create data request: ' + (error.message || 'Unknown error'));
    }
  };

  const processDataRequest = async (requestId) => {
    try {
      const result = await apiService.request(`/api/gdpr/data-request/${requestId}/process`, {
        method: 'POST'
      });
      
      if (result.success) {
        alert('Data request processed successfully');
        loadDashboard();
      }
    } catch (error) {
      alert('Failed to process request: ' + (error.message || 'Unknown error'));
    }
  };

  const downloadDataExport = async (requestId) => {
    try {
      const result = await apiService.request(`/api/gdpr/data-request/${requestId}/download`, {
        method: 'GET'
      });
      
      // In production, would trigger file download
      alert('Data export downloaded');
    } catch (error) {
      alert('Failed to download export: ' + (error.message || 'Unknown error'));
    }
  };

  const recordBreach = async () => {
    try {
      const result = await apiService.request('/api/gdpr/breach', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        alert('Breach recorded successfully');
        setShowBreachForm(false);
        setFormData({});
        loadBreaches();
        loadDashboard();
      }
    } catch (error) {
      alert('Failed to record breach: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="p-6">Loading GDPR compliance data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GDPR Compliance</h1>
          <p className="text-gray-600 mt-1">EU General Data Protection Regulation</p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          <Shield className="w-4 h-4 mr-2" />
          GDPR Compliant
        </Badge>
      </div>

      {/* Dashboard Statistics */}
      {dashboard && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Consents</p>
              <p className="text-2xl font-bold">{dashboard.statistics.total_consents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Active Consents</p>
              <p className="text-2xl font-bold text-green-600">{dashboard.statistics.active_consents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-orange-600">{dashboard.statistics.pending_requests}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Breaches</p>
              <p className="text-2xl font-bold">{dashboard.statistics.total_breaches}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Unresolved Breaches</p>
              <p className="text-2xl font-bold text-red-600">{dashboard.statistics.unresolved_breaches}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="consents">
        <TabsList>
          <TabsTrigger value="consents">Consents</TabsTrigger>
          <TabsTrigger value="data-requests">Data Requests</TabsTrigger>
          <TabsTrigger value="breaches">Breaches</TabsTrigger>
          <TabsTrigger value="processing-activities">Processing Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="consents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>GDPR Consents</CardTitle>
                  <CardDescription>Manage patient consents for data processing</CardDescription>
                </div>
                <Button onClick={() => setShowConsentForm(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Consent
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {consents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No consents found</p>
              ) : (
                <div className="space-y-4">
                  {consents.map((consent) => (
                    <div key={consent.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={consent.is_granted ? 'default' : 'secondary'}>
                              {consent.is_granted ? 'Active' : 'Withdrawn'}
                            </Badge>
                            <span className="font-semibold">{consent.consent_type}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{consent.consent_purpose}</p>
                          <p className="text-xs text-gray-500">
                            Granted: {consent.granted_at ? new Date(consent.granted_at).toLocaleString() : 'N/A'}
                            {consent.withdrawn_at && (
                              <> | Withdrawn: {new Date(consent.withdrawn_at).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        {consent.is_granted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => withdrawConsent(consent.consent_id, consent.patient_id)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-requests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Data Subject Access Requests</CardTitle>
                  <CardDescription>Manage GDPR data requests</CardDescription>
                </div>
                <Button onClick={() => setShowRequestForm(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Request
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataRequests.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No data requests found</p>
              ) : (
                <div className="space-y-4">
                  {dataRequests.map((req) => (
                    <div key={req.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              req.status === 'completed' ? 'default' :
                              req.status === 'pending' ? 'secondary' :
                              'destructive'
                            }>
                              {req.status}
                            </Badge>
                            <span className="font-semibold">{req.request_type}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{req.request_description}</p>
                          <p className="text-xs text-gray-500">
                            Submitted: {new Date(req.submitted_at).toLocaleString()}
                            {req.completed_at && (
                              <> | Completed: {new Date(req.completed_at).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {req.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => processDataRequest(req.request_id)}
                            >
                              Process
                            </Button>
                          )}
                          {req.status === 'completed' && req.response_file_path && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadDataExport(req.request_id)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breaches">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personal Data Breaches</CardTitle>
                  <CardDescription>Record and manage GDPR breaches</CardDescription>
                </div>
                <Button onClick={() => setShowBreachForm(true)} variant="destructive">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Record Breach
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {breaches.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No breaches recorded</p>
              ) : (
                <div className="space-y-4">
                  {breaches.map((breach) => (
                    <div key={breach.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              breach.status === 'resolved' ? 'default' :
                              breach.status === 'investigating' ? 'secondary' :
                              'destructive'
                            }>
                              {breach.status}
                            </Badge>
                            <span className="font-semibold">{breach.breach_type}</span>
                            {breach.risk_level && (
                              <Badge variant={
                                breach.risk_level === 'high' ? 'destructive' :
                                breach.risk_level === 'medium' ? 'secondary' :
                                'default'
                              }>
                                {breach.risk_level} risk
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{breach.breach_description}</p>
                          <p className="text-xs text-gray-500">
                            Affected: {breach.affected_data_subjects} individuals
                            {breach.supervisory_authority_notified && (
                              <> | Authority notified: {new Date(breach.discovered_at).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing-activities">
          <Card>
            <CardHeader>
              <CardTitle>Record of Processing Activities</CardTitle>
              <CardDescription>GDPR Article 30 - Processing activities register</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Processing activities will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Consent Form Modal */}
      {showConsentForm && (
        <Card className="fixed inset-0 z-50 m-auto max-w-2xl max-h-[90vh] overflow-auto">
          <CardHeader>
            <CardTitle>Create Consent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Patient ID</Label>
              <Input
                value={formData.patient_id || ''}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Consent Type</Label>
              <select
                value={formData.consent_type || ''}
                onChange={(e) => setFormData({ ...formData, consent_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select type</option>
                <option value="data_processing">Data Processing</option>
                <option value="marketing">Marketing</option>
                <option value="research">Research</option>
                <option value="sharing">Data Sharing</option>
              </select>
            </div>
            <div>
              <Label>Purpose</Label>
              <Textarea
                value={formData.consent_purpose || ''}
                onChange={(e) => setFormData({ ...formData, consent_purpose: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createConsent}>Create</Button>
              <Button variant="outline" onClick={() => { setShowConsentForm(false); setFormData({}); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Request Form Modal */}
      {showRequestForm && (
        <Card className="fixed inset-0 z-50 m-auto max-w-2xl max-h-[90vh] overflow-auto">
          <CardHeader>
            <CardTitle>Create Data Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Patient ID</Label>
              <Input
                value={formData.patient_id || ''}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Request Type</Label>
              <select
                value={formData.request_type || ''}
                onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select type</option>
                <option value="access">Access</option>
                <option value="rectification">Rectification</option>
                <option value="erasure">Erasure (Right to be Forgotten)</option>
                <option value="portability">Data Portability</option>
                <option value="restriction">Restriction</option>
                <option value="objection">Objection</option>
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.request_description || ''}
                onChange={(e) => setFormData({ ...formData, request_description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createDataRequest}>Submit</Button>
              <Button variant="outline" onClick={() => { setShowRequestForm(false); setFormData({}); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breach Form Modal */}
      {showBreachForm && (
        <Card className="fixed inset-0 z-50 m-auto max-w-2xl max-h-[90vh] overflow-auto">
          <CardHeader>
            <CardTitle>Record Data Breach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Breach Type</Label>
              <select
                value={formData.breach_type || ''}
                onChange={(e) => setFormData({ ...formData, breach_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select type</option>
                <option value="confidentiality">Confidentiality</option>
                <option value="integrity">Integrity</option>
                <option value="availability">Availability</option>
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.breach_description || ''}
                onChange={(e) => setFormData({ ...formData, breach_description: e.target.value })}
              />
            </div>
            <div>
              <Label>Breach Date</Label>
              <Input
                type="datetime-local"
                value={formData.breach_date || ''}
                onChange={(e) => setFormData({ ...formData, breach_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Affected Data Categories (comma-separated)</Label>
              <Input
                value={formData.affected_data_categories || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  affected_data_categories: e.target.value.split(',').map(s => s.trim())
                })}
              />
            </div>
            <div>
              <Label>Number of Affected Individuals</Label>
              <Input
                type="number"
                value={formData.affected_data_subjects || ''}
                onChange={(e) => setFormData({ ...formData, affected_data_subjects: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={recordBreach} variant="destructive">Record Breach</Button>
              <Button variant="outline" onClick={() => { setShowBreachForm(false); setFormData({}); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GDPRCompliance;

