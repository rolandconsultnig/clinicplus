/**
 * AI Consultation Component - Enhanced
 * AI-assisted diagnosis and treatment recommendations with speech-to-text
 */
import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Brain, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  FileText,
  Pill,
  Activity,
  Search,
  Loader2,
  Mic,
  MicOff,
  Download,
  Copy,
  Save,
  Play,
  Pause,
  Volume2
} from 'lucide-react'
import { apiService } from '../services/apiService.js'

export default function AIConsultation({ patientId }) {
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [symptoms, setSymptoms] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [transcription, setTranscription] = useState('')
  const [vitalSigns, setVitalSigns] = useState({
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: ''
  })
  const [aiResponse, setAiResponse] = useState(null)
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [generatedNotes, setGeneratedNotes] = useState(null)
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    loadAnalysisHistory()
    loadPatientData()
  }, [patientId])

  const loadPatientData = async () => {
    try {
      const response = await apiService.request(`/patients/${patientId}`)
      if (response.success && response.patient) {
        // Load patient's medical history
        const historyResponse = await apiService.request(`/patients/${patientId}/medical-history`)
        if (historyResponse.success) {
          const history = historyResponse.history || []
          setMedicalHistory(history.map(h => h.condition).join(', '))
        }
      }
    } catch (error) {
      console.error('Error loading patient data:', error)
    }
  }

  const loadAnalysisHistory = async () => {
    try {
      const response = await apiService.request(`/ai/consultation?patient_id=${patientId}`)
      if (response.success) {
        setAnalysisHistory(response.consultations || [])
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Microphone access denied. Please enable microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob) => {
    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')
      formData.append('patient_id', patientId)

      const response = await apiService.request('/ai/consultation/transcribe', {
        method: 'POST',
        body: formData
      })

      if (response.success && response.transcription) {
        setTranscription(response.transcription)
        setSymptoms(prev => prev + (prev ? ' ' : '') + response.transcription)
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Transcription failed. Please try typing manually.')
    } finally {
      setTranscribing(false)
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const response = await apiService.request('/ai/consultation', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          symptoms,
          medical_history: medicalHistory,
          vital_signs: vitalSigns,
          transcription: transcription
        })
      })
      
      if (response.success) {
        setAiResponse(response)
        loadAnalysisHistory()
      }
    } catch (error) {
      console.error('AI Analysis error:', error)
      alert('AI analysis failed: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateNotes = async () => {
    setIsGeneratingNotes(true)
    try {
      const consultationId = aiResponse?.consultation_id || Date.now()
      const response = await apiService.request(`/ai/consultation/${consultationId}/generate-notes`, {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          symptoms,
          medical_history: medicalHistory,
          vital_signs: vitalSigns,
          diagnoses: aiResponse?.diagnoses || [],
          treatments: aiResponse?.treatments || []
        })
      })

      if (response.success) {
        setGeneratedNotes(response.notes)
      }
    } catch (error) {
      console.error('Note generation error:', error)
      alert('Failed to generate notes')
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!generatedNotes) return
    
    try {
      const response = await apiService.request('/soap-notes', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          subjective: generatedNotes.subjective || symptoms,
          objective: generatedNotes.objective || JSON.stringify(vitalSigns),
          assessment: generatedNotes.assessment || aiResponse?.diagnoses?.[0]?.condition,
          plan: generatedNotes.plan || aiResponse?.treatments?.[0]?.recommendation
        })
      })

      if (response.success) {
        alert('Notes saved successfully!')
      }
    } catch (error) {
      console.error('Save notes error:', error)
      alert('Failed to save notes')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            AI-Assisted Consultation
          </h1>
          <p className="text-gray-600 mt-1">
            Get AI-powered diagnostic suggestions and treatment recommendations
          </p>
        </div>
        <Badge variant="outline" className="text-purple-600 border-purple-600">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze">Analysis</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="notes">Auto Notes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Enter patient symptoms and vital signs for AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Speech-to-Text Section */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-lg font-semibold">Voice Input (Speech-to-Text)</Label>
                  <div className="flex gap-2">
                    {!recording ? (
                      <Button
                        type="button"
                        onClick={startRecording}
                        variant="outline"
                        className="bg-white"
                      >
                        <Mic className="w-4 h-4 mr-2 text-red-600" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={stopRecording}
                        variant="outline"
                        className="bg-red-50 border-red-300"
                      >
                        <MicOff className="w-4 h-4 mr-2 text-red-600" />
                        Stop Recording
                      </Button>
                    )}
                  </div>
                </div>
                {recording && (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Recording...</span>
                  </div>
                )}
                {transcribing && (
                  <div className="flex items-center gap-2 text-purple-600 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Transcribing audio...</span>
                  </div>
                )}
                {transcription && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">Transcription:</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(transcription)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-800">{transcription}</p>
                  </div>
                )}
              </div>

              {/* Symptoms */}
              <div>
                <Label htmlFor="symptoms">Chief Complaints & Symptoms</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Describe patient's symptoms in detail... (or use voice input above)"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Medical History */}
              <div>
                <Label htmlFor="history">Relevant Medical History</Label>
                <Textarea
                  id="history"
                  placeholder="Past medical conditions, surgeries, allergies..."
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Vital Signs */}
              <div>
                <Label>Vital Signs</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                  <div>
                    <Label htmlFor="temp" className="text-xs">Temperature (°F)</Label>
                    <Input
                      id="temp"
                      type="number"
                      placeholder="98.6"
                      value={vitalSigns.temperature}
                      onChange={(e) => setVitalSigns({...vitalSigns, temperature: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bp" className="text-xs">Blood Pressure</Label>
                    <Input
                      id="bp"
                      placeholder="120/80"
                      value={vitalSigns.bloodPressure}
                      onChange={(e) => setVitalSigns({...vitalSigns, bloodPressure: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hr" className="text-xs">Heart Rate (bpm)</Label>
                    <Input
                      id="hr"
                      type="number"
                      placeholder="72"
                      value={vitalSigns.heartRate}
                      onChange={(e) => setVitalSigns({...vitalSigns, heartRate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rr" className="text-xs">Respiratory Rate</Label>
                    <Input
                      id="rr"
                      type="number"
                      placeholder="16"
                      value={vitalSigns.respiratoryRate}
                      onChange={(e) => setVitalSigns({...vitalSigns, respiratoryRate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="spo2" className="text-xs">SpO2 (%)</Label>
                    <Input
                      id="spo2"
                      type="number"
                      placeholder="98"
                      value={vitalSigns.oxygenSaturation}
                      onChange={(e) => setVitalSigns({...vitalSigns, oxygenSaturation: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleAnalyze} 
                  disabled={loading || !symptoms}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      AI Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {aiResponse ? (
            <>
              {/* Diagnosis Results */}
              {aiResponse.diagnoses && aiResponse.diagnoses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Possible Diagnoses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiResponse.diagnoses.map((diagnosis, index) => (
                        <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg">{diagnosis.condition}</h4>
                                <Badge variant={diagnosis.probability > 70 ? 'default' : 'outline'}>
                                  {diagnosis.probability}% Probability
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{diagnosis.description}</p>
                              <div className="flex items-center gap-4 mt-3">
                                <span className="text-xs text-gray-500">
                                  ICD-10: {diagnosis.icd10_code || 'N/A'}
                                </span>
                                {diagnosis.confidence && (
                                  <span className="text-xs text-gray-500">
                                    Confidence: {diagnosis.confidence}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Treatment Recommendations */}
              {aiResponse.treatments && aiResponse.treatments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-green-600" />
                      Treatment Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {aiResponse.treatments.map((treatment, index) => (
                        <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-2">{treatment.type}</h4>
                              <p className="text-sm text-gray-700 mb-3">{treatment.recommendation}</p>
                              {treatment.medications && treatment.medications.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Suggested Medications:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {treatment.medications.map((med, i) => (
                                      <Badge key={i} variant="outline" className="bg-white">
                                        {med}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {treatment.dosage && (
                                <p className="text-xs text-gray-600 mt-2">Dosage: {treatment.dosage}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Factors */}
              {aiResponse.risk_factors && aiResponse.risk_factors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      Risk Factors & Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {aiResponse.risk_factors.map((risk, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded">
                          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Confidence Score */}
              {aiResponse.confidence && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      AI Confidence Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-purple-600 h-4 rounded-full transition-all"
                            style={{ width: `${aiResponse.confidence}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-purple-600">
                        {aiResponse.confidence}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      This score indicates the AI's confidence in the analysis based on the provided information.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Disclaimer */}
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-900">Clinical Judgment Required</p>
                      <p className="text-yellow-800 mt-1">
                        AI suggestions are meant to assist clinical decision-making, not replace it. 
                        Always use professional judgment and consider the complete clinical picture.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No analysis results yet. Run an AI analysis to see results here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Auto Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Auto-Generated Clinical Notes</CardTitle>
                  <CardDescription>AI-powered SOAP note generation</CardDescription>
                </div>
                {aiResponse && (
                  <Button
                    onClick={handleGenerateNotes}
                    disabled={isGeneratingNotes}
                    variant="outline"
                  >
                    {isGeneratingNotes ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Notes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedNotes ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Subjective (S)</Label>
                    <div className="relative">
                      <Textarea
                        value={generatedNotes.subjective || ''}
                        readOnly
                        rows={3}
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatedNotes.subjective)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Objective (O)</Label>
                    <div className="relative">
                      <Textarea
                        value={generatedNotes.objective || ''}
                        readOnly
                        rows={3}
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatedNotes.objective)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Assessment (A)</Label>
                    <div className="relative">
                      <Textarea
                        value={generatedNotes.assessment || ''}
                        readOnly
                        rows={3}
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatedNotes.assessment)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Plan (P)</Label>
                    <div className="relative">
                      <Textarea
                        value={generatedNotes.plan || ''}
                        readOnly
                        rows={3}
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatedNotes.plan)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSaveNotes}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save to SOAP Notes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const fullNotes = `SUBJECTIVE:\n${generatedNotes.subjective}\n\nOBJECTIVE:\n${generatedNotes.objective}\n\nASSESSMENT:\n${generatedNotes.assessment}\n\nPLAN:\n${generatedNotes.plan}`
                        copyToClipboard(fullNotes)
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No notes generated yet.</p>
                  <p className="text-sm mt-2">Complete an AI analysis first, then generate notes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>Previous AI consultations for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              {analysisHistory.length > 0 ? (
                <div className="space-y-3">
                  {analysisHistory.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{item.primary_diagnosis || 'Consultation'}</p>
                          <p className="text-sm text-gray-600 mt-1">{item.symptoms || 'No symptoms recorded'}</p>
                          {item.confidence && (
                            <Badge variant="outline" className="mt-2">
                              {item.confidence}% Confidence
                            </Badge>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(item.created_at || Date.now()).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAiResponse(item)
                            setSymptoms(item.symptoms || '')
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No previous AI consultations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
