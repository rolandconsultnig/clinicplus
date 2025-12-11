import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Activity,
  Heart,
  Thermometer,
  Droplet,
  Wind,
  TrendingUp,
  TrendingDown,
  Watch,
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Moon,
  Footprints,
  Flame
} from 'lucide-react'

export default function IoTVitalsPanel({ patientId }) {
  const [iotVitals, setIotVitals] = useState(null)
  const [devices, setDevices] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (patientId) {
      loadIoTVitals()
      loadDevices()
      loadAlerts()
    }
  }, [patientId])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadIoTVitals()
        loadAlerts()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, patientId])

  const loadIoTVitals = async () => {
    try {
      const response = await fetch(`/api/iot-vitals/readings/patient/${patientId}/latest`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setIotVitals(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error loading IoT vitals:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDevices = async () => {
    try {
      const response = await fetch(`/api/iot-vitals/devices/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices || [])
      }
    } catch (error) {
      console.error('Error loading devices:', error)
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await fetch(`/api/iot-vitals/alerts/patient/${patientId}?status=active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    }
  }

  const syncDevice = async (deviceId) => {
    try {
      const response = await fetch(`/api/iot-vitals/devices/${deviceId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        loadIoTVitals()
        loadDevices()
      }
    } catch (error) {
      console.error('Error syncing device:', error)
    }
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/iot-vitals/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Loading vitals...</p>
        </CardContent>
      </Card>
    )
  }

  const mostRecent = iotVitals?.most_recent

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center text-red-800">
              <AlertTriangle className="w-4 h-4 mr-2" />
              VITAL ALERTS ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {alerts.slice(0, 3).map((alert, idx) => (
              <div key={idx} className="flex items-start justify-between p-2 bg-white rounded border border-red-200">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-red-900">{alert.alert_message}</p>
                  <p className="text-xs text-red-700">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => acknowledgeAlert(alert.alert_id)}
                  className="text-xs"
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Vitals Display */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Real-Time Vitals
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={autoRefresh ? "default" : "outline"} className="text-xs">
                {autoRefresh ? <Zap className="w-3 h-3 mr-1" /> : null}
                {autoRefresh ? 'Live' : 'Paused'}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  loadIoTVitals()
                  loadAlerts()
                }}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {lastUpdate && (
            <CardDescription className="text-xs">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="current">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Current Vitals Tab */}
            <TabsContent value="current" className="space-y-3 mt-3">
              {mostRecent ? (
                <>
                  {/* Cardiovascular */}
                  {(mostRecent.systolic_bp || mostRecent.heart_rate) && (
                    <div className="grid grid-cols-2 gap-3">
                      {mostRecent.systolic_bp && (
                        <VitalCard
                          icon={<Heart className="w-5 h-5 text-red-500" />}
                          label="Blood Pressure"
                          value={`${mostRecent.systolic_bp}/${mostRecent.diastolic_bp}`}
                          unit="mmHg"
                          source={getDeviceType(mostRecent.device_id, devices)}
                          timestamp={mostRecent.reading_timestamp}
                          isAbnormal={mostRecent.is_abnormal}
                        />
                      )}
                      {mostRecent.heart_rate && (
                        <VitalCard
                          icon={<Activity className="w-5 h-5 text-pink-500" />}
                          label="Heart Rate"
                          value={mostRecent.heart_rate}
                          unit="bpm"
                          source={getDeviceType(mostRecent.device_id, devices)}
                          timestamp={mostRecent.reading_timestamp}
                          isAbnormal={mostRecent.is_abnormal}
                        />
                      )}
                    </div>
                  )}

                  {/* Respiratory */}
                  {(mostRecent.oxygen_saturation || mostRecent.respiratory_rate) && (
                    <div className="grid grid-cols-2 gap-3">
                      {mostRecent.oxygen_saturation && (
                        <VitalCard
                          icon={<Wind className="w-5 h-5 text-blue-500" />}
                          label="SpO2"
                          value={mostRecent.oxygen_saturation}
                          unit="%"
                          source={getDeviceType(mostRecent.device_id, devices)}
                          timestamp={mostRecent.reading_timestamp}
                          isAbnormal={mostRecent.is_abnormal}
                        />
                      )}
                      {mostRecent.respiratory_rate && (
                        <VitalCard
                          icon={<Wind className="w-5 h-5 text-cyan-500" />}
                          label="Resp Rate"
                          value={mostRecent.respiratory_rate}
                          unit="bpm"
                          source={getDeviceType(mostRecent.device_id, devices)}
                          timestamp={mostRecent.reading_timestamp}
                        />
                      )}
                    </div>
                  )}

                  {/* Temperature & Glucose */}
                  {(mostRecent.temperature || mostRecent.blood_glucose) && (
                    <div className="grid grid-cols-2 gap-3">
                      {mostRecent.temperature && (
                        <VitalCard
                          icon={<Thermometer className="w-5 h-5 text-orange-500" />}
                          label="Temperature"
                          value={mostRecent.temperature}
                          unit={`°${mostRecent.temperature_unit}`}
                          source={getDeviceType(mostRecent.device_id, devices)}
                          timestamp={mostRecent.reading_timestamp}
                        />
                      )}
                      {mostRecent.blood_glucose && (
                        <VitalCard
                          icon={<Droplet className="w-5 h-5 text-purple-500" />}
                          label="Glucose"
                          value={mostRecent.blood_glucose}
                          unit="mg/dL"
                          context={mostRecent.glucose_context}
                          source={getDeviceType(mostRecent.device_id, devices)}
                          timestamp={mostRecent.reading_timestamp}
                          isAbnormal={mostRecent.is_abnormal}
                        />
                      )}
                    </div>
                  )}

                  {/* Weight & BMI */}
                  {(mostRecent.weight || mostRecent.bmi) && (
                    <div className="grid grid-cols-2 gap-3">
                      {mostRecent.weight && (
                        <VitalCard
                          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
                          label="Weight"
                          value={mostRecent.weight}
                          unit={mostRecent.weight_unit}
                          source={getDeviceType(mostRecent.device_id, devices)}
                          timestamp={mostRecent.reading_timestamp}
                        />
                      )}
                      {mostRecent.bmi && (
                        <VitalCard
                          icon={<TrendingUp className="w-5 h-5 text-teal-500" />}
                          label="BMI"
                          value={mostRecent.bmi}
                          unit=""
                          source="Calculated"
                          timestamp={mostRecent.reading_timestamp}
                        />
                      )}
                    </div>
                  )}

                  {/* Data Quality Indicator */}
                  {mostRecent.data_quality && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <span className="text-gray-600">Data Quality:</span>
                      <Badge variant={mostRecent.data_quality === 'good' ? 'default' : 'outline'}>
                        {mostRecent.data_quality}
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent vitals data</p>
              )}
            </TabsContent>

            {/* Devices Tab */}
            <TabsContent value="devices" className="space-y-2 mt-3">
              {devices.length > 0 ? (
                devices.map((device, idx) => (
                  <DeviceCard
                    key={idx}
                    device={device}
                    onSync={() => syncDevice(device.device_id)}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No devices registered</p>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-3 mt-3">
              {mostRecent && (mostRecent.steps || mostRecent.sleep_duration) ? (
                <>
                  {mostRecent.steps && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Footprints className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold">Steps</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {mostRecent.steps.toLocaleString()}
                        </span>
                      </div>
                      {mostRecent.distance && (
                        <p className="text-sm text-gray-600 mt-1">
                          Distance: {mostRecent.distance} miles
                        </p>
                      )}
                      {mostRecent.calories_burned && (
                        <p className="text-sm text-gray-600">
                          Calories: {mostRecent.calories_burned} kcal
                        </p>
                      )}
                    </div>
                  )}

                  {mostRecent.sleep_duration && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Moon className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold">Sleep</span>
                        </div>
                        <span className="text-2xl font-bold text-purple-600">
                          {Math.floor(mostRecent.sleep_duration / 60)}h {mostRecent.sleep_duration % 60}m
                        </span>
                      </div>
                      {mostRecent.sleep_quality_score && (
                        <p className="text-sm text-gray-600 mt-1">
                          Quality Score: {mostRecent.sleep_quality_score}/100
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        {mostRecent.deep_sleep_minutes && (
                          <div>
                            <span className="text-gray-600">Deep:</span>
                            <span className="font-semibold ml-1">{mostRecent.deep_sleep_minutes}m</span>
                          </div>
                        )}
                        {mostRecent.rem_sleep_minutes && (
                          <div>
                            <span className="text-gray-600">REM:</span>
                            <span className="font-semibold ml-1">{mostRecent.rem_sleep_minutes}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {mostRecent.active_minutes && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Flame className="w-5 h-5 text-green-600" />
                          <span className="font-semibold">Active Minutes</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                          {mostRecent.active_minutes}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No activity data</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Vital Card Component
function VitalCard({ icon, label, value, unit, source, timestamp, context, isAbnormal }) {
  return (
    <div className={`p-3 rounded-lg border ${isAbnormal ? 'border-red-300 bg-red-50' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-xs font-medium text-gray-700">{label}</span>
        </div>
        {isAbnormal && <AlertTriangle className="w-4 h-4 text-red-600" />}
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm text-gray-600">{unit}</span>
      </div>
      {context && (
        <p className="text-xs text-gray-600 mt-1 capitalize">{context.replace('_', ' ')}</p>
      )}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span className="flex items-center">
          <Watch className="w-3 h-3 mr-1" />
          {source || 'Device'}
        </span>
        {timestamp && (
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}

// Device Card Component
function DeviceCard({ device, onSync }) {
  const getDeviceIcon = (type) => {
    switch (type) {
      case 'smartwatch':
        return <Watch className="w-5 h-5" />
      case 'bp_monitor':
        return <Heart className="w-5 h-5" />
      case 'pulse_oximeter':
        return <Activity className="w-5 h-5" />
      case 'glucose_meter':
        return <Droplet className="w-5 h-5" />
      case 'thermometer':
        return <Thermometer className="w-5 h-5" />
      case 'weight_scale':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Smartphone className="w-5 h-5" />
    }
  }

  return (
    <div className="p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded">
            {getDeviceIcon(device.device_type)}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {device.device_manufacturer} {device.device_model}
            </p>
            <p className="text-xs text-gray-600 capitalize">
              {device.device_type.replace('_', ' ')}
            </p>
            {device.last_sync && (
              <p className="text-xs text-gray-500 mt-1">
                Last sync: {new Date(device.last_sync).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <div className="flex items-center space-x-1">
            {device.is_active ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" />
            )}
            {device.battery_level && (
              <div className="flex items-center">
                {device.battery_level < 20 ? (
                  <BatteryLow className="w-4 h-4 text-red-600" />
                ) : (
                  <Battery className="w-4 h-4 text-green-600" />
                )}
                <span className="text-xs ml-1">{device.battery_level}%</span>
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onSync} className="text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Sync
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper function
function getDeviceType(deviceId, devices) {
  const device = devices.find(d => d.device_id === deviceId)
  if (!device) return 'Device'
  return `${device.device_manufacturer || ''} ${device.device_type.replace('_', ' ')}`.trim()
}
