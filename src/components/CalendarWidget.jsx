import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Plus, X } from 'lucide-react';
import { apiService } from '../services/apiService';

const CalendarWidget = ({ userId, providerId, facilityId, compact = false, onAppointmentBooked }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    patient_id: '',
    appointment_time: '',
    appointment_type: 'consultation',
    reason_for_visit: ''
  });
  const [patients, setPatients] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
    if (showBookingForm) {
      loadPatients();
    }
  }, [currentDate, providerId, facilityId, showBookingForm]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const params = new URLSearchParams();
      params.append('start_date', startDate.toISOString().split('T')[0]);
      params.append('end_date', endDate.toISOString().split('T')[0]);
      if (providerId) params.append('provider_id', providerId);
      if (facilityId) params.append('facility_id', facilityId);
      
      const result = await apiService.request(`/scheduling/appointments?${params.toString()}`, { method: 'GET' });
      if (result.success) {
        setAppointments(result.appointments || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const result = await apiService.getPatients();
      if (result.success) {
        setPatients(result.patients || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const handleBookAppointment = async () => {
    if (!bookingData.patient_id || !bookingData.appointment_time) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setBookingLoading(true);
      const appointmentData = {
        patient_id: parseInt(bookingData.patient_id),
        provider_id: providerId,
        facility_id: facilityId,
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: bookingData.appointment_time,
        appointment_type: bookingData.appointment_type,
        reason_for_visit: bookingData.reason_for_visit
      };

      const result = await apiService.request('/scheduling/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData)
      });

      if (result.success) {
        alert('Appointment booked successfully!');
        setShowBookingForm(false);
        setBookingData({
          patient_id: '',
          appointment_time: '',
          appointment_type: 'consultation',
          reason_for_visit: ''
        });
        await loadAppointments();
        if (onAppointmentBooked) {
          onAppointmentBooked(result.appointment);
        }
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Error booking appointment: ' + (error.message || 'Unknown error'));
    } finally {
      setBookingLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getAppointmentsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === dateStr);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (compact) {
    // Compact calendar view
    const todayAppointments = getAppointmentsForDate(new Date());
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto"></div>
            </div>
          ) : todayAppointments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No appointments today</p>
          ) : (
            <div className="space-y-2">
              {todayAppointments.slice(0, 3).map((apt, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-teal-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-700" />
                    <span className="text-sm font-medium">{apt.appointment_time || 'N/A'}</span>
                  </div>
                  <span className="text-sm text-gray-600">{apt.patient_name || 'Patient'}</span>
                </div>
              ))}
              {todayAppointments.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{todayAppointments.length - 3} more appointments
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <CardDescription>View and manage appointments</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 p-2">
                  {day}
                </div>
              ))}
              {days.map((date, idx) => {
                const dateAppointments = getAppointmentsForDate(date);
                const appointmentCount = dateAppointments.length;
                
                return (
                  <div
                    key={idx}
                    onClick={() => date && setSelectedDate(date)}
                    className={`
                      min-h-[40px] p-1 border rounded cursor-pointer transition-colors
                      ${!date ? 'bg-gray-50' : ''}
                      ${isToday(date) ? 'bg-teal-100 border-teal-500' : ''}
                      ${isSelected(date) && date ? 'ring-2 ring-teal-500' : ''}
                      ${date ? 'hover:bg-gray-50' : ''}
                    `}
                  >
                    {date && (
                      <>
                        <div className="text-sm font-medium mb-1">
                          {date.getDate()}
                        </div>
                        {appointmentCount > 0 && (
                          <div className="flex items-center justify-center">
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {appointmentCount}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Appointments */}
            {selectedDate && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => setShowBookingForm(true)}
                    className="bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Book
                  </Button>
                </div>

                {/* Booking Form */}
                {showBookingForm && (
                  <div className="mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-sm text-gray-900">Book New Appointment</h5>
                      <Button variant="ghost" size="sm" onClick={() => setShowBookingForm(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Patient *</Label>
                        <select
                          value={bookingData.patient_id}
                          onChange={(e) => setBookingData({ ...bookingData, patient_id: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          required
                        >
                          <option value="">Select Patient</option>
                          {patients.map((patient) => (
                            <option key={patient.id} value={patient.id}>
                              {patient.first_name} {patient.last_name} ({patient.universal_patient_id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Time *</Label>
                        <Input
                          type="time"
                          value={bookingData.appointment_time}
                          onChange={(e) => setBookingData({ ...bookingData, appointment_time: e.target.value })}
                          className="text-sm"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <select
                          value={bookingData.appointment_type}
                          onChange={(e) => setBookingData({ ...bookingData, appointment_type: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="consultation">Consultation</option>
                          <option value="follow-up">Follow-up</option>
                          <option value="checkup">Checkup</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Reason</Label>
                        <Input
                          value={bookingData.reason_for_visit}
                          onChange={(e) => setBookingData({ ...bookingData, reason_for_visit: e.target.value })}
                          placeholder="Reason for visit"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        onClick={handleBookAppointment}
                        disabled={bookingLoading}
                        className="w-full bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800"
                      >
                        {bookingLoading ? 'Booking...' : 'Book Appointment'}
                      </Button>
                    </div>
                  </div>
                )}

                {getAppointmentsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-gray-500">No appointments scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {getAppointmentsForDate(selectedDate).map((apt, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium">{apt.appointment_time || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{apt.patient_name || 'Patient'}</span>
                          {apt.status && (
                            <Badge variant="outline" className="text-xs">
                              {apt.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarWidget;

