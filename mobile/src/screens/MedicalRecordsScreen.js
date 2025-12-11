/**
 * Medical Records Screen - View patient medical records
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

const MedicalRecordsScreen = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        const patientId = user.patient_id || user.id;
        
        const result = await apiService.getPatientRecords(patientId);
        if (result.success) {
          setRecords(result.records || []);
        }
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const RecordCard = ({ record }) => (
    <TouchableOpacity
      style={styles.recordCard}
      onPress={() => navigation.navigate('RecordDetail', { record })}
    >
      <View style={styles.recordHeader}>
        <MaterialCommunityIcons
          name={getRecordIcon(record.type)}
          size={24}
          color="#049ebb"
        />
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{record.title || record.type}</Text>
          <Text style={styles.recordDate}>
            {record.date ? format(new Date(record.date), 'MMM dd, yyyy') : 'No date'}
          </Text>
        </View>
      </View>
      {record.provider_name && (
        <Text style={styles.recordProvider}>Provider: {record.provider_name}</Text>
      )}
    </TouchableOpacity>
  );

  const getRecordIcon = (type) => {
    switch (type) {
      case 'encounter':
        return 'stethoscope';
      case 'lab':
        return 'test-tube';
      case 'prescription':
        return 'pill';
      case 'document':
        return 'file-document';
      default:
        return 'file-document-outline';
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
          <Text style={styles.title}>Medical Records</Text>
          <Text style={styles.subtitle}>Your complete medical history</Text>
        </View>

        {records.length > 0 ? (
          <View style={styles.recordsList}>
            {records.map((record, index) => (
              <RecordCard key={index} record={record} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No medical records found</Text>
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
  recordsList: {
    padding: 16,
  },
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18444c',
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recordProvider: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default MedicalRecordsScreen;

