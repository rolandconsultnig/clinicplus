/**
 * Patient Portal Management Component
 * Administrative interface for managing patient portal access
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle2, XCircle, Search, Settings, Eye, UserPlus, Lock, Unlock, Activity } from 'lucide-react';

export default function PatientPortalManagement() {
  const [patients, setPatients] = useState([]);
  const [portalStats, setPortalStats] = useState(null);
  const [accessLogs, setAccessLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [portalSettings, setPortalSettings] = useState({
    allow_registration: true,
    require_email_verification: true,
    allow_document_upload: true,
    allow_message_sending: true,
    allow_appointment_booking: true,
    allow_prescription_refills: true
  });

  useEffect(() => {
    loadPortalData();
  }, [filterStatus]);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      
      // Load patients with portal status
      const patientsResult = await apiService.request('/api/specialized/portal/patients', { method: 'GET' });
      if (patientsResult.success) {
        setPatients(patientsResult.patients || []);
      }

      // Load portal statistics
      const statsResult = await apiService.request('/api/specialized/portal/statistics', { method: 'GET' });
      if (statsResult.success) {
        setPortalStats(statsResult.statistics);
      }

      // Load access logs
      const logsResult = await apiService.request('/api/specialized/portal/access-logs', { method: 'GET' });
      if (logsResult.success) {
        setAccessLogs(logsResult.logs || []);
      }
    } catch (error) {
      console.error('Error loading portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePortalAccess = async (patientId, enable) => {
    try {
      const endpoint = enable 
        ? `/api/specialized/portal/enable/${patientId}`
        : `/api/specialized/portal/disable/${patientId}`;
      
      const result = await apiService.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({ create_login: enable })
      });
      
      if (result.success) {
        alert(`Patient portal ${enable ? 'enabled' : 'disabled'} successfully`);
        loadPortalData();
      }
    } catch (error) {
      alert('Failed to update portal access: ' + (error.message || 'Unknown error'));
    }
  };

  const createPortalLogin = async (patientId) => {
    try {
      const result = await apiService.request(`/api/specialized/portal/create-login/${patientId}`, {
        method: 'POST'
      });
      
      if (result.success) {
        alert(`Portal login created successfully!\nUsername: ${result.username}\nTemporary Password: ${result.temporary_password}`);
        loadPortalData();
      }
    } catch (error) {
      alert('Failed to create portal login: ' + (error.message || 'Unknown error'));
    }
  };

  const resetPortalPassword = async (patientId) => {
    if (!confirm('Reset portal password for this patient?')) return;
    
    try {
      const result = await apiService.request(`/api/specialized/portal/reset-password/${patientId}`, {
        method: 'POST'
      });
      
      if (result.success) {
        alert(`Password reset successfully!\nNew Temporary Password: ${result.temporary_password}`);
      }
    } catch (error) {
      alert('Failed to reset password: ' + (error.message || 'Unknown error'));
    }
  };

  const updatePortalSettings = async () => {
    try {
      const result = await apiService.request('/api/specialized/portal/settings', {
        method: 'PUT',
        body: JSON.stringify(portalSettings)
      });
      
      if (result.success) {
        alert('Portal settings updated successfully');
        setShowSettings(false);
      }
    } catch (error) {
      alert('Failed to update settings: ' + (error.message || 'Unknown error'));
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = !searchTerm || 
      patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.universal_patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'enabled' && patient.portal_enabled) ||
      (filterStatus === 'disabled' && !patient.portal_enabled);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="p-4">Loading portal management data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {portalStats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold">{portalStats.total_patients}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Portal Enabled</p>
              <p className="text-2xl font-bold text-green-600">{portalStats.portal_enabled}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Active Users (30d)</p>
              <p className="text-2xl font-bold text-teal-700">{portalStats.active_users_30d}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Messages Sent</p>
              <p className="text-2xl font-bold">{portalStats.messages_sent}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Portal Management</CardTitle>
              <CardDescription>Manage patient portal access and settings</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search patients by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Patients</option>
              <option value="enabled">Portal Enabled</option>
              <option value="disabled">Portal Disabled</option>
            </select>
          </div>

          {/* Patients List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPatients.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No patients found</p>
            ) : (
              filteredPatients.map((patient) => (
                <Card key={patient.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <Badge variant={patient.portal_enabled ? 'default' : 'secondary'}>
                          {patient.portal_enabled ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Disabled
                            </>
                          )}
                        </Badge>
                        {patient.portal_username && (
                          <Badge variant="outline">User: {patient.portal_username}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        ID: {patient.universal_patient_id} | 
                        {patient.portal_last_access && (
                          <> Last Access: {new Date(patient.portal_last_access).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {patient.portal_enabled ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetPortalPassword(patient.id)}
                          >
                            Reset Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePortalAccess(patient.id, false)}
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Disable
                          </Button>
                        </>
                      ) : (
                        <>
                          {!patient.portal_username && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => createPortalLogin(patient.id)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Create Login
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => togglePortalAccess(patient.id, true)}
                          >
                            <Unlock className="w-4 h-4 mr-1" />
                            Enable
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Access Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Portal Access Logs</CardTitle>
          <CardDescription>Last 20 portal access activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {accessLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No access logs found</p>
            ) : (
              accessLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">
                      {log.patient_name} - {log.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()} | IP: {log.ip_address}
                    </p>
                  </div>
                  <Badge variant={log.success ? 'default' : 'destructive'}>
                    {log.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portal Settings Modal */}
      {showSettings && (
        <Card className="fixed inset-0 z-50 m-auto max-w-2xl max-h-[90vh] overflow-auto">
          <CardHeader>
            <CardTitle>Portal Settings</CardTitle>
            <CardDescription>Configure patient portal features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Allow Patient Registration</Label>
                <input
                  type="checkbox"
                  checked={portalSettings.allow_registration}
                  onChange={(e) => setPortalSettings({...portalSettings, allow_registration: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Require Email Verification</Label>
                <input
                  type="checkbox"
                  checked={portalSettings.require_email_verification}
                  onChange={(e) => setPortalSettings({...portalSettings, require_email_verification: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Document Upload</Label>
                <input
                  type="checkbox"
                  checked={portalSettings.allow_document_upload}
                  onChange={(e) => setPortalSettings({...portalSettings, allow_document_upload: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Message Sending</Label>
                <input
                  type="checkbox"
                  checked={portalSettings.allow_message_sending}
                  onChange={(e) => setPortalSettings({...portalSettings, allow_message_sending: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Appointment Booking</Label>
                <input
                  type="checkbox"
                  checked={portalSettings.allow_appointment_booking}
                  onChange={(e) => setPortalSettings({...portalSettings, allow_appointment_booking: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Prescription Refills</Label>
                <input
                  type="checkbox"
                  checked={portalSettings.allow_prescription_refills}
                  onChange={(e) => setPortalSettings({...portalSettings, allow_prescription_refills: e.target.checked})}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={updatePortalSettings}>Save Settings</Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

