/**
 * Emergency Module Component
 * Emergency department triage and management
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  AlertCircle, 
  Activity, 
  Clock,
  Users,
  Truck,
  Heart,
  Thermometer,
  Stethoscope,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import apiService from '../services/apiService'

export default function EmergencyModule() {
  const [patients, setPatients] = useState([])
  const [triageQueue, setTriageQueue] = useState([])
  const [activeEmergencies, setActiveEmergencies] = useState([])
  const [loading, setLoading] = useState(false)
  const [showTriageForm, setShowTriageForm] = useState(false)
  const [triageData, setTriageData] = useState({
    patient_name: '',
    age: '',
    gender: '',
    chief_complaint: '',
    vital_signs: {
      blood_pressure: '',
      heart_rate: '',
      respiratory_rate: '',
      temperature: '',
      oxygen_saturation: ''
    },
    pain_scale: 0,
    consciousness_level: 'alert',
    triage_level: '',
    arrival_mode: 'walk-in'
  })

  useEffect(() => {
    loadEmergencyData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadEmergencyData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadEmergencyData = async () => {
    try {
      const [patientsRes, triageRes, emergenciesRes] = await Promise.all([
        apiService.request('/emergency/patients'),
        apiService.request('/emergency/triage-queue'),
        apiService.request('/emergency/active')
      ])
      
      setPatients(patientsRes.patients || [])
      setTriageQueue(triageRes.queue || [])
      setActiveEmergencies(emergenciesRes.emergencies || [])
    } catch (error) {
      console.error('Error loading emergency data:', error)
    }
  }

  const handleTriageSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiService.request('/emergency/triage', {
        method: 'POST',
        body: JSON.stringify(triageData)
      })
      
      alert('Patient triaged successfully')
      setShowTriageForm(false)
      setTriageData({
        patient_name: '',
        age: '',
        gender: '',
        chief_complaint: '',
        vital_signs: {
          blood_pressure: '',
          heart_rate: '',
          respiratory_rate: '',
          temperature: '',
          oxygen_saturation: ''
        },
        pain_scale: 0,
        consciousness_level: 'alert',
        triage_level: '',
        arrival_mode: 'walk-in'
      })
      loadEmergencyData()
    } catch (error) {
      alert('Triage failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateTriageLevel = () => {
    const { vital_signs, pain_scale, consciousness_level } = triageData
    
    // Critical (Level 1) - Immediate
    if (consciousness_level === 'unresponsive' || 
        parseInt(vital_signs.heart_rate) > 140 || 
        parseInt(vital_signs.heart_rate) < 40 ||
        parseInt(vital_signs.oxygen_saturation) < 90) {
      return 'critical'
    }
    
    // Emergency (Level 2) - 10 minutes
    if (pain_scale >= 8 || 
        parseInt(vital_signs.heart_rate) > 120 ||
        parseInt(vital_signs.temperature) > 103) {
      return 'emergency'
    }
    
    // Urgent (Level 3) - 30 minutes
    if (pain_scale >= 5 || 
        parseInt(vital_signs.heart_rate) > 100) {
      return 'urgent'
    }
    
    // Semi-urgent (Level 4) - 60 minutes
    if (pain_scale >= 3) {
      return 'semi-urgent'
    }
    
    // Non-urgent (Level 5) - 120 minutes
    return 'non-urgent'
  }

  const getTriageColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white'
      case 'emergency': return 'bg-orange-600 text-white'
      case 'urgent': return 'bg-yellow-600 text-white'
      case 'semi-urgent': return 'bg-green-600 text-white'
      case 'non-urgent': return 'bg-teal-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const getTriageIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return <AlertCircle className="w-5 h-5" />
      case 'emergency': return <Heart className="w-5 h-5" />
      case 'urgent': return <Activity className="w-5 h-5" />
      default: return <Stethoscope className="w-5 h-5" />
    }
  }

  const assignToDoctor = async (patientId, doctorId) => {
    try {
      await apiService.request('/emergency/assign', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId, doctor_id: doctorId })
      })
      alert('Patient assigned successfully')
      loadEmergencyData()
    } catch (error) {
      alert('Assignment failed: ' + error.message)
    }
  }

  const dischargePatient = async (patientId) => {
    try {
      await apiService.request(`/emergency/discharge/${patientId}`, {
        method: 'POST'
      })
      alert('Patient discharged')
      loadEmergencyData()
    } catch (error) {
      alert('Discharge failed: ' + error.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="w-8 h-8 text-red-600" />
            Emergency Department
          </h1>
          <p className="text-gray-600 mt-1">Triage and emergency patient management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadEmergencyData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowTriageForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Triage
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Triage</p>
                <p className="text-2xl font-bold">{triageQueue.length}</p>
              </div>
              <Users className="w-8 h-8 text-teal-700" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Cases</p>
                <p className="text-2xl font-bold">{activeEmergencies.length}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {triageQueue.filter(p => p.triage_level === 'critical').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold">15 min</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Triage Form Modal */}
      {showTriageForm && (
        <Card className="border-2 border-teal-500">
          <CardHeader>
            <CardTitle>Emergency Triage Assessment</CardTitle>
            <CardDescription>Complete initial patient assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTriageSubmit} className="space-y-4">
              {/* Patient Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Patient Name *</Label>
                  <Input
                    required
                    value={triageData.patient_name}
                    onChange={(e) => setTriageData({...triageData, patient_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Age *</Label>
                  <Input
                    type="number"
                    required
                    value={triageData.age}
                    onChange={(e) => setTriageData({...triageData, age: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Gender *</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    required
                    value={triageData.gender}
                    onChange={(e) => setTriageData({...triageData, gender: e.target.value})}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <Label>Chief Complaint *</Label>
                <Textarea
                  required
                  value={triageData.chief_complaint}
                  onChange={(e) => setTriageData({...triageData, chief_complaint: e.target.value})}
                  placeholder="Describe the main reason for emergency visit..."
                />
              </div>

              {/* Vital Signs */}
              <div>
                <Label className="text-lg font-semibold mb-2 block">Vital Signs</Label>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <Label className="text-xs">BP (mmHg)</Label>
                    <Input
                      placeholder="120/80"
                      value={triageData.vital_signs.blood_pressure}
                      onChange={(e) => setTriageData({
                        ...triageData,
                        vital_signs: {...triageData.vital_signs, blood_pressure: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">HR (bpm)</Label>
                    <Input
                      type="number"
                      placeholder="72"
                      value={triageData.vital_signs.heart_rate}
                      onChange={(e) => setTriageData({
                        ...triageData,
                        vital_signs: {...triageData.vital_signs, heart_rate: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">RR (bpm)</Label>
                    <Input
                      type="number"
                      placeholder="16"
                      value={triageData.vital_signs.respiratory_rate}
                      onChange={(e) => setTriageData({
                        ...triageData,
                        vital_signs: {...triageData.vital_signs, respiratory_rate: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Temp (°F)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={triageData.vital_signs.temperature}
                      onChange={(e) => setTriageData({
                        ...triageData,
                        vital_signs: {...triageData.vital_signs, temperature: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SpO2 (%)</Label>
                    <Input
                      type="number"
                      placeholder="98"
                      value={triageData.vital_signs.oxygen_saturation}
                      onChange={(e) => setTriageData({
                        ...triageData,
                        vital_signs: {...triageData.vital_signs, oxygen_saturation: e.target.value}
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Assessment */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Pain Scale (0-10)</Label>
                  <Input
                    type="range"
                    min="0"
                    max="10"
                    value={triageData.pain_scale}
                    onChange={(e) => setTriageData({...triageData, pain_scale: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <p className="text-center font-bold text-2xl mt-2">{triageData.pain_scale}</p>
                </div>
                <div>
                  <Label>Consciousness Level</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={triageData.consciousness_level}
                    onChange={(e) => setTriageData({...triageData, consciousness_level: e.target.value})}
                  >
                    <option value="alert">Alert</option>
                    <option value="verbal">Responds to Verbal</option>
                    <option value="pain">Responds to Pain</option>
                    <option value="unresponsive">Unresponsive</option>
                  </select>
                </div>
                <div>
                  <Label>Arrival Mode</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={triageData.arrival_mode}
                    onChange={(e) => setTriageData({...triageData, arrival_mode: e.target.value})}
                  >
                    <option value="walk-in">Walk-in</option>
                    <option value="ambulance">Ambulance</option>
                    <option value="police">Police</option>
                    <option value="helicopter">Helicopter</option>
                  </select>
                </div>
              </div>

              {/* Calculated Triage Level */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="mb-2 block">Calculated Triage Level</Label>
                <Badge className={`${getTriageColor(calculateTriageLevel())} text-lg px-4 py-2`}>
                  {getTriageIcon(calculateTriageLevel())}
                  <span className="ml-2">{calculateTriageLevel().toUpperCase()}</span>
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setShowTriageForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Complete Triage'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="triage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="triage">Triage Queue ({triageQueue.length})</TabsTrigger>
          <TabsTrigger value="active">Active Cases ({activeEmergencies.length})</TabsTrigger>
          <TabsTrigger value="all">All Patients ({patients.length})</TabsTrigger>
        </TabsList>

        {/* Triage Queue */}
        <TabsContent value="triage" className="space-y-3">
          {triageQueue.length > 0 ? (
            triageQueue.map((patient) => (
              <Card key={patient.id} className={`border-l-4 ${getTriageColor(patient.triage_level)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{patient.patient_name}</h3>
                        <Badge className={getTriageColor(patient.triage_level)}>
                          {patient.triage_level}
                        </Badge>
                        <Badge variant="outline">{patient.age}y {patient.gender}</Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Chief Complaint:</strong> {patient.chief_complaint}
                      </p>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">BP:</span> {patient.vital_signs?.blood_pressure || 'N/A'}
                        </div>
                        <div>
                          <span className="text-gray-600">HR:</span> {patient.vital_signs?.heart_rate || 'N/A'} bpm
                        </div>
                        <div>
                          <span className="text-gray-600">RR:</span> {patient.vital_signs?.respiratory_rate || 'N/A'}
                        </div>
                        <div>
                          <span className="text-gray-600">Temp:</span> {patient.vital_signs?.temperature || 'N/A'}°F
                        </div>
                        <div>
                          <span className="text-gray-600">SpO2:</span> {patient.vital_signs?.oxygen_saturation || 'N/A'}%
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Waiting: {patient.wait_time || '0'} minutes | Arrived: {patient.arrival_mode}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => assignToDoctor(patient.id, 1)}>
                        Assign to Doctor
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p>No patients in triage queue</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Active Cases */}
        <TabsContent value="active" className="space-y-3">
          {activeEmergencies.length > 0 ? (
            activeEmergencies.map((emergency) => (
              <Card key={emergency.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{emergency.patient_name}</h3>
                      <p className="text-sm text-gray-700 mb-2">{emergency.diagnosis}</p>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">Room {emergency.room_number}</Badge>
                        <Badge variant="outline">Dr. {emergency.assigned_doctor}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => dischargePatient(emergency.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Discharge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No active emergency cases</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Patients */}
        <TabsContent value="all" className="space-y-3">
          {patients.length > 0 ? (
            patients.map((patient) => (
              <Card key={patient.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{patient.patient_name}</h3>
                      <p className="text-sm text-gray-600">{patient.status}</p>
                    </div>
                    <Badge variant="outline">{patient.triage_level}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No patients in emergency department</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
