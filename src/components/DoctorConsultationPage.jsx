import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import IoTVitalsPanel from './IoTVitalsPanel.jsx'
import { 
  AlertTriangle,
  Activity,
  Heart,
  Thermometer,
  User,
  FileText,
  Pill,
  TestTube,
  Image as ImageIcon,
  Calendar,
  Send,
  Save,
  CheckCircle,
  XCircle,
  TrendingUp,
  Stethoscope,
  ClipboardList,
  Search,
  Plus,
  Printer,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  Users,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'

export default function DoctorConsultationPage({ patientId, encounterId }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [patient, setPatient] = useState(null)
  const [encounter, setEncounter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [soapNote, setSoapNote] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  })
  const [clinicalAlerts, setClinicalAlerts] = useState([])
  const [drugInteractions, setDrugInteractions] = useState([])
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved')
  const [templates, setTemplates] = useState([])
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [vitalsTrend, setVitalsTrend] = useState(null)
  const [allergies, setAllergies] = useState([])
  const [activeProblems, setActiveProblems] = useState([])

  useEffect(() => {
    if (patientId) {
      loadPatientData()
      loadEncounterData()
    }
  }, [patientId, encounterId])

  const loadPatientData = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPatient(data.patient)
        
        // Load additional patient data
        await Promise.all([
          loadAllergies(),
          loadActiveProblems(),
          loadClinicalAlerts(),
          loadVitalsTrend()
        ])
      }
    } catch (error) {
      console.error('Error loading patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllergies = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patientId}/allergies`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAllergies(data.allergies || [])
      }
    } catch (error) {
      console.error('Error loading allergies:', error)
    }
  }

  const loadActiveProblems = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patientId}/problems?status=active`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setActiveProblems(data.problems || [])
      }
    } catch (error) {
      console.error('Error loading problems:', error)
    }
  }

  const loadClinicalAlerts = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patientId}/clinical-alerts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setClinicalAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error loading clinical alerts:', error)
    }
  }

  const loadVitalsTrend = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patientId}/vitals-trend?days=30`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setVitalsTrend(data.trend)
      }
    } catch (error) {
      console.error('Error loading vitals trend:', error)
    }
  }

  const loadEncounterData = async () => {
    if (!encounterId) return
    try {
      const response = await fetch(`/api/doctor/encounter/${encounterId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEncounter(data.encounter)
      }
    } catch (error) {
      console.error('Error loading encounter:', error)
    }
  }

  // Auto-save functionality
  useEffect(() => {
    if (!encounterId) return
    
    const autoSaveTimer = setTimeout(() => {
      if (soapNote.subjective || soapNote.objective || soapNote.assessment || soapNote.plan) {
        autoSaveNote()
      }
    }, 3000) // Auto-save after 3 seconds of inactivity
    
    return () => clearTimeout(autoSaveTimer)
  }, [soapNote])

  const autoSaveNote = async () => {
    setAutoSaveStatus('saving')
    try {
      const response = await fetch(`/api/doctor/encounter/${encounterId}/soap-note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(soapNote)
      })
      
      if (response.ok) {
        setAutoSaveStatus('saved')
      } else {
        setAutoSaveStatus('error')
      }
    } catch (error) {
      console.error('Auto-save error:', error)
      setAutoSaveStatus('error')
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/doctor/soap-templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const applyTemplate = (template) => {
    setSoapNote({
      subjective: template.subjective || '',
      objective: template.objective || '',
      assessment: template.assessment || '',
      plan: template.plan || ''
    })
    setShowTemplateSelector(false)
  }

  const checkDrugInteractions = async (medications) => {
    try {
      const response = await fetch('/api/doctor/check-drug-interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          patient_id: patientId,
          medications: medications 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setDrugInteractions(data.interactions || [])
      }
    } catch (error) {
      console.error('Error checking drug interactions:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No patient selected</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with Patient Info */}
      <PatientHeader patient={patient} encounter={encounter} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Patient Overview */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <PatientOverviewPanel patient={patient} />
        </div>

        {/* Center - Clinical Documentation */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="soap">SOAP Note</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="finalize">Finalize</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <ClinicalOverview patient={patient} encounter={encounter} />
            </TabsContent>

            <TabsContent value="soap" className="space-y-4 mt-4">
              <SOAPDocumentation 
                patientId={patientId} 
                encounterId={encounterId}
                soapNote={soapNote}
                setSoapNote={setSoapNote}
              />
            </TabsContent>

            <TabsContent value="orders" className="space-y-4 mt-4">
              <OrderManagement patientId={patientId} encounterId={encounterId} />
            </TabsContent>

            <TabsContent value="results" className="space-y-4 mt-4">
              <ResultsReview patientId={patientId} />
            </TabsContent>

            <TabsContent value="finalize" className="space-y-4 mt-4">
              <FinalizeVisit 
                patientId={patientId} 
                encounterId={encounterId}
                soapNote={soapNote}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Quick Actions & Alerts */}
        <div className="w-64 bg-white border-l overflow-y-auto">
          <QuickActionsPanel patientId={patientId} />
        </div>
      </div>
    </div>
  )
}

// Patient Header Component
function PatientHeader({ patient, encounter }) {
  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>MRN: {patient.universal_patient_id}</span>
              <span>•</span>
              <span>{patient.gender}</span>
              <span>•</span>
              <span>DOB: {patient.date_of_birth}</span>
              <span>•</span>
              <span>{calculateAge(patient.date_of_birth)} years</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Clock className="w-3 h-3 mr-1" />
            {encounter?.encounter_date || 'New Visit'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// Patient Overview Panel Component
function PatientOverviewPanel({ patient }) {
  const [vitals, setVitals] = useState(null)
  const [allergies, setAllergies] = useState([])
  const [medications, setMedications] = useState([])
  const [conditions, setConditions] = useState([])

  useEffect(() => {
    loadPatientOverview()
  }, [patient.id])

  const loadPatientOverview = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patient.id}/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setVitals(data.vitals)
        setAllergies(data.allergies || [])
        setMedications(data.medications || [])
        setConditions(data.conditions || [])
      }
    } catch (error) {
      console.error('Error loading overview:', error)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Critical Alerts */}
      {allergies.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center text-red-800">
              <AlertTriangle className="w-4 h-4 mr-2" />
              ALLERGIES
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {allergies.map((allergy, idx) => (
                <div key={idx} className="text-sm">
                  <p className="font-semibold text-red-900">{allergy.allergen}</p>
                  <p className="text-red-700 text-xs">{allergy.reaction}</p>
                  <Badge variant="destructive" className="text-xs mt-1">
                    {allergy.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IoT Vitals - Real-time from devices */}
      <IoTVitalsPanel patientId={patient.id} />

      {/* Active Medications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Pill className="w-4 h-4 mr-2" />
            Active Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {medications.length > 0 ? (
            <div className="space-y-2">
              {medications.map((med, idx) => (
                <div key={idx} className="text-sm border-b pb-2 last:border-0">
                  <p className="font-semibold">{med.medication_name}</p>
                  <p className="text-gray-600 text-xs">{med.dosage} - {med.frequency}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active medications</p>
          )}
        </CardContent>
      </Card>

      {/* Medical History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Medical History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {conditions.length > 0 ? (
            <div className="space-y-2">
              {conditions.map((condition, idx) => (
                <div key={idx} className="text-sm">
                  <p className="font-semibold">{condition.condition}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {condition.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No medical history</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Clinical Overview Component
function ClinicalOverview({ patient, encounter }) {
  const [previousVisits, setPreviousVisits] = useState([])

  useEffect(() => {
    loadPreviousVisits()
  }, [patient.id])

  const loadPreviousVisits = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patient.id}/visits`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPreviousVisits(data.visits || [])
      }
    } catch (error) {
      console.error('Error loading visits:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Chief Complaint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="w-5 h-5 mr-2" />
            Chief Complaint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{encounter?.chief_complaint || 'Not recorded'}</p>
        </CardContent>
      </Card>

      {/* Previous Consultation Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Previous Consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {previousVisits.length > 0 ? (
            <div className="space-y-3">
              {previousVisits.map((visit, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{visit.encounter_date}</p>
                      <p className="text-sm text-gray-600">{visit.diagnosis}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No previous consultations</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// SOAP Documentation Component
function SOAPDocumentation({ patientId, encounterId, soapNote, setSoapNote }) {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [diagnosisCodes, setDiagnosisCodes] = useState([])
  const [searchDiagnosis, setSearchDiagnosis] = useState('')
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([])
  const [rosData, setRosData] = useState({})
  const [peData, setPeData] = useState({})

  const handleSaveSOAP = async () => {
    try {
      const response = await fetch(`/api/doctor/encounter/${encounterId}/soap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...soapNote,
          diagnoses: selectedDiagnoses,
          ros: rosData,
          physical_exam: peData
        })
      })
      if (response.ok) {
        alert('SOAP note saved successfully')
      }
    } catch (error) {
      console.error('Error saving SOAP:', error)
    }
  }

  const searchDiagnosisCodes = async (query) => {
    if (!query || query.length < 3) return
    try {
      const response = await fetch(`/api/doctor/icd10/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setDiagnosisCodes(data.codes || [])
      }
    } catch (error) {
      console.error('Error searching diagnosis codes:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Clinical Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Common Cold</Button>
            <Button variant="outline" size="sm">Diabetes Follow-up</Button>
            <Button variant="outline" size="sm">Hypertension</Button>
            <Button variant="outline" size="sm">Annual Physical</Button>
          </div>
        </CardContent>
      </Card>

      {/* Subjective */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Subjective (History of Present Illness)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>History of Present Illness (HPI)</Label>
            <Textarea
              rows={6}
              placeholder="Document patient's story, symptoms, onset, duration, severity..."
              value={soapNote.subjective}
              onChange={(e) => setSoapNote({ ...soapNote, subjective: e.target.value })}
            />
          </div>
          
          {/* Review of Systems */}
          <div>
            <Label className="mb-2 block">Review of Systems (ROS)</Label>
            <ReviewOfSystemsChecklist rosData={rosData} setRosData={setRosData} />
          </div>
        </CardContent>
      </Card>

      {/* Objective */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Stethoscope className="w-5 h-5 mr-2" />
            Objective (Physical Examination)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhysicalExaminationForm peData={peData} setPeData={setPeData} />
          
          <div>
            <Label>Additional Findings</Label>
            <Textarea
              rows={4}
              placeholder="Document physical examination findings..."
              value={soapNote.objective}
              onChange={(e) => setSoapNote({ ...soapNote, objective: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="w-5 h-5 mr-2" />
            Assessment (Diagnosis)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ICD-10 Search */}
          <div>
            <Label>Search ICD-10 Codes</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Search diagnosis codes..."
                value={searchDiagnosis}
                onChange={(e) => {
                  setSearchDiagnosis(e.target.value)
                  searchDiagnosisCodes(e.target.value)
                }}
              />
              <Button variant="outline">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Search Results */}
            {diagnosisCodes.length > 0 && (
              <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                {diagnosisCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                    onClick={() => {
                      setSelectedDiagnoses([...selectedDiagnoses, code])
                      setSearchDiagnosis('')
                      setDiagnosisCodes([])
                    }}
                  >
                    <p className="font-semibold text-sm">{code.code}</p>
                    <p className="text-xs text-gray-600">{code.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Diagnoses */}
          {selectedDiagnoses.length > 0 && (
            <div>
              <Label>Selected Diagnoses</Label>
              <div className="space-y-2 mt-2">
                {selectedDiagnoses.map((diagnosis, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div>
                      <p className="font-semibold text-sm">{diagnosis.code}</p>
                      <p className="text-xs text-gray-600">{diagnosis.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDiagnoses(selectedDiagnoses.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Clinical Assessment</Label>
            <Textarea
              rows={4}
              placeholder="Document your clinical assessment and differential diagnoses..."
              value={soapNote.assessment}
              onChange={(e) => setSoapNote({ ...soapNote, assessment: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRight className="w-5 h-5 mr-2" />
            Plan (Treatment Plan)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={6}
            placeholder="Document treatment plan, follow-up instructions, patient education..."
            value={soapNote.plan}
            onChange={(e) => setSoapNote({ ...soapNote, plan: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline">
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={handleSaveSOAP}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Save SOAP Note
        </Button>
      </div>
    </div>
  )
}

// Review of Systems Checklist
function ReviewOfSystemsChecklist({ rosData, setRosData }) {
  const systems = [
    { name: 'Constitutional', items: ['Fever', 'Weight Loss', 'Fatigue'] },
    { name: 'Cardiovascular', items: ['Chest Pain', 'Palpitations', 'Edema'] },
    { name: 'Respiratory', items: ['Cough', 'Shortness of Breath', 'Wheezing'] },
    { name: 'Gastrointestinal', items: ['Nausea', 'Vomiting', 'Diarrhea', 'Abdominal Pain'] },
    { name: 'Neurological', items: ['Headache', 'Dizziness', 'Seizures'] }
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {systems.map((system, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">{system.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {system.items.map((item, itemIdx) => (
                <label key={itemIdx} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rosData[`${system.name}_${item}`] || false}
                    onChange={(e) => setRosData({
                      ...rosData,
                      [`${system.name}_${item}`]: e.target.checked
                    })}
                    className="rounded"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Physical Examination Form
function PhysicalExaminationForm({ peData, setPeData }) {
  const examSystems = [
    { name: 'General', placeholder: 'Well-developed, well-nourished...' },
    { name: 'Cardiovascular', placeholder: 'Regular rate and rhythm, no murmurs...' },
    { name: 'Respiratory', placeholder: 'Clear to auscultation bilaterally...' },
    { name: 'Abdominal', placeholder: 'Soft, non-tender, non-distended...' },
    { name: 'Neurological', placeholder: 'Alert and oriented x3...' }
  ]

  return (
    <div className="space-y-3">
      {examSystems.map((system, idx) => (
        <div key={idx}>
          <Label className="text-sm">{system.name}</Label>
          <Input
            placeholder={system.placeholder}
            value={peData[system.name] || ''}
            onChange={(e) => setPeData({ ...peData, [system.name]: e.target.value })}
          />
        </div>
      ))}
    </div>
  )
}

// Order Management Component (CPOE)
function OrderManagement({ patientId, encounterId }) {
  const [activeOrderTab, setActiveOrderTab] = useState('prescriptions')

  return (
    <div className="space-y-4">
      <Tabs value={activeOrderTab} onValueChange={setActiveOrderTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="labs">Lab Orders</TabsTrigger>
          <TabsTrigger value="imaging">Imaging</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions">
          <PrescriptionOrderForm patientId={patientId} encounterId={encounterId} />
        </TabsContent>

        <TabsContent value="labs">
          <LabOrderForm patientId={patientId} encounterId={encounterId} />
        </TabsContent>

        <TabsContent value="imaging">
          <ImagingOrderForm patientId={patientId} encounterId={encounterId} />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralForm patientId={patientId} encounterId={encounterId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Prescription Order Form
function PrescriptionOrderForm({ patientId, encounterId }) {
  const [drugSearch, setDrugSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [currentRx, setCurrentRx] = useState({
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  })

  const searchDrugs = async (query) => {
    if (!query || query.length < 3) return
    try {
      const response = await fetch(`/api/doctor/drugs/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.drugs || [])
      }
    } catch (error) {
      console.error('Error searching drugs:', error)
    }
  }

  const addPrescription = () => {
    if (currentRx.medication && currentRx.dosage) {
      setPrescriptions([...prescriptions, currentRx])
      setCurrentRx({
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      })
    }
  }

  const sendPrescriptions = async () => {
    try {
      const response = await fetch(`/api/doctor/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          encounter_id: encounterId,
          prescriptions: prescriptions
        })
      })
      if (response.ok) {
        alert('Prescriptions sent to pharmacy')
        setPrescriptions([])
      }
    } catch (error) {
      console.error('Error sending prescriptions:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Pill className="w-5 h-5 mr-2" />
          e-Prescription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drug Search */}
        <div>
          <Label>Search Medication</Label>
          <Input
            placeholder="Search drug formulary..."
            value={drugSearch}
            onChange={(e) => {
              setDrugSearch(e.target.value)
              searchDrugs(e.target.value)
            }}
          />
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
              {searchResults.map((drug, idx) => (
                <div
                  key={idx}
                  className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                  onClick={() => {
                    setCurrentRx({ ...currentRx, medication: drug.name })
                    setDrugSearch('')
                    setSearchResults([])
                  }}
                >
                  <p className="font-semibold text-sm">{drug.name}</p>
                  <p className="text-xs text-gray-600">{drug.generic_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prescription Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Medication</Label>
            <Input
              value={currentRx.medication}
              onChange={(e) => setCurrentRx({ ...currentRx, medication: e.target.value })}
            />
          </div>
          <div>
            <Label>Dosage</Label>
            <Input
              placeholder="e.g., 500mg"
              value={currentRx.dosage}
              onChange={(e) => setCurrentRx({ ...currentRx, dosage: e.target.value })}
            />
          </div>
          <div>
            <Label>Frequency</Label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={currentRx.frequency}
              onChange={(e) => setCurrentRx({ ...currentRx, frequency: e.target.value })}
            >
              <option value="">Select Frequency</option>
              <option value="Once daily">Once daily</option>
              <option value="Twice daily">Twice daily</option>
              <option value="Three times daily">Three times daily</option>
              <option value="Four times daily">Four times daily</option>
              <option value="Every 6 hours">Every 6 hours</option>
              <option value="As needed">As needed</option>
            </select>
          </div>
          <div>
            <Label>Duration</Label>
            <Input
              placeholder="e.g., 7 days"
              value={currentRx.duration}
              onChange={(e) => setCurrentRx({ ...currentRx, duration: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Instructions</Label>
          <Textarea
            rows={2}
            placeholder="Special instructions for patient..."
            value={currentRx.instructions}
            onChange={(e) => setCurrentRx({ ...currentRx, instructions: e.target.value })}
          />
        </div>

        <Button onClick={addPrescription} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add to Prescription List
        </Button>

        {/* Prescription List */}
        {prescriptions.length > 0 && (
          <div className="space-y-2">
            <Label>Prescriptions to Send</Label>
            {prescriptions.map((rx, idx) => (
              <div key={idx} className="p-3 bg-blue-50 rounded-md flex items-center justify-between">
                <div>
                  <p className="font-semibold">{rx.medication} - {rx.dosage}</p>
                  <p className="text-sm text-gray-600">{rx.frequency} for {rx.duration}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
            <Button onClick={sendPrescriptions} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Send to Pharmacy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Lab Order Form
function LabOrderForm({ patientId, encounterId }) {
  const [selectedTests, setSelectedTests] = useState([])
  const [clinicalNotes, setClinicalNotes] = useState('')

  const testPanels = [
    { name: 'Complete Blood Count (CBC)', tests: ['WBC', 'RBC', 'Hemoglobin', 'Platelets'] },
    { name: 'Basic Metabolic Panel', tests: ['Sodium', 'Potassium', 'Glucose', 'Creatinine'] },
    { name: 'Lipid Profile', tests: ['Total Cholesterol', 'LDL', 'HDL', 'Triglycerides'] },
    { name: 'Liver Function Tests', tests: ['ALT', 'AST', 'Bilirubin', 'Albumin'] },
    { name: 'Thyroid Panel', tests: ['TSH', 'T3', 'T4'] }
  ]

  const sendLabOrders = async () => {
    try {
      const response = await fetch(`/api/doctor/lab-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          encounter_id: encounterId,
          tests: selectedTests,
          clinical_notes: clinicalNotes
        })
      })
      if (response.ok) {
        alert('Lab orders sent successfully')
        setSelectedTests([])
        setClinicalNotes('')
      }
    } catch (error) {
      console.error('Error sending lab orders:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TestTube className="w-5 h-5 mr-2" />
          Laboratory Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {testPanels.map((panel, idx) => (
            <Card key={idx} className="cursor-pointer hover:bg-gray-50">
              <CardContent className="p-4">
                <label className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(panel.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTests([...selectedTests, panel.name])
                      } else {
                        setSelectedTests(selectedTests.filter(t => t !== panel.name))
                      }
                    }}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold text-sm">{panel.name}</p>
                    <p className="text-xs text-gray-600">{panel.tests.join(', ')}</p>
                  </div>
                </label>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Label>Clinical Notes for Lab</Label>
          <Textarea
            rows={3}
            placeholder="Add clinical indication or special instructions..."
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />
        </div>

        {selectedTests.length > 0 && (
          <Button onClick={sendLabOrders} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Send Lab Orders ({selectedTests.length})
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Imaging Order Form
function ImagingOrderForm({ patientId, encounterId }) {
  const [selectedImaging, setSelectedImaging] = useState([])
  const [indication, setIndication] = useState('')

  const imagingTypes = [
    'X-Ray Chest',
    'X-Ray Abdomen',
    'CT Scan Head',
    'CT Scan Chest',
    'MRI Brain',
    'Ultrasound Abdomen',
    'Echocardiogram',
    'Mammography'
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ImageIcon className="w-5 h-5 mr-2" />
          Imaging Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {imagingTypes.map((type, idx) => (
            <label key={idx} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedImaging.includes(type)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedImaging([...selectedImaging, type])
                  } else {
                    setSelectedImaging(selectedImaging.filter(t => t !== type))
                  }
                }}
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>

        <div>
          <Label>Clinical Indication</Label>
          <Textarea
            rows={3}
            placeholder="Reason for imaging study..."
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
          />
        </div>

        {selectedImaging.length > 0 && (
          <Button className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Send Imaging Orders ({selectedImaging.length})
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Referral Form
function ReferralForm({ patientId, encounterId }) {
  const [referralData, setReferralData] = useState({
    specialty: '',
    urgency: 'routine',
    reason: ''
  })

  const specialties = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Gastroenterology',
    'Endocrinology',
    'Dermatology',
    'Psychiatry',
    'Ophthalmology'
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Referral & Consultation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Specialty</Label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={referralData.specialty}
            onChange={(e) => setReferralData({ ...referralData, specialty: e.target.value })}
          >
            <option value="">Select Specialty</option>
            {specialties.map((spec, idx) => (
              <option key={idx} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>Urgency</Label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={referralData.urgency}
            onChange={(e) => setReferralData({ ...referralData, urgency: e.target.value })}
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        <div>
          <Label>Reason for Referral</Label>
          <Textarea
            rows={4}
            placeholder="Clinical reason for consultation..."
            value={referralData.reason}
            onChange={(e) => setReferralData({ ...referralData, reason: e.target.value })}
          />
        </div>

        <Button className="w-full">
          <Send className="w-4 h-4 mr-2" />
          Send Referral Request
        </Button>
      </CardContent>
    </Card>
  )
}

// Results Review Component
function ResultsReview({ patientId }) {
  const [labResults, setLabResults] = useState([])
  const [imagingResults, setImagingResults] = useState([])

  useEffect(() => {
    loadResults()
  }, [patientId])

  const loadResults = async () => {
    try {
      const response = await fetch(`/api/doctor/patient/${patientId}/results`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLabResults(data.lab_results || [])
        setImagingResults(data.imaging_results || [])
      }
    } catch (error) {
      console.error('Error loading results:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Lab Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TestTube className="w-5 h-5 mr-2" />
            Recent Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {labResults.length > 0 ? (
            <div className="space-y-3">
              {labResults.map((result, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{result.test_name}</p>
                      <p className="text-sm text-gray-600">{result.result_date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${result.is_abnormal ? 'text-red-600' : 'text-green-600'}`}>
                        {result.value} {result.unit}
                      </p>
                      <p className="text-xs text-gray-500">Ref: {result.reference_range}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent lab results</p>
          )}
        </CardContent>
      </Card>

      {/* Imaging Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ImageIcon className="w-5 h-5 mr-2" />
            Imaging Studies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {imagingResults.length > 0 ? (
            <div className="space-y-3">
              {imagingResults.map((result, idx) => (
                <div key={idx} className="p-3 border rounded hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{result.study_type}</p>
                      <p className="text-sm text-gray-600">{result.study_date}</p>
                      <p className="text-sm mt-1">{result.findings}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View Images
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No imaging results</p>
          )}
        </CardContent>
      </Card>

      {/* Trending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Lab Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Graphical trending feature coming soon</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Finalize Visit Component
function FinalizeVisit({ patientId, encounterId, soapNote }) {
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpInterval, setFollowUpInterval] = useState('')
  const [patientInstructions, setPatientInstructions] = useState('')
  const [selectedInstructionTemplates, setSelectedInstructionTemplates] = useState([])

  const instructionTemplates = [
    'Diet for Diabetes',
    'Wound Care Instructions',
    'Medication Compliance',
    'Exercise Guidelines',
    'Hypertension Management'
  ]

  const finalizeEncounter = async () => {
    try {
      const response = await fetch(`/api/doctor/encounter/${encounterId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          soap_note: soapNote,
          follow_up_date: followUpDate,
          patient_instructions: patientInstructions,
          instruction_templates: selectedInstructionTemplates
        })
      })
      if (response.ok) {
        alert('Visit finalized successfully!')
      }
    } catch (error) {
      console.error('Error finalizing visit:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Follow-up Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Follow-up Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Or Select Interval</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={followUpInterval}
                onChange={(e) => setFollowUpInterval(e.target.value)}
              >
                <option value="">Select Interval</option>
                <option value="1_week">1 Week</option>
                <option value="2_weeks">2 Weeks</option>
                <option value="1_month">1 Month</option>
                <option value="3_months">3 Months</option>
                <option value="6_months">6 Months</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Patient Instructions & Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Instruction Templates</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {instructionTemplates.map((template, idx) => (
                <label key={idx} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedInstructionTemplates.includes(template)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInstructionTemplates([...selectedInstructionTemplates, template])
                      } else {
                        setSelectedInstructionTemplates(selectedInstructionTemplates.filter(t => t !== template))
                      }
                    }}
                  />
                  <span className="text-sm">{template}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Custom Instructions</Label>
            <Textarea
              rows={6}
              placeholder="Enter custom patient instructions..."
              value={patientInstructions}
              onChange={(e) => setPatientInstructions(e.target.value)}
            />
          </div>

          <Button variant="outline" className="w-full">
            <Printer className="w-4 h-4 mr-2" />
            Preview Instructions
          </Button>
        </CardContent>
      </Card>

      {/* Finalize Button */}
      <Card className="border-green-300 bg-green-50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-900">Ready to Finalize Visit?</h3>
            <p className="text-sm text-green-800">
              This will lock the medical record and forward all orders to respective departments.
            </p>
            <Button
              onClick={finalizeEncounter}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Finalize & Sign-Off Visit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Quick Actions Panel
function QuickActionsPanel({ patientId }) {
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Printer className="w-4 h-4 mr-2" />
            Print Summary
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Mail className="w-4 h-4 mr-2" />
            Email Patient
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Phone className="w-4 h-4 mr-2" />
            Call Patient
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <FileText className="w-4 h-4 mr-2" />
            View History
          </Button>
        </CardContent>
      </Card>

      <Card className="border-yellow-300 bg-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center text-yellow-800">
            <AlertCircle className="w-4 h-4 mr-2" />
            Clinical Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-yellow-800">No active alerts</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper Functions
function calculateAge(dob) {
  if (!dob) return 0
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
