/**
 * Prescriptions Screen - View patient prescriptions
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
import { format } from 'date-fns';

const PrescriptionsScreen = ({ navigation }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        const patientId = user.patient_id || user.id;
        
        const result = await apiService.getPrescriptions(patientId);
        if (result.success) {
          setPrescriptions(result.prescriptions || []);
        }
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const PrescriptionCard = ({ prescription }) => (
    <TouchableOpacity
      style={styles.prescriptionCard}
      onPress={() => navigation.navigate('PrescriptionDetail', { prescription })}
    >
      <View style={styles.prescriptionHeader}>
        <MaterialCommunityIcons name="pill" size={24} color="#049ebb" />
        <View style={styles.prescriptionInfo}>
          <Text style={styles.prescriptionDrug}>{prescription.drug_name || 'Unknown Drug'}</Text>
          <Text style={styles.prescriptionProvider}>{prescription.provider_name || 'Provider'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prescription.status) }]}>
          <Text style={styles.statusText}>{prescription.status}</Text>
        </View>
      </View>
      <View style={styles.prescriptionDetails}>
        <Text style={styles.prescriptionDosage}>
          {prescription.dosage} {prescription.frequency}
        </Text>
        {prescription.start_date && (
          <Text style={styles.prescriptionDate}>
            Started: {format(new Date(prescription.start_date), 'MMM dd, yyyy')}
          </Text>
        )}
        {prescription.refills_remaining !== undefined && (
          <Text style={styles.prescriptionRefills}>
            Refills remaining: {prescription.refills_remaining}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4caf50';
      case 'completed':
        return '#999';
      case 'cancelled':
        return '#f44336';
      default:
        return '#049ebb';
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Prescriptions</Text>
          <Text style={styles.subtitle}>Your current medications</Text>
        </View>

        {prescriptions.length > 0 ? (
          <View style={styles.prescriptionsList}>
            {prescriptions.map((prescription, index) => (
              <PrescriptionCard key={index} prescription={prescription} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="pill" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No prescriptions found</Text>
          </View>
        )}
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
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18444c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  prescriptionsList: {
    padding: 16,
  },
  prescriptionCard: {
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
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  prescriptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prescriptionDrug: {
    fontSize: 18,
    fontWeight: '600',
    color: '#18444c',
  },
  prescriptionProvider: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  prescriptionDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  prescriptionDosage: {
    fontSize: 14,
    color: '#18444c',
    marginBottom: 4,
  },
  prescriptionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  prescriptionRefills: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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

export default PrescriptionsScreen;

