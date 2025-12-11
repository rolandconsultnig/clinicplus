/**
 * OPD Queue Management Component
 * Outpatient Department queue and token system
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Users, 
  Clock, 
  CheckCircle, 
  UserPlus,
  Bell,
  Monitor,
  Printer,
  RefreshCw,
  ArrowRight,
  XCircle
} from 'lucide-react'
import apiService from '../services/apiService'

export default function OPDQueueManagement() {
  const [queue, setQueue] = useState([])
  const [currentToken, setCurrentToken] = useState(null)
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('general')
  const [stats, setStats] = useState({
    waiting: 0,
    inProgress: 0,
    completed: 0,
    avgWaitTime: 0
  })

  useEffect(() => {
    loadQueueData()
    const interval = setInterval(loadQueueData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [selectedDepartment])

  const loadQueueData = async () => {
    try {
      const [queueRes, statsRes, deptRes] = await Promise.all([
        apiService.request(`/opd/queue?department=${selectedDepartment}`),
        apiService.request(`/opd/stats?department=${selectedDepartment}`),
        apiService.request('/opd/departments')
      ])
      
      setQueue(queueRes.queue || [])
      setStats(statsRes.stats || stats)
      setDepartments(deptRes.departments || [])
      setCurrentToken(queueRes.current_token || null)
    } catch (error) {
      console.error('Error loading queue data:', error)
    }
  }

  const generateToken = async (patientData) => {
    try {
      const response = await apiService.request('/opd/generate-token', {
        method: 'POST',
        body: JSON.stringify({
          ...patientData,
          department: selectedDepartment
        })
      })
      
      alert(`Token generated: ${response.token_number}`)
      loadQueueData()
      
      // Print token
      if (response.token_number) {
        printToken(response)
      }
    } catch (error) {
      alert('Failed to generate token: ' + error.message)
    }
  }

  const callNextPatient = async () => {
    try {
      const response = await apiService.request('/opd/call-next', {
        method: 'POST',
        body: JSON.stringify({ department: selectedDepartment })
      })
      
      setCurrentToken(response.token)
      loadQueueData()
      
      // Trigger announcement
      announceToken(response.token)
    } catch (error) {
      alert('Failed to call next patient: ' + error.message)
    }
  }

  const completeConsultation = async (tokenId) => {
    try {
      await apiService.request(`/opd/complete/${tokenId}`, {
        method: 'POST'
      })
      
      loadQueueData()
    } catch (error) {
      alert('Failed to complete: ' + error.message)
    }
  }

  const cancelToken = async (tokenId) => {
    try {
      await apiService.request(`/opd/cancel/${tokenId}`, {
        method: 'POST'
      })
      
      loadQueueData()
    } catch (error) {
      alert('Failed to cancel: ' + error.message)
    }
  }

  const printToken = (tokenData) => {
    const printWindow = window.open('', '', 'height=400,width=300')
    printWindow.document.write(`
      <html>
        <head>
          <title>OPD Token</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 20px; }
            .token { font-size: 48px; font-weight: bold; margin: 20px 0; }
            .info { font-size: 14px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h2>Clinic+ OPD</h2>
          <div class="token">${tokenData.token_number}</div>
          <div class="info">Patient: ${tokenData.patient_name}</div>
          <div class="info">Department: ${tokenData.department}</div>
          <div class="info">Time: ${new Date().toLocaleTimeString()}</div>
          <div class="info">Estimated Wait: ${tokenData.estimated_wait} min</div>
          <p style="font-size: 12px; margin-top: 30px;">Please wait for your token to be called</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const announceToken = (token) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Token number ${token.token_number}, please proceed to consultation room ${token.room_number}`
      )
      window.speechSynthesis.speak(utterance)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            OPD Queue Management
          </h1>
          <p className="text-gray-600 mt-1">Token system and patient queue</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadQueueData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={callNextPatient}>
            <Bell className="w-4 h-4 mr-2" />
            Call Next
          </Button>
        </div>
      </div>

      {/* Department Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Department:</Label>
            <select
              className="px-4 py-2 border rounded-md"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="general">General Medicine</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="cardiology">Cardiology</option>
              <option value="dermatology">Dermatology</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waiting</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.waiting}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Monitor className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Wait Time</p>
                <p className="text-3xl font-bold text-purple-600">{stats.avgWaitTime}m</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Token Display */}
      {currentToken && (
        <Card className="bg-blue-50 border-2 border-blue-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">NOW SERVING</p>
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {currentToken.token_number}
              </div>
              <p className="text-lg">
                {currentToken.patient_name} - Room {currentToken.room_number}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queue">Queue ({queue.filter(t => t.status === 'waiting').length})</TabsTrigger>
          <TabsTrigger value="register">Register Patient</TabsTrigger>
          <TabsTrigger value="display">Display Board</TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-3">
          {queue.length > 0 ? (
            queue.map((token) => (
              <Card key={token.id} className={token.status === 'in_progress' ? 'border-2 border-blue-500' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {token.token_number}
                        </div>
                        <Badge className={getStatusColor(token.status)} variant="outline">
                          {token.status}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{token.patient_name}</h3>
                        <p className="text-sm text-gray-600">
                          Age: {token.age} | Gender: {token.gender}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Registered: {new Date(token.created_at).toLocaleTimeString()}
                          {token.wait_time && ` | Waiting: ${token.wait_time} min`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {token.status === 'waiting' && (
                        <Button size="sm" onClick={() => {
                          setCurrentToken(token)
                          announceToken(token)
                        }}>
                          <Bell className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      )}
                      {token.status === 'in_progress' && (
                        <Button size="sm" variant="outline" onClick={() => completeConsultation(token.id)}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => cancelToken(token.id)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No patients in queue</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Register Tab */}
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Register New Patient
              </CardTitle>
              <CardDescription>Generate token for OPD consultation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                generateToken({
                  patient_name: formData.get('patient_name'),
                  age: formData.get('age'),
                  gender: formData.get('gender'),
                  phone: formData.get('phone'),
                  visit_type: formData.get('visit_type')
                })
                e.target.reset()
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient Name *</Label>
                    <Input name="patient_name" required placeholder="Enter full name" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input name="phone" type="tel" placeholder="Enter phone" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Age *</Label>
                    <Input name="age" type="number" required placeholder="Age" />
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <select name="gender" className="w-full px-3 py-2 border rounded-md" required>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <Label>Visit Type</Label>
                    <select name="visit_type" className="w-full px-3 py-2 border rounded-md">
                      <option value="new">New Patient</option>
                      <option value="followup">Follow-up</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Printer className="w-4 h-4 mr-2" />
                  Generate Token & Print
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Board Tab */}
        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Display Board View
              </CardTitle>
              <CardDescription>Patient-facing queue display</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-white p-8 rounded-lg">
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-bold mb-2">OPD Queue - {selectedDepartment}</h2>
                  <p className="text-gray-400">{new Date().toLocaleString()}</p>
                </div>
                
                {currentToken && (
                  <div className="bg-blue-600 p-6 rounded-lg mb-6 text-center">
                    <p className="text-lg mb-2">NOW SERVING</p>
                    <div className="text-7xl font-bold mb-2">{currentToken.token_number}</div>
                    <p className="text-xl">Room {currentToken.room_number}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800 p-4 rounded">
                    <p className="text-gray-400 text-sm">Waiting</p>
                    <p className="text-3xl font-bold">{stats.waiting}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded">
                    <p className="text-gray-400 text-sm">In Progress</p>
                    <p className="text-3xl font-bold">{stats.inProgress}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded">
                    <p className="text-gray-400 text-sm">Avg Wait</p>
                    <p className="text-3xl font-bold">{stats.avgWaitTime}m</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-4">Upcoming</h3>
                  <div className="space-y-2">
                    {queue.filter(t => t.status === 'waiting').slice(0, 5).map((token) => (
                      <div key={token.id} className="bg-gray-800 p-3 rounded flex items-center justify-between">
                        <span className="text-2xl font-bold">{token.token_number}</span>
                        <span className="text-gray-400">Waiting...</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
