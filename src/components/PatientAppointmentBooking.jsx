/**
 * Patient Appointment Booking - streamlined, essential fields only
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Calendar, Clock, Building2, User, 
  CheckCircle, AlertCircle, FileText, Shield
} from 'lucide-react';

export default function PatientAppointmentBooking({ patientId, onBookingSuccess }) {
  const [facilities, setFacilities] = useState([]);
  const [providers, setProviders] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const storedUser = (() => {
    try {
      const userData = localStorage.getItem('auth_user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  })();

  const [bookingData, setBookingData] = useState({
    full_name: storedUser?.full_name || `${storedUser?.first_name || ''} ${storedUser?.last_name || ''}`.trim(),
    date_of_birth: storedUser?.date_of_birth || '',
    phone: storedUser?.phone || storedUser?.phone_primary || '',
    email: storedUser?.email || '',
    facility_id: '',
    provider_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'consultation',
    reason_for_visit: '',
    is_returning: 'returning',
    insurance_provider: '',
    insurance_policy_number: '',
    notes: '',
    consent: false,
  });

  useEffect(() => {
    loadFacilities();
  }, []);

  useEffect(() => {
    if (bookingData.facility_id) {
      loadProviders(bookingData.facility_id);
    } else {
      setProviders([]);
    }
  }, [bookingData.facility_id]);

  useEffect(() => {
    if (bookingData.provider_id && bookingData.appointment_date) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [bookingData.provider_id, bookingData.appointment_date]);

  const loadFacilities = async () => {
    try {
      const result = await apiService.request('/organization/facilities', 'GET');
      if (result.success) {
        setFacilities(result.facilities || []);
      }
    } catch (err) {
      console.error('Error loading facilities:', err);
    }
  };

  const loadProviders = async (facilityId) => {
    try {
      const result = await apiService.request(`/provider?facility_id=${facilityId}`, 'GET');
      if (result.success) {
        setProviders(result.providers || []);
      }
    } catch (err) {
      console.error('Error loading providers:', err);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        provider_id: bookingData.provider_id,
        date: bookingData.appointment_date,
        facility_id: bookingData.facility_id
      });
      
      const result = await apiService.request(`/scheduling/available-slots?${params}`, 'GET');
      if (result.success) {
        setAvailableSlots(result.slots || []);
      }
    } catch (err) {
      console.error('Error loading available slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!bookingData.full_name) newErrors.full_name = 'Full name is required';
    if (!bookingData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (!bookingData.phone) newErrors.phone = 'Phone number is required';
    if (!bookingData.email) newErrors.email = 'Email is required';
    if (!bookingData.facility_id) newErrors.facility_id = 'Please select a facility';
    if (!bookingData.appointment_date) newErrors.appointment_date = 'Please choose a preferred date';
    if (!bookingData.appointment_time) newErrors.appointment_time = 'Please choose a preferred time';
    if (!bookingData.reason_for_visit) newErrors.reason_for_visit = 'Reason for visit is required';
    if (!bookingData.consent) newErrors.consent = 'Consent is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBooking = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        patient_id: patientId,
        full_name: bookingData.full_name,
        date_of_birth: bookingData.date_of_birth,
        phone: bookingData.phone,
        email: bookingData.email,
        facility_id: bookingData.facility_id,
        provider_id: bookingData.provider_id || null,
        appointment_type: bookingData.appointment_type,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        reason_for_visit: bookingData.reason_for_visit,
        status: 'requested',
        is_returning: bookingData.is_returning === 'returning',
        insurance_provider: bookingData.insurance_provider,
        insurance_policy_number: bookingData.insurance_policy_number,
        notes: bookingData.notes,
      };

      const appointmentResult = await apiService.request('/scheduling/appointments', 'POST', payload);

      if (appointmentResult.success) {
        setBookingSuccess(true);
        if (onBookingSuccess) onBookingSuccess(appointmentResult.appointment);
        setBookingData({
          ...bookingData,
          provider_id: '',
          appointment_date: '',
          appointment_time: '',
          reason_for_visit: '',
          insurance_provider: '',
          insurance_policy_number: '',
          notes: '',
          consent: false,
        });
      } else {
        alert(appointmentResult.error || 'Failed to create appointment');
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      alert('Error booking appointment: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (bookingSuccess) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Appointment Request Submitted</h2>
          <p className="text-gray-600 mb-4">
            We’ve received your request. We’ll contact you to confirm the exact time.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left space-y-1">
            <p><strong>Date:</strong> {bookingData.appointment_date}</p>
            <p><strong>Time:</strong> {bookingData.appointment_time}</p>
            <p><strong>Provider:</strong> {providers.find(p => p.id === parseInt(bookingData.provider_id))?.name || 'Any available'}</p>
          </div>
          <Button onClick={() => setBookingSuccess(false)}>
            Book Another Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Book an Appointment
              </CardTitle>
              <CardDescription>Essential details only. Takes under a minute.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-emerald-600" />
              Secure & Private
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Patient Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={bookingData.full_name}
                onChange={(e) => setBookingData({ ...bookingData, full_name: e.target.value })}
                placeholder="First and last name"
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <Input
                type="date"
                value={bookingData.date_of_birth}
                onChange={(e) => setBookingData({ ...bookingData, date_of_birth: e.target.value })}
                className={errors.date_of_birth ? 'border-red-500' : ''}
              />
              {errors.date_of_birth && <p className="text-xs text-red-500">{errors.date_of_birth}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                type="tel"
                value={bookingData.phone}
                onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                placeholder="+234 800 000 0000"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={bookingData.email}
                onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                placeholder="you@example.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facility *</Label>
              <select
                value={bookingData.facility_id}
                onChange={(e) => {
                  setBookingData({ ...bookingData, facility_id: e.target.value, provider_id: '' });
                  setErrors({ ...errors, facility_id: '' });
                }}
                className={`w-full px-3 py-2 border rounded-lg ${errors.facility_id ? 'border-red-500' : ''}`}
              >
                <option value="">Select facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name} {facility.address ? `- ${facility.address}` : ''}
                  </option>
                ))}
              </select>
              {errors.facility_id && <p className="text-xs text-red-500">{errors.facility_id}</p>}
            </div>

            <div className="space-y-2">
              <Label>Preferred Doctor (optional)</Label>
              <select
                value={bookingData.provider_id}
                onChange={(e) => setBookingData({ ...bookingData, provider_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!bookingData.facility_id}
              >
                <option value="">Any available</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {provider.specialty ? `- ${provider.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Date *</Label>
              <Input
                type="date"
                value={bookingData.appointment_date}
                onChange={(e) => {
                  setBookingData({ ...bookingData, appointment_date: e.target.value, appointment_time: '' });
                  setErrors({ ...errors, appointment_date: '' });
                }}
                min={new Date().toISOString().split('T')[0]}
                className={errors.appointment_date ? 'border-red-500' : ''}
              />
              {errors.appointment_date && <p className="text-xs text-red-500">{errors.appointment_date}</p>}
            </div>

            <div className="space-y-2">
              <Label>Preferred Time *</Label>
              {loading ? (
                <p className="text-sm text-gray-500">Loading available slots...</p>
              ) : (
                <select
                  value={bookingData.appointment_time}
                  onChange={(e) => setBookingData({ ...bookingData, appointment_time: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.appointment_time ? 'border-red-500' : ''}`}
                  disabled={!bookingData.appointment_date}
                >
                  <option value="">Select time</option>
                  {availableSlots.length > 0
                    ? availableSlots.map((slot) => (
                        <option key={slot.time} value={slot.time}>
                          {slot.time}
                        </option>
                      ))
                    : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                </select>
              )}
              {errors.appointment_time && <p className="text-xs text-red-500">{errors.appointment_time}</p>}
            </div>

            <div className="space-y-2">
              <Label>Appointment Type *</Label>
              <select
                value={bookingData.appointment_type}
                onChange={(e) => setBookingData({ ...bookingData, appointment_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="consultation">Consultation / Check-up</option>
                <option value="follow_up">Follow-up</option>
                <option value="telemedicine">Telemedicine</option>
                <option value="urgent">Urgent / Same day</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Reason for Visit *</Label>
              <textarea
                value={bookingData.reason_for_visit}
                onChange={(e) => setBookingData({ ...bookingData, reason_for_visit: e.target.value })}
                rows="3"
                placeholder="Briefly describe symptoms or reason for the visit"
                className={`w-full px-3 py-2 border rounded-lg ${errors.reason_for_visit ? 'border-red-500' : ''}`}
              />
              {errors.reason_for_visit && <p className="text-xs text-red-500">{errors.reason_for_visit}</p>}
            </div>
          </div>

          {/* Preferences & Insurance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>New or Returning Patient?</Label>
              <select
                value={bookingData.is_returning}
                onChange={(e) => setBookingData({ ...bookingData, is_returning: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="returning">Returning patient</option>
                <option value="new">New patient</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Insurance Provider (optional)</Label>
              <Input
                value={bookingData.insurance_provider}
                onChange={(e) => setBookingData({ ...bookingData, insurance_provider: e.target.value })}
                placeholder="e.g., NHIS, Private, None"
              />
            </div>

            <div className="space-y-2">
              <Label>Policy Number (optional)</Label>
              <Input
                value={bookingData.insurance_policy_number}
                onChange={(e) => setBookingData({ ...bookingData, insurance_policy_number: e.target.value })}
                placeholder="Policy / Member ID"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Notes / Special Requests (optional)</Label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                rows="3"
                placeholder="Accessibility needs, allergies, or any other preference"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Consent */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={bookingData.consent}
              onChange={(e) => setBookingData({ ...bookingData, consent: e.target.checked })}
            />
            <div className="text-sm text-gray-700">
              I agree to share my information with the clinic for scheduling and care purposes, and I accept the privacy policy.
              {errors.consent && <p className="text-xs text-red-500 mt-1">{errors.consent}</p>}
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                Please fix the highlighted fields to continue.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setBookingData({
              ...bookingData,
              facility_id: '',
              provider_id: '',
              appointment_date: '',
              appointment_time: '',
              appointment_type: 'consultation',
              reason_for_visit: '',
              is_returning: 'returning',
              insurance_provider: '',
              insurance_policy_number: '',
              notes: '',
              consent: false,
            })}>
              Clear Form
            </Button>
            <Button onClick={handleBooking} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

