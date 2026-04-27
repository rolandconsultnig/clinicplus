/**
 * System health and status (admin) — uses /api/health and /api/status
 */
import React, { useState, useEffect, useCallback } from 'react'
import { apiService } from '../services/apiService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Activity, Database, Server, RefreshCw } from 'lucide-react'

export default function SystemHealthMonitoring() {
  const [health, setHealth] = useState(null)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [h, s] = await Promise.all([
        apiService.request('/health', { method: 'GET', auth: false }),
        apiService.request('/status', { method: 'GET', auth: false }),
      ])
      setHealth(h)
      setStatus(s)
    } catch (e) {
      setError(e.message || 'Failed to load system status')
      setHealth(null)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !health && !error) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 py-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading system status…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-600">API health, database, and high-level table counts (when DB is up).</p>
        <Button type="button" variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 text-sm text-amber-900">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-teal-700" />
              <CardTitle className="text-base">/api/health</CardTitle>
            </div>
            <CardDescription>Load balancer and uptime checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {health ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Status</span>
                  <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>{health.status}</Badge>
                </div>
                {health.database != null && (
                  <div className="flex items-start gap-2">
                    <Database className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-slate-500 text-xs">Database</p>
                      <p className="font-mono text-xs break-all">{String(health.database)}</p>
                    </div>
                  </div>
                )}
                {health.environment && (
                  <p className="text-xs text-slate-500">Environment: {health.environment}</p>
                )}
                {health.timestamp && (
                  <p className="text-xs text-slate-500">Time: {health.timestamp}</p>
                )}
              </>
            ) : (
              <p className="text-slate-500">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-700" />
              <CardTitle className="text-base">/api/status</CardTitle>
            </div>
            <CardDescription>Statistics and detailed DB state</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {status ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">State</span>
                  <Badge variant={status.status === 'operational' ? 'default' : 'secondary'}>
                    {status.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">Database: {status.database}</p>
                {status.statistics && typeof status.statistics === 'object' && !status.statistics.error && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {Object.entries(status.statistics).map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-mono">{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {status.statistics?.error && (
                  <p className="text-xs text-amber-800 mt-1">{status.statistics.error}</p>
                )}
                {status.timestamp && <p className="text-xs text-slate-500 pt-1">{status.timestamp}</p>}
              </div>
            ) : (
              <p className="text-slate-500">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
