import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { PieChart } from '@/components/charts/PieChart.jsx'
import { BarChart } from '@/components/charts/BarChart.jsx'
import { LineChart } from '@/components/charts/LineChart.jsx'
import {
  ScanLine,
  Plus,
  FileText,
  Link as LinkIcon,
  Activity,
  Bell,
  ShieldCheck,
  Mic,
  BrainCircuit,
  Gauge,
  Network,
  Save,
  Trash2,
} from 'lucide-react'
import { apiService } from '../services/apiService'

const MODALITIES = ['xray', 'ct', 'mri', 'ultrasound', 'fluoroscopy']
const STATUS_FILTERS = ['all', 'ordered', 'scheduled', 'in_progress', 'reported', 'cancelled']
const STATUS_LABELS = {
  ordered: 'Ordered',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  reported: 'Reported',
  cancelled: 'Cancelled',
}

export default function RadiologyWorkflow() {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof localStorage === 'undefined') return apiService.user || null
    try {
      const raw = localStorage.getItem('auth_user')
      return raw ? JSON.parse(raw) : apiService.user || null
    } catch {
      return apiService.user || null
    }
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalityFilter, setModalityFilter] = useState('all')
  const [reportDrafts, setReportDrafts] = useState({})
  const [metadataDrafts, setMetadataDrafts] = useState({})
  const [launchInfo, setLaunchInfo] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('orders')
  const [worklist, setWorklist] = useState([])
  const [protocols, setProtocols] = useState([])
  const [schedule, setSchedule] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [shareLinks, setShareLinks] = useState({})
  const [structuredDrafts, setStructuredDrafts] = useState({})
  const [criticalDrafts, setCriticalDrafts] = useState({})
  const [dictationDrafts, setDictationDrafts] = useState({})
  const [aiDrafts, setAiDrafts] = useState({})
  const [doseDrafts, setDoseDrafts] = useState({})
  const [connectorList, setConnectorList] = useState([])
  const [mwlPreview, setMwlPreview] = useState({})
  const [criticalEvents, setCriticalEvents] = useState({})
  const [protocolForm, setProtocolForm] = useState({
    name: '',
    modality: 'xray',
    body_part: '',
    duration_min: 15,
    instructions: '',
    contrast_required: false,
  })
  const [protocolEdits, setProtocolEdits] = useState({})
  const [connectorForm, setConnectorForm] = useState({
    connector_name: '',
    vendor: 'generic',
    base_url: '',
    mllp_host: '',
    mllp_port: '',
    accession_field: 'accession_number',
    patient_field: 'patient_id',
    modality_field: 'modality',
  })
  const [formData, setFormData] = useState({
    patient_id: '',
    study_name: '',
    modality: 'xray',
    priority: 'routine',
    indication: '',
    scheduled_at: '',
    protocol_name: '',
    modality_room: '',
  })

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    const syncUser = () => {
      try {
        const raw = localStorage.getItem('auth_user')
        setCurrentUser(raw ? JSON.parse(raw) : apiService.user || null)
      } catch {
        setCurrentUser(apiService.user || null)
      }
    }
    syncUser()
    window.addEventListener('storage', syncUser)
    return () => window.removeEventListener('storage', syncUser)
  }, [])

  const requestWithTimeout = async (endpoint, options = {}, timeoutMs = 15000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await apiService.request(endpoint, {
        ...options,
        signal: controller.signal,
      })
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out. Please retry.')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (modalityFilter !== 'all') params.set('modality', modalityFilter)
      const query = params.toString()
      const response = await requestWithTimeout(`/radiology/orders${query ? `?${query}` : ''}`)
      setOrders(response.orders || [])
    } catch (err) {
      console.error('Failed to load radiology orders:', err)
      setError(err.message || 'Failed to load radiology queue')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const loadWorklist = async () => {
    try {
      const response = await requestWithTimeout('/radiology/worklist')
      setWorklist(response.worklist || [])
    } catch (err) {
      console.error('Failed to load worklist:', err)
    }
  }

  const loadOperations = async () => {
    try {
      const [protocolRes, scheduleRes, analyticsRes, connectorsRes] = await Promise.allSettled([
        requestWithTimeout('/radiology/protocols'),
        requestWithTimeout('/radiology/modality-schedule'),
        requestWithTimeout('/radiology/analytics'),
        requestWithTimeout('/radiology/pacs-connectors'),
      ])
      if (protocolRes.status === 'fulfilled') setProtocols(protocolRes.value.protocols || [])
      if (scheduleRes.status === 'fulfilled') setSchedule(scheduleRes.value.schedule || [])
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.metrics || null)
      if (connectorsRes.status === 'fulfilled') setConnectorList(connectorsRes.value.connectors || [])
      if (
        protocolRes.status === 'rejected' ||
        scheduleRes.status === 'rejected' ||
        analyticsRes.status === 'rejected' ||
        connectorsRes.status === 'rejected'
      ) {
        console.warn('Some operations endpoints failed to load; partial data shown.')
      }
    } catch (err) {
      // Safety catch; Promise.allSettled should prevent hard failure.
      console.error('Failed to load radiology operations data:', err)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter, modalityFilter])

  useEffect(() => {
    loadWorklist()
    loadOperations()
  }, [])

  useEffect(() => {
    orders.forEach((order) => {
      if (order.critical_findings && Object.keys(order.critical_findings).length > 0 && !criticalEvents[order.id]) {
        loadCriticalEvents(order.id)
      }
    })
  }, [orders])

  const summary = useMemo(() => ({
    total: orders.length,
    ordered: orders.filter((row) => row.status === 'ordered').length,
    in_progress: orders.filter((row) => row.status === 'in_progress').length,
    reported: orders.filter((row) => row.status === 'reported').length
  }), [orders])

  const roleNames = useMemo(() => {
    const roles = currentUser?.roles
    if (!Array.isArray(roles)) return []
    return roles
      .map((role) => {
        if (typeof role === 'string') return role.toLowerCase()
        if (role && typeof role === 'object') return String(role.role_name || '').toLowerCase()
        return ''
      })
      .filter(Boolean)
  }, [currentUser])

  const userType = String(currentUser?.user_type || '').toLowerCase()
  const hasRole = (...names) => {
    const normalized = names.map((n) => String(n).toLowerCase())
    if (normalized.includes(userType)) return true
    return normalized.some((n) => roleNames.includes(n))
  }

  const canCreateOrders = hasRole('physician', 'radiographer', 'radiologist', 'admin', 'system administrator')
  const canDraftReports = hasRole('radiographer', 'radiologist', 'admin', 'system administrator')
  const canFinalizeReports = hasRole('radiologist', 'admin', 'system administrator')
  const canManageQc = hasRole('radiologist', 'admin', 'system administrator')

  const statusDistribution = useMemo(() => {
    const grouped = STATUS_FILTERS
      .filter((status) => status !== 'all')
      .map((status) => ({
        name: STATUS_LABELS[status] || status,
        value: orders.filter((row) => row.status === status).length,
      }))
      .filter((item) => item.value > 0)
    return grouped.length > 0 ? grouped : [{ name: 'No Data', value: 1 }]
  }, [orders])

  const modalityDistribution = useMemo(() => {
    const utilization = analytics?.modality_utilization || {}
    const rows = Object.entries(utilization).map(([name, value]) => ({
      name: String(name || 'unknown').toUpperCase(),
      value: Number(value || 0),
    }))
    return rows.length > 0 ? rows : [{ name: 'N/A', value: 0 }]
  }, [analytics])

  const doseByPatient = useMemo(() => {
    const doseMap = analytics?.patient_cumulative_dose_mgy || {}
    const rows = Object.entries(doseMap)
      .map(([patientId, value]) => ({
        name: `Pt-${patientId}`,
        value: Number(value || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    return rows.length > 0 ? rows : [{ name: 'N/A', value: 0 }]
  }, [analytics])

  const orderTrend = useMemo(() => {
    const now = new Date()
    const buckets = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      buckets.push({ key, name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: 0 })
    }
    const byDay = buckets.reduce((acc, day) => ({ ...acc, [day.key]: day }), {})
    orders.forEach((row) => {
      if (!row.created_at) return
      const key = String(row.created_at).slice(0, 10)
      if (byDay[key]) byDay[key].value += 1
    })
    return buckets
  }, [orders])

  const createOrder = async () => {
    if (!canCreateOrders) {
      alert('Your role is read-only for order entry.')
      return
    }
    if (!formData.patient_id || !formData.study_name) {
      alert('Patient ID and Study Name are required')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        patient_id: formData.patient_id,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        protocol_name: formData.protocol_name || null,
        modality_room: formData.modality_room || null,
      }
      const response = await apiService.request('/radiology/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      if (response.success) {
        setFormData({
          patient_id: '',
          study_name: '',
          modality: 'xray',
          priority: 'routine',
          indication: '',
          scheduled_at: '',
          protocol_name: '',
          modality_room: '',
        })
        await loadOrders()
        await loadWorklist()
        await loadOperations()
      }
    } catch (err) {
      console.error('Failed to create radiology order:', err)
      alert(err.message || 'Failed to create radiology order')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (orderId, status) => {
    try {
      await apiService.request(`/radiology/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      await loadOrders()
    } catch (err) {
      console.error('Failed to update radiology status:', err)
      alert(err.message || 'Failed to update status')
    }
  }

  const submitReport = async (orderId) => {
    if (!canDraftReports) {
      alert('Your role cannot submit radiology reports.')
      return
    }
    const report = (reportDrafts[orderId] || '').trim()
    if (!report) {
      alert('Report text is required')
      return
    }
    try {
      const response = await apiService.request(`/radiology/orders/${orderId}/report`, {
        method: 'POST',
        body: JSON.stringify({ report_text: report, create_document: true })
      })
      if (response.success) {
        setReportDrafts((prev) => ({ ...prev, [orderId]: '' }))
        await loadOrders()
      }
    } catch (err) {
      console.error('Failed to submit radiology report:', err)
      alert(err.message || 'Failed to submit report')
    }
  }

  const updateDicomMetadata = async (orderId) => {
    const draft = metadataDrafts[orderId] || {}
    try {
      await apiService.request(`/radiology/orders/${orderId}/dicom-metadata`, {
        method: 'PATCH',
        body: JSON.stringify({
          dicom_study_uid: draft.dicom_study_uid || null,
          dicom_series_uid: draft.dicom_series_uid || null,
          accession_number: draft.accession_number || null,
          pacs_source: draft.pacs_source || null,
          viewer_vendor: draft.viewer_vendor || 'internal_placeholder',
          dicom_metadata: {
            study_instance_uid: draft.dicom_study_uid || null,
            series_instance_uid: draft.dicom_series_uid || null,
            accession_number: draft.accession_number || null,
            viewer_hints: {
              pacs_source: draft.pacs_source || null,
              vendor: draft.viewer_vendor || 'internal_placeholder'
            }
          }
        })
      })
      await loadOrders()
    } catch (err) {
      console.error('Failed to update DICOM metadata:', err)
      alert(err.message || 'Failed to update DICOM metadata')
    }
  }

  const requestViewerLaunchToken = async (orderId) => {
    try {
      const response = await apiService.request(`/radiology/orders/${orderId}/viewer-launch-token`, {
        method: 'POST',
        body: JSON.stringify({})
      })
      if (response.success) {
        setLaunchInfo((prev) => ({
          ...prev,
          [orderId]: {
            launch_token: response.launch_token,
            expires_at: response.expires_at,
            launch_url: response.launch_url
          }
        }))
      }
    } catch (err) {
      console.error('Failed to create launch token:', err)
      alert(err.message || 'Failed to create viewer launch token')
    }
  }

  const submitStructuredReport = async (orderId) => {
    if (!canDraftReports) {
      alert('Your role cannot save structured reports.')
      return
    }
    const draft = structuredDrafts[orderId] || {}
    try {
      await apiService.request(`/radiology/orders/${orderId}/structured-report`, {
        method: 'POST',
        body: JSON.stringify({
          structured_report: {
            template: draft.template || 'General radiology',
            findings: draft.findings || '',
            impression: draft.impression || '',
            recommendation: draft.recommendation || '',
          },
        }),
      })
      await loadOrders()
    } catch (err) {
      console.error('Failed to submit structured report:', err)
      alert(err.message || 'Failed to save structured report')
    }
  }

  const submitCriticalAlert = async (orderId) => {
    if (!canFinalizeReports) {
      alert('Critical alerts require radiologist-level permission.')
      return
    }
    const draft = criticalDrafts[orderId] || {}
    if (!draft.summary) {
      alert('Critical summary is required')
      return
    }
    try {
      await apiService.request(`/radiology/orders/${orderId}/critical-findings`, {
        method: 'POST',
        body: JSON.stringify({
          summary: draft.summary,
          severity: draft.severity || 'critical',
          channels: draft.channels || ['in_app', 'sms'],
          notify_referrer: true,
        }),
      })
      await loadOrders()
      await loadCriticalEvents(orderId)
    } catch (err) {
      console.error('Failed to send critical alert:', err)
      alert(err.message || 'Failed to send critical alert')
    }
  }

  const loadCriticalEvents = async (orderId) => {
    try {
      const response = await requestWithTimeout(`/radiology/orders/${orderId}/critical-events`)
      setCriticalEvents((prev) => ({ ...prev, [orderId]: response.events || [] }))
    } catch (err) {
      console.error('Failed to load critical events:', err)
    }
  }

  const acknowledgeCriticalEvent = async (orderId, eventToken) => {
    try {
      await apiService.request(`/radiology/orders/${orderId}/critical-findings/ack`, {
        method: 'POST',
        body: JSON.stringify({ event_token: eventToken }),
      })
      await loadOrders()
      await loadCriticalEvents(orderId)
    } catch (err) {
      console.error('Failed to acknowledge critical event:', err)
      alert(err.message || 'Failed to acknowledge critical event')
    }
  }

  const signReport = async (orderId) => {
    if (!canFinalizeReports) {
      alert('Only radiologist-level roles can e-sign reports.')
      return
    }
    try {
      await apiService.request(`/radiology/orders/${orderId}/sign`, { method: 'POST', body: JSON.stringify({}) })
      await loadOrders()
    } catch (err) {
      console.error('Failed to sign report:', err)
      alert(err.message || 'Failed to sign report')
    }
  }

  const saveVoiceDictation = async (orderId) => {
    if (!canDraftReports) {
      alert('Your role cannot save voice dictation.')
      return
    }
    const draft = (dictationDrafts[orderId] || '').trim()
    if (!draft) return
    try {
      await apiService.request(`/radiology/orders/${orderId}/voice-dictation`, {
        method: 'POST',
        body: JSON.stringify({ voice_text: draft, append_to_report: true }),
      })
      setDictationDrafts((prev) => ({ ...prev, [orderId]: '' }))
      await loadOrders()
    } catch (err) {
      console.error('Failed to save voice dictation:', err)
      alert(err.message || 'Failed to save dictation')
    }
  }

  const saveAITriage = async (orderId) => {
    const draft = aiDrafts[orderId] || {}
    try {
      await apiService.request(`/radiology/orders/${orderId}/ai-triage`, {
        method: 'POST',
        body: JSON.stringify({
          score: draft.score || 0,
          findings: {
            flagged_conditions: draft.flagged_conditions || '',
            comment: draft.comment || '',
          },
        }),
      })
      await loadOrders()
      await loadWorklist()
    } catch (err) {
      console.error('Failed to save AI triage:', err)
      alert(err.message || 'Failed to save AI triage')
    }
  }

  const saveDose = async (orderId) => {
    const draft = doseDrafts[orderId] || {}
    if (!draft.dose_mgy) {
      alert('Dose value is required')
      return
    }
    try {
      await apiService.request(`/radiology/orders/${orderId}/dose`, {
        method: 'POST',
        body: JSON.stringify({
          dose_mgy: draft.dose_mgy,
          contrast_details: {
            lot_number: draft.lot_number || '',
            volume_ml: draft.volume_ml || '',
            agent: draft.agent || '',
          },
        }),
      })
      await loadOrders()
      await loadOperations()
    } catch (err) {
      console.error('Failed to save dose:', err)
      alert(err.message || 'Failed to save dose')
    }
  }

  const savePeerReview = async (orderId) => {
    if (!canManageQc) {
      alert('Peer review requires radiologist-level permission.')
      return
    }
    try {
      await apiService.request(`/radiology/orders/${orderId}/peer-review`, {
        method: 'POST',
        body: JSON.stringify({ agreement_level: 'agree', comments: 'Peer QA pass', blind_review: true }),
      })
      await loadOrders()
    } catch (err) {
      console.error('Failed to save peer review:', err)
      alert(err.message || 'Failed to save peer review')
    }
  }

  const createShareLink = async (orderId, audience = 'patient') => {
    try {
      const response = await apiService.request(`/radiology/orders/${orderId}/share-links`, {
        method: 'POST',
        body: JSON.stringify({ audience }),
      })
      if (response.success) {
        setShareLinks((prev) => ({
          ...prev,
          [orderId]: [...(prev[orderId] || []), { ...response.share_link, share_url: response.share_url }],
        }))
      }
    } catch (err) {
      console.error('Failed to create share link:', err)
      alert(err.message || 'Failed to create share link')
    }
  }

  const createProtocol = async () => {
    if (!canManageQc) {
      alert('Protocol management requires radiologist-level permission.')
      return
    }
    if (!protocolForm.name.trim()) {
      alert('Protocol name is required')
      return
    }
    try {
      await apiService.request('/radiology/protocols', {
        method: 'POST',
        body: JSON.stringify({
          ...protocolForm,
          duration_min: Number(protocolForm.duration_min || 15),
        }),
      })
      setProtocolForm({
        name: '',
        modality: 'xray',
        body_part: '',
        duration_min: 15,
        instructions: '',
        contrast_required: false,
      })
      await loadOperations()
    } catch (err) {
      console.error('Failed to create protocol:', err)
      alert(err.message || 'Failed to create protocol')
    }
  }

  const updateProtocol = async (protocol) => {
    if (!canManageQc) {
      alert('Protocol management requires radiologist-level permission.')
      return
    }
    const draft = protocolEdits[protocol.id] || {}
    try {
      await apiService.request(`/radiology/protocols/${protocol.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: draft.name ?? protocol.name,
          modality: draft.modality ?? protocol.modality,
          body_part: draft.body_part ?? protocol.body_part,
          duration_min: Number(draft.duration_min ?? protocol.duration_min ?? 15),
          instructions: draft.instructions ?? protocol.instructions ?? '',
          contrast_required: draft.contrast_required ?? protocol.contrast_required ?? false,
        }),
      })
      await loadOperations()
    } catch (err) {
      console.error('Failed to update protocol:', err)
      alert(err.message || 'Failed to update protocol')
    }
  }

  const deleteProtocol = async (protocolId) => {
    if (!canManageQc) {
      alert('Protocol management requires radiologist-level permission.')
      return
    }
    if (!window.confirm('Delete this protocol?')) return
    try {
      await apiService.request(`/radiology/protocols/${protocolId}`, { method: 'DELETE' })
      await loadOperations()
    } catch (err) {
      console.error('Failed to delete protocol:', err)
      alert(err.message || 'Failed to delete protocol')
    }
  }

  const createConnector = async () => {
    if (!canManageQc) {
      alert('Connector management requires radiologist-level permission.')
      return
    }
    if (!connectorForm.connector_name.trim()) {
      alert('Connector name is required')
      return
    }
    try {
      await apiService.request('/radiology/pacs-connectors', {
        method: 'POST',
        body: JSON.stringify({
          connector_name: connectorForm.connector_name,
          vendor: connectorForm.vendor,
          base_url: connectorForm.base_url || null,
          mllp_host: connectorForm.mllp_host || null,
          mllp_port: connectorForm.mllp_port ? Number(connectorForm.mllp_port) : null,
          mwl_mapping: {
            fields: {
              accession: connectorForm.accession_field || 'accession_number',
              patient_id: connectorForm.patient_field || 'patient_id',
              modality: connectorForm.modality_field || 'modality',
            },
          },
        }),
      })
      setConnectorForm({
        connector_name: '',
        vendor: 'generic',
        base_url: '',
        mllp_host: '',
        mllp_port: '',
        accession_field: 'accession_number',
        patient_field: 'patient_id',
        modality_field: 'modality',
      })
      await loadOperations()
    } catch (err) {
      console.error('Failed to create connector:', err)
      alert(err.message || 'Failed to create connector')
    }
  }

  const previewConnectorMWL = async (connectorId) => {
    try {
      const response = await apiService.request(`/radiology/pacs-connectors/${connectorId}/mwl-preview`)
      setMwlPreview((prev) => ({ ...prev, [connectorId]: response.mwl_items || [] }))
    } catch (err) {
      console.error('Failed to preview MWL:', err)
      alert(err.message || 'Failed to preview MWL mapping')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Radiology Portal</h1>
        <p className="text-gray-600">DICOM workflow, reporting, critical alerts, sharing, and department analytics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Ordered</p><p className="text-xl font-bold">{summary.ordered}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">In Progress</p><p className="text-xl font-bold">{summary.in_progress}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Reported</p><p className="text-xl font-bold">{summary.reported}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Worklist</p><p className="text-xl font-bold">{worklist.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Avg TAT</p><p className="text-xl font-bold">{analytics?.average_tat_minutes || 0}m</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={statusDistribution} height={230} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Modality</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={modalityDistribution} dataKey="value" name="Orders" color="#2563eb" height={230} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={orderTrend} dataKey="value" name="Orders/day" color="#0f766e" height={230} />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="orders">Orders & Worklist</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
          <TabsTrigger value="viewer">Viewer & Sharing</TabsTrigger>
          <TabsTrigger value="ops">Operations & QC</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Order Entry (CPOE)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!canCreateOrders && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Read-only: your role can manage worklist but cannot create new orders.
                  </p>
                )}
                <div><Label>Patient ID</Label><Input value={formData.patient_id} onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })} /></div>
                <div><Label>Study Name</Label><Input value={formData.study_name} onChange={(e) => setFormData({ ...formData, study_name: e.target.value })} placeholder="e.g. MRI Brain w/o Contrast" /></div>
                <div><Label>Protocol</Label><Input value={formData.protocol_name} onChange={(e) => setFormData({ ...formData, protocol_name: e.target.value })} placeholder="Protocol / template" /></div>
                <div><Label>Modality Room</Label><Input value={formData.modality_room} onChange={(e) => setFormData({ ...formData, modality_room: e.target.value })} placeholder="CT-1, MRI-2..." /></div>
                <div>
                  <Label>Modality</Label>
                  <select className="w-full h-10 px-3 border rounded-md" value={formData.modality} onChange={(e) => setFormData({ ...formData, modality: e.target.value })}>
                    {MODALITIES.map((modality) => <option key={modality} value={modality}>{modality.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select className="w-full h-10 px-3 border rounded-md" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div><Label>Clinical Indication</Label><Input value={formData.indication} onChange={(e) => setFormData({ ...formData, indication: e.target.value })} /></div>
                <div><Label>Scheduled At</Label><Input type="datetime-local" value={formData.scheduled_at} onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })} /></div>
                <Button className="w-full" onClick={createOrder} disabled={submitting || !canCreateOrders}>{submitting ? 'Creating...' : 'Create Order'}</Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center gap-3">
                <CardTitle className="mr-auto flex items-center gap-2"><ScanLine className="w-5 h-5" />Enterprise Worklist</CardTitle>
                <select className="h-10 px-3 border rounded-md text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUS_FILTERS.map((status) => <option key={status} value={status}>{status === 'all' ? 'All Statuses' : status.replace('_', ' ')}</option>)}
                </select>
                <select className="h-10 px-3 border rounded-md text-sm" value={modalityFilter} onChange={(e) => setModalityFilter(e.target.value)}>
                  <option value="all">All Modalities</option>
                  {MODALITIES.map((modality) => <option key={modality} value={modality}>{modality.toUpperCase()}</option>)}
                </select>
              </CardHeader>
              <CardContent className="space-y-3">
                {error && <p className="text-sm text-red-600">{error}</p>}
                {loading && <p className="text-sm text-gray-500">Loading radiology queue...</p>}
                {!loading && orders.length === 0 && <p className="text-sm text-gray-500">No radiology orders for current filters.</p>}
                {orders.map((order) => (
                  <div key={order.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{order.study_name}</p>
                        <p className="text-sm text-gray-600">Order: {order.order_code} · {String(order.modality || '').toUpperCase()} · Patient #{order.patient_id}</p>
                        <p className="text-xs text-gray-500">
                          Priority: {order.priority}
                          {order.scheduled_at ? ` · Scheduled ${new Date(order.scheduled_at).toLocaleString()}` : ''}
                          {order.protocol_name ? ` · Protocol ${order.protocol_name}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={order.status === 'reported' ? 'default' : 'secondary'}>{order.status}</Badge>
                        {order.ai_triage_score != null && (
                          <Badge variant="outline">AI {Number(order.ai_triage_score).toFixed(2)}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'scheduled')}>Schedule</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'in_progress')}>Start</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'cancelled')}>Cancel</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reporting" className="space-y-4">
          {orders.map((order) => (
            <Card key={`report-${order.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{order.order_code} · {order.study_name}</span>
                  {order.signed_at ? <Badge>Signed</Badge> : <Badge variant="outline">Unsigned</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!canDraftReports && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Reporting is read-only for your role.
                  </p>
                )}
                <Input placeholder="Free-text report / dictation" value={reportDrafts[order.id] || ''} onChange={(e) => setReportDrafts((p) => ({ ...p, [order.id]: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => submitReport(order.id)} disabled={!canDraftReports}>
                    <FileText className="w-4 h-4 mr-1" />
                    {canFinalizeReports ? 'Submit Report' : 'Save Preliminary'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => signReport(order.id)} disabled={!canFinalizeReports}><ShieldCheck className="w-4 h-4 mr-1" />E-Sign</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input placeholder="Template" value={structuredDrafts[order.id]?.template || ''} onChange={(e) => setStructuredDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), template: e.target.value } }))} />
                  <Input placeholder="Findings" value={structuredDrafts[order.id]?.findings || ''} onChange={(e) => setStructuredDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), findings: e.target.value } }))} />
                  <Input placeholder="Impression" value={structuredDrafts[order.id]?.impression || ''} onChange={(e) => setStructuredDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), impression: e.target.value } }))} />
                </div>
                <Button size="sm" variant="outline" onClick={() => submitStructuredReport(order.id)} disabled={!canDraftReports}>Save Structured Report</Button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input placeholder="Critical finding summary" value={criticalDrafts[order.id]?.summary || ''} onChange={(e) => setCriticalDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), summary: e.target.value } }))} />
                  <Input placeholder="Severity (critical/urgent)" value={criticalDrafts[order.id]?.severity || ''} onChange={(e) => setCriticalDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), severity: e.target.value } }))} />
                  <Button size="sm" variant="outline" onClick={() => submitCriticalAlert(order.id)} disabled={!canFinalizeReports}><Bell className="w-4 h-4 mr-1" />Critical Alert</Button>
                </div>
                {(criticalEvents[order.id] || []).length > 0 && (
                  <div className="space-y-1 rounded border p-2 text-xs">
                    <p className="font-medium text-slate-700">Notification Audit Trail</p>
                    {(criticalEvents[order.id] || []).map((event) => (
                      <div key={event.event_token} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {event.channel} · {event.status}
                          {event.acknowledged_at ? ` · ack ${new Date(event.acknowledged_at).toLocaleString()}` : ''}
                        </span>
                        {event.status !== 'acknowledged' ? (
                          <Button size="sm" variant="outline" onClick={() => acknowledgeCriticalEvent(order.id, event.event_token)}>
                            Acknowledge
                          </Button>
                        ) : (
                          <span className="text-emerald-700">Closed-loop complete</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="Voice dictation text" value={dictationDrafts[order.id] || ''} onChange={(e) => setDictationDrafts((p) => ({ ...p, [order.id]: e.target.value }))} />
                  <Button size="sm" variant="outline" onClick={() => saveVoiceDictation(order.id)} disabled={!canDraftReports}><Mic className="w-4 h-4 mr-1" />Save Dictation</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="viewer" className="space-y-4">
          {orders.map((order) => (
            <Card key={`viewer-${order.id}`}>
              <CardHeader>
                <CardTitle>{order.order_code} · DICOM / Sharing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="DICOM Study UID" value={metadataDrafts[order.id]?.dicom_study_uid || order.dicom_study_uid || ''} onChange={(e) => setMetadataDrafts((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || {}), dicom_study_uid: e.target.value } }))} />
                  <Input placeholder="Series UID" value={metadataDrafts[order.id]?.dicom_series_uid || order.dicom_series_uid || ''} onChange={(e) => setMetadataDrafts((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || {}), dicom_series_uid: e.target.value } }))} />
                  <Input placeholder="Accession Number" value={metadataDrafts[order.id]?.accession_number || order.accession_number || ''} onChange={(e) => setMetadataDrafts((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || {}), accession_number: e.target.value } }))} />
                  <Input placeholder="PACS Source" value={metadataDrafts[order.id]?.pacs_source || order.pacs_source || ''} onChange={(e) => setMetadataDrafts((prev) => ({ ...prev, [order.id]: { ...(prev[order.id] || {}), pacs_source: e.target.value } }))} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateDicomMetadata(order.id)}>Save DICOM Metadata</Button>
                  <Button size="sm" variant="outline" onClick={() => requestViewerLaunchToken(order.id)}>Generate Viewer Token</Button>
                  <Button size="sm" variant="outline" onClick={() => createShareLink(order.id, 'patient')}><LinkIcon className="w-3 h-3 mr-1" />Patient Link</Button>
                  <Button size="sm" variant="outline" onClick={() => createShareLink(order.id, 'referral')}><Network className="w-3 h-3 mr-1" />Referrer Link</Button>
                </div>
                {launchInfo[order.id] && (
                  <p className="text-xs text-slate-700">
                    Viewer token: {launchInfo[order.id].launch_token} · expires {new Date(launchInfo[order.id].expires_at).toLocaleString()}
                  </p>
                )}
                {(shareLinks[order.id] || []).map((link) => (
                  <p key={link.share_token} className="text-xs text-emerald-700">Share ({link.audience}): {link.share_url}</p>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ops" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4" />Analytics Dashboard</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border p-3"><p className="text-gray-500">Total Orders</p><p className="font-semibold text-lg">{analytics?.total_orders || 0}</p></div>
                <div className="rounded-lg border p-3"><p className="text-gray-500">Reported</p><p className="font-semibold text-lg">{analytics?.reported_orders || 0}</p></div>
                <div className="rounded-lg border p-3"><p className="text-gray-500">STAT Pending</p><p className="font-semibold text-lg">{analytics?.stat_pending || 0}</p></div>
                <div className="rounded-lg border p-3"><p className="text-gray-500">Average TAT</p><p className="font-semibold text-lg">{analytics?.average_tat_minutes || 0} min</p></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border p-2">
                  <p className="text-sm font-medium text-slate-700 px-2 pt-2">Operational Mix (Pie)</p>
                  <PieChart data={modalityDistribution} height={260} />
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-sm font-medium text-slate-700 px-2 pt-2">Cumulative Dose by Patient (Top 8)</p>
                  <BarChart data={doseByPatient} dataKey="value" name="mGy" color="#7c3aed" height={260} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="w-4 h-4" />Modality Scheduling</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {schedule.length === 0 && <p className="text-gray-500">No scheduled slots.</p>}
              {schedule.slice(0, 8).map((slot) => (
                <p key={slot.order_id}>{slot.modality.toUpperCase()} · {slot.room} · {slot.order_code} · {new Date(slot.scheduled_at).toLocaleString()}</p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="w-4 h-4" />AI Triage, Dose & Peer Review</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {orders.map((order) => (
                <div key={`ops-${order.id}`} className="border rounded p-3 space-y-2">
                  <p className="text-sm font-medium">{order.order_code} · {order.study_name}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="AI score 0-1" value={aiDrafts[order.id]?.score || ''} onChange={(e) => setAiDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), score: e.target.value } }))} />
                    <Input placeholder="AI flagged conditions" value={aiDrafts[order.id]?.flagged_conditions || ''} onChange={(e) => setAiDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), flagged_conditions: e.target.value } }))} />
                    <Button size="sm" variant="outline" onClick={() => saveAITriage(order.id)}>Save AI Triage</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input placeholder="Dose mGy" value={doseDrafts[order.id]?.dose_mgy || ''} onChange={(e) => setDoseDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), dose_mgy: e.target.value } }))} />
                    <Input placeholder="Contrast lot" value={doseDrafts[order.id]?.lot_number || ''} onChange={(e) => setDoseDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), lot_number: e.target.value } }))} />
                    <Input placeholder="Volume ml" value={doseDrafts[order.id]?.volume_ml || ''} onChange={(e) => setDoseDrafts((p) => ({ ...p, [order.id]: { ...(p[order.id] || {}), volume_ml: e.target.value } }))} />
                    <Button size="sm" variant="outline" onClick={() => saveDose(order.id)}>Save Dose</Button>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => savePeerReview(order.id)} disabled={!canManageQc}>Submit Blind Peer Review</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Protocol Management (Persistent CRUD)</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!canManageQc && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Read-only: protocol edits require radiologist-level permission.
                </p>
              )}
              <div className="grid md:grid-cols-3 gap-2">
                <Input placeholder="Protocol name" value={protocolForm.name} onChange={(e) => setProtocolForm((p) => ({ ...p, name: e.target.value }))} />
                <Input placeholder="Body part" value={protocolForm.body_part} onChange={(e) => setProtocolForm((p) => ({ ...p, body_part: e.target.value }))} />
                <Input placeholder="Duration (min)" type="number" value={protocolForm.duration_min} onChange={(e) => setProtocolForm((p) => ({ ...p, duration_min: e.target.value }))} />
                <select className="h-10 px-3 border rounded-md" value={protocolForm.modality} onChange={(e) => setProtocolForm((p) => ({ ...p, modality: e.target.value }))}>
                  {MODALITIES.map((modality) => <option key={modality} value={modality}>{modality.toUpperCase()}</option>)}
                </select>
                <Input placeholder="Instructions" value={protocolForm.instructions} onChange={(e) => setProtocolForm((p) => ({ ...p, instructions: e.target.value }))} />
                <Button size="sm" onClick={createProtocol} disabled={!canManageQc}><Plus className="w-4 h-4 mr-1" />Create Protocol</Button>
              </div>
              <div className="space-y-2">
                {protocols.map((protocol) => {
                  const edit = protocolEdits[protocol.id] || {}
                  return (
                    <div key={protocol.id} className="border rounded p-2 space-y-2">
                      <div className="grid md:grid-cols-4 gap-2">
                        <Input value={edit.name ?? protocol.name} onChange={(e) => setProtocolEdits((p) => ({ ...p, [protocol.id]: { ...(p[protocol.id] || {}), name: e.target.value } }))} />
                        <Input value={edit.body_part ?? protocol.body_part ?? ''} onChange={(e) => setProtocolEdits((p) => ({ ...p, [protocol.id]: { ...(p[protocol.id] || {}), body_part: e.target.value } }))} />
                        <Input type="number" value={edit.duration_min ?? protocol.duration_min ?? 15} onChange={(e) => setProtocolEdits((p) => ({ ...p, [protocol.id]: { ...(p[protocol.id] || {}), duration_min: e.target.value } }))} />
                        <select className="h-10 px-3 border rounded-md" value={edit.modality ?? protocol.modality} onChange={(e) => setProtocolEdits((p) => ({ ...p, [protocol.id]: { ...(p[protocol.id] || {}), modality: e.target.value } }))}>
                          {MODALITIES.map((modality) => <option key={modality} value={modality}>{modality.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateProtocol(protocol)} disabled={!canManageQc}><Save className="w-4 h-4 mr-1" />Update</Button>
                        <Button size="sm" variant="outline" onClick={() => deleteProtocol(protocol.id)} disabled={!canManageQc}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>PACS Connectors & MWL Mapping</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!canManageQc && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Read-only: connector creation/editing requires radiologist-level permission.
                </p>
              )}
              <div className="grid md:grid-cols-3 gap-2">
                <Input placeholder="Connector name" value={connectorForm.connector_name} onChange={(e) => setConnectorForm((p) => ({ ...p, connector_name: e.target.value }))} />
                <Input placeholder="Vendor (e.g. orthanc, sectra)" value={connectorForm.vendor} onChange={(e) => setConnectorForm((p) => ({ ...p, vendor: e.target.value }))} />
                <Input placeholder="Base URL" value={connectorForm.base_url} onChange={(e) => setConnectorForm((p) => ({ ...p, base_url: e.target.value }))} />
                <Input placeholder="MLLP host" value={connectorForm.mllp_host} onChange={(e) => setConnectorForm((p) => ({ ...p, mllp_host: e.target.value }))} />
                <Input placeholder="MLLP port" value={connectorForm.mllp_port} onChange={(e) => setConnectorForm((p) => ({ ...p, mllp_port: e.target.value }))} />
                <Button size="sm" onClick={createConnector} disabled={!canManageQc}><Plus className="w-4 h-4 mr-1" />Create Connector</Button>
              </div>
              <div className="grid md:grid-cols-3 gap-2">
                <Input placeholder="MWL accession field" value={connectorForm.accession_field} onChange={(e) => setConnectorForm((p) => ({ ...p, accession_field: e.target.value }))} />
                <Input placeholder="MWL patient field" value={connectorForm.patient_field} onChange={(e) => setConnectorForm((p) => ({ ...p, patient_field: e.target.value }))} />
                <Input placeholder="MWL modality field" value={connectorForm.modality_field} onChange={(e) => setConnectorForm((p) => ({ ...p, modality_field: e.target.value }))} />
              </div>
              {connectorList.map((connector) => (
                <div key={connector.id} className="border rounded p-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{connector.connector_name} · {connector.vendor}</p>
                    <Button size="sm" variant="outline" onClick={() => previewConnectorMWL(connector.id)}>Preview MWL Contract</Button>
                  </div>
                  {(mwlPreview[connector.id] || []).slice(0, 3).map((item, idx) => (
                    <p key={`${connector.id}-${idx}`} className="text-xs text-gray-600">{JSON.stringify(item)}</p>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
