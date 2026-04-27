import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { ArrowLeft, MonitorPlay, ShieldCheck } from 'lucide-react'
import { apiService } from '../services/apiService'

export default function RadiologyViewerHandoff() {
  const { launchToken: tokenParam } = useParams()
  const navigate = useNavigate()
  const [tokenInput, setTokenInput] = useState(tokenParam || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)

  const loadLaunchContract = async (tokenValue) => {
    if (!tokenValue) return
    setLoading(true)
    setError('')
    setPayload(null)
    try {
      const response = await apiService.request(`/radiology/viewer-launch/${encodeURIComponent(tokenValue)}`)
      if (response.success) {
        setPayload(response)
      } else {
        setError('Unable to load viewer launch contract')
      }
    } catch (err) {
      console.error('Failed to load viewer launch contract:', err)
      setError(err.message || 'Failed to validate/consume launch token')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenParam) {
      loadLaunchContract(tokenParam)
    }
  }, [tokenParam])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Viewer Handoff</h1>
          <p className="text-gray-600">PACS-ready launch summary generated from secure radiology contract token.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Launch Token Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Launch Token</Label>
            <Input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste viewer launch token"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => loadLaunchContract(tokenInput)} disabled={loading || !tokenInput.trim()}>
              {loading ? 'Validating...' : 'Consume Token and Load Contract'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {payload && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorPlay className="w-5 h-5" />
                Viewer Session Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-700">Viewer URL: <span className="font-medium">{payload.viewer_session?.viewer_url || 'N/A'}</span></p>
              <p className="text-sm text-gray-700">Launched At: <span className="font-medium">{payload.viewer_session?.launched_at ? new Date(payload.viewer_session.launched_at).toLocaleString() : 'N/A'}</span></p>
              <p className="text-sm text-gray-700">Vendor: <span className="font-medium">{payload.viewer_session?.viewer_vendor || 'internal_placeholder'}</span></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PACS Contract Payload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Order: {payload.contract?.order?.order_code || 'N/A'}</Badge>
                <Badge variant="outline">Study UID: {payload.contract?.study_instance_uid || 'N/A'}</Badge>
                <Badge variant="outline">Series UID: {payload.contract?.series_instance_uid || 'N/A'}</Badge>
                <Badge variant="outline">Accession: {payload.contract?.accession_number || 'N/A'}</Badge>
              </div>
              <pre className="text-xs bg-slate-50 border rounded p-3 overflow-auto">
{JSON.stringify(payload.contract, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
