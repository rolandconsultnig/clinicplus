/**
 * Clinical Decision Support (CDS) Component - Enhanced
 * Evidence-based clinical alerts and recommendations with rules management
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Bell,
  Shield,
  TrendingUp,
  FileText,
  X,
  ExternalLink,
  Plus,
  Settings,
  Filter,
  Search,
  Save
} from 'lucide-react'
import { apiService } from '../services/apiService.js'

export default function ClinicalDecisionSupport({ patientId, encounterId }) {
  const [alerts, setAlerts] = useState([])
  const [guidelines, setGuidelines] = useState([])
  const [drugInteractions, setDrugInteractions] = useState([])
  const [preventiveCare, setPreventiveCare] = useState([])
  const [cdsRules, setCdsRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    condition: '',
    action: '',
    severity: 'medium',
    enabled: true
  })

  useEffect(() => {
    loadCDSData()
  }, [patientId, encounterId])

  const loadCDSData = async () => {
    setLoading(true)
    try {
      const requests = patientId
        ? [
            apiService.request(`/cds/alerts?patient_id=${patientId}`),
            apiService.request(`/cds/care-gaps?patient_id=${patientId}`)
          ]
        : [
            Promise.resolve({ alerts: [] }),
            Promise.resolve({ care_gaps: [] })
          ]
      const [alertsRes, careGapsRes, rulesRes] = await Promise.all([
        ...requests,
        apiService.request('/cds/rules')
      ])

      setAlerts(alertsRes?.alerts || [])
      setGuidelines([])
      setDrugInteractions([])
      setPreventiveCare(careGapsRes?.care_gaps || [])
      setCdsRules(rulesRes.rules || [])
    } catch (error) {
      console.error('Error loading CDS data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runCDSCheck = async () => {
    if (!patientId) {
      alert('Select a patient before running CDS check.')
      return
    }
    setLoading(true)
    try {
      const response = await apiService.request(`/cds/check-patient/${patientId}`, {
        method: 'POST',
        body: JSON.stringify({
          encounter_id: encounterId || null
        })
      })

      if (response.success) {
        await loadCDSData()
        alert(`CDS check completed. Created ${response.alerts_created || 0} alerts.`)
      }
    } catch (error) {
      console.error('CDS check error:', error)
      alert('CDS check failed')
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      await apiService.request(`/cds/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      })
      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      ))
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const dismissAlert = async (alertId) => {
    setAlerts(alerts.filter(a => a.id !== alertId))
  }

  const createCDSRule = async () => {
    try {
      const response = await apiService.request('/cds/rules', {
        method: 'POST',
        body: JSON.stringify(ruleForm)
      })

      if (response.success) {
        alert('CDS rule created successfully')
        setShowRuleModal(false)
        setRuleForm({
          name: '',
          description: '',
          condition: '',
          action: '',
          severity: 'medium',
          enabled: true
        })
        loadCDSData()
      }
    } catch (error) {
      console.error('Error creating rule:', error)
      alert('Failed to create rule')
    }
  }

  const toggleRule = async (ruleId, enabled) => {
    try {
      await apiService.request(`/cds/rules/${ruleId}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      })
      setCdsRules(cdsRules.map(r => 
        r.id === ruleId ? { ...r, enabled } : r
      ))
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-teal-700 bg-teal-50 border-teal-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />
      case 'medium':
        return <Info className="w-5 h-5" />
      case 'low':
        return <Bell className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity
    const matchesSearch = !searchTerm || 
      alert.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSeverity && matchesSearch
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-teal-700" />
            Clinical Decision Support
          </h1>
          <p className="text-gray-600 mt-1">
            Evidence-based alerts and recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runCDSCheck} variant="outline">
            <Shield className="w-4 h-4 mr-2" />
            Run CDS Check
          </Button>
          <Badge variant="outline" className="text-red-600 border-red-600">
            {alerts.filter(a => a.severity === 'critical').length} Critical
          </Badge>
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {alerts.filter(a => a.severity === 'high').length} High
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="alerts">
            Active Alerts ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="guidelines">
            Guidelines
          </TabsTrigger>
          <TabsTrigger value="interactions">
            Drug Interactions
          </TabsTrigger>
          <TabsTrigger value="preventive">
            Preventive Care
          </TabsTrigger>
          <TabsTrigger value="rules">
            CDS Rules
          </TabsTrigger>
        </TabsList>

        {/* Active Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search alerts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <Card key={alert.id} className={`border-2 ${getSeverityColor(alert.severity)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{alert.title}</h3>
                            <Badge variant="outline">{alert.severity}</Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
                          
                          {/* Recommendation */}
                          {alert.recommendation && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Recommendation:</p>
                              <p className="text-sm">{alert.recommendation}</p>
                            </div>
                          )}

                          {/* Evidence */}
                          {alert.evidence && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                              <FileText className="w-3 h-3" />
                              <span>Evidence: {alert.evidence}</span>
                              {alert.reference_url && (
                                <a 
                                  href={alert.reference_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-teal-700 hover:underline flex items-center gap-1"
                                >
                                  View Reference <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Alert Metadata */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            {alert.category && (
                              <span>Category: {alert.category}</span>
                            )}
                            {alert.created_at && (
                              <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!alert.acknowledged && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No active alerts</p>
                <p className="text-sm text-gray-500 mt-1">All clinical decision support checks passed</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clinical Guidelines */}
        <TabsContent value="guidelines" className="space-y-4">
          {guidelines.length > 0 ? (
            guidelines.map((guideline, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-700" />
                    {guideline.title}
                  </CardTitle>
                  <CardDescription>{guideline.organization}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{guideline.summary}</p>
                  
                  {guideline.recommendations && guideline.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700">Key Recommendations:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {guideline.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-gray-700">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {guideline.url && (
                    <a 
                      href={guideline.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline mt-4"
                    >
                      View Full Guideline <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No applicable guidelines found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Drug Interactions */}
        <TabsContent value="interactions" className="space-y-4">
          {drugInteractions.length > 0 ? (
            drugInteractions.map((interaction, index) => (
              <Card key={index} className={`border-2 ${getSeverityColor(interaction.severity)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 ${interaction.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">
                          {interaction.drug1} + {interaction.drug2}
                        </h4>
                        <Badge variant="outline">{interaction.severity}</Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{interaction.description}</p>
                      
                      {interaction.clinical_effect && (
                        <div className="p-3 bg-white rounded border mb-3">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Clinical Effect:</p>
                          <p className="text-sm">{interaction.clinical_effect}</p>
                        </div>
                      )}

                      {interaction.management && (
                        <div className="p-3 bg-green-50 rounded border border-green-200">
                          <p className="text-xs font-semibold text-green-900 mb-1">Management:</p>
                          <p className="text-sm text-green-800">{interaction.management}</p>
                        </div>
                      )}

                      {interaction.reference && (
                        <p className="text-xs text-gray-500 mt-2">
                          Reference: {interaction.reference}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No drug interactions detected</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preventive Care */}
        <TabsContent value="preventive" className="space-y-4">
          {preventiveCare.length > 0 ? (
            preventiveCare.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-teal-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg">{item.title}</h4>
                        <Badge variant={item.status === 'due' ? 'default' : 'outline'}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                      
                      {item.due_date && (
                        <p className="text-xs text-gray-600">
                          Due: {new Date(item.due_date).toLocaleDateString()}
                        </p>
                      )}

                      {item.guidelines && (
                        <p className="text-xs text-gray-500 mt-2">
                          Based on: {item.guidelines}
                        </p>
                      )}

                      {item.status === 'due' && (
                        <Button size="sm" variant="outline" className="mt-3">
                          Schedule
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">All preventive care up to date</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CDS Rules Management */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>CDS Rules Management</CardTitle>
                  <CardDescription>Configure clinical decision support rules</CardDescription>
                </div>
                <Button onClick={() => setShowRuleModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cdsRules.length > 0 ? (
                <div className="space-y-3">
                  {cdsRules.map((rule) => (
                    <Card key={rule.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{rule.name}</h4>
                              <Badge variant={rule.enabled ? 'default' : 'outline'}>
                                {rule.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                              <Badge variant="outline">{rule.severity}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                            <div className="text-xs text-gray-500">
                              <p>Condition: {rule.condition}</p>
                              <p>Action: {rule.action}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleRule(rule.id, !rule.enabled)}
                            >
                              {rule.enabled ? 'Disable' : 'Enable'}
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No CDS rules configured</p>
                  <Button className="mt-4" onClick={() => setShowRuleModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Rule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create CDS Rule</CardTitle>
              <CardDescription>Define a new clinical decision support rule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({...ruleForm, name: e.target.value})}
                  placeholder="e.g., Drug Allergy Alert"
                />
              </div>

              <div>
                <Label>Description *</Label>
                <Textarea
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                  placeholder="Describe what this rule checks..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Condition *</Label>
                <Textarea
                  value={ruleForm.condition}
                  onChange={(e) => setRuleForm({...ruleForm, condition: e.target.value})}
                  placeholder="e.g., patient.allergies.contains(drug) AND prescription.drug == drug"
                  rows={2}
                />
              </div>

              <div>
                <Label>Action *</Label>
                <Textarea
                  value={ruleForm.action}
                  onChange={(e) => setRuleForm({...ruleForm, action: e.target.value})}
                  placeholder="e.g., Show critical alert: 'Patient is allergic to this medication'"
                  rows={2}
                />
              </div>

              <div>
                <Label>Severity *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={ruleForm.severity}
                  onChange={(e) => setRuleForm({...ruleForm, severity: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={createCDSRule}
                  disabled={!ruleForm.name || !ruleForm.condition || !ruleForm.action}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRuleModal(false)
                    setRuleForm({
                      name: '',
                      description: '',
                      condition: '',
                      action: '',
                      severity: 'medium',
                      enabled: true
                    })
                  }}
                >
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
