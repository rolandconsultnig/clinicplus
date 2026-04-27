import React, { useState, useEffect } from 'react';
import { PageWrapper } from './PageWrapper';
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, FileText, Search, Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

const emptyNewPatient = () => ({
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  phone_primary: '',
  email: '',
  address_line1: '',
  city: '',
  state: '',
  zip_code: '',
})

const PatientDataManager = ({ userType, token, currentUser }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [medicalData, setMedicalData] = useState({
    allergies: [],
    medications: [],
    medicalHistory: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatient, setNewPatient] = useState(emptyNewPatient);

  // JWT is stored in localStorage by apiService; user object from profile does not include .token
  const authToken =
    token ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null);
  
  // Patients can only access their own data
  const isPatient = userType === 'patient' || userType === 'Patient';
  const canCreatePatient = !isPatient;
  const canSearchPatients = !isPatient;

  // API base URL - use relative path to work with Vite proxy for subdomain support
  const API_BASE = '/api';

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    const bearer =
      authToken ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null);
    if (!bearer) {
      throw new Error('Not signed in');
    }
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${bearer}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  // Load patients list
  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/secure/patients/');
      setPatients(data.patients || []);
      setError('');
    } catch (err) {
      setError(`Failed to load patients: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load patient details
  const loadPatientDetails = async (patientId) => {
    setLoading(true);
    try {
      const [patientData, allergiesData, medicationsData, historyData] = await Promise.all([
        apiCall(`/secure/patients/${patientId}`),
        apiCall(`/secure/medical/patients/${patientId}/allergies`),
        apiCall(`/secure/medical/patients/${patientId}/medications`),
        apiCall(`/secure/medical/patients/${patientId}/medical-history`)
      ]);

      setPatientDetails(patientData.patient);
      setMedicalData({
        allergies: allergiesData.allergies || [],
        medications: medicationsData.medications || [],
        medicalHistory: historyData.medical_history || []
      });
      setError('');
    } catch (err) {
      setError(`Failed to load patient details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Search patients
  const searchPatients = async () => {
    if (!searchTerm.trim()) {
      loadPatients();
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall(`/secure/patients/search?q=${encodeURIComponent(searchTerm)}`);
      setPatients(data.patients || []);
      setError('');
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!newPatient.first_name?.trim() || !newPatient.last_name?.trim() || !newPatient.date_of_birth) {
      setError('First name, last name, and date of birth are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('/secure/patients/', {
        method: 'POST',
        body: JSON.stringify({
          first_name: newPatient.first_name.trim(),
          last_name: newPatient.last_name.trim(),
          date_of_birth: newPatient.date_of_birth,
          gender: newPatient.gender || undefined,
          phone_primary: newPatient.phone_primary || undefined,
          email: newPatient.email || undefined,
          address_line1: newPatient.address_line1 || undefined,
          city: newPatient.city || undefined,
          state: newPatient.state || undefined,
          zip_code: newPatient.zip_code || undefined,
        }),
      });
      if (data.success && data.patient) {
        setShowAddForm(false);
        setNewPatient(emptyNewPatient());
        await loadPatients();
        setSelectedPatient(data.patient.universal_patient_id || String(data.patient.id));
      } else {
        setError(data.error || 'Could not create patient');
      }
    } catch (err) {
      setError(err.message || 'Could not create patient');
    } finally {
      setLoading(false);
    }
  };

  // Add new allergy
  const addAllergy = async (allergyData) => {
    try {
      await apiCall(`/secure/medical/patients/${selectedPatient}/allergies`, {
        method: 'POST',
        body: JSON.stringify(allergyData)
      });
      
      // Reload allergies
      const allergiesData = await apiCall(`/secure/medical/patients/${selectedPatient}/allergies`);
      setMedicalData(prev => ({
        ...prev,
        allergies: allergiesData.allergies || []
      }));
      
      setError('');
    } catch (err) {
      setError(`Failed to add allergy: ${err.message}`);
    }
  };

  // Add new medication
  const addMedication = async (medicationData) => {
    try {
      await apiCall(`/secure/medical/patients/${selectedPatient}/medications`, {
        method: 'POST',
        body: JSON.stringify(medicationData)
      });
      
      // Reload medications
      const medicationsData = await apiCall(`/secure/medical/patients/${selectedPatient}/medications`);
      setMedicalData(prev => ({
        ...prev,
        medications: medicationsData.medications || []
      }));
      
      setError('');
    } catch (err) {
      setError(`Failed to add medication: ${err.message}`);
    }
  };

  // Open add form when navigated from Patient Management / Patient Search
  useEffect(() => {
    if (isPatient) return;
    try {
      if (sessionStorage.getItem('digiclinic_open_add_patient')) {
        sessionStorage.removeItem('digiclinic_open_add_patient');
        setShowAddForm(true);
      }
    } catch (_) {
      /* ignore */
    }
  }, [isPatient]);

  // Load initial data
  useEffect(() => {
    if (authToken) {
      if (isPatient && currentUser?.patient_id) {
        // Patients can only see their own record
        setSelectedPatient(currentUser.patient_id);
        loadPatientDetails(currentUser.patient_id);
      } else {
        loadPatients();
      }
    }
  }, [authToken, isPatient, currentUser]);

  // Load patient details when selected
  useEffect(() => {
    if (selectedPatient) {
      loadPatientDetails(selectedPatient);
    }
  }, [selectedPatient]);

  const PatientList = () => (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {isPatient ? 'My Medical Records' : 'Patients'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search - Hidden for patients */}
        {canSearchPatients && (
          <div className="mb-4 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={searchPatients} variant="outline">
              Search
            </Button>
          </div>
        )}

        {/* Patient List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(patient.universal_patient_id)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedPatient === patient.universal_patient_id
                  ? 'bg-teal-50 border-teal-300 shadow-sm'
                  : 'hover:bg-gray-50 border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="font-medium text-gray-900">
                {patient.first_name} {patient.last_name}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                ID: {patient.universal_patient_id}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                DOB: {patient.date_of_birth} | Gender: {patient.gender}
              </div>
              {patient.medical_summary && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {patient.medical_summary.active_medications} medications
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {patient.medical_summary.known_allergies} allergies
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        {patients.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No patients found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PatientDetails = () => {
    if (!patientDetails) return null;

    return (
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                {patientDetails.first_name} {patientDetails.last_name}
              </CardTitle>
              <CardDescription className="mt-1">
                ID: {patientDetails.universal_patient_id} | DOB: {patientDetails.date_of_birth} | Gender: {patientDetails.gender}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPatient(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Phone:</span> {patientDetails.phone_primary}</p>
                  <p><span className="font-medium">Email:</span> {patientDetails.email}</p>
                  <p><span className="font-medium">Address:</span> {patientDetails.address_line1}</p>
                  {patientDetails.address_line2 && <p>{patientDetails.address_line2}</p>}
                  <p>{patientDetails.city}, {patientDetails.state} {patientDetails.zip_code}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {patientDetails.emergency_contact_name}</p>
                  <p><span className="font-medium">Phone:</span> {patientDetails.emergency_contact_phone}</p>
                  <p><span className="font-medium">Relationship:</span> {patientDetails.emergency_contact_relationship}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Medical Data Tabs */}
          <MedicalDataTabs />
        </CardContent>
      </Card>
    );
  };

  const MedicalDataTabs = () => {
    const [activeTab, setActiveTab] = useState('allergies');

    const tabs = [
      { id: 'allergies', label: 'Allergies', count: medicalData.allergies.length },
      { id: 'medications', label: 'Medications', count: medicalData.medications.length },
      { id: 'history', label: 'Medical History', count: medicalData.medicalHistory.length }
    ];

    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label} ({tab.count})
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="allergies" className="mt-4">
              <AllergiesTab />
            </TabsContent>
            <TabsContent value="medications" className="mt-4">
              <MedicationsTab />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <MedicalHistoryTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  const AllergiesTab = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-900">Known Allergies</h4>
        {userType !== 'patient' && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              const allergen = prompt('Enter allergen:');
              const reaction = prompt('Enter reaction:');
              const severity = prompt('Enter severity (mild/moderate/severe):') || 'moderate';
              
              if (allergen) {
                addAllergy({ allergen, reaction, severity });
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Allergy
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {medicalData.allergies.map((allergy) => (
          <Card
            key={allergy.id}
            className={`border-l-4 shadow-sm ${
              allergy.severity === 'severe' ? 'border-red-500 bg-red-50' :
              allergy.severity === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
              'border-green-500 bg-green-50'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  allergy.severity === 'severe' ? 'text-red-600' :
                  allergy.severity === 'moderate' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{allergy.allergen}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Reaction: {allergy.reaction} | Severity: <Badge variant="outline" className="ml-1">{allergy.severity}</Badge>
                  </div>
                  {allergy.notes && (
                    <div className="text-sm text-gray-500 mt-2">{allergy.notes}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {medicalData.allergies.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500 py-8">
                <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No known allergies</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const MedicationsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-900">Current Medications</h4>
        {userType !== 'patient' && (
          <Button
            size="sm"
            onClick={() => {
              const medication_name = prompt('Enter medication name:');
              const dosage = prompt('Enter dosage:');
              const frequency = prompt('Enter frequency:');
              const start_date = prompt('Enter start date (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];
              
              if (medication_name && dosage && frequency) {
                addMedication({ medication_name, dosage, frequency, start_date });
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {medicalData.medications.filter(med => med.is_active).map((medication) => (
          <Card key={medication.id} className="shadow-sm border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-teal-700" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{medication.medication_name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Dosage: {medication.dosage} | Frequency: {medication.frequency}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Started: {medication.start_date}
                    {medication.prescribing_provider && ` | Prescribed by: ${medication.prescribing_provider}`}
                  </div>
                  {medication.notes && (
                    <div className="text-sm text-gray-500 mt-2 p-2 bg-gray-50 rounded">{medication.notes}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {medicalData.medications.filter(med => med.is_active).length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No current medications</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const MedicalHistoryTab = () => (
    <div>
      <h4 className="font-semibold text-gray-900 mb-4">Medical History</h4>
      
      <div className="space-y-3">
        {medicalData.medicalHistory.map((history) => (
          <Card key={history.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="font-semibold text-gray-900">{history.condition}</div>
              <div className="text-sm text-gray-600 mt-1">
                Status: <Badge variant="outline" className="ml-1">{history.status}</Badge>
                {history.diagnosis_date && ` | Diagnosed: ${history.diagnosis_date}`}
              </div>
              {history.notes && (
                <div className="text-sm text-gray-500 mt-2 p-2 bg-gray-50 rounded">{history.notes}</div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {medicalData.medicalHistory.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No medical history recorded</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <PageWrapper
      title={isPatient ? 'My Medical Records' : 'Patient Data Management'}
      description={isPatient 
        ? 'View and manage your medical information'
        : 'Secure patient data management with role-based access control'
      }
      icon={FileText}
      actions={canCreatePatient && (
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      )}
    >
      {canSearchPatients && (
        <div className="mb-4 max-w-3xl">
          <UnifiedPatientSelector
            onSelect={async (p) => {
              if (!p?.id) return;
              setSelectedPatient(p.id);
            }}
            showQuickInfo
          />
        </div>
      )}
      {showAddForm && canCreatePatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-patient-title"
        >
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border-slate-200">
            <CardHeader>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <CardTitle id="add-patient-title">Add patient</CardTitle>
                  <CardDescription className="mt-1">
                    Enter demographics. Date of birth must be YYYY-MM-DD.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPatient(emptyNewPatient());
                  }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePatient} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600" htmlFor="np-first">First name *</label>
                    <Input
                      id="np-first"
                      value={newPatient.first_name}
                      onChange={(ev) => setNewPatient((p) => ({ ...p, first_name: ev.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600" htmlFor="np-last">Last name *</label>
                    <Input
                      id="np-last"
                      value={newPatient.last_name}
                      onChange={(ev) => setNewPatient((p) => ({ ...p, last_name: ev.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600" htmlFor="np-dob">Date of birth *</label>
                  <Input
                    id="np-dob"
                    type="date"
                    value={newPatient.date_of_birth}
                    onChange={(ev) => setNewPatient((p) => ({ ...p, date_of_birth: ev.target.value }))}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600" htmlFor="np-gender">Gender</label>
                  <Input
                    id="np-gender"
                    placeholder="e.g. male, female"
                    value={newPatient.gender}
                    onChange={(ev) => setNewPatient((p) => ({ ...p, gender: ev.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600" htmlFor="np-phone">Phone</label>
                    <Input
                      id="np-phone"
                      value={newPatient.phone_primary}
                      onChange={(ev) => setNewPatient((p) => ({ ...p, phone_primary: ev.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600" htmlFor="np-email">Email</label>
                    <Input
                      id="np-email"
                      type="email"
                      value={newPatient.email}
                      onChange={(ev) => setNewPatient((p) => ({ ...p, email: ev.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600" htmlFor="np-addr">Address</label>
                  <Input
                    id="np-addr"
                    value={newPatient.address_line1}
                    onChange={(ev) => setNewPatient((p) => ({ ...p, address_line1: ev.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600" htmlFor="np-city">City</label>
                    <Input
                      id="np-city"
                      value={newPatient.city}
                      onChange={(ev) => setNewPatient((p) => ({ ...p, city: ev.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600" htmlFor="np-state">State</label>
                    <Input
                      id="np-state"
                      value={newPatient.state}
                      onChange={(ev) => setNewPatient((p) => ({ ...p, state: ev.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-1 col-span-2">
                    <label className="text-xs font-medium text-slate-600" htmlFor="np-zip">ZIP</label>
                    <Input
                      id="np-zip"
                      value={newPatient.zip_code}
                      onChange={(ev) => setNewPatient((p) => ({ ...p, zip_code: ev.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewPatient(emptyNewPatient());
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving…' : 'Create patient'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-semibold">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={isPatient ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
        {!isPatient && (
          <div className="lg:col-span-1">
            <PatientList />
          </div>
        )}
        
        <div className={isPatient ? "col-span-1" : "lg:col-span-2"}>
          {selectedPatient ? (
            <PatientDetails />
          ) : (
            <Card className="shadow-md">
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>{isPatient ? 'Loading your medical records...' : 'Select a patient to view details'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default PatientDataManager;

