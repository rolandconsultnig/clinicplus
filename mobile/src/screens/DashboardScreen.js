/**
 * Dashboard Screen - Main home screen for patients
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService';

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    activePrescriptions: 0,
    pendingLabResults: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const userObj = JSON.parse(userData);
        setUser(userObj);

        // Load stats
        const [appointmentsRes, prescriptionsRes, messagesRes] = await Promise.allSettled([
          apiService.getAppointments(userObj.patient_id || userObj.id),
          apiService.getPrescriptions(userObj.patient_id || userObj.id),
          apiService.getMessages(),
        ]);

        const appointments = appointmentsRes.status === 'fulfilled' && appointmentsRes.value.success
          ? appointmentsRes.value.appointments || []
          : [];
        const prescriptions = prescriptionsRes.status === 'fulfilled' && prescriptionsRes.value.success
          ? prescriptionsRes.value.prescriptions || []
          : [];
        const messages = messagesRes.status === 'fulfilled' && messagesRes.value.success
          ? messagesRes.value.messages || []
          : [];

        setStats({
          upcomingAppointments: appointments.filter(a => {
            const apptDate = new Date(a.appointment_date);
            return apptDate > new Date();
          }).length,
          activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
          pendingLabResults: 0, // TODO: Implement lab results count
          unreadMessages: messages.filter(m => !m.is_read).length,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const QuickActionCard = ({ icon, title, subtitle, onPress, badge }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <MaterialCommunityIcons name={icon} size={32} color="#049ebb" />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#049ebb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.username || 'Patient'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <MaterialCommunityIcons name="account-circle" size={40} color="#049ebb" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color="#049ebb" />
            <Text style={styles.statValue}>{stats.upcomingAppointments}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="pill" size={24} color="#049ebb" />
            <Text style={styles.statValue}>{stats.activePrescriptions}</Text>
            <Text style={styles.statLabel}>Prescriptions</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="test-tube" size={24} color="#049ebb" />
            <Text style={styles.statValue}>{stats.pendingLabResults}</Text>
            <Text style={styles.statLabel}>Lab Results</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="message-text" size={24} color="#049ebb" />
            <Text style={styles.statValue}>{stats.unreadMessages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon="file-document"
              title="Medical Records"
              subtitle="View your records"
              onPress={() => navigation.navigate('Records')}
            />
            <QuickActionCard
              icon="calendar"
              title="Appointments"
              subtitle="Manage appointments"
              onPress={() => navigation.navigate('Appointments')}
              badge={stats.upcomingAppointments}
            />
            <QuickActionCard
              icon="pill"
              title="Prescriptions"
              subtitle="View medications"
              onPress={() => navigation.navigate('Prescriptions')}
              badge={stats.activePrescriptions}
            />
            <QuickActionCard
              icon="test-tube"
              title="Lab Results"
              subtitle="View test results"
              onPress={() => navigation.navigate('LabResults')}
            />
            <QuickActionCard
              icon="message-text"
              title="Messages"
              subtitle="Contact providers"
              onPress={() => navigation.navigate('Messages')}
              badge={stats.unreadMessages}
            />
            <QuickActionCard
              icon="account"
              title="Profile"
              subtitle="Manage profile"
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>No recent activity</Text>
          </View>
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
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#18444c',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#18444c',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18444c',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    position: 'relative',
    marginBottom: 12,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18444c',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  activityText: {
    color: '#666',
    fontSize: 14,
  },
});

export default DashboardScreen;

