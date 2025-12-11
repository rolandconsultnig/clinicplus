import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BarChart, LineChart } from './charts';
import { Calendar, Clock, User, Plus } from 'lucide-react';

export default function SchedulingCalendar({ facilityId, providerId }) {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appointmentStats, setAppointmentStats] = useState([]);

  useEffect(() => {
    loadAppointments();
  }, [selectedDate, facilityId, providerId]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const startDate = selectedDate.toISOString().split('T')[0];
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      const result = await apiService.request(`/scheduling/appointments?start_date=${startDate}&end_date=${endDateStr}&facility_id=${facilityId}${providerId ? `&provider_id=${providerId}` : ''}`);
      
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                              'border-blue-400 bg-blue-50'
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
    </PageWrapper>
  );
}

