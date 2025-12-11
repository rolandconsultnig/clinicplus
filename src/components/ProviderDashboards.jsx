import React, { useState, useEffect } from 'react';
import CalendarWidget from './CalendarWidget';

// Physician Dashboard Component
const PhysicianDashboard = ({ token, currentUser }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEncounterForm, setShowEncounterForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);

  const API_BASE = 'http://localhost:5000/api';

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

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/provider-workflows/physician/dashboard');
      setDashboardData(data.dashboard);
      setError('');
    } catch (err) {
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const createEncounter = async (encounterData) => {
    try {
      await apiCall('/provider-workflows/physician/encounter', {
        method: 'POST',
        body: JSON.stringify(encounterData)
      });
      setShowEncounterForm(false);
      loadDashboard(); // Refresh dashboard
    } catch (err) {
      setError(`Failed to create encounter: ${err.message}`);
    }
  };

  const prescribeMedication = async (prescriptionData) => {
    try {
      await apiCall('/provider-workflows/physician/prescribe', {
        method: 'POST',
        body: JSON.stringify(prescriptionData)
      });
      setShowPrescriptionForm(false);
      loadDashboard(); // Refresh dashboard
    } catch (err) {
      setError(`Failed to prescribe medication: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Physician Dashboard</h1>
            <p className="text-gray-600">
              Welcome, Dr. {dashboardData?.provider?.first_name} {dashboardData?.provider?.last_name}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowEncounterForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              New Encounter
            </button>
            <button
              onClick={() => setShowPrescriptionForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Prescribe Medication
            </button>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-800">Today's Encounters</h3>
          <p className="text-3xl font-bold text-blue-900">
            {dashboardData?.today_stats?.scheduled_encounters || 0}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
          <h3 className="font-semibold text-yellow-800">Pending Lab Orders</h3>
          <p className="text-3xl font-bold text-yellow-900">
            {dashboardData?.today_stats?.pending_lab_orders || 0}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-6 border-l-4 border-red-500">
          <h3 className="font-semibold text-red-800">Follow-up Patients</h3>
          <p className="text-3xl font-bold text-red-900">
            {dashboardData?.today_stats?.follow_up_patients || 0}
          </p>
        </div>
      </div>

      {/* Today's Encounters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Encounters</h2>
        <div className="space-y-3">
          {dashboardData?.todays_encounters?.map((encounter) => (
            <div key={encounter.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-800">
                    Patient ID: {encounter.patient_id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Type: {encounter.encounter_type} | Time: {encounter.encounter_date}
                  </p>
                  <p className="text-sm text-gray-500">
                    Chief Complaint: {encounter.chief_complaint || 'Not specified'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  encounter.follow_up_required 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {encounter.follow_up_required ? 'Follow-up Required' : 'Complete'}
                </span>
              </div>
            </div>
          ))}
          
          {(!dashboardData?.todays_encounters || dashboardData.todays_encounters.length === 0) && (
            <div className="text-center text-gray-500 py-8">
              No encounters scheduled for today
            </div>
          )}
        </div>
      </div>

      {/* Follow-up Patients */}
      {dashboardData?.follow_up_patients?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Patients Requiring Follow-up</h2>
          <div className="space-y-3">
            {dashboardData.follow_up_patients.map((item) => (
              <div key={item.encounter.id} className="border rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {item.patient?.first_name} {item.patient?.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Last Visit: {item.encounter.encounter_date}
                    </p>
                    <p className="text-sm text-gray-500">
                      Follow-up Due: {item.encounter.follow_up_date}
                    </p>
                  </div>
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Schedule Follow-up
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Patients */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Patients</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardData?.recent_patients?.map((patient) => (
            <div key={patient.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
              <h3 className="font-medium text-gray-800">
                {patient.first_name} {patient.last_name}
              </h3>
              <p className="text-sm text-gray-600">ID: {patient.universal_patient_id}</p>
              <p className="text-sm text-gray-500">
                DOB: {patient.date_of_birth} | {patient.gender}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Encounter Form Modal */}
      {showEncounterForm && (
        <EncounterForm
          onSubmit={createEncounter}
          onCancel={() => setShowEncounterForm(false)}
        />
      )}

      {/* Prescription Form Modal */}
      {showPrescriptionForm && (
        <PrescriptionForm
          onSubmit={prescribeMedication}
          onCancel={() => setShowPrescriptionForm(false)}
        />
      )}
    </div>
  );
};

// Nurse Dashboard Component
const NurseDashboard = ({ token, currentUser }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVitalsForm, setShowVitalsForm] = useState(false);

  const API_BASE = 'http://localhost:5000/api';

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

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/provider-workflows/nurse/dashboard');
      setDashboardData(data.dashboard);
      setError('');
    } catch (err) {
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const recordVitals = async (vitalsData) => {
    try {
      await apiCall('/provider-workflows/nurse/vitals', {
        method: 'POST',
        body: JSON.stringify(vitalsData)
      });
      setShowVitalsForm(false);
      loadDashboard(); // Refresh dashboard
    } catch (err) {
      setError(`Failed to record vitals: ${err.message}`);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Nurse Dashboard</h1>
            <p className="text-gray-600">
              Welcome, {dashboardData?.provider?.first_name} {dashboardData?.provider?.last_name}
            </p>
          </div>
          <button
            onClick={() => setShowVitalsForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Record Vitals
          </button>
        </div>
      </div>

      {/* Calendar and Today's Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CalendarWidget 
            providerId={dashboardData?.provider?.id} 
            facilityId={dashboardData?.provider?.facility_id}
            compact={false}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
              <h3 className="font-semibold text-blue-800">Total Encounters</h3>
              <p className="text-3xl font-bold text-blue-900">
                {dashboardData?.today_stats?.total_encounters || 0}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
              <h3 className="font-semibold text-yellow-800">Patients Needing Vitals</h3>
              <p className="text-3xl font-bold text-yellow-900">
                {dashboardData?.today_stats?.patients_needing_vitals || 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
              <h3 className="font-semibold text-green-800">Vitals Recorded Today</h3>
              <p className="text-3xl font-bold text-green-900">
                {dashboardData?.today_stats?.vitals_recorded_today || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Patients Needing Vitals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Patients Needing Vital Signs</h2>
        <div className="space-y-3">
          {dashboardData?.patients_needing_vitals?.map((item) => (
            <div key={item.encounter.id} className="border rounded-lg p-4 bg-yellow-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-800">
                    {item.patient?.first_name} {item.patient?.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    ID: {item.patient?.universal_patient_id}
                  </p>
                  <p className="text-sm text-gray-500">
                    Encounter: {item.encounter.encounter_type}
                  </p>
                </div>
                <button
                  onClick={() => setShowVitalsForm(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Record Vitals
                </button>
              </div>
            </div>
          ))}
          
          {(!dashboardData?.patients_needing_vitals || dashboardData.patients_needing_vitals.length === 0) && (
            <div className="text-center text-gray-500 py-8">
              All patients have current vital signs recorded
            </div>
          )}
        </div>
      </div>

      {/* Recent Vitals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Vital Signs Recorded</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recorded
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData?.recent_vitals?.map((vitals) => (
                <tr key={vitals.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Patient {vitals.patient_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vitals.systolic_bp}/{vitals.diastolic_bp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vitals.heart_rate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vitals.temperature}°F
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vitals.recorded_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vitals Form Modal */}
      {showVitalsForm && (
        <VitalsForm
          onSubmit={recordVitals}
          onCancel={() => setShowVitalsForm(false)}
        />
      )}
    </div>
  );
};

// Pharmacist Dashboard Component
const PharmacistDashboard = ({ token, currentUser }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = 'http://localhost:5000/api';

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

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/provider-workflows/pharmacist/dashboard');
      setDashboardData(data.dashboard);
      setError('');
    } catch (err) {
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reviewMedication = async (medicationId, action, notes) => {
    try {
      await apiCall('/provider-workflows/pharmacist/medication-review', {
        method: 'POST',
        body: JSON.stringify({
          medication_id: medicationId,
          action: action,
          notes: notes
        })
      });
      loadDashboard(); // Refresh dashboard
    } catch (err) {
      setError(`Failed to review medication: ${err.message}`);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800">Pharmacist Dashboard</h1>
        <p className="text-gray-600">Prescription management and medication review</p>
      </div>

      {/* Calendar and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CalendarWidget 
            providerId={dashboardData?.provider?.id} 
            facilityId={dashboardData?.provider?.facility_id}
            compact={false}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
              <h3 className="font-semibold text-blue-800">Pending Prescriptions</h3>
              <p className="text-3xl font-bold text-blue-900">
                {dashboardData?.stats?.pending_prescriptions || 0}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-500">
              <h3 className="font-semibold text-yellow-800">Medications for Review</h3>
              <p className="text-3xl font-bold text-yellow-900">
                {dashboardData?.stats?.medications_for_review || 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
              <h3 className="font-semibold text-green-800">Recent Changes</h3>
              <p className="text-3xl font-bold text-green-900">
                {dashboardData?.stats?.recent_changes || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Prescriptions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Prescriptions</h2>
        <div className="space-y-3">
          {dashboardData?.pending_prescriptions?.map((item) => (
            <div key={item.medication.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-800">
                    {item.medication.medication_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Patient: {item.patient?.first_name} {item.patient?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Dosage: {item.medication.dosage} | Frequency: {item.medication.frequency}
                  </p>
                  <p className="text-sm text-gray-500">
                    Prescribed by: {item.medication.prescribing_provider}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => reviewMedication(item.medication.id, 'approve', 'Approved by pharmacist')}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter review notes:');
                      if (notes) reviewMedication(item.medication.id, 'modify', notes);
                    }}
                    className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter reason for discontinuation:');
                      if (notes) reviewMedication(item.medication.id, 'discontinue', notes);
                    }}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Discontinue
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {(!dashboardData?.pending_prescriptions || dashboardData.pending_prescriptions.length === 0) && (
            <div className="text-center text-gray-500 py-8">
              No pending prescriptions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Form Components
const EncounterForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    patient_id: '',
    encounter_type: 'consultation',
    chief_complaint: '',
    diagnosis: '',
    treatment_plan: '',
    follow_up_required: false,
    follow_up_date: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">New Clinical Encounter</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Encounter Type</label>
            <select
              value={formData.encounter_type}
              onChange={(e) => setFormData({...formData, encounter_type: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="consultation">Consultation</option>
              <option value="follow_up">Follow-up</option>
              <option value="emergency">Emergency</option>
              <option value="routine">Routine Check-up</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Chief Complaint</label>
            <textarea
              value={formData.chief_complaint}
              onChange={(e) => setFormData({...formData, chief_complaint: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Treatment Plan</label>
            <textarea
              value={formData.treatment_plan}
              onChange={(e) => setFormData({...formData, treatment_plan: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.follow_up_required}
              onChange={(e) => setFormData({...formData, follow_up_required: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Follow-up Required</label>
          </div>
          
          {formData.follow_up_required && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
              <input
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Encounter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PrescriptionForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    patient_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Prescribe Medication</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Medication Name</label>
            <input
              type="text"
              value={formData.medication_name}
              onChange={(e) => setFormData({...formData, medication_name: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Dosage</label>
            <input
              type="text"
              value={formData.dosage}
              onChange={(e) => setFormData({...formData, dosage: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 10mg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Frequency</label>
            <input
              type="text"
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Once daily"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Route</label>
            <select
              value={formData.route}
              onChange={(e) => setFormData({...formData, route: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="oral">Oral</option>
              <option value="injection">Injection</option>
              <option value="topical">Topical</option>
              <option value="inhalation">Inhalation</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Prescribe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VitalsForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    patient_id: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    pain_scale: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Record Vital Signs</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Systolic BP</label>
              <input
                type="number"
                value={formData.systolic_bp}
                onChange={(e) => setFormData({...formData, systolic_bp: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Diastolic BP</label>
              <input
                type="number"
                value={formData.diastolic_bp}
                onChange={(e) => setFormData({...formData, diastolic_bp: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="80"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Heart Rate (bpm)</label>
              <input
                type="number"
                value={formData.heart_rate}
                onChange={(e) => setFormData({...formData, heart_rate: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="72"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Temperature (°F)</label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="98.6"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Respiratory Rate</label>
              <input
                type="number"
                value={formData.respiratory_rate}
                onChange={(e) => setFormData({...formData, respiratory_rate: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="16"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Oxygen Saturation (%)</label>
              <input
                type="number"
                value={formData.oxygen_saturation}
                onChange={(e) => setFormData({...formData, oxygen_saturation: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="98"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Height (inches)</label>
              <input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="68"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Pain Scale (0-10)</label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.pain_scale}
              onChange={(e) => setFormData({...formData, pain_scale: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Record Vitals
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { PhysicianDashboard, NurseDashboard, PharmacistDashboard };

