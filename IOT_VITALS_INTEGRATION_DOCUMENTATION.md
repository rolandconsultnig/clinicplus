# IoT Vitals Integration - Complete Documentation

## Overview
A comprehensive Remote Patient Monitoring (RPM) system that integrates vitals data from IoT devices, smartwatches, and other remote monitoring devices directly into the Doctor's Consultation Page. This enables real-time patient monitoring and automated alert generation for abnormal vital signs.

## Supported Device Types

### 1. Smartwatches & Wearables
- **Apple Watch** - Heart rate, ECG, blood oxygen, activity, sleep
- **Fitbit** - Heart rate, steps, sleep, calories
- **Samsung Galaxy Watch** - Heart rate, blood pressure, ECG, SpO2
- **Garmin** - Heart rate, activity, sleep, stress
- **Withings** - Heart rate, ECG, blood pressure

### 2. Medical IoT Devices
- **Blood Pressure Monitors** - Omron, Welch Allyn
- **Pulse Oximeters** - Nonin, Masimo
- **Glucose Meters** - OneTouch, Freestyle Libre, Dexcom CGM
- **Smart Thermometers** - Kinsa, Withings
- **Smart Scales** - Withings, Fitbit Aria
- **ECG Monitors** - AliveCor KardiaMobile

### 3. Connection Methods
- **Bluetooth** - Direct device pairing
- **Wi-Fi** - Cloud-connected devices
- **Cellular** - LTE-enabled devices
- **API Integration** - Cloud service APIs (Apple HealthKit, Google Fit, Fitbit API)

## Architecture

### Data Flow
```
IoT Device/Smartwatch
        ↓
   (Bluetooth/WiFi/API)
        ↓
Device Registration System
        ↓
Data Ingestion Endpoint
        ↓
Threshold Checking & Alert Generation
        ↓
Database Storage (IoTVitalReading)
        ↓
Real-time Display on Doctor's Page
```

## Database Models

### 1. DeviceRegistration
**Purpose**: Track all registered IoT devices for patients

**Fields**:
- `device_id` - Unique device identifier
- `patient_id` - Associated patient
- `device_type` - smartwatch, bp_monitor, pulse_oximeter, glucose_meter, weight_scale, ecg_monitor, thermometer
- `device_manufacturer` - Apple, Fitbit, Omron, etc.
- `device_model` - Specific model name
- `connection_type` - bluetooth, wifi, cellular, api
- `api_endpoint` - For cloud-connected devices
- `is_active` - Device status
- `last_sync` - Last synchronization timestamp
- `battery_level` - Device battery percentage
- `signal_strength` - Wireless signal strength

**Table**: `device_registrations`

### 2. IoTVitalReading
**Purpose**: Store all vital sign readings from IoT devices

**Vital Categories**:

#### Cardiovascular
- `systolic_bp` - Systolic blood pressure (mmHg)
- `diastolic_bp` - Diastolic blood pressure (mmHg)
- `heart_rate` - Heart rate (bpm)
- `heart_rate_variability` - HRV (ms)

#### Respiratory
- `respiratory_rate` - Breaths per minute
- `oxygen_saturation` - SpO2 percentage

#### Temperature
- `temperature` - Body temperature
- `temperature_unit` - F or C
- `temperature_location` - oral, axillary, tympanic, temporal

#### Body Composition
- `weight` - Body weight (lbs or kg)
- `height` - Height (inches or cm)
- `bmi` - Body Mass Index
- `body_fat_percentage` - Body fat %
- `muscle_mass` - Muscle mass

#### Glucose
- `blood_glucose` - Blood glucose (mg/dL)
- `glucose_context` - fasting, post_meal, random

#### Activity (from smartwatches)
- `steps` - Daily step count
- `distance` - Distance traveled (miles/km)
- `calories_burned` - Calories burned
- `active_minutes` - Active minutes

#### Sleep (from smartwatches)
- `sleep_duration` - Total sleep (minutes)
- `sleep_quality_score` - Quality score (0-100)
- `deep_sleep_minutes` - Deep sleep duration
- `rem_sleep_minutes` - REM sleep duration

#### ECG/EKG
- `ecg_rhythm` - normal, afib, inconclusive
- `ecg_file_path` - Path to ECG waveform data

**Metadata**:
- `reading_timestamp` - When reading was taken
- `received_timestamp` - When received by system
- `data_source` - device, manual, api, integration
- `data_quality` - good, fair, poor
- `confidence_score` - 0-1
- `is_abnormal` - Boolean flag
- `alert_triggered` - Boolean flag

**Table**: `iot_vital_readings`

### 3. VitalAlert
**Purpose**: Track alerts generated from abnormal vital readings

**Fields**:
- `alert_id` - Unique alert identifier
- `patient_id` - Associated patient
- `reading_id` - Associated vital reading
- `alert_type` - critical, warning, info
- `alert_category` - bp_high, bp_low, hr_high, hr_low, spo2_low, glucose_high, glucose_low, temp_high
- `alert_message` - Human-readable message
- `severity` - critical, high, medium, low
- `vital_type` - Type of vital that triggered alert
- `vital_value` - Actual value
- `threshold_value` - Threshold that was exceeded
- `status` - active, acknowledged, resolved, dismissed
- `acknowledged_by` - User who acknowledged
- `notification_sent` - Boolean
- `notification_method` - sms, email, push, call

**Table**: `vital_alerts`

### 4. DeviceSyncLog
**Purpose**: Log all device synchronization events

**Fields**:
- `device_id` - Device identifier
- `sync_timestamp` - When sync occurred
- `sync_type` - automatic, manual, scheduled
- `sync_status` - success, failed, partial
- `readings_synced` - Number of readings synced
- `error_message` - Error details if failed

**Table**: `device_sync_logs`

## API Endpoints

### Base URL: `/api/iot-vitals`

### Device Management

#### Register Device
```http
POST /devices/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "device_id": "DEV-APPLE-WATCH-001",
  "patient_id": 123,
  "device_type": "smartwatch",
  "device_manufacturer": "Apple",
  "device_model": "Apple Watch Series 8",
  "connection_type": "api",
  "api_endpoint": "https://api.apple.com/healthkit"
}

Response: 201 Created
{
  "success": true,
  "message": "Device registered successfully",
  "device": { ... }
}
```

#### Get Patient Devices
```http
GET /devices/patient/{patient_id}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "devices": [
    {
      "device_id": "DEV-APPLE-WATCH-001",
      "device_type": "smartwatch",
      "device_manufacturer": "Apple",
      "is_active": true,
      "last_sync": "2024-12-02T00:15:00Z",
      "battery_level": 85
    }
  ]
}
```

#### Sync Device
```http
POST /devices/{device_id}/sync
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "message": "Device sync initiated",
  "last_sync": "2024-12-02T00:20:00Z"
}
```

### Data Ingestion

#### Ingest Vital Reading
```http
POST /readings/ingest
X-API-Key: {device_api_key}
X-Device-ID: {device_id}
Content-Type: application/json

{
  "timestamp": "2024-12-02T00:15:30Z",
  "data_source": "device",
  "heart_rate": 72,
  "systolic_bp": 120,
  "diastolic_bp": 80,
  "oxygen_saturation": 98,
  "temperature": 98.6,
  "temperature_unit": "F",
  "steps": 8543,
  "calories_burned": 2100,
  "sleep_duration": 420,
  "battery_level": 85,
  "signal_strength": 90
}

Response: 201 Created
{
  "success": true,
  "message": "Vital reading recorded",
  "reading_id": "READ-ABC123",
  "alerts": [
    {
      "alert_type": "warning",
      "alert_message": "Elevated heart rate: 120 bpm"
    }
  ]
}
```

### Data Retrieval

#### Get Latest Vitals
```http
GET /readings/patient/{patient_id}/latest
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "latest_by_device": {
    "smartwatch": {
      "heart_rate": 72,
      "steps": 8543,
      "reading_timestamp": "2024-12-02T00:15:30Z"
    },
    "bp_monitor": {
      "systolic_bp": 120,
      "diastolic_bp": 80,
      "reading_timestamp": "2024-12-02T08:00:00Z"
    }
  },
  "most_recent": { ... }
}
```

#### Get Vitals History
```http
GET /readings/patient/{patient_id}/history?days=7&device_type=smartwatch&vital_type=heart_rate
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "count": 150,
  "readings": [
    {
      "reading_id": "READ-ABC123",
      "heart_rate": 72,
      "reading_timestamp": "2024-12-02T00:15:30Z",
      "device_id": "DEV-APPLE-WATCH-001"
    }
  ]
}
```

#### Get Vital Trends
```http
GET /trends/patient/{patient_id}?vital_type=heart_rate&days=7
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "vital_type": "heart_rate",
  "period_days": 7,
  "data": [
    {
      "timestamp": "2024-12-01T08:00:00Z",
      "value": 68,
      "unit": "bpm",
      "device_id": "DEV-APPLE-WATCH-001"
    }
  ],
  "statistics": {
    "min": 58,
    "max": 95,
    "avg": 72.5,
    "count": 150
  }
}
```

### Alert Management

#### Get Patient Alerts
```http
GET /alerts/patient/{patient_id}?status=active
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "count": 2,
  "alerts": [
    {
      "alert_id": "ALERT-XYZ789",
      "alert_type": "critical",
      "alert_category": "spo2_low",
      "alert_message": "Low oxygen saturation: 88%",
      "severity": "critical",
      "vital_value": "88",
      "threshold_value": "90",
      "status": "active",
      "created_at": "2024-12-02T00:15:30Z"
    }
  ]
}
```

#### Acknowledge Alert
```http
POST /alerts/{alert_id}/acknowledge
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "message": "Alert acknowledged"
}
```

## Frontend Components

### IoTVitalsPanel Component

**Location**: `src/components/IoTVitalsPanel.jsx`

**Features**:
1. **Real-time Display** - Auto-refreshes every 30 seconds
2. **Multi-tab Interface**:
   - **Current** - Latest vital signs from all devices
   - **Devices** - Registered device list with sync status
   - **Activity** - Steps, sleep, calories from smartwatches

3. **Visual Indicators**:
   - Color-coded vital cards
   - Abnormal value highlighting (red border)
   - Device icons (watch, heart, thermometer, etc.)
   - Battery and signal strength indicators
   - Live/Paused badge

4. **Alert Display**:
   - Critical alerts at top
   - Acknowledge button
   - Alert count badge

5. **Device Management**:
   - Device status (active/inactive)
   - Last sync time
   - Manual sync button
   - Battery level display
   - Connection status (WiFi icon)

**Props**:
```jsx
<IoTVitalsPanel patientId={123} />
```

**Usage in Doctor's Page**:
```jsx
// In PatientOverviewPanel
<IoTVitalsPanel patientId={patient.id} />
```

## Alert Thresholds

### Automatic Alert Generation

The system automatically checks vital readings against thresholds and generates alerts:

#### Blood Pressure
- **Critical High**: Systolic ≥ 180 or Diastolic ≥ 120
- **Warning Low**: Systolic < 90 or Diastolic < 60

#### Heart Rate
- **Warning High**: > 120 bpm
- **Warning Low**: < 50 bpm

#### Oxygen Saturation
- **Critical Low**: < 90%

#### Blood Glucose
- **Warning High**: > 250 mg/dL
- **Critical Low**: < 70 mg/dL

#### Temperature
- **Warning High**: ≥ 103°F

### Alert Severity Levels
- **Critical** - Requires immediate attention
- **High** - Urgent but not life-threatening
- **Medium** - Should be reviewed soon
- **Low** - Informational

## Integration Examples

### Apple HealthKit Integration

```javascript
// Example: Sync Apple Watch data
async function syncAppleHealthData(patientId, healthData) {
  const response = await fetch('/api/iot-vitals/readings/ingest', {
    method: 'POST',
    headers: {
      'X-API-Key': APPLE_HEALTH_API_KEY,
      'X-Device-ID': 'DEV-APPLE-WATCH-001',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timestamp: healthData.timestamp,
      heart_rate: healthData.heartRate,
      steps: healthData.steps,
      calories_burned: healthData.calories,
      sleep_duration: healthData.sleepMinutes,
      oxygen_saturation: healthData.bloodOxygen
    })
  })
  return response.json()
}
```

### Fitbit API Integration

```python
# Example: Fetch and sync Fitbit data
import requests

def sync_fitbit_data(patient_id, fitbit_user_id, access_token):
    # Get heart rate data
    hr_response = requests.get(
        f'https://api.fitbit.com/1/user/{fitbit_user_id}/activities/heart/date/today/1d.json',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    # Get activity data
    activity_response = requests.get(
        f'https://api.fitbit.com/1/user/{fitbit_user_id}/activities/date/today.json',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    # Ingest data
    ingest_vital_reading({
        'patient_id': patient_id,
        'device_id': f'DEV-FITBIT-{fitbit_user_id}',
        'heart_rate': hr_response.json()['activities-heart'][0]['value']['restingHeartRate'],
        'steps': activity_response.json()['summary']['steps'],
        'calories_burned': activity_response.json()['summary']['caloriesOut']
    })
```

### Bluetooth Device Integration

```javascript
// Example: Connect to Bluetooth blood pressure monitor
async function connectBluetoothBPMonitor() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['blood_pressure'] }]
    })
    
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService('blood_pressure')
    const characteristic = await service.getCharacteristic('blood_pressure_measurement')
    
    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value
      const systolic = value.getUint16(1, true)
      const diastolic = value.getUint16(3, true)
      
      // Send to server
      ingestVitalReading({
        systolic_bp: systolic,
        diastolic_bp: diastolic,
        device_id: device.id
      })
    })
    
    await characteristic.startNotifications()
  } catch (error) {
    console.error('Bluetooth connection failed:', error)
  }
}
```

## Security Considerations

### Data Protection
1. **Encryption**:
   - API keys encrypted in database
   - TLS/SSL for all data transmission
   - End-to-end encryption for sensitive vitals

2. **Authentication**:
   - Device API key authentication
   - JWT tokens for user access
   - Role-based access control

3. **Privacy**:
   - HIPAA compliance
   - Patient consent for device data
   - Data retention policies
   - Audit logging

### Access Control
- Only authorized healthcare providers can view vitals
- Patients can control which devices share data
- Device registration requires authentication

## Performance Optimization

### Real-time Updates
- WebSocket support (future enhancement)
- Polling interval: 30 seconds (configurable)
- Efficient database queries with indexes

### Data Management
- Automatic data aggregation for trends
- Archival of old readings
- Pagination for large datasets

## Testing

### Device Registration Test
```bash
curl -X POST http://localhost:5000/api/iot-vitals/devices/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "device_type": "smartwatch",
    "device_manufacturer": "Apple",
    "device_model": "Apple Watch Series 8"
  }'
```

### Vital Ingestion Test
```bash
curl -X POST http://localhost:5000/api/iot-vitals/readings/ingest \
  -H "X-API-Key: test_api_key" \
  -H "X-Device-ID: DEV-TEST-001" \
  -H "Content-Type: application/json" \
  -d '{
    "heart_rate": 72,
    "systolic_bp": 120,
    "diastolic_bp": 80,
    "oxygen_saturation": 98
  }'
```

## Future Enhancements

### Planned Features
1. **WebSocket Real-time Updates** - Push notifications for new readings
2. **Predictive Analytics** - ML models for trend prediction
3. **Voice Alerts** - Audio alerts for critical values
4. **Mobile App** - Companion app for patients
5. **Telemedicine Integration** - Share vitals during video calls
6. **Medication Correlation** - Link vitals to medication adherence
7. **Family Sharing** - Allow family members to view vitals
8. **Export Reports** - PDF/CSV export of vital trends
9. **Insurance Integration** - Share data with insurance for RPM billing
10. **Multi-language Support** - Internationalization

## Troubleshooting

### Common Issues

1. **Device not syncing**
   - Check device battery
   - Verify internet connection
   - Re-register device
   - Check API credentials

2. **Alerts not generating**
   - Verify threshold configuration
   - Check alert status in database
   - Review error logs

3. **Data quality issues**
   - Check device placement
   - Verify calibration
   - Review confidence scores

## Conclusion

The IoT Vitals Integration provides comprehensive remote patient monitoring capabilities, enabling doctors to access real-time vital signs from various devices and wearables directly within the consultation interface. This enhances clinical decision-making and enables proactive patient care.

---

**Version**: 1.0.0  
**Status**: ✅ Complete and Ready for Use  
**Last Updated**: December 2, 2024
