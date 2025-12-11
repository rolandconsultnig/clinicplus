/**
 * Health Data Screen - View and manage health data from smart watch
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService';
import healthService from '../services/healthService';
import { format, subDays } from 'date-fns';

const HealthDataScreen = ({ navigation }) => {
  const [healthData, setHealthData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState('heart_rate');

  useEffect(() => {
    loadHealthData();
    loadDevices();
    initializeHealthService();
  }, []);

  const initializeHealthService = async () => {
    try {
      await healthService.initialize();
      await healthService.requestPermissions();
    } catch (error) {
      console.error('Error initializing health service:', error);
    }
  };

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        const patientId = user.patient_id || user.id;

        const [dataResult, summaryResult] = await Promise.all([
          apiService.getHealthData({
            patient_id: patientId,
            data_type: selectedDataType,
            start_date: subDays(new Date(), 7).toISOString(),
            limit: 100,
          }),
          apiService.getHealthSummary({
            days: 7,
          }),
        ]);

        if (dataResult.success) {
          setHealthData(dataResult.data_points || []);
        }
        if (summaryResult.success && summaryResult.summaries.length > 0) {
          setSummary(summaryResult.summaries[0]);
        }
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const result = await apiService.getWearableDevices();
      if (result.success) {
        setDevices(result.devices || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
    await loadDevices();
    setRefreshing(false);
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await healthService.syncHealthDataToBackend();
      if (result.success) {
        Alert.alert('Success', 'Health data synced successfully');
        await loadHealthData();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to sync health data');
    } finally {
      setSyncing(false);
    }
  };

  const getDataTypeIcon = (type) => {
    switch (type) {
      case 'heart_rate':
        return 'heart-pulse';
      case 'steps':
        return 'walk';
      case 'sleep_hours':
        return 'sleep';
      case 'blood_pressure_systolic':
      case 'blood_pressure_diastolic':
        return 'water';
      case 'blood_oxygen':
        return 'air-humidifier';
      default:
        return 'chart-line';
    }
  };

  const getDataTypeLabel = (type) => {
    switch (type) {
      case 'heart_rate':
        return 'Heart Rate';
      case 'steps':
        return 'Steps';
      case 'sleep_hours':
        return 'Sleep';
      case 'blood_pressure_systolic':
        return 'Blood Pressure (Systolic)';
      case 'blood_pressure_diastolic':
        return 'Blood Pressure (Diastolic)';
      case 'blood_oxygen':
        return 'Blood Oxygen';
      default:
        return type;
    }
  };

  const prepareChartData = () => {
    if (healthData.length === 0) return null;

    const sortedData = [...healthData].sort((a, b) => 
      new Date(a.recorded_at) - new Date(b.recorded_at)
    );

    return {
      labels: sortedData.slice(-7).map(d => format(new Date(d.recorded_at), 'MMM dd')),
      datasets: [{
        data: sortedData.slice(-7).map(d => d.value),
      }],
    };
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

  const chartData = prepareChartData();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Health Data</Text>
            <Text style={styles.subtitle}>From your smart watch</Text>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="sync" size={20} color="#fff" />
                <Text style={styles.syncButtonText}>Sync</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Devices */}
        {devices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Devices</Text>
            {devices.map((device, index) => (
              <View key={index} style={styles.deviceCard}>
                <MaterialCommunityIcons
                  name={device.device_type === 'apple_watch' ? 'watch' : 'watch-variant'}
                  size={24}
                  color="#049ebb"
                />
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.device_name || device.device_type}</Text>
                  <Text style={styles.deviceType}>{device.manufacturer} {device.model}</Text>
                  {device.last_sync_at && (
                    <Text style={styles.deviceSync}>
                      Last sync: {format(new Date(device.last_sync_at), 'MMM dd, HH:mm')}
                    </Text>
                  )}
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: device.is_active ? '#4caf50' : '#ccc' }]} />
              </View>
            ))}
          </View>
        )}

        {/* Data Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dataTypeSelector}>
            {['heart_rate', 'steps', 'sleep_hours', 'blood_oxygen'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.dataTypeButton,
                  selectedDataType === type && styles.dataTypeButtonActive,
                ]}
                onPress={() => {
                  setSelectedDataType(type);
                  loadHealthData();
                }}
              >
                <MaterialCommunityIcons
                  name={getDataTypeIcon(type)}
                  size={20}
                  color={selectedDataType === type ? '#fff' : '#049ebb'}
                />
                <Text
                  style={[
                    styles.dataTypeButtonText,
                    selectedDataType === type && styles.dataTypeButtonTextActive,
                  ]}
                >
                  {getDataTypeLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Stats */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Summary</Text>
            <View style={styles.statsGrid}>
              {summary.avg_heart_rate && (
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="heart-pulse" size={24} color="#049ebb" />
                  <Text style={styles.statValue}>{Math.round(summary.avg_heart_rate)}</Text>
                  <Text style={styles.statLabel}>Avg Heart Rate</Text>
                  <Text style={styles.statUnit}>bpm</Text>
                </View>
              )}
              {summary.total_steps && (
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="walk" size={24} color="#049ebb" />
                  <Text style={styles.statValue}>{summary.total_steps.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Steps</Text>
                </View>
              )}
              {summary.sleep_hours && (
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="sleep" size={24} color="#049ebb" />
                  <Text style={styles.statValue}>{summary.sleep_hours.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Sleep Hours</Text>
                </View>
              )}
              {summary.avg_blood_oxygen && (
                <View style={styles.statCard}>
                  <MaterialCommunityIcons name="air-humidifier" size={24} color="#049ebb" />
                  <Text style={styles.statValue}>{summary.avg_blood_oxygen.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Blood Oxygen</Text>
                  <Text style={styles.statUnit}>%</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Chart */}
        {chartData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trend</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={chartData}
                width={350}
                height={220}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(4, 158, 187, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(24, 68, 76, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>
        )}

        {/* Recent Data Points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Data</Text>
          {healthData.length > 0 ? (
            healthData.slice(0, 10).map((point, index) => (
              <View key={index} style={styles.dataPointCard}>
                <MaterialCommunityIcons
                  name={getDataTypeIcon(point.data_type)}
                  size={20}
                  color="#049ebb"
                />
                <View style={styles.dataPointInfo}>
                  <Text style={styles.dataPointValue}>
                    {point.value} {point.unit || ''}
                  </Text>
                  <Text style={styles.dataPointTime}>
                    {format(new Date(point.recorded_at), 'MMM dd, HH:mm')}
                  </Text>
                </View>
                {point.device_name && (
                  <Text style={styles.dataPointDevice}>{point.device_name}</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="chart-line" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No health data available</Text>
              <Text style={styles.emptySubtext}>
                Connect your smart watch and sync data
              </Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#049ebb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#18444c',
    marginBottom: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18444c',
  },
  deviceType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deviceSync: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dataTypeSelector: {
    marginBottom: 16,
  },
  dataTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#049ebb',
    gap: 8,
  },
  dataTypeButtonActive: {
    backgroundColor: '#049ebb',
  },
  dataTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#049ebb',
  },
  dataTypeButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
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
  statUnit: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  chartContainer: {
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  dataPointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dataPointInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dataPointValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18444c',
  },
  dataPointTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dataPointDevice: {
    fontSize: 12,
    color: '#999',
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
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});

export default HealthDataScreen;

