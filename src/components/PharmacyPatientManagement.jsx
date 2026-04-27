/**
 * Pharmacy Patient Management Module
 * Patient profiles with medication history, allergies, preferences, reminders, and CRM tools
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import {
  User,
  Search,
  Pill,
  AlertTriangle,
  Bell,
  Star,
  Plus
} from 'lucide-react'
import { apiService } from '../services/apiService'

export default function PharmacyPatientManagement() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patients, setPatients] = useState([])
  const [medicationHistory, setMedicationHistory] = useState([])
  const [allergies, setAllergies] = useState([])
  const [reminders, setReminders] = useState([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [newReminder, setNewReminder] = useState({
    type: 'refill',
    method: 'sms',
    days_before: 3
  })

  useEffect(() => {
    if (selectedPatient) {
      loadPatientDetails()
    }
  }, [selectedPatient])

  const searchPatients = async () => {
    if (!searchQuery.trim()) {
      setPatients([])
      setSelectedPatient(null)
      return
    }

    setSearchLoading(true)
    setErrorMessage('')
    try {
      const response = await apiService.request(`/patients/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.success) {
        setPatients(response.patients || [])
      }
    } catch (error) {
      console.error('Error searching patients:', error)
      setPatients([])
      setErrorMessage(error.message || 'Failed to search patients')
    } finally {
      setSearchLoading(false)
    }
  }

  const loadPatientDetails = async () => {
    if (!selectedPatient) return

    const patientId = selectedPatient.id
    setDetailsLoading(true)
    setErrorMessage('')
    try {
      const [historyRes, allergiesRes, remindersRes, loyaltyRes] = await Promise.all([
        apiService.request(`/pharmacy/patients/${patientId}/medication-history`),
        apiService.request(`/pharmacy/patients/${patientId}/allergies`),
        apiService.request(`/pharmacy/patients/${patientId}/reminders`),
        apiService.request(`/pharmacy/patients/${patientId}/loyalty`)
      ])

      setMedicationHistory(historyRes.history || [])
      setAllergies(allergiesRes.allergies || [])
      setReminders(remindersRes.reminders || [])
      setLoyaltyPoints(loyaltyRes.points || 0)
    } catch (error) {
      console.error('Error loading patient details:', error)
      setErrorMessage(error.message || 'Failed to load patient details')
      setMedicationHistory([])
      setAllergies([])
      setReminders([])
      setLoyaltyPoints(0)
    } finally {
      setDetailsLoading(false)
    }
  }

  const createReminder = async () => {
    if (!selectedPatient) return
    
    try {
      const response = await apiService.request(`/pharmacy/patients/${selectedPatient.id}/reminders`, {
        method: 'POST',
        body: JSON.stringify(newReminder)
      })
      
      if (response.success) {
        setReminders((prev) => [...prev, response.reminder])
        setShowReminderModal(false)
        setNewReminder({ type: 'refill', method: 'sms', days_before: 3 })
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      alert('Failed to create reminder')
    }
  }

  const sendReminder = async (reminderId) => {
    try {
      const response = await apiService.request(`/pharmacy/reminders/${reminderId}/send`, {
        method: 'POST'
      })
      
      if (response.success) {
        alert('Reminder sent successfully')
        loadPatientDetails()
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Failed to send reminder')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <p className="text-gray-600">Manage patient profiles, medication history, and reminders</p>
        </div>
      </div>
      {errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Search */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Search Patients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
                />
                <Button onClick={searchPatients} disabled={searchLoading}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchLoading && (
                  <p className="text-sm text-gray-500">Searching patients...</p>
                )}
                {!searchLoading && patients.length === 0 && searchQuery.trim() && (
                  <p className="text-sm text-gray-500">No patients found for your search.</p>
                )}
                {patients.map(patient => (
                  <div
                    key={patient.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedPatient?.id === patient.id ? 'bg-teal-50 border-teal-500' : ''
                    }`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <p className="font-semibold">{patient.first_name} {patient.last_name}</p>
                    <p className="text-sm text-gray-600">{patient.phone}</p>
                    <p className="text-xs text-gray-500">ID: {patient.universal_patient_id}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Patient Details */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="medications">Medication History</TabsTrigger>
                <TabsTrigger value="allergies">Allergies</TabsTrigger>
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
                <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Patient Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <p className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                      </div>
                      <div>
                        <Label>Date of Birth</Label>
                        <p className="font-semibold">{selectedPatient.date_of_birth}</p>
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <p className="font-semibold">{selectedPatient.phone}</p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p className="font-semibold">{selectedPatient.email || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Patient ID</Label>
                        <p className="font-semibold">{selectedPatient.universal_patient_id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Medication History Tab */}
              <TabsContent value="medications">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5" />
                      Medication History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailsLoading && <p className="text-sm text-gray-500">Loading medication history...</p>}
                      {!detailsLoading && medicationHistory.length === 0 && (
                        <p className="text-sm text-gray-500">No medication history found.</p>
                      )}
                      {medicationHistory.map((med, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{med.medication}</p>
                              <p className="text-sm text-gray-600">Prescribed by: {med.prescriber}</p>
                              <p className="text-sm text-gray-600">
                                {med.startDate} - {med.endDate || 'Ongoing'}
                              </p>
                            </div>
                            <Badge variant={med.status === 'active' ? 'default' : 'secondary'}>
                              {med.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Allergies Tab */}
              <TabsContent value="allergies">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Allergies & Reactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailsLoading && <p className="text-sm text-gray-500">Loading allergies...</p>}
                      {!detailsLoading && allergies.length === 0 && (
                        <p className="text-sm text-gray-500">No allergies recorded for this patient.</p>
                      )}
                      {allergies.map((allergy, index) => (
                        <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-lg">{allergy.allergen}</p>
                              <p className="text-sm">Severity: {allergy.severity}</p>
                              <p className="text-sm">Reaction: {allergy.reaction}</p>
                            </div>
                            <Badge variant="destructive">{allergy.severity}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reminders Tab */}
              <TabsContent value="reminders">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Automated Reminders
                    </CardTitle>
                    <Button onClick={() => setShowReminderModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Reminder
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailsLoading && <p className="text-sm text-gray-500">Loading reminders...</p>}
                      {!detailsLoading && reminders.length === 0 && (
                        <p className="text-sm text-gray-500">No reminders configured.</p>
                      )}
                      {reminders.map((reminder, index) => (
                        <div key={reminder.id || index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold">{reminder.medication}</p>
                              <p className="text-sm text-gray-600">Type: {reminder.type}</p>
                              <p className="text-sm text-gray-600">Date: {reminder.date}</p>
                              <p className="text-sm text-gray-600">Method: {(reminder.method || 'sms').toUpperCase()}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant={reminder.status === 'pending' ? 'secondary' : 'default'}>
                                {reminder.status}
                              </Badge>
                              {reminder.status === 'pending' && (
                                <Button size="sm" onClick={() => sendReminder(reminder.id)}>
                                  Send Now
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Loyalty Tab */}
              <TabsContent value="loyalty">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Loyalty Program
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="text-4xl font-bold text-yellow-500 mb-2">{loyaltyPoints}</div>
                      <p className="text-gray-600">Loyalty Points</p>
                      <p className="text-sm text-gray-500 mt-4">
                        Points can be redeemed for discounts on future purchases
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Select a patient to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Create Reminder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Reminder Type</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={newReminder.type}
                  onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                >
                  <option value="refill">Refill Reminder</option>
                  <option value="pickup">Pickup Reminder</option>
                  <option value="appointment">Appointment Reminder</option>
                </select>
              </div>
              <div>
                <Label>Method</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={newReminder.method}
                  onChange={(e) => setNewReminder({ ...newReminder, method: e.target.value })}
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <Label>Days Before</Label>
                <Input
                  type="number"
                  value={newReminder.days_before}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10)
                    setNewReminder({ ...newReminder, days_before: Number.isNaN(parsed) ? 0 : parsed })
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={createReminder}>
                  Create
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowReminderModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

