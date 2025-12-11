/**
 * Lab Results Screen - View lab test results
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

const LabResultsScreen = ({ navigation }) => {
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLabResults();
  }, []);

  const loadLabResults = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        const patientId = user.patient_id || user.id;
        
        const result = await apiService.getLabResults(patientId);
        if (result.success) {
          setLabResults(result.lab_results || []);
        }
      }
    } catch (error) {
      console.error('Error loading lab results:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLabResults();
    setRefreshing(false);
  };

  const LabResultCard = ({ result }) => (
    <TouchableOpacity style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <MaterialCommunityIcons name="test-tube" size={24} color="#049ebb" />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTest}>{result.test_name || 'Lab Test'}</Text>
          <Text style={styles.resultDate}>
            {result.result_date ? format(new Date(result.result_date), 'MMM dd, yyyy') : 'No date'}
          </Text>
        </View>
        {result.status && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
            <Text style={styles.statusText}>{result.status}</Text>
          </View>
        )}
      </View>
      {result.value && (
        <View style={styles.resultValue}>
          <Text style={styles.valueText}>
            {result.value} {result.unit || ''}
          </Text>
          {result.reference_range && (
            <Text style={styles.referenceRange}>
              Normal: {result.reference_range}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal':
        return '#4caf50';
      case 'abnormal':
        return '#f44336';
      case 'critical':
        return '#d32f2f';
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
          <Text style={styles.title}>Lab Results</Text>
          <Text style={styles.subtitle}>Your test results</Text>
        </View>

        {labResults.length > 0 ? (
          <View style={styles.resultsList}>
            {labResults.map((result, index) => (
              <LabResultCard key={index} result={result} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="test-tube" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No lab results found</Text>
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
  resultsList: {
    padding: 16,
  },
  resultCard: {
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
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTest: {
    fontSize: 18,
    fontWeight: '600',
    color: '#18444c',
  },
  resultDate: {
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
  resultValue: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  valueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18444c',
  },
  referenceRange: {
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

export default LabResultsScreen;

