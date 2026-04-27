import React, { useState, useEffect } from 'react';
import CalendarWidget from './CalendarWidget';
import { Activity, Clock3, FlaskConical, RefreshCw, Stethoscope, User, Users } from 'lucide-react';

// Physician Dashboard Component
const PhysicianDashboard = ({ token, currentUser }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEncounterForm, setShowEncounterForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);

  // Use relative path to work with Vite proxy for subdomain support
  const API_BASE = '/api';

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
      loadMarTimeline(todayDate, 'all');
      loadMarHistory({
        startDate: todayDate,
        endDate: todayDate,
        nurseId: '',
        action: 'all'
      });
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
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

  const statCards = [
    {
      label: "Today's Encounters",
      value: dashboardData?.today_stats?.scheduled_encounters || 0,
      icon: Activity,
      classes: 'bg-teal-50 border-teal-200 text-teal-900'
    },
    {
      label: 'Pending Lab Orders',
      value: dashboardData?.today_stats?.pending_lab_orders || 0,
      icon: FlaskConical,
      classes: 'bg-amber-50 border-amber-200 text-amber-900'
    },
    {
      label: 'Follow-up Patients',
      value: dashboardData?.today_stats?.follow_up_patients || 0,
      icon: RefreshCw,
      classes: 'bg-rose-50 border-rose-200 text-rose-900'
    }
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Clinical Workspace</p>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-teal-700" />
              Physician Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome, Dr. {dashboardData?.provider?.first_name} {dashboardData?.provider?.last_name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowEncounterForm(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 text-sm"
            >
              New Encounter
            </button>
            <button
              onClick={() => setShowPrescriptionForm(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"
            >
              Prescribe Medication
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl border p-4 ${stat.classes}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <Icon className="w-5 h-5 opacity-70" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-teal-700" />
          Today's Encounters
        </h2>
        <div className="space-y-3">
          {dashboardData?.todays_encounters?.map((encounter) => (
            <div key={encounter.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <h3 className="font-medium text-gray-900">Patient ID: {encounter.patient_id}</h3>
                  <p className="text-sm text-gray-600">
                    Type: {encounter.encounter_type} | Time: {encounter.encounter_date}
                  </p>
                  <p className="text-sm text-gray-500">
                    Chief Complaint: {encounter.chief_complaint || 'Not specified'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  encounter.follow_up_required
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
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

      {dashboardData?.follow_up_patients?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600" />
            Patients Requiring Follow-up
          </h2>
          <div className="space-y-3">
            {dashboardData.follow_up_patients.map((item) => (
              <div key={item.encounter.id} className="border border-amber-200 rounded-xl p-4 bg-amber-50/60">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {item.patient?.first_name} {item.patient?.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Last Visit: {item.encounter.encounter_date}
                    </p>
                    <p className="text-sm text-gray-500">
                      Follow-up Due: {item.encounter.follow_up_date}
                    </p>
                  </div>
                  <button className="bg-teal-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-teal-700">
                    Schedule Follow-up
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-700" />
          Recent Patients
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dashboardData?.recent_patients?.map((patient) => (
            <div key={patient.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
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
  const todayDate = new Date().toISOString().split('T')[0];
  const [marDate, setMarDate] = useState(todayDate);
  const [marShift, setMarShift] = useState('all');
  const [marTimeline, setMarTimeline] = useState([]);
  const [marTimelineLoading, setMarTimelineLoading] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState(todayDate);
  const [historyEndDate, setHistoryEndDate] = useState(todayDate);
  const [historyNurseId, setHistoryNurseId] = useState('');
  const [historyAction, setHistoryAction] = useState('all');
  const [marHistory, setMarHistory] = useState([]);
  const [marHistorySummary, setMarHistorySummary] = useState({});
  const [marHistoryNurses, setMarHistoryNurses] = useState([]);
  const [marHistoryLoading, setMarHistoryLoading] = useState(false);
  const [handoffItems, setHandoffItems] = useState([]);
  const [handoffShift, setHandoffShift] = useState('morning');

  // Use relative path to work with Vite proxy for subdomain support
  const API_BASE = '/api';

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
      setMarTimeline(data?.dashboard?.mar_timeline || []);
      setError('');
    } catch (err) {
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMarTimeline = async (dateValue = marDate, shiftValue = marShift) => {
    setMarTimelineLoading(true);
    try {
      const data = await apiCall(`/provider-workflows/nurse/mar?date=${encodeURIComponent(dateValue)}&shift=${encodeURIComponent(shiftValue)}`);
      setMarTimeline(data.timeline || []);
      setError('');
    } catch (err) {
      setError(`Failed to load MAR timeline: ${err.message}`);
    } finally {
      setMarTimelineLoading(false);
    }
  };

  const loadMarHistory = async ({
    startDate = historyStartDate,
    endDate = historyEndDate,
    nurseId = historyNurseId,
    action = historyAction
  } = {}) => {
    setMarHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('start_date', startDate);
      params.set('end_date', endDate);
      if (nurseId) params.set('nurse_id', nurseId);
      if (action && action !== 'all') params.set('action', action);
      params.set('limit', '200');
      const data = await apiCall(`/provider-workflows/nurse/mar/history?${params.toString()}`);
      setMarHistory(data.history || []);
      setMarHistorySummary(data.summary || {});
      setMarHistoryNurses(data.nurses || []);
      setError('');
    } catch (err) {
      setError(`Failed to load MAR history: ${err.message}`);
    } finally {
      setMarHistoryLoading(false);
    }
  };

  const loadHandoffSummaries = async (dateValue = todayDate) => {
    try {
      const data = await apiCall(`/provider-workflows/nurse/mar/handoff-summary?date=${encodeURIComponent(dateValue)}`);
      setHandoffItems(data.handoffs || []);
    } catch (err) {
      setError(`Failed to load handoff summaries: ${err.message}`);
    }
  };

  const exportMarHistoryCsv = async () => {
    try {
      const params = new URLSearchParams();
      params.set('start_date', historyStartDate);
      params.set('end_date', historyEndDate);
      if (historyNurseId) params.set('nurse_id', historyNurseId);
      if (historyAction && historyAction !== 'all') params.set('action', historyAction);
      const response = await fetch(`${API_BASE}/provider-workflows/nurse/mar/history/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const err = await response.json();
          message = err.error || message;
        } catch (_e) {
          // Ignore JSON parse failures and keep default message.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mar_history_${historyStartDate}_${historyEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setError('');
    } catch (err) {
      setError(`Failed to export MAR history CSV: ${err.message}`);
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

  const recordMarAction = async (entry, action) => {
    try {
      let reason = '';
      if (action === 'refused' || action === 'held') {
        reason = window.prompt(`Enter reason for ${action}:`, '') || '';
        if (!reason.trim()) {
          setError(`Reason is required for ${action}.`);
          return;
        }
      }

      const medName = (entry.medication.name || entry.medication.medication_name || '').toLowerCase();
      const highRiskKeywords = ['insulin', 'heparin', 'warfarin', 'morphine', 'fentanyl', 'potassium'];
      const isHighRisk = highRiskKeywords.some((keyword) => medName.includes(keyword));

      await apiCall('/provider-workflows/nurse/mar', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: entry.patient.id,
          medication_id: entry.medication.id,
          action,
          reason: reason || undefined,
          dose_given: entry.medication.dosage || undefined,
          scheduled_time: entry.slot_time || undefined,
          is_high_risk: isHighRisk
        })
      });
      setError('');
      await Promise.all([
        loadDashboard(),
        loadMarTimeline(),
        loadMarHistory(),
        loadHandoffSummaries()
      ]);
    } catch (err) {
      setError(`Failed to record MAR action: ${err.message}`);
    }
  };

  const cosignMarRecord = async (recordId) => {
    try {
      await apiCall(`/provider-workflows/nurse/mar/${recordId}/cosign`, { method: 'POST', body: '{}' });
      await Promise.all([loadMarTimeline(), loadMarHistory()]);
      setError('');
    } catch (err) {
      setError(`Failed to co-sign MAR record: ${err.message}`);
    }
  };

  const escalateMarRecord = async (recordId) => {
    try {
      const reason = window.prompt('Escalation reason for missed/held/refused dose:', '');
      if (!reason || !reason.trim()) return;
      await apiCall(`/provider-workflows/nurse/mar/${recordId}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim(), escalated_to: 'Nursing Supervisor' })
      });
      await Promise.all([loadMarTimeline(), loadMarHistory()]);
      setError('');
    } catch (err) {
      setError(`Failed to escalate MAR record: ${err.message}`);
    }
  };

  const createHandoffSummary = async () => {
    try {
      const notes = window.prompt('Optional shift handoff notes:', '') || '';
      await apiCall('/provider-workflows/nurse/mar/handoff-summary', {
        method: 'POST',
        body: JSON.stringify({
          shift_date: todayDate,
          shift_name: handoffShift,
          notes
        })
      });
      await loadHandoffSummaries(todayDate);
      setError('');
    } catch (err) {
      setError(`Failed to create handoff summary: ${err.message}`);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
      loadMarTimeline(todayDate, 'all');
      loadMarHistory({ startDate: todayDate, endDate: todayDate, nurseId: '', action: 'all' });
      loadHandoffSummaries(todayDate);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
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
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Clinical Workspace</p>
            <h1 className="text-2xl font-semibold text-gray-900">Nurse Dashboard</h1>
            <p className="text-sm text-gray-600">
              Welcome, {dashboardData?.provider?.first_name} {dashboardData?.provider?.last_name}
            </p>
          </div>
          <button
            onClick={() => setShowVitalsForm(true)}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 text-sm"
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
            <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
              <h3 className="font-semibold text-teal-800">Total Encounters</h3>
              <p className="text-3xl font-bold text-teal-900">
                {dashboardData?.today_stats?.total_encounters || 0}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
              <h3 className="font-semibold text-yellow-800">Patients Needing Vitals</h3>
              <p className="text-3xl font-bold text-yellow-900">
                {dashboardData?.today_stats?.patients_needing_vitals || 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
              <h3 className="font-semibold text-green-800">Vitals Recorded Today</h3>
              <p className="text-3xl font-bold text-green-900">
                {dashboardData?.today_stats?.vitals_recorded_today || 0}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
              <h3 className="font-semibold text-teal-900">MAR Pending</h3>
              <p className="text-3xl font-bold text-teal-900">
                {dashboardData?.today_stats?.mar_pending || 0}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
              <h3 className="font-semibold text-emerald-800">Administered</h3>
              <p className="text-3xl font-bold text-emerald-900">
                {dashboardData?.today_stats?.mar_administered || 0}
              </p>
            </div>
            <div className="bg-rose-50 rounded-xl p-5 border border-rose-200">
              <h3 className="font-semibold text-rose-800">Refused/Held</h3>
              <p className="text-3xl font-bold text-rose-900">
                {(dashboardData?.today_stats?.mar_refused || 0) + (dashboardData?.today_stats?.mar_held || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Patients Needing Vitals */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Patients Needing Vital Signs</h2>
        <div className="space-y-3">
          {dashboardData?.patients_needing_vitals?.map((item) => (
            <div key={item.encounter.id} className="border border-yellow-200 rounded-xl p-4 bg-yellow-50/70">
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
                  className="bg-teal-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-teal-700"
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

      {/* MAR Worklist */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Medication Administration Record (MAR)</h2>
        <div className="space-y-3">
          {dashboardData?.mar_due?.map((entry) => (
            <div key={`${entry.patient.id}-${entry.medication.id}`} className="border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-medium text-gray-800">
                    {entry.patient.name} ({entry.patient.mrn || `Patient ${entry.patient.id}`})
                  </h3>
                  <p className="text-sm text-gray-600">
                    {entry.medication.medication_name} | {entry.medication.dosage || 'Dose not specified'} | {entry.medication.frequency || 'Frequency not specified'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Route: {entry.medication.route || 'N/A'} | Status: {entry.status}
                  </p>
                  {entry.latest_administration?.reason && (
                    <p className="text-sm text-rose-600">
                      Last reason: {entry.latest_administration.reason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => recordMarAction(entry, 'administered')}
                    className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-emerald-700"
                  >
                    Administered
                  </button>
                  <button
                    onClick={() => recordMarAction(entry, 'refused')}
                    className="bg-amber-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-amber-700"
                  >
                    Refused
                  </button>
                  <button
                    onClick={() => recordMarAction(entry, 'held')}
                    className="bg-rose-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-rose-700"
                  >
                    Held
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!dashboardData?.mar_due || dashboardData.mar_due.length === 0) && (
            <div className="text-center text-gray-500 py-8">
              No active medications queued in MAR for today
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Dose Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Scheduled Dose Timeline</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={marDate}
              onChange={(e) => setMarDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={marShift}
              onChange={(e) => setMarShift(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning (06:00-14:00)</option>
              <option value="afternoon">Afternoon (14:00-22:00)</option>
              <option value="night">Night (22:00-06:00)</option>
            </select>
            <button
              onClick={() => loadMarTimeline(marDate, marShift)}
              className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-teal-700"
            >
              Refresh Timeline
            </button>
          </div>
        </div>
        {marTimelineLoading ? (
          <div className="text-sm text-gray-500">Loading timeline...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Late Flag</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nurse</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {marTimeline.map((entry) => (
                  <tr key={`${entry.slot_time}-${entry.patient.id}-${entry.medication.id}`}>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.slot_label}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 capitalize">{entry.shift}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {entry.patient.name}
                      <div className="text-xs text-gray-500">{entry.patient.mrn || `Patient ${entry.patient.id}`}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {entry.medication.name}
                      <div className="text-xs text-gray-500">{entry.medication.dosage || '-'} | {entry.medication.route || '-'}</div>
                      {entry.record?.is_high_risk && (
                        <div className="text-xs text-rose-700 font-medium">High-risk med</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 capitalize">{entry.status}</td>
                    <td className="px-4 py-2 text-sm">
                      {entry.is_late ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-rose-100 text-rose-800">
                          Late ({entry.minutes_late || 0}m)
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">On time</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.nurse_name || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => recordMarAction(entry, 'administered')}
                          className="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700"
                        >
                          Administered
                        </button>
                        <button
                          onClick={() => recordMarAction(entry, 'refused')}
                          className="bg-amber-600 text-white px-2 py-1 rounded text-xs hover:bg-amber-700"
                        >
                          Refused
                        </button>
                        <button
                          onClick={() => recordMarAction(entry, 'held')}
                          className="bg-rose-600 text-white px-2 py-1 rounded text-xs hover:bg-rose-700"
                        >
                          Held
                        </button>
                        {entry.record?.requires_cosign && !entry.record?.cosigned_by && (
                          <button
                            onClick={() => cosignMarRecord(entry.record.id)}
                            className="bg-teal-600 text-white px-2 py-1 rounded text-xs hover:bg-teal-700"
                          >
                            Co-sign
                          </button>
                        )}
                        {['missed', 'held', 'refused', 'escalated'].includes(entry.status) && entry.record?.id && (
                          <button
                            onClick={() => escalateMarRecord(entry.record.id)}
                            className="bg-slate-700 text-white px-2 py-1 rounded text-xs hover:bg-slate-800"
                          >
                            Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {marTimeline.length === 0 && (
              <div className="text-sm text-gray-500 py-4">No scheduled doses in selected shift/date.</div>
            )}
          </div>
        )}
      </div>

      {/* MAR Audit History */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">MAR Audit History (Supervisor View)</h2>
          <div className="flex gap-2">
            <button
              onClick={exportMarHistoryCsv}
              className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700"
            >
              Export CSV
            </button>
            <button
              onClick={() => loadMarHistory()}
              className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-800"
            >
              Refresh History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <input
            type="date"
            value={historyStartDate}
            onChange={(e) => setHistoryStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="date"
            value={historyEndDate}
            onChange={(e) => setHistoryEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={historyNurseId}
            onChange={(e) => setHistoryNurseId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Nurses</option>
            {marHistoryNurses.map((nurse) => (
              <option key={nurse.id} value={nurse.id}>
                {nurse.name}
              </option>
            ))}
          </select>
          <select
            value={historyAction}
            onChange={(e) => setHistoryAction(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Actions</option>
            <option value="administered">Administered</option>
            <option value="refused">Refused</option>
            <option value="held">Held</option>
            <option value="missed">Missed</option>
          </select>
          <button
            onClick={() => loadMarHistory({
              startDate: historyStartDate,
              endDate: historyEndDate,
              nurseId: historyNurseId,
              action: historyAction
            })}
            className="bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700"
          >
            Apply Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded p-3">
            <p className="text-xs text-emerald-700 uppercase">Administered</p>
            <p className="text-lg font-semibold text-emerald-900">{marHistorySummary.administered || 0}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded p-3">
            <p className="text-xs text-amber-700 uppercase">Refused</p>
            <p className="text-lg font-semibold text-amber-900">{marHistorySummary.refused || 0}</p>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded p-3">
            <p className="text-xs text-rose-700 uppercase">Held</p>
            <p className="text-lg font-semibold text-rose-900">{marHistorySummary.held || 0}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded p-3">
            <p className="text-xs text-slate-700 uppercase">Missed</p>
            <p className="text-lg font-semibold text-slate-900">{marHistorySummary.missed || 0}</p>
          </div>
        </div>

        {marHistoryLoading ? (
          <div className="text-sm text-gray-500">Loading MAR audit history...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nurse</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Co-sign</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Escalation</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason/Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {marHistory.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.administered_at ? new Date(row.administered_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.patient?.name}
                      <div className="text-xs text-gray-500">{row.patient?.mrn || '-'}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.medication?.name}
                      <div className="text-xs text-gray-500">{row.medication?.dosage || '-'}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 capitalize">{row.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.nurse?.name || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.requires_cosign
                        ? (row.cosigned_by ? `Signed (${new Date(row.cosigned_at).toLocaleString()})` : 'Pending')
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.escalation_status === 'escalated' ? `${row.escalated_to || 'Supervisor'}: ${row.escalation_reason || '-'}` : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.reason || row.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {marHistory.length === 0 && (
              <div className="text-sm text-gray-500 py-4">No MAR history entries for selected filters.</div>
            )}
          </div>
        )}
      </div>

      {/* Shift Handoff Summaries */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Shift Handoff Summaries</h2>
          <div className="flex gap-2">
            <select
              value={handoffShift}
              onChange={(e) => setHandoffShift(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
            </select>
            <button
              onClick={createHandoffSummary}
              className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-teal-700"
            >
              Create Handoff
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {handoffItems.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-800">
                {item.shift_name} shift - {item.shift_date}
              </p>
              <p className="text-xs text-gray-600">
                Total: {item.summary?.total || 0}, Administered: {item.summary?.administered || 0}, Pending Co-sign: {item.summary?.pending_cosign || 0}, Escalated: {item.summary?.escalated || 0}
              </p>
              {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
            </div>
          ))}
          {handoffItems.length === 0 && (
            <p className="text-sm text-gray-500">No handoff summaries for selected date.</p>
          )}
        </div>
      </div>

      {/* Recent Vitals */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Vital Signs Recorded</h2>
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

  // Use relative path to work with Vite proxy for subdomain support
  const API_BASE = '/api';

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
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
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500">Clinical Workspace</p>
        <h1 className="text-2xl font-semibold text-gray-900">Pharmacist Dashboard</h1>
        <p className="text-sm text-gray-600">Prescription management and medication review</p>
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
            <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
              <h3 className="font-semibold text-teal-800">Pending Prescriptions</h3>
              <p className="text-3xl font-bold text-teal-900">
                {dashboardData?.stats?.pending_prescriptions || 0}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
              <h3 className="font-semibold text-yellow-800">Medications for Review</h3>
              <p className="text-3xl font-bold text-yellow-900">
                {dashboardData?.stats?.medications_for_review || 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
              <h3 className="font-semibold text-green-800">Recent Changes</h3>
              <p className="text-3xl font-bold text-green-900">
                {dashboardData?.stats?.recent_changes || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Prescriptions */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Prescriptions</h2>
        <div className="space-y-3">
          {dashboardData?.pending_prescriptions?.map((item) => (
            <div key={item.medication.id} className="border border-gray-200 rounded-xl p-4">
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
                    className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter review notes:');
                      if (notes) reviewMedication(item.medication.id, 'modify', notes);
                    }}
                    className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-700"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter reason for discontinuation:');
                      if (notes) reviewMedication(item.medication.id, 'discontinue', notes);
                    }}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
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

// Radiographer Dashboard Component
const RadiographerDashboard = ({ token, currentUser }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_BASE = '/api';

  const apiCall = async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: controller.signal,
        ...options
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return await response.json();
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      let data = null;
      try {
        data = await apiCall('/provider-workflows/radiology/dashboard');
      } catch (_primaryErr) {
        // Fallback to unified radiology summary route.
        const summary = await apiCall('/radiology/dashboard');
        data = {
          stats: {
            pending: summary?.summary?.ordered || 0,
            in_progress: summary?.summary?.in_progress || 0,
            completed_recent: summary?.summary?.reported || 0,
          },
          pending_orders: [],
          in_progress_orders: [],
        };
      }
      setDashboardData(data);
      setError('');
    } catch (err) {
      const timeoutHint = String(err.message || '').toLowerCase().includes('abort')
        ? 'Request timed out. Check backend/API availability.'
        : err.message;
      setError(`Failed to load radiology dashboard: ${timeoutHint}`);
    } finally {
      setLoading(false);
    }
  };

  const startOrder = async (orderId) => {
    try {
      await apiCall(`/provider-workflows/radiology/orders/${orderId}/start`, { method: 'POST', body: '{}' });
      loadDashboard();
    } catch (err) {
      setError(`Failed to start imaging order: ${err.message}`);
    }
  };

  const completeOrder = async (orderId) => {
    try {
      const report = window.prompt('Enter imaging report text:', '');
      if (!report || !report.trim()) return;
      await apiCall(`/provider-workflows/radiology/orders/${orderId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ report_text: report.trim() })
      });
      loadDashboard();
    } catch (err) {
      setError(`Failed to complete imaging order: ${err.message}`);
    }
  };

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500">Clinical Workspace</p>
        <h1 className="text-2xl font-semibold text-gray-900">Radiology Dashboard</h1>
        <p className="text-sm text-gray-600">RIS/PACS starter workflow for imaging queue management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
          <h3 className="font-semibold text-amber-800">Pending</h3>
          <p className="text-3xl font-bold text-amber-900">{dashboardData?.stats?.pending || 0}</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
          <h3 className="font-semibold text-teal-800">In Progress</h3>
          <p className="text-3xl font-bold text-teal-900">{dashboardData?.stats?.in_progress || 0}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
          <h3 className="font-semibold text-emerald-800">Completed (Recent)</h3>
          <p className="text-3xl font-bold text-emerald-900">{dashboardData?.stats?.completed_recent || 0}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Imaging Orders</h2>
        <div className="space-y-3">
          {(dashboardData?.pending_orders || []).map((item) => (
            <div key={item.order.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-800">{item.order.test_name}</p>
                <p className="text-sm text-gray-600">{item.patient?.first_name} {item.patient?.last_name}</p>
                <p className="text-xs text-gray-500">Order: {item.order.order_id} | Priority: {item.order.priority}</p>
              </div>
              <button onClick={() => startOrder(item.order.id)} className="bg-teal-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-teal-700">
                Start
              </button>
            </div>
          ))}
          {(dashboardData?.pending_orders || []).length === 0 && (
            <p className="text-sm text-gray-500">No pending imaging orders.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">In Progress Imaging Orders</h2>
        <div className="space-y-3">
          {(dashboardData?.in_progress_orders || []).map((item) => (
            <div key={item.order.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-800">{item.order.test_name}</p>
                <p className="text-sm text-gray-600">{item.patient?.first_name} {item.patient?.last_name}</p>
                <p className="text-xs text-gray-500">Order: {item.order.order_id}</p>
              </div>
              <button onClick={() => completeOrder(item.order.id)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-emerald-700">
                Complete + Report
              </button>
            </div>
          ))}
          {(dashboardData?.in_progress_orders || []).length === 0 && (
            <p className="text-sm text-gray-500">No in-progress imaging orders.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// OT Manager Dashboard Component
const OTManagerDashboard = ({ token, currentUser }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const todayDate = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [otAnalytics, setOtAnalytics] = useState(null);
  const API_BASE = '/api';

  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
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
  };

  const loadDashboard = async (dateValue = selectedDate) => {
    setLoading(true);
    try {
      const data = await apiCall(`/provider-workflows/ot-manager/dashboard?date=${encodeURIComponent(dateValue)}`);
      setDashboardData(data);
      const analytics = await apiCall(`/provider-workflows/ot-manager/analytics?start_date=${encodeURIComponent(dateValue)}&end_date=${encodeURIComponent(dateValue)}`);
      setOtAnalytics(analytics);
      setError('');
    } catch (err) {
      setError(`Failed to load OT manager dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelSchedule = async (scheduleId) => {
    try {
      const reason = window.prompt('Cancellation reason:', '');
      if (!reason || !reason.trim()) return;
      await apiCall(`/provider-workflows/ot-manager/schedules/${scheduleId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      loadDashboard();
    } catch (err) {
      setError(`Failed to cancel OT schedule: ${err.message}`);
    }
  };

  const createSchedule = async (payload) => {
    try {
      await apiCall('/provider-workflows/ot-manager/schedules', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setShowScheduleForm(false);
      loadDashboard();
    } catch (err) {
      setError(`Failed to create OT schedule: ${err.message}`);
    }
  };

  const allocateResources = async (schedule) => {
    try {
      const availableResourceIds = (dashboardData?.resources || [])
        .filter((resource) => (resource.quantity_available || 0) > 0)
        .slice(0, 2)
        .map((resource) => resource.id);
      if (availableResourceIds.length === 0) {
        setError('No available OT resources to allocate.');
        return;
      }
      await apiCall(`/provider-workflows/ot-manager/schedules/${schedule.id}/allocate`, {
        method: 'POST',
        body: JSON.stringify({ resource_ids: availableResourceIds })
      });
      loadDashboard();
    } catch (err) {
      setError(`Failed to allocate resources: ${err.message}`);
    }
  };

  const startSchedule = async (scheduleId) => {
    try {
      await apiCall(`/provider-workflows/ot-manager/schedules/${scheduleId}/start`, {
        method: 'POST',
        body: '{}'
      });
      loadDashboard();
    } catch (err) {
      setError(`Failed to start OT schedule: ${err.message}`);
    }
  };

  const completeSchedule = async (scheduleId) => {
    try {
      await apiCall(`/provider-workflows/ot-manager/schedules/${scheduleId}/complete`, {
        method: 'POST',
        body: '{}'
      });
      loadDashboard();
    } catch (err) {
      setError(`Failed to complete OT schedule: ${err.message}`);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard(todayDate);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Clinical Workspace</p>
            <h1 className="text-2xl font-semibold text-gray-900">OT Manager Dashboard</h1>
            <p className="text-sm text-gray-600">Operating theatre scheduling and resource allocation</p>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => loadDashboard(selectedDate)}
              className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-teal-700"
            >
              New OT Schedule
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
          <h3 className="font-semibold text-teal-800">Scheduled</h3>
          <p className="text-3xl font-bold text-teal-900">{dashboardData?.stats?.scheduled || 0}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
          <h3 className="font-semibold text-amber-800">In Progress</h3>
          <p className="text-3xl font-bold text-amber-900">{dashboardData?.stats?.in_progress || 0}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
          <h3 className="font-semibold text-emerald-800">Completed</h3>
          <p className="text-3xl font-bold text-emerald-900">{dashboardData?.stats?.completed || 0}</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
          <h3 className="font-semibold text-teal-900">Resources Available</h3>
          <p className="text-3xl font-bold text-teal-900">{dashboardData?.stats?.resources_available || 0}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">OT Utilization Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 uppercase">Avg Room Utilization</p>
            <p className="text-xl font-semibold text-gray-900">{otAnalytics?.summary?.avg_room_utilization_pct || 0}%</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 uppercase">Avg Turnaround</p>
            <p className="text-xl font-semibold text-gray-900">{otAnalytics?.summary?.avg_turnaround_minutes || 0} mins</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 uppercase">Cancelled Cases</p>
            <p className="text-xl font-semibold text-gray-900">{otAnalytics?.summary?.cancelled_cases || 0}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Room Utilization</p>
            <div className="space-y-2">
              {(otAnalytics?.room_utilization || []).map((room) => (
                <div key={room.room} className="border border-gray-200 rounded-lg p-2 text-sm">
                  <span className="font-medium">{room.room}</span> - {room.utilization_pct}% ({room.cases} cases)
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Cancellation Reasons</p>
            <div className="space-y-2">
              {(otAnalytics?.cancellation_reasons || []).map((row) => (
                <div key={row.reason} className="border border-gray-200 rounded-lg p-2 text-sm">
                  <span className="font-medium">{row.reason}</span> - {row.count}
                </div>
              ))}
              {(otAnalytics?.cancellation_reasons || []).length === 0 && (
                <p className="text-sm text-gray-500">No cancellations in selected range.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">OT Schedule Board</h2>
        <div className="space-y-3">
          {(dashboardData?.schedules || []).map((schedule) => (
            <div key={schedule.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800">{schedule.procedure_name}</p>
                  <p className="text-sm text-gray-600">Room: {schedule.ot_room} | Status: {schedule.status}</p>
                  <p className="text-xs text-gray-500">
                    {schedule.scheduled_start ? new Date(schedule.scheduled_start).toLocaleString() : '-'} - {schedule.scheduled_end ? new Date(schedule.scheduled_end).toLocaleString() : '-'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => allocateResources(schedule)}
                    className="bg-teal-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-teal-700"
                  >
                    Allocate
                  </button>
                  <button
                    onClick={() => startSchedule(schedule.id)}
                    className="bg-amber-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-amber-700"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => completeSchedule(schedule.id)}
                    className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-emerald-700"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => cancelSchedule(schedule.id)}
                    className="bg-rose-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-rose-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(dashboardData?.schedules || []).length === 0 && (
            <p className="text-sm text-gray-500">No OT schedules for selected date.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">OT Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(dashboardData?.resources || []).map((resource) => (
            <div key={resource.id} className="border border-gray-200 rounded-lg p-3">
              <p className="font-medium text-gray-800">{resource.name}</p>
              <p className="text-sm text-gray-600">{resource.resource_type}</p>
              <p className="text-xs text-gray-500">
                Available: {resource.quantity_available}/{resource.quantity_total}
              </p>
            </div>
          ))}
        </div>
      </div>

      {showScheduleForm && (
        <OTScheduleForm
          onSubmit={createSchedule}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}
    </div>
  );
};

// Form Components
const modalBackdropClass = "fixed inset-0 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center z-50 p-4";
const modalContainerClass = "bg-white border border-gray-200 rounded-2xl p-6 w-full shadow-xl max-h-[90vh] overflow-y-auto";
const modalTitleClass = "text-xl font-semibold text-gray-900";
const modalSubtitleClass = "text-xs text-gray-500 mt-1 mb-4";
const modalFieldClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500";
const modalTextareaClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500";
const modalSecondaryBtnClass = "px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50";
const modalPrimaryBlueBtnClass = "px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700";
const modalPrimaryGreenBtnClass = "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700";
const modalPrimaryIndigoBtnClass = "px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700";

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
    <div className={modalBackdropClass}>
      <div className={`${modalContainerClass} max-w-2xl`}>
        <h2 className={modalTitleClass}>New Clinical Encounter</h2>
        <p className={modalSubtitleClass}>Capture consultation details and follow-up plans.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
              className={modalFieldClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Encounter Type</label>
            <select
              value={formData.encounter_type}
              onChange={(e) => setFormData({...formData, encounter_type: e.target.value})}
              className={modalFieldClass}
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
              className={modalTextareaClass}
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              className={modalTextareaClass}
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Treatment Plan</label>
            <textarea
              value={formData.treatment_plan}
              onChange={(e) => setFormData({...formData, treatment_plan: e.target.value})}
              className={modalTextareaClass}
              rows="3"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.follow_up_required}
              onChange={(e) => setFormData({...formData, follow_up_required: e.target.checked})}
              className="h-4 w-4 text-teal-700 focus:ring-teal-500 border-gray-300 rounded"
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
                className={modalFieldClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className={modalTextareaClass}
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className={modalSecondaryBtnClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={modalPrimaryBlueBtnClass}
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
    <div className={modalBackdropClass}>
      <div className={`${modalContainerClass} max-w-lg`}>
        <h2 className={modalTitleClass}>Prescribe Medication</h2>
        <p className={modalSubtitleClass}>Create and submit medication orders with dosing instructions.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
              className={modalFieldClass}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Medication Name</label>
            <input
              type="text"
              value={formData.medication_name}
              onChange={(e) => setFormData({...formData, medication_name: e.target.value})}
              className={modalFieldClass}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Dosage</label>
            <input
              type="text"
              value={formData.dosage}
              onChange={(e) => setFormData({...formData, dosage: e.target.value})}
              className={modalFieldClass}
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
              className={modalFieldClass}
              placeholder="e.g., Once daily"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Route</label>
            <select
              value={formData.route}
              onChange={(e) => setFormData({...formData, route: e.target.value})}
              className={modalFieldClass}
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
              className={modalFieldClass}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className={modalTextareaClass}
              rows="3"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className={modalSecondaryBtnClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={modalPrimaryGreenBtnClass}
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
    <div className={modalBackdropClass}>
      <div className={`${modalContainerClass} max-w-2xl`}>
        <h2 className={modalTitleClass}>Record Vital Signs</h2>
        <p className={modalSubtitleClass}>Capture clinical observations for the selected patient encounter.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
              className={modalFieldClass}
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
                className={modalFieldClass}
                placeholder="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Diastolic BP</label>
              <input
                type="number"
                value={formData.diastolic_bp}
                onChange={(e) => setFormData({...formData, diastolic_bp: e.target.value})}
                className={modalFieldClass}
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
                className={modalFieldClass}
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
                className={modalFieldClass}
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
                className={modalFieldClass}
                placeholder="16"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Oxygen Saturation (%)</label>
              <input
                type="number"
                value={formData.oxygen_saturation}
                onChange={(e) => setFormData({...formData, oxygen_saturation: e.target.value})}
                className={modalFieldClass}
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
                className={modalFieldClass}
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
              className={modalFieldClass}
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
              className={modalFieldClass}
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className={modalTextareaClass}
              rows="3"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className={modalSecondaryBtnClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={modalPrimaryBlueBtnClass}
            >
              Record Vitals
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OTScheduleForm = ({ onSubmit, onCancel }) => {
  const now = new Date();
  const plusOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const plusTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const toInputDateTime = (dt) => dt.toISOString().slice(0, 16);

  const [formData, setFormData] = useState({
    patient_id: '',
    procedure_name: '',
    ot_room: 'Operating Room 1',
    surgeon_name: '',
    anesthetist_name: '',
    scheduled_start: toInputDateTime(plusOneHour),
    scheduled_end: toInputDateTime(plusTwoHours),
    required_resources: 'Anesthesia Machine, Scrub Nurse Team',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const resources = formData.required_resources
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    onSubmit({
      patient_id: formData.patient_id,
      procedure_name: formData.procedure_name,
      ot_room: formData.ot_room,
      surgeon_name: formData.surgeon_name || undefined,
      anesthetist_name: formData.anesthetist_name || undefined,
      scheduled_start: new Date(formData.scheduled_start).toISOString(),
      scheduled_end: new Date(formData.scheduled_end).toISOString(),
      required_resources: resources,
      notes: formData.notes || undefined
    });
  };

  return (
    <div className={modalBackdropClass}>
      <div className={`${modalContainerClass} max-w-2xl`}>
        <h2 className={modalTitleClass}>Create OT Schedule</h2>
        <p className={modalSubtitleClass}>Plan theatre time, team allocation, and required resources.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              type="text"
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className={modalFieldClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Procedure Name</label>
            <input
              type="text"
              value={formData.procedure_name}
              onChange={(e) => setFormData({ ...formData, procedure_name: e.target.value })}
              className={modalFieldClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">OT Room</label>
              <input
                type="text"
                value={formData.ot_room}
                onChange={(e) => setFormData({ ...formData, ot_room: e.target.value })}
                className={modalFieldClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Surgeon Name</label>
              <input
                type="text"
                value={formData.surgeon_name}
                onChange={(e) => setFormData({ ...formData, surgeon_name: e.target.value })}
                className={modalFieldClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Scheduled Start</label>
              <input
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                className={modalFieldClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Scheduled End</label>
              <input
                type="datetime-local"
                value={formData.scheduled_end}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                className={modalFieldClass}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Required Resources (comma-separated)</label>
            <input
              type="text"
              value={formData.required_resources}
              onChange={(e) => setFormData({ ...formData, required_resources: e.target.value })}
              className={modalFieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={modalTextareaClass}
              rows="3"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className={modalSecondaryBtnClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={modalPrimaryIndigoBtnClass}
            >
              Create Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { PhysicianDashboard, NurseDashboard, PharmacistDashboard, RadiographerDashboard, OTManagerDashboard };

