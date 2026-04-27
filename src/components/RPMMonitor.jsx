import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LineChart, AreaChart } from './charts';
import { Activity, AlertCircle, Heart, Droplet } from 'lucide-react';

export default function RPMMonitor({ patientId }) {
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadRPMData();
      // Set up polling for real-time updates
      const interval = setInterval(loadRPMData, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [patientId]);

  const loadRPMData = async () => {
    setLoading(true);
    try {
      const [readingsRes, alertsRes] = await Promise.all([
        apiService.request(`/rpm/readings?patient_id=${patientId}&limit=10`),
        apiService.request(`/rpm/alerts?patient_id=${patientId}&status=active`)
      ]);

      if (readingsRes.success) {
        setReadings(readingsRes.readings || []);
      }

      if (alertsRes.success) {
        setAlerts(alertsRes.alerts || []);
      }
    } catch (error) {
      console.error('Failed to load RPM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (level) => {
    switch (level) {
      case 3:
        return 'bg-red-100 border-red-300 text-red-900';
      case 2:
        return 'bg-orange-100 border-orange-300 text-orange-900';
      default:
        return 'bg-teal-100 border-teal-300 text-teal-900';
    }
  };

  const getBPStatus = (systolic, diastolic) => {
    if (!systolic || !diastolic) return { status: 'normal', color: 'text-green-600' };
    
    if (systolic >= 180 || diastolic >= 120) {
      return { status: 'Hypertensive Crisis', color: 'text-red-600' };
    } else if (systolic >= 140 || diastolic >= 90) {
      return { status: 'High', color: 'text-orange-600' };
    } else if (systolic >= 120 || diastolic >= 80) {
      return { status: 'Elevated', color: 'text-yellow-600' };
    } else {
      return { status: 'Normal', color: 'text-green-600' };
    }
  };

  const latestReading = readings[0];

  return (
    <PageWrapper
      title="Remote Patient Monitoring"
      description="Monitor patient vital signs in real-time"
      icon={Activity}
      actions={device && (
        <Badge variant={device.is_paired ? 'default' : 'secondary'} className="text-lg px-4 py-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${device.is_paired ? 'bg-green-500' : 'bg-gray-400'}`} />
          {device.is_paired ? 'Device Paired' : 'Device Not Paired'}
        </Badge>
      )}
    >

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-300 bg-red-50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-6 h-6" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map(alert => (
                <Card key={alert.id} className={`shadow-sm ${getAlertColor(alert.alert_level)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{alert.alert_message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{alert.alert_type}</Badge>
                          <Badge variant={alert.alert_level === 3 ? 'destructive' : 'secondary'}>
                            Level {alert.alert_level}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Acknowledge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Reading */}
      {latestReading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Blood Pressure</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {latestReading.systolic_bp}/{latestReading.diastolic_bp}
                  </p>
                  <Badge variant="outline" className={`mt-2 ${getBPStatus(latestReading.systolic_bp, latestReading.diastolic_bp).color}`}>
                    {getBPStatus(latestReading.systolic_bp, latestReading.diastolic_bp).status}
                  </Badge>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-teal-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Heart Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{latestReading.heart_rate}</p>
                  <p className="text-sm text-gray-600 mt-1">bpm</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-teal-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Oxygen Saturation</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{latestReading.oxygen_saturation}%</p>
                  <p className="text-sm text-gray-600 mt-1">SpO2</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <Droplet className="w-6 h-6 text-teal-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vital Signs Trends */}
      {readings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blood Pressure Trend */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Blood Pressure Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={readings.slice(0, 10).reverse().map((r, idx) => ({
                  name: `Reading ${idx + 1}`,
                  systolic: r.systolic_bp,
                  diastolic: r.diastolic_bp
                }))}
                dataKey="systolic"
                name="Systolic BP"
                color="#ef4444"
                height={250}
              />
            </CardContent>
          </Card>

          {/* Heart Rate & SpO2 Trend */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Heart Rate & Oxygen Saturation</CardTitle>
            </CardHeader>
            <CardContent>
              <AreaChart
                data={readings.slice(0, 10).reverse().map((r, idx) => ({
                  name: `Reading ${idx + 1}`,
                  heartRate: r.heart_rate,
                  oxygen: r.oxygen_saturation
                }))}
                dataKey="heartRate"
                name="Heart Rate (bpm)"
                color="#ec4899"
                height={250}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Readings */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Readings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {readings.map(reading => (
                <Card key={reading.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          BP: {reading.systolic_bp}/{reading.diastolic_bp} | 
                          HR: {reading.heart_rate} bpm | 
                          SpO2: {reading.oxygen_saturation}%
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(reading.measurement_timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={
                        reading.signal_quality === 'excellent' ? 'default' :
                        reading.signal_quality === 'good' ? 'secondary' :
                        reading.signal_quality === 'fair' ? 'outline' :
                        'destructive'
                      }>
                        {reading.signal_quality}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {readings.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No readings available</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

