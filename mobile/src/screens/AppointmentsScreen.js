/**
 * Appointments Screen - View and manage appointments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService';
import { format } from 'date-fns';

const AppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        const patientId = user.patient_id || user.id;
        
        const result = await apiService.getAppointments(patientId);
        if (result.success) {
          setAppointments(result.appointments || []);
        }
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const getMarkedDates = () => {
    const marked = {};
    appointments.forEach(apt => {
      const date = apt.appointment_date?.split('T')[0];
      if (date) {
        marked[date] = {
          marked: true,
          dotColor: apt.status === 'scheduled' ? '#049ebb' : '#999',
        };
      }
    });
    return marked;
  };

  const getAppointmentsForDate = (date) => {
    return appointments.filter(apt => {
      const aptDate = apt.appointment_date?.split('T')[0];
      return aptDate === date;
    });
  };

  const AppointmentCard = ({ appointment }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('AppointmentDetail', { appointment })}
    >
      <View style={styles.appointmentHeader}>
        <MaterialCommunityIcons name="clock-outline" size={20} color="#049ebb" />
        <Text style={styles.appointmentTime}>
          {appointment.appointment_time || 'Time TBD'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>{appointment.status}</Text>
        </View>
      </View>
      <Text style={styles.appointmentProvider}>
        {appointment.provider_name || 'Provider'}
      </Text>
      {appointment.facility_name && (
        <Text style={styles.appointmentFacility}>{appointment.facility_name}</Text>
      )}
      {appointment.reason && (
        <Text style={styles.appointmentReason}>{appointment.reason}</Text>
      )}
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#049ebb';
      case 'completed':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#999';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#049ebb" />
        </View>
      </SafeAreaView>
    );
  }

  const dayAppointments = getAppointmentsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Appointments</Text>
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => Alert.alert('New Appointment', 'Feature coming soon')}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={getMarkedDates()}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            theme={{
              selectedDayBackgroundColor: '#049ebb',
              selectedDayTextColor: '#fff',
              todayTextColor: '#049ebb',
              arrowColor: '#049ebb',
            }}
          />
        </View>

        <View style={styles.appointmentsSection}>
          <Text style={styles.sectionTitle}>
            {format(new Date(selectedDate), 'MMMM dd, yyyy')}
          </Text>
          {dayAppointments.length > 0 ? (
            dayAppointments.map((apt, index) => (
              <AppointmentCard key={index} appointment={apt} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No appointments on this date</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18444c',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#049ebb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#18444c',
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  appointmentTime: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#18444c',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  appointmentProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18444c',
    marginBottom: 4,
  },
  appointmentFacility: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default AppointmentsScreen;

