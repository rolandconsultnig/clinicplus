import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Users, Clock, CheckCircle, UserPlus, RefreshCw, ClipboardCheck } from 'lucide-react'
import { apiService } from '../services/apiService'

const STATUS_LABELS = {
  booked: 'Booked',
  arrived: 'Arrived',
  registered: 'Registered',
  triaged: 'Triaged',
  in_queue: 'In Queue',
  in_consultation: 'In Consultation',
  investigations_ordered: 'Investigations Ordered',
  investigations_completed: 'Investigations Completed',
  review_completed: 'Review Completed',
  pharmacy_completed: 'Pharmacy Completed',
  billing_completed: 'Billing Completed',
  discharged: 'Discharged'
}

const STATUS_COLORS = {
  booked: 'bg-teal-100 text-teal-800',
  arrived: 'bg-cyan-100 text-cyan-800',
  registered: 'bg-yellow-100 text-yellow-800',
  triaged: 'bg-orange-100 text-orange-800',
  in_queue: 'bg-amber-100 text-amber-800',
  in_consultation: 'bg-teal-100 text-teal-900',
  investigations_ordered: 'bg-teal-100 text-teal-900',
  investigations_completed: 'bg-violet-100 text-violet-800',
  review_completed: 'bg-teal-50 text-rose-800',
  pharmacy_completed: 'bg-emerald-100 text-emerald-800',
  billing_completed: 'bg-green-100 text-green-800',
  discharged: 'bg-gray-100 text-gray-800'
}

const WORKFLOW_SEQUENCE = [
  { key: 'booked', label: 'Book' },
  { key: 'arrived', label: 'Arrival' },
  { key: 'registered', label: 'Verify' },
  { key: 'triaged', label: 'Triage' },
  { key: 'in_queue', label: 'Queue' },
  { key: 'in_consultation', label: 'Consult' },
  { key: 'investigations_ordered', label: 'Investigations' },
  { key: 'investigations_completed', label: 'Results' },
  { key: 'review_completed', label: 'Review' },
  { key: 'pharmacy_completed', label: 'Pharmacy' },
  { key: 'billing_completed', label: 'Billing' },
  { key: 'discharged', label: 'Discharge' }
]

export default function OPDQueueManagement() {
  const [visits, setVisits] = useState([])
  const [queue, setQueue] = useState([])
  const [stats, setStats] = useState({ waiting: 0, inProgress: 0, completed: 0, avgWaitTime: 0 })
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [visitsRes, queueRes, statsRes, deptRes] = await Promise.all([
        apiService.request('/opd/visits'),
        apiService.request('/opd/queue?status=waiting'),
        apiService.request('/opd/stats'),
        apiService.request('/opd/departments')
      ])
      setVisits(visitsRes.visits || [])
      setQueue(queueRes.queue || [])
      setStats(statsRes.stats || { waiting: 0, inProgress: 0, completed: 0, avgWaitTime: 0 })
      setDepartments(deptRes.departments || [])
      if (!selectedDepartment && (deptRes.departments || []).length > 0) {
        setSelectedDepartment(deptRes.departments[0])
      }
    } catch (error) {
      console.error('Failed to load OPD data', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredVisits = useMemo(() => {
    if (!selectedDepartment) return visits
    return visits.filter(v => !v.department || v.department === selectedDepartment)
  }, [visits, selectedDepartment])

  const submitWalkIn = async (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    const payload = {
      patient_id: Number(form.get('patient_id')),
      chief_complaint: form.get('chief_complaint'),
      department: form.get('department') || null,
      insurance_plan: form.get('insurance_plan') || null,
      registration_fee_paid: form.get('registration_fee_paid') === 'yes',
      registration_fee_amount: Number(form.get('registration_fee_amount') || 0)
    }
    try {
      await apiService.request('/opd/visits/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      event.target.reset()
      await loadData()
    } catch (error) {
      alert(error.message || 'Failed to register walk-in visit')
    }
  }

  const submitBooking = async (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    const payload = {
      patient_id: Number(form.get('patient_id')),
      appointment_date: form.get('appointment_date'),
      booking_source: form.get('booking_source'),
      chief_complaint: form.get('chief_complaint'),
      department: form.get('department') || null,
      insurance_plan: form.get('insurance_plan') || null
    }
    try {
      await apiService.request('/opd/visits/book', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      event.target.reset()
      await loadData()
    } catch (error) {
      alert(error.message || 'Failed to book visit')
    }
  }

  const callPatient = async (queueId) => {
    try {
      await apiService.request(`/opd/queue/${queueId}/call`, { method: 'POST', body: JSON.stringify({}) })
      await loadData()
    } catch (error) {
      alert(error.message || 'Failed to call patient')
    }
  }

  const markStage = async (visit, stage) => {
    try {
      if (stage === 'discharge') {
        const pendingSteps = getPendingDischargeSteps(visit)
        if (pendingSteps.length > 0) {
          alert(`Cannot discharge yet. Pending steps: ${pendingSteps.join(', ')}`)
          return
        }
      }

      if (stage === 'arrival') {
        await apiService.request(`/opd/visits/${visit.id}/arrival`, { method: 'POST', body: JSON.stringify({}) })
      } else if (stage === 'verify') {
        await apiService.request(`/opd/visits/${visit.id}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            registration_fee_paid: true,
            registration_fee_amount: visit.registration_fee_amount || 0,
            verification_notes: 'Identity and insurance verified'
          })
        })
      } else if (stage === 'triage') {
        await apiService.request(`/opd/visits/${visit.id}/triage`, {
          method: 'POST',
          body: JSON.stringify({ priority: 'normal', notes: 'Initial triage completed', vitals: {} })
        })
      } else if (stage === 'assign') {
        const providerInput = window.prompt('Enter Provider ID to assign:')
        const providerId = Number(providerInput)
        if (!providerId) return
        await apiService.request(`/opd/visits/${visit.id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId, clinic_name: visit.department || 'General Clinic' })
        })
      } else if (stage === 'review') {
        await apiService.request(`/opd/visits/${visit.id}/review`, {
          method: 'POST',
          body: JSON.stringify({ follow_up_required: false })
        })
      } else if (stage === 'pharmacy') {
        await apiService.request(`/opd/visits/${visit.id}/pharmacy/complete`, { method: 'POST', body: JSON.stringify({}) })
      } else if (stage === 'billing') {
        const totalAmount = Number(window.prompt('Enter total billing amount:', `${visit.total_billing_amount || 0}`) || 0)
        await apiService.request(`/opd/visits/${visit.id}/billing/settle`, {
          method: 'POST',
          body: JSON.stringify({ total_amount: totalAmount })
        })
      } else if (stage === 'discharge') {
        await apiService.request(`/opd/visits/${visit.id}/discharge`, {
          method: 'POST',
          body: JSON.stringify({
            visit_summary: 'Outpatient visit completed successfully.',
            discharge_notes: 'Follow medication and follow-up advice.'
          })
        })
      }
      await loadData()
    } catch (error) {
      const missingSteps = error?.details?.missing_steps
      if (Array.isArray(missingSteps) && missingSteps.length > 0) {
        alert(`Cannot complete this step yet. Pending: ${missingSteps.join(', ')}`)
      } else {
        alert(error.message || 'Failed to update visit stage')
      }
    }
  }

  const nextAction = (visit) => {
    switch (visit.workflow_status) {
      case 'booked': return { label: 'Mark Arrival', stage: 'arrival' }
      case 'arrived': return { label: 'Verify Registration', stage: 'verify' }
      case 'registered': return { label: 'Complete Triage', stage: 'triage' }
      case 'triaged': return { label: 'Assign Provider', stage: 'assign' }
      case 'investigations_completed': return { label: 'Complete Review', stage: 'review' }
      case 'review_completed': return { label: 'Mark Pharmacy Done', stage: 'pharmacy' }
      case 'pharmacy_completed': return { label: 'Complete Billing', stage: 'billing' }
      case 'billing_completed': return { label: 'Discharge', stage: 'discharge' }
      default: return null
    }
  }

  const getPendingDischargeSteps = (visit) => {
    const pending = []
    if (!visit.review_completed) pending.push('Review')
    if (!visit.pharmacy_completed) pending.push('Pharmacy')
    if (!visit.billing_completed) pending.push('Billing')
    return pending
  }

  const getTimelineState = (visit, stepKey) => {
    const progress = visit.step_progress || []
    const progressItem = progress.find((p) => p.step === stepKey)
    if (progressItem?.current) return 'current'
    if (progressItem?.completed) return 'done'
    return 'pending'
  }

  const getTimelineClass = (state) => {
    if (state === 'done') return 'bg-green-100 text-green-700 border-green-200'
    if (state === 'current') return 'bg-teal-100 text-teal-800 border-teal-200'
    return 'bg-gray-50 text-gray-500 border-gray-200'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8 text-teal-700" />
            Outpatient Visit Workflow
          </h1>
          <p className="text-gray-600 mt-1">Booking, triage, consultation, diagnostics, pharmacy, billing, discharge</p>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Waiting</p><p className="text-3xl font-bold text-yellow-600">{stats.waiting}</p></div><Clock className="w-8 h-8 text-yellow-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm text-gray-600">In Progress</p><p className="text-3xl font-bold text-teal-700">{stats.inProgress}</p></div><ClipboardCheck className="w-8 h-8 text-teal-700" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Completed</p><p className="text-3xl font-bold text-green-600">{stats.completed}</p></div><CheckCircle className="w-8 h-8 text-green-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm text-gray-600">Avg Wait</p><p className="text-3xl font-bold text-teal-700">{stats.avgWaitTime}m</p></div><Clock className="w-8 h-8 text-teal-700" /></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Label>Department</Label>
            <select className="px-3 py-2 border rounded-md" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
              <option value="">All</option>
              {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflow">Visit Workflow</TabsTrigger>
          <TabsTrigger value="queue">Consultation Queue</TabsTrigger>
          <TabsTrigger value="registration">Register / Book</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-3">
          {filteredVisits.map((visit) => {
            const action = nextAction(visit)
            const pendingDischargeSteps = getPendingDischargeSteps(visit)
            const dischargeLocked = action?.stage === 'discharge' && pendingDischargeSteps.length > 0
            return (
              <Card key={visit.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Visit {visit.visit_id}</p>
                        <Badge className={STATUS_COLORS[visit.workflow_status] || 'bg-gray-100 text-gray-800'}>
                          {STATUS_LABELS[visit.workflow_status] || visit.workflow_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Token: {visit.registration_token || '-'} | Dept: {visit.department || 'General'} | Complaint: {visit.chief_complaint || '-'}
                      </p>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {WORKFLOW_SEQUENCE.map((step) => {
                          const state = getTimelineState(visit, step.key)
                          return (
                            <div
                              key={`${visit.id}-${step.key}`}
                              className={`text-xs border rounded px-2 py-1 ${getTimelineClass(state)}`}
                              title={`${step.label}: ${state}`}
                            >
                              {step.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {action && (
                      <Button
                        size="sm"
                        disabled={dischargeLocked}
                        onClick={() => markStage(visit, action.stage)}
                        title={dischargeLocked ? `Pending: ${pendingDischargeSteps.join(', ')}` : action.label}
                      >
                        {action.label}
                      </Button>
                    )}
                  </div>
                  {dischargeLocked && (
                    <p className="text-xs text-amber-700 mt-3">
                      Discharge locked: complete {pendingDischargeSteps.join(', ')} first.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {filteredVisits.length === 0 && (
            <Card><CardContent className="py-10 text-center text-gray-500">No OPD visits found for this filter.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-3">
          {queue.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Queue #{item.queue_number} - Position {item.queue_position}</p>
                  <p className="text-sm text-gray-600">{item.patient?.name || 'Unknown patient'} | {item.patient?.chief_complaint || '-'}</p>
                </div>
                <Button size="sm" onClick={() => callPatient(item.id)}>Call Patient</Button>
              </CardContent>
            </Card>
          ))}
          {queue.length === 0 && (
            <Card><CardContent className="py-10 text-center text-gray-500">No waiting patients in queue.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="registration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Walk-in Registration</CardTitle>
                <CardDescription>For arriving patients (Step 2-3)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitWalkIn} className="space-y-3">
                  <div><Label>Patient ID</Label><Input name="patient_id" type="number" required /></div>
                  <div><Label>Chief Complaint</Label><Input name="chief_complaint" required /></div>
                  <div><Label>Department</Label><Input name="department" placeholder="General Medicine" /></div>
                  <div><Label>Insurance Plan</Label><Input name="insurance_plan" /></div>
                  <div><Label>Registration Fee Paid</Label><select name="registration_fee_paid" className="w-full px-3 py-2 border rounded-md"><option value="yes">Yes</option><option value="no">No</option></select></div>
                  <div><Label>Registration Fee Amount</Label><Input name="registration_fee_amount" type="number" step="0.01" defaultValue="0" /></div>
                  <Button type="submit" className="w-full">Register Walk-in</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Booking</CardTitle>
                <CardDescription>Pre-book OPD visit (Step 1)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitBooking} className="space-y-3">
                  <div><Label>Patient ID</Label><Input name="patient_id" type="number" required /></div>
                  <div><Label>Appointment Date</Label><Input name="appointment_date" type="date" required /></div>
                  <div><Label>Booking Source</Label><select name="booking_source" className="w-full px-3 py-2 border rounded-md"><option value="online">Online</option><option value="phone">Phone</option><option value="walk_in">Walk-in</option><option value="referral">Referral</option></select></div>
                  <div><Label>Department</Label><Input name="department" placeholder="General Medicine" /></div>
                  <div><Label>Chief Complaint</Label><Input name="chief_complaint" required /></div>
                  <div><Label>Insurance Plan</Label><Input name="insurance_plan" /></div>
                  <Button type="submit" className="w-full">Book Visit</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
