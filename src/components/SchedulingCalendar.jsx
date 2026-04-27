import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { BarChart, LineChart } from './charts';
import { Calendar, Clock, User, Plus, X } from 'lucide-react';

export default function SchedulingCalendar({ facilityId, providerId, patientId }) {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appointmentStats, setAppointmentStats] = useState([]);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [creating, setCreating] = useState(false);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    provider_id: providerId || '',
    facility_id: facilityId || '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    appointment_type: 'consultation',
    reason_for_visit: '',
    duration_minutes: 30
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadAppointments();
  }, [selectedDate, facilityId, providerId]);

  useEffect(() => {
    if (showCreateModal) {
      if (!patientId) {
        // Only load patients list if no patientId is provided
        loadPatients();
      } else {
        // Load patient info if patientId is provided
        loadPatientInfo();
      }
      loadFacilities();
      if (formData.facility_id) {
        loadProviders(formData.facility_id);
      }
    }
  }, [showCreateModal, patientId]);

  useEffect(() => {
    if (formData.facility_id) {
      loadProviders(formData.facility_id);
    } else {
      setProviders([]);
    }
  }, [formData.facility_id]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const startDate = selectedDate.toISOString().split('T')[0];
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDateStr
      });
      if (facilityId) params.set('facility_id', `${facilityId}`);
      if (providerId) params.set('provider_id', `${providerId}`);
      const result = await apiService.request(`/scheduling/appointments?${params.toString()}`);
      
      if (result.success) {
        setAppointments(result.appointments || []);
        
        // Generate appointment statistics
        generateAppointmentStats(result.appointments || []);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAppointmentStats = (appts) => {
    // Group appointments by hour
    const hourlyStats = {};
    appts.forEach(apt => {
      const hour = new Date(`${apt.appointment_date}T${apt.appointment_time}`).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });
    
    // Convert to chart data
    const stats = Array.from({ length: 12 }, (_, i) => i + 8).map(hour => ({
      name: `${hour}:00`,
      appointments: hourlyStats[hour] || 0
    }));
    
    setAppointmentStats(stats);
  };

  const getAppointmentsForHour = (hour) => {
    return appointments.filter(apt => {
      const aptTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
      return aptTime.getHours() === hour;
    });
  };

  const loadPatientInfo = async () => {
    if (!patientId) return;
    try {
      const result = await apiService.request(`/secure/patients/${patientId}`, { method: 'GET' });
      if (result.success && result.patient) {
        setSelectedPatientInfo(result.patient);
      }
    } catch (error) {
      console.error('Error loading patient info:', error);
    }
  };

  const loadPatients = async () => {
    try {
      const result = await apiService.request('/secure/patients');
      if (result.success) {
        setPatients(result.patients || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadFacilities = async () => {
    try {
      const result = await apiService.request('/organization/facilities');
      if (result.success) {
        setFacilities(result.facilities || []);
      }
    } catch (error) {
      console.error('Error loading facilities:', error);
    }
  };

  const loadProviders = async (facilityId) => {
    try {
      const result = await apiService.request(`/providers?facility_id=${facilityId}`);
      if (result.success) {
        setProviders(result.providers || []);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    // Only validate patient_id if it's not pre-selected
    if (!patientId && !formData.patient_id) newErrors.patient_id = 'Patient is required';
    if (!formData.facility_id) newErrors.facility_id = 'Facility is required';
    if (!formData.appointment_date) newErrors.appointment_date = 'Date is required';
    if (!formData.appointment_time) newErrors.appointment_time = 'Time is required';
    if (!formData.reason_for_visit) newErrors.reason_for_visit = 'Reason for visit is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAppointment = async () => {
    if (!validateForm()) return;

    try {
      setCreating(true);
      const payload = {
        patient_id: parseInt(patientId || formData.patient_id),
        provider_id: formData.provider_id || null,
        facility_id: parseInt(formData.facility_id),
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        appointment_type: formData.appointment_type,
        reason_for_visit: formData.reason_for_visit,
        duration_minutes: formData.duration_minutes || 30,
        status: 'scheduled'
      };

      const result = await apiService.request('/scheduling/appointments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        setShowCreateModal(false);
        setFormData({
          patient_id: patientId || '',
          provider_id: providerId || '',
          facility_id: facilityId || '',
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '',
          appointment_type: 'consultation',
          reason_for_visit: '',
          duration_minutes: 30
        });
        setErrors({});
        loadAppointments();
        alert('Appointment created successfully!');
      } else {
        alert(result.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error creating appointment: ' + (error.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  return (
    <PageWrapper
      title="Appointments Calendar"
      description="Schedule and manage patient appointments"
      icon={Calendar}
      actions={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      }
    >
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Appointments for {selectedDate.toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading appointments...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hours.map(hour => {
                const hourAppointments = getAppointmentsForHour(hour);
                return (
                  <div key={hour} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-20 text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {hour}:00
                    </div>
                    <div className="flex-1 space-y-2">
                      {hourAppointments.length === 0 ? (
                        <div className="text-sm text-gray-400 italic">No appointments</div>
                      ) : (
                        hourAppointments.map(apt => (
                          <Card
                            key={apt.id}
                            className={`shadow-sm border-l-4 ${
                              apt.status === 'completed' ? 'border-gray-400 bg-gray-50' :
                              apt.status === 'cancelled' ? 'border-red-400 bg-red-50' :
                              apt.status === 'checked_in' ? 'border-green-400 bg-green-50' :
                              'border-teal-400 bg-teal-50'
                            }`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-600" />
                                  <span className="font-medium text-gray-900">Patient #{apt.patient_id}</span>
                                </div>
                                <Badge variant={
                                  apt.status === 'completed' ? 'secondary' :
                                  apt.status === 'cancelled' ? 'destructive' :
                                  apt.status === 'checked_in' ? 'default' :
                                  'outline'
                                }>
                                  {apt.status}
                                </Badge>
                              </div>
                              {apt.reason_for_visit && (
                                <div className="text-sm text-gray-600 mt-2">{apt.reason_for_visit}</div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Statistics Chart */}
      {appointmentStats.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Appointment Distribution by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={appointmentStats}
              dataKey="appointments"
              name="Appointments"
              color="#3b82f6"
              height={300}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 bg-white shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between bg-white border-b">
              <CardTitle>New Appointment</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setErrors({});
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 bg-white">
              {/* Patient Selection - Only show if patientId is not provided */}
              {!patientId && (
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <select
                    value={formData.patient_id}
                    onChange={(e) => {
                      setFormData({ ...formData, patient_id: e.target.value });
                      setErrors({ ...errors, patient_id: '' });
                    }}
                    className={`w-full px-3 py-2 border rounded-lg ${errors.patient_id ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Select Patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} ({patient.universal_patient_id})
                      </option>
                    ))}
                  </select>
                  {errors.patient_id && <p className="text-xs text-red-500">{errors.patient_id}</p>}
                </div>
              )}

              {/* Show patient info if patientId is provided */}
              {patientId && selectedPatientInfo && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-teal-700" />
                    <Label className="text-sm font-semibold text-teal-900">
                      Patient: {selectedPatientInfo.first_name} {selectedPatientInfo.last_name}
                    </Label>
                  </div>
                  <div className="text-xs text-teal-800">
                    Patient ID: {selectedPatientInfo.universal_patient_id}
                  </div>
                </div>
              )}

              {/* Facility Selection */}
              <div className="space-y-2">
                <Label>Facility *</Label>
                <select
                  value={formData.facility_id}
                  onChange={(e) => {
                    setFormData({ ...formData, facility_id: e.target.value, provider_id: '' });
                    setErrors({ ...errors, facility_id: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.facility_id ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
                {errors.facility_id && <p className="text-xs text-red-500">{errors.facility_id}</p>}
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Provider (Optional)</Label>
                <select
                  value={formData.provider_id}
                  onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={!formData.facility_id}
                >
                  <option value="">Any Available Provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.first_name} {provider.last_name} {provider.specialty ? `- ${provider.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => {
                      setFormData({ ...formData, appointment_date: e.target.value });
                      setErrors({ ...errors, appointment_date: '' });
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className={errors.appointment_date ? 'border-red-500' : ''}
                  />
                  {errors.appointment_date && <p className="text-xs text-red-500">{errors.appointment_date}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => {
                      setFormData({ ...formData, appointment_time: e.target.value });
                      setErrors({ ...errors, appointment_time: '' });
                    }}
                    className={errors.appointment_time ? 'border-red-500' : ''}
                  />
                  {errors.appointment_time && <p className="text-xs text-red-500">{errors.appointment_time}</p>}
                </div>
              </div>

              {/* Appointment Type and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Appointment Type</Label>
                  <select
                    value={formData.appointment_type}
                    onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="checkup">Checkup</option>
                    <option value="emergency">Emergency</option>
                    <option value="procedure">Procedure</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                    min={15}
                    max={120}
                    step={15}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Reason for Visit */}
              <div className="space-y-2">
                <Label>Reason for Visit *</Label>
                <Textarea
                  value={formData.reason_for_visit}
                  onChange={(e) => {
                    setFormData({ ...formData, reason_for_visit: e.target.value });
                    setErrors({ ...errors, reason_for_visit: '' });
                  }}
                  placeholder="Enter reason for visit..."
                  rows={3}
                  className={errors.reason_for_visit ? 'border-red-500' : ''}
                />
                {errors.reason_for_visit && <p className="text-xs text-red-500">{errors.reason_for_visit}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setErrors({});
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateAppointment} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Appointment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}

