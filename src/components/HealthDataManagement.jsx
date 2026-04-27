/**
 * Health Data Management Component
 * Centralized health data aggregation and analytics
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Activity, 
  Heart,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react'
import apiService from '../services/apiService'

export default function HealthDataManagement({ patientId }) {
  const [healthMetrics, setHealthMetrics] = useState(null)
  const [vitalsTrends, setVitalsTrends] = useState([])
  const [labTrends, setLabTrends] = useState([])
  const [healthScore, setHealthScore] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (patientId) loadHealthData()
  }, [patientId])

  const loadHealthData = async () => {
    setLoading(true)
    try {
      const [metricsRes, vitalsRes, labsRes, scoreRes] = await Promise.all([
        apiService.request(`/health-data/metrics/${patientId}`),
        apiService.request(`/health-data/vitals-trends/${patientId}`),
        apiService.request(`/health-data/lab-trends/${patientId}`),
        apiService.request(`/health-data/health-score/${patientId}`)
      ])
      
      setHealthMetrics(metricsRes.metrics)
      setVitalsTrends(vitalsRes.trends || [])
      setLabTrends(labsRes.trends || [])
      setHealthScore(scoreRes.score)
    } catch (error) {
      console.error('Error loading health data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportHealthData = async () => {
    try {
      const response = await apiService.request(`/health-data/export/${patientId}`)
      // Trigger download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `health-data-${patientId}-${new Date().toISOString()}.json`
      a.click()
    } catch (error) {
      alert('Export failed: ' + error.message)
    }
  }

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Activity className="w-4 h-4 text-gray-600" />
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8 text-teal-700" />
            Health Data Management
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive health metrics and trends</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadHealthData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportHealthData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Health Score */}
      {healthScore && (
        <Card className="border-2 border-teal-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Overall Health Score</p>
              <div className={`text-6xl font-bold ${getScoreColor(healthScore.score)}`}>
                {healthScore.score}
              </div>
              <p className="text-sm text-gray-600 mt-2">{healthScore.category}</p>
              <div className="mt-4 flex justify-center gap-4">
                {healthScore.factors?.map((factor, i) => (
                  <Badge key={i} variant="outline">{factor}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {healthMetrics && Object.entries(healthMetrics).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{key.replace(/_/g, ' ').toUpperCase()}</p>
                  <p className="text-2xl font-bold">{value.value}</p>
                  <p className="text-xs text-gray-500">{value.unit}</p>
                </div>
                {getTrendIcon(value.trend)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
        </TabsList>

        {/* Vitals Trends */}
        <TabsContent value="vitals" className="space-y-4">
          {vitalsTrends.map((vital) => (
            <Card key={vital.type}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{vital.name}</span>
                  <Badge className={vital.status === 'normal' ? 'bg-green-100' : 'bg-red-100'}>
                    {vital.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current:</span>
                    <span className="font-semibold">{vital.current} {vital.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average (30d):</span>
                    <span className="font-semibold">{vital.average} {vital.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Range:</span>
                    <span className="font-semibold">{vital.range}</span>
                  </div>
                  <div className="mt-4">
                    <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                      <span className="ml-2 text-gray-500">Trend Chart</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Lab Trends */}
        <TabsContent value="labs" className="space-y-4">
          {labTrends.map((lab) => (
            <Card key={lab.test}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{lab.test_name}</span>
                  <Badge className={lab.abnormal ? 'bg-red-100' : 'bg-green-100'}>
                    {lab.abnormal ? 'Abnormal' : 'Normal'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Latest</p>
                    <p className="font-semibold">{lab.latest} {lab.unit}</p>
                    <p className="text-xs text-gray-500">{new Date(lab.latest_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Previous</p>
                    <p className="font-semibold">{lab.previous} {lab.unit}</p>
                    <p className="text-xs text-gray-500">{new Date(lab.previous_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reference</p>
                    <p className="font-semibold">{lab.reference_range}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Conditions */}
        <TabsContent value="conditions">
          <Card>
            <CardHeader>
              <CardTitle>Active Conditions</CardTitle>
              <CardDescription>Chronic conditions and diagnoses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Hypertension', 'Type 2 Diabetes', 'Hyperlipidemia'].map((condition, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{condition}</p>
                      <p className="text-sm text-gray-600">Diagnosed: 2 years ago</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
