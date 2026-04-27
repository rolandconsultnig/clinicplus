import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { useToast } from './ui/toast'
import portalGapData from '../data/portalGapData.json'

const statusClasses = {
  implemented: 'bg-green-100 text-green-800 border-green-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  planned: 'bg-teal-100 text-teal-800 border-teal-200'
}

const statusLabels = {
  implemented: 'Implemented',
  in_progress: 'In Progress',
  planned: 'Planned'
}

const rows = portalGapData?.rows || []

function getPortalSummary() {
  const grouped = {}
  for (const row of rows) {
    if (!grouped[row.portal]) {
      grouped[row.portal] = { total: 0, implemented: 0, in_progress: 0, planned: 0 }
    }
    grouped[row.portal].total += 1
    grouped[row.portal][row.status] += 1
  }
  return Object.entries(grouped).map(([portal, counts]) => {
    const coverage = Math.round((counts.implemented / counts.total) * 100)
    return { portal, ...counts, coverage }
  })
}

export default function PortalGapTracker() {
  const { success: showSuccess, info: showInfo } = useToast()
  const summary = getPortalSummary()
  const generatedAt = portalGapData?.generated_at
  const generatedAtDate = generatedAt ? new Date(generatedAt) : null
  const staleThresholdMs = 24 * 60 * 60 * 1000
  const isStale = generatedAtDate ? (Date.now() - generatedAtDate.getTime()) > staleThresholdMs : true
  const outputFile = 'src/data/portalGapData.json'

  const formatAge = (dateValue) => {
    if (!dateValue) return 'unknown'
    const diffMs = Date.now() - dateValue.getTime()
    if (diffMs < 60 * 1000) return 'just now'
    const minutes = Math.floor(diffMs / (60 * 1000))
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const copyCommand = async () => {
    const cmd = 'npm run generate:portal-gap'
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cmd)
        showSuccess('Copied: npm run generate:portal-gap')
        return
      }
    } catch {
      // Fallback toast below.
    }
    showInfo(`Run this command: ${cmd}`)
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portal Gap Tracker</CardTitle>
          <CardDescription>
            Live-derived matrix from actual frontend components and backend route files.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          <p className="text-xs text-gray-500">
            Last generated: {generatedAt ? new Date(generatedAt).toLocaleString() : 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated age: {formatAge(generatedAtDate)}
          </p>
          {isStale && (
            <p className="text-xs text-amber-700 mt-1">
              Data is stale (older than 24 hours). Regenerate before using for planning.
            </p>
          )}
          <div className="mt-3 border rounded-md p-3 bg-slate-50 space-y-2">
            <p className="text-xs font-medium text-slate-700">Regenerate now</p>
            <p className="text-xs text-gray-600">Command: <code>npm run generate:portal-gap</code></p>
            <p className="text-xs text-gray-600">Output: <code>{outputFile}</code></p>
            <Button type="button" size="sm" variant="outline" onClick={copyCommand}>
              Copy regenerate command
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portal Coverage Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.map((item) => (
            <div key={item.portal} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{item.portal}</p>
                <Badge variant="outline">{item.coverage}%</Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Impl: {item.implemented} | In progress: {item.in_progress} | Planned: {item.planned}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Mapping Matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, idx) => (
            <div key={`${row.portal}-${idx}`} className="border rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm">{row.portal} - {row.feature}</p>
                <Badge variant="outline" className={statusClasses[row.status]}>{statusLabels[row.status]}</Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Frontend: {row.frontend.join(', ')}
              </p>
              <p className="text-xs text-gray-600">
                Backend: {row.backend.join(', ')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Coverage: FE {row.frontend_coverage}% | BE {row.backend_coverage}%
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
