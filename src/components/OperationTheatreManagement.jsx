import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Scissors, Plus, Clock, Activity } from 'lucide-react'
import { apiService } from '../services/apiService'

const STATUS_OPTIONS = ['all', 'scheduled', 'in_progress', 'completed', 'cancelled']

export default function OperationTheatreManagement() {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [surgeries, setSurgeries] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState('')
  const [newSurgery, setNewSurgery] = useState({
    procedure_name: '',
    theatre_name: 'OT-1',
    scheduled_start: '',
    estimated_duration_minutes: 90,
    priority: 'routine',
    anesthesia_type: ''
  })

  const loadSurgeries = async () => {
    setLoading(true)
    setError('')
    try {
      const query = filterStatus && filterStatus !== 'all' ? `?status=${filterStatus}` : ''
      const response = await apiService.request(`/ot/surgeries${query}`)
      if (response.success) {
        setSurgeries(response.surgeries || [])
      } else {
        setSurgeries([])
      }
    } catch (err) {
      console.error('Failed to load OT surgeries:', err)
      setError(err.message || 'Failed to load OT schedules')
      setSurgeries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSurgeries()
  }, [filterStatus])

  const summary = useMemo(() => ({
    total: surgeries.length,
    in_progress: surgeries.filter((item) => item.status === 'in_progress').length,
    scheduled: surgeries.filter((item) => item.status === 'scheduled').length,
    completed: surgeries.filter((item) => item.status === 'completed').length
  }), [surgeries])

  const createSurgery = async () => {
    if (!newSurgery.procedure_name || !newSurgery.scheduled_start) {
      alert('Procedure and schedule time are required')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...newSurgery,
        estimated_duration_minutes: Number.parseInt(newSurgery.estimated_duration_minutes, 10) || 60
      }
      const response = await apiService.request('/ot/surgeries', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      if (response.success) {
        setSurgeries((prev) => [...prev, response.surgery])
        setNewSurgery({
          procedure_name: '',
          theatre_name: 'OT-1',
          scheduled_start: '',
          estimated_duration_minutes: 90,
          priority: 'routine',
          anesthesia_type: ''
        })
      }
    } catch (err) {
      console.error('Failed to create surgery:', err)
      alert(err.message || 'Failed to create OT case')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      const response = await apiService.request(`/ot/surgeries/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      if (response.success) {
        setSurgeries((prev) => prev.map((item) => (item.id === id ? response.surgery : item)))
      }
    } catch (err) {
      console.error('Failed to update surgery status:', err)
      alert(err.message || 'Failed to update status')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operation Theatre Management</h1>
        <p className="text-gray-600">Schedule surgeries, track OT progress, and keep theatre utilization visible.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Cases</p><p className="text-2xl font-bold">{summary.total}</p></div><Scissors className="w-5 h-5 text-teal-700" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">In Progress</p><p className="text-2xl font-bold">{summary.in_progress}</p></div><Activity className="w-5 h-5 text-amber-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Scheduled</p><p className="text-2xl font-bold">{summary.scheduled}</p></div><Clock className="w-5 h-5 text-teal-700" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold">{summary.completed}</p></div><Badge variant="secondary">OT</Badge></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Add Surgery Case</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Procedure</Label><Input value={newSurgery.procedure_name} onChange={(e) => setNewSurgery({ ...newSurgery, procedure_name: e.target.value })} placeholder="e.g. Laparoscopic Appendectomy" /></div>
            <div><Label>Theatre</Label><Input value={newSurgery.theatre_name} onChange={(e) => setNewSurgery({ ...newSurgery, theatre_name: e.target.value })} /></div>
            <div><Label>Scheduled Start</Label><Input type="datetime-local" value={newSurgery.scheduled_start} onChange={(e) => setNewSurgery({ ...newSurgery, scheduled_start: e.target.value })} /></div>
            <div><Label>Estimated Duration (minutes)</Label><Input type="number" value={newSurgery.estimated_duration_minutes} onChange={(e) => setNewSurgery({ ...newSurgery, estimated_duration_minutes: e.target.value })} /></div>
            <div><Label>Priority</Label><Input value={newSurgery.priority} onChange={(e) => setNewSurgery({ ...newSurgery, priority: e.target.value })} /></div>
            <div><Label>Anesthesia</Label><Input value={newSurgery.anesthesia_type} onChange={(e) => setNewSurgery({ ...newSurgery, anesthesia_type: e.target.value })} placeholder="General / Regional" /></div>
            <Button className="w-full" onClick={createSurgery} disabled={submitting}>{submitting ? 'Saving...' : 'Create OT Case'}</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>OT Schedule Board</CardTitle>
            <select
              className="w-44 h-10 px-3 border rounded-md bg-white text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading && <p className="text-sm text-gray-500">Loading schedule...</p>}
            {!loading && surgeries.length === 0 && <p className="text-sm text-gray-500">No OT cases yet.</p>}
            {surgeries.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{item.procedure_name}</p>
                    <p className="text-sm text-gray-600">{item.theatre_name} · {new Date(item.scheduled_start).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Code: {item.surgery_code}</p>
                  </div>
                  <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'in_progress')}>Start</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'completed')}>Complete</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, 'cancelled')}>Cancel</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
