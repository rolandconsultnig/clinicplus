import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { ClipboardCheck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { apiService } from '../services/apiService'

export default function NursingMARWorkflow() {
  const [loading, setLoading] = useState(false)
  const [submittingId, setSubmittingId] = useState(null)
  const [error, setError] = useState('')
  const [shift, setShift] = useState('all')
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10))
  const [timeline, setTimeline] = useState([])
  const [history, setHistory] = useState([])
  const [reasonMap, setReasonMap] = useState({})

  const loadMar = async () => {
    setLoading(true)
    setError('')
    try {
      const marRes = await apiService.request(`/provider-workflows/nurse/mar?date=${encodeURIComponent(targetDate)}&shift=${encodeURIComponent(shift)}`)
      const histRes = await apiService.request(`/provider-workflows/nurse/mar/history?start_date=${encodeURIComponent(targetDate)}&end_date=${encodeURIComponent(targetDate)}&limit=25`)
      setTimeline(marRes.timeline || [])
      setHistory(histRes.history || [])
    } catch (err) {
      console.error('Failed to load MAR workflow:', err)
      setError(err.message || 'Failed to load MAR workflow')
      setTimeline([])
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMar()
  }, [targetDate, shift])

  const stats = useMemo(() => ({
    total: timeline.length,
    due: timeline.filter((row) => row.is_due || row.is_overdue).length,
    overdue: timeline.filter((row) => row.is_overdue).length,
    completed: history.filter((row) => row.status === 'administered').length
  }), [timeline, history])

  const submitAction = async (row, action) => {
    const reason = reasonMap[row.medication.id] || ''
    if ((action === 'held' || action === 'refused' || action === 'missed') && !reason.trim()) {
      alert('Please provide a reason for held/refused/missed actions')
      return
    }
    setSubmittingId(row.medication.id)
    try {
      await apiService.request('/provider-workflows/nurse/mar', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: row.patient.id,
          medication_id: row.medication.id,
          action,
          scheduled_time: row.slot_time,
          dose_given: row.medication.dosage || null,
          reason: reason || null
        })
      })
      setReasonMap((prev) => ({ ...prev, [row.medication.id]: '' }))
      await loadMar()
    } catch (err) {
      console.error('Failed to submit MAR action:', err)
      alert(err.message || 'Failed to submit MAR action')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nursing MAR Workflow</h1>
        <p className="text-gray-600">Medication administration worklist, action capture, and near-real-time audit visibility.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Slots</p><p className="text-2xl font-bold">{stats.total}</p></div><ClipboardCheck className="w-5 h-5 text-teal-700" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Due Now</p><p className="text-2xl font-bold">{stats.due}</p></div><Clock className="w-5 h-5 text-amber-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Overdue</p><p className="text-2xl font-bold">{stats.overdue}</p></div><AlertTriangle className="w-5 h-5 text-red-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Completed Today</p><p className="text-2xl font-bold">{stats.completed}</p></div><CheckCircle2 className="w-5 h-5 text-green-600" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <CardTitle className="mr-auto">MAR Queue</CardTitle>
          <div className="flex items-center gap-2">
            <Label>Date</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-44" />
          </div>
          <select
            className="h-10 px-3 border rounded-md text-sm"
            value={shift}
            onChange={(e) => setShift(e.target.value)}
          >
            <option value="all">All Shifts</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <p className="text-sm text-gray-500">Loading MAR timeline...</p>}
          {!loading && timeline.length === 0 && <p className="text-sm text-gray-500">No medications scheduled for selected date/shift.</p>}

          {timeline.map((row, idx) => (
            <div key={`${row.patient.id}-${row.medication.id}-${idx}`} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{row.patient.name} · {row.medication.name}</p>
                  <p className="text-sm text-gray-600">{row.medication.dosage || 'Dose N/A'} · {row.medication.route || 'Route N/A'} · {new Date(row.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex gap-2">
                  {row.is_overdue && <Badge variant="destructive">Overdue</Badge>}
                  {row.status && <Badge variant={row.status === 'administered' ? 'default' : 'secondary'}>{row.status}</Badge>}
                </div>
              </div>
              <Input
                placeholder="Reason (required for held/refused/missed)"
                value={reasonMap[row.medication.id] || ''}
                onChange={(e) => setReasonMap((prev) => ({ ...prev, [row.medication.id]: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={submittingId === row.medication.id} onClick={() => submitAction(row, 'administered')}>Administer</Button>
                <Button size="sm" variant="outline" disabled={submittingId === row.medication.id} onClick={() => submitAction(row, 'held')}>Hold</Button>
                <Button size="sm" variant="outline" disabled={submittingId === row.medication.id} onClick={() => submitAction(row, 'refused')}>Refused</Button>
                <Button size="sm" variant="outline" disabled={submittingId === row.medication.id} onClick={() => submitAction(row, 'missed')}>Missed</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent MAR Audit Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-gray-500">No recent MAR events for selected date.</p>}
          {history.map((entry) => (
            <div key={entry.administration_id} className="p-3 border rounded-md flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{entry.patient?.name} · {entry.medication?.name}</p>
                <p className="text-xs text-gray-500">{entry.recorded_at ? new Date(entry.recorded_at).toLocaleString() : 'No timestamp'} · Nurse: {entry.nurse?.name || 'N/A'}</p>
              </div>
              <Badge variant={entry.status === 'administered' ? 'default' : 'secondary'}>{entry.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
