import React, { useState, useEffect } from 'react';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, FileText, Search, Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

  // API base URL
  const API_BASE = 'http://localhost:5000/api';

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  // Load initial data
  useEffect(() => {
    if (token) {
      loadPatients();
    }
  }, [token]);

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
          {userType === 'patient' ? 'My Medical Records' : 'Patients'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search */}
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

        {/* Patient List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(patient.universal_patient_id)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedPatient === patient.universal_patient_id
                  ? 'bg-blue-50 border-blue-300 shadow-sm'
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
          <Card key={medication.id} className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
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
      title={userType === 'patient' ? 'My Medical Records' : 'Patient Data Management'}
      description={userType === 'patient' 
        ? 'View and manage your medical information'
        : 'Secure patient data management with role-based access control'
      }
      icon={FileText}
      actions={userType !== 'patient' && (
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      )}
    >

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
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PatientList />
        </div>
        
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <PatientDetails />
          ) : (
            <Card className="shadow-md">
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>Select a patient to view details</p>
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

