/**
 * FHIR Integration Component - Enhanced
 * Manage FHIR resources and interoperability with SMART on FHIR support
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Database, 
  Upload, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  FileJson,
  Server,
  Link as LinkIcon,
  Search,
  Code,
  Plus,
  Settings,
  ExternalLink,
  Key,
  Globe
} from 'lucide-react'
import { apiService } from '../services/apiService.js'

export default function FHIRIntegration() {
  const [resources, setResources] = useState([])
  const [servers, setServers] = useState([])
  const [selectedResource, setSelectedResource] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [resourceType, setResourceType] = useState('Patient')
  const [loading, setLoading] = useState(false)
  const [fhirData, setFhirData] = useState(null)
  const [showServerModal, setShowServerModal] = useState(false)
  const [showSMARTModal, setShowSMARTModal] = useState(false)
  const [serverForm, setServerForm] = useState({
    name: '',
    url: '',
    fhir_version: 'R4',
    auth_type: 'none',
    client_id: '',
    client_secret: '',
    scope: 'launch patient/*.read'
  })
  const [capabilityStatement, setCapabilityStatement] = useState(null)

  const resourceTypes = [
    'Patient', 'Practitioner', 'Organization', 'Observation',
    'Condition', 'Procedure', 'MedicationRequest', 'Encounter',
    'AllergyIntolerance', 'DiagnosticReport', 'Immunization',
    'Medication', 'Location', 'Appointment', 'DocumentReference'
  ]

  useEffect(() => {
    loadServers()
    loadCapabilityStatement()
  }, [])

  const loadServers = async () => {
    try {
      const response = await apiService.request('/fhir/servers')
      if (response.success) {
        setServers(response.servers || [])
      }
    } catch (error) {
      console.error('Error loading FHIR servers:', error)
    }
  }

  const loadCapabilityStatement = async () => {
    try {
      const response = await apiService.request('/fhir/CapabilityStatement')
      if (response.success) {
        setCapabilityStatement(response)
      }
    } catch (error) {
      console.error('Error loading capability statement:', error)
    }
  }

  const searchResources = async () => {
    setLoading(true)
    try {
      let url = `/fhir/${resourceType}`
      if (searchQuery) {
        url += `?name=${encodeURIComponent(searchQuery)}`
      }

      const response = await apiService.request(url)
      if (response.success) {
        setResources(response.entry || response.resources || [])
      }
    } catch (error) {
      console.error('Error searching resources:', error)
      alert('Search failed: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const getResource = async (resourceType, id) => {
    setLoading(true)
    try {
      const response = await apiService.request(`/fhir/${resourceType}/${id}`)
      if (response.success) {
        setSelectedResource(response)
        setFhirData(JSON.stringify(response, null, 2))
      }
    } catch (error) {
      console.error('Error getting resource:', error)
      alert('Failed to load resource: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const createResource = async (resourceData) => {
    setLoading(true)
    try {
      const response = await apiService.request(`/fhir/${resourceType}`, {
        method: 'POST',
        body: JSON.stringify(resourceData)
      })
      if (response.success) {
        alert('Resource created successfully')
        searchResources()
      }
    } catch (error) {
      console.error('Error creating resource:', error)
      alert('Failed to create resource: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const exportToFHIR = async (patientId) => {
    setLoading(true)
    try {
      const response = await apiService.request(`/fhir/export/patient/${patientId}`)
      
      if (response.success) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(response.bundle || response, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `patient-${patientId}-fhir-bundle.json`
        a.click()
        window.URL.revokeObjectURL(url)
        
        alert('FHIR bundle exported successfully')
      }
    } catch (error) {
      console.error('Error exporting to FHIR:', error)
      alert('Export failed: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const importFromFHIR = async (file) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiService.request('/fhir/import', {
        method: 'POST',
        body: formData
      })
      
      if (response.success) {
        alert(`Imported ${response.imported_count || 0} resources successfully`)
      }
    } catch (error) {
      console.error('Error importing FHIR:', error)
      alert('Import failed: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (serverId) => {
    try {
      const response = await apiService.request(`/fhir/servers/${serverId}/test`)
      return response.success
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  const launchSMARTApp = async (appUrl, patientId) => {
    try {
      // Generate SMART launch URL
      const launchUrl = await apiService.request('/fhir/smart/launch', {
        method: 'POST',
        body: JSON.stringify({
          app_url: appUrl,
          patient_id: patientId,
          scope: 'launch patient/*.read'
        })
      })

      if (launchUrl.success && launchUrl.launch_url) {
        window.open(launchUrl.launch_url, '_blank')
      }
    } catch (error) {
      console.error('SMART launch failed:', error)
      alert('Failed to launch SMART app')
    }
  }

  const addServer = async () => {
    try {
      const response = await apiService.request('/fhir/servers', {
        method: 'POST',
        body: JSON.stringify(serverForm)
      })

      if (response.success) {
        alert('FHIR server added successfully')
        setShowServerModal(false)
        setServerForm({
          name: '',
          url: '',
          fhir_version: 'R4',
          auth_type: 'none',
          client_id: '',
          client_secret: '',
          scope: 'launch patient/*.read'
        })
        loadServers()
      }
    } catch (error) {
      console.error('Error adding server:', error)
      alert('Failed to add server')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-green-600" />
            FHIR Integration
          </h1>
          <p className="text-gray-600 mt-1">
            Fast Healthcare Interoperability Resources (FHIR R4)
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            FHIR R4
          </Badge>
          {capabilityStatement && (
            <Badge variant="outline">
              <CheckCircle className="w-3 h-3 mr-1" />
              Server Ready
            </Badge>
          )}
        </div>
      </div>

      {/* Capability Statement */}
      {capabilityStatement && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">FHIR Server Status</h3>
                <p className="text-sm text-green-800 mt-1">
                  Server: {capabilityStatement.url || 'Local'} | 
                  Version: {capabilityStatement.fhirVersion || 'R4'} |
                  Resources: {capabilityStatement.rest?.[0]?.resource?.length || 0} supported
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="search">Search Resources</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="servers">FHIR Servers</TabsTrigger>
          <TabsTrigger value="smart">SMART on FHIR</TabsTrigger>
        </TabsList>

        {/* Search Resources */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search FHIR Resources</CardTitle>
              <CardDescription>Query FHIR resources by type and criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Resource Type</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md mt-1"
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                  >
                    {resourceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Search Query</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter search criteria..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchResources()}
                    />
                    <Button onClick={searchResources} disabled={loading}>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </div>

              {/* Results */}
              {resources.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Results ({resources.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {resources.map((entry, index) => {
                      const resource = entry.resource || entry
                      return (
                        <div 
                          key={index}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => getResource(resource.resourceType || resourceType, resource.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <Badge variant="outline" className="mb-2">
                                {resource.resourceType || resourceType}
                              </Badge>
                              <p className="font-medium">ID: {resource.id}</p>
                              {resource.name && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {Array.isArray(resource.name) 
                                    ? resource.name[0]?.text || resource.name[0]?.family 
                                    : resource.name}
                                </p>
                              )}
                              {resource.status && (
                                <Badge variant="outline" className="mt-2">
                                  {resource.status}
                                </Badge>
                              )}
                            </div>
                            <FileJson className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Resource Details */}
              {selectedResource && (
                <Card className="mt-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        Resource Details
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(fhirData)
                            alert('Copied to clipboard!')
                          }}
                        >
                          <Code className="w-4 h-4 mr-1" />
                          Copy JSON
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const blob = new Blob([fhirData], { type: 'application/json' })
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `${selectedResource.resourceType || resourceType}-${selectedResource.id}.json`
                            a.click()
                            window.URL.revokeObjectURL(url)
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                      {fhirData}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Data */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-teal-700" />
                Export to FHIR
              </CardTitle>
              <CardDescription>
                Export patient data as FHIR-compliant JSON bundles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Patient ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="exportPatientId"
                    placeholder="Enter patient ID..."
                    type="number"
                  />
                  <Button 
                    onClick={() => {
                      const patientId = document.getElementById('exportPatientId').value
                      if (patientId) {
                        exportToFHIR(patientId)
                      } else {
                        alert('Please enter a patient ID')
                      }
                    }}
                    disabled={loading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <h4 className="font-semibold text-teal-900 mb-2">Export Includes:</h4>
                <ul className="text-sm text-teal-800 space-y-1">
                  <li>• Patient demographics</li>
                  <li>• Conditions and diagnoses</li>
                  <li>• Medications and allergies</li>
                  <li>• Observations and vitals</li>
                  <li>• Procedures and encounters</li>
                  <li>• Immunizations</li>
                  <li>• Diagnostic reports</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Data */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-600" />
                Import from FHIR
              </CardTitle>
              <CardDescription>
                Import FHIR bundles or individual resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>FHIR Bundle File (JSON)</Label>
                <Input
                  type="file"
                  accept=".json"
                  className="mt-1"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) importFromFHIR(file)
                  }}
                  disabled={loading}
                />
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Import Notes:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Only FHIR R4 format supported</li>
                  <li>• Duplicate resources will be skipped</li>
                  <li>• Validation errors will be logged</li>
                  <li>• Large bundles may take time to process</li>
                  <li>• Patient matching uses identifiers</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FHIR Servers */}
        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-teal-700" />
                    Connected FHIR Servers
                  </CardTitle>
                  <CardDescription>
                    Manage external FHIR server connections
                  </CardDescription>
                </div>
                <Button onClick={() => setShowServerModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {servers.length > 0 ? (
                <div className="space-y-3">
                  {servers.map((server) => (
                    <Card key={server.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{server.name}</h4>
                              <Badge variant={server.status === 'active' ? 'default' : 'outline'}>
                                {server.status}
                              </Badge>
                              {server.auth_type && server.auth_type !== 'none' && (
                                <Badge variant="outline">
                                  <Key className="w-3 h-3 mr-1" />
                                  {server.auth_type}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              <LinkIcon className="w-3 h-3 inline mr-1" />
                              {server.url}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>FHIR Version: {server.fhir_version || 'R4'}</span>
                              {server.last_sync && (
                                <span>Last Sync: {new Date(server.last_sync).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                const success = await testConnection(server.id)
                                alert(success ? 'Connection successful!' : 'Connection failed')
                              }}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Test
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
                  <Server className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No FHIR servers configured</p>
                  <Button className="mt-4" onClick={() => setShowServerModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Server
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMART on FHIR */}
        <TabsContent value="smart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-700" />
                SMART on FHIR Apps
              </CardTitle>
              <CardDescription>
                Launch SMART on FHIR applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">SMART on FHIR</h4>
                <p className="text-sm text-teal-900">
                  Launch third-party applications that integrate with your FHIR server using OAuth2.
                </p>
              </div>

              <div>
                <Label>Patient ID</Label>
                <Input
                  id="smartPatientId"
                  placeholder="Enter patient ID for app launch..."
                  type="number"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>SMART App URL</Label>
                <Input
                  id="smartAppUrl"
                  placeholder="https://app.example.com/launch"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={() => {
                  const patientId = document.getElementById('smartPatientId').value
                  const appUrl = document.getElementById('smartAppUrl').value
                  if (patientId && appUrl) {
                    launchSMARTApp(appUrl, patientId)
                  } else {
                    alert('Please enter both patient ID and app URL')
                  }
                }}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Launch SMART App
              </Button>

              <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-semibold mb-2">Available SMART Apps:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Clinical Decision Support App</span>
                    <Button size="sm" variant="outline">Launch</Button>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Medication Reconciliation</span>
                    <Button size="sm" variant="outline">Launch</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Server Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add FHIR Server</CardTitle>
              <CardDescription>Configure a new FHIR server connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Server Name *</Label>
                <Input
                  value={serverForm.name}
                  onChange={(e) => setServerForm({...serverForm, name: e.target.value})}
                  placeholder="e.g., Epic FHIR Server"
                />
              </div>

              <div>
                <Label>Server URL *</Label>
                <Input
                  value={serverForm.url}
                  onChange={(e) => setServerForm({...serverForm, url: e.target.value})}
                  placeholder="https://fhir.example.com/fhir"
                />
              </div>

              <div>
                <Label>FHIR Version</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={serverForm.fhir_version}
                  onChange={(e) => setServerForm({...serverForm, fhir_version: e.target.value})}
                >
                  <option value="R4">R4</option>
                  <option value="R3">R3</option>
                  <option value="STU3">STU3</option>
                </select>
              </div>

              <div>
                <Label>Authentication Type</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={serverForm.auth_type}
                  onChange={(e) => setServerForm({...serverForm, auth_type: e.target.value})}
                >
                  <option value="none">None</option>
                  <option value="basic">Basic Auth</option>
                  <option value="oauth2">OAuth2</option>
                  <option value="bearer">Bearer Token</option>
                </select>
              </div>

              {(serverForm.auth_type === 'oauth2' || serverForm.auth_type === 'bearer') && (
                <>
                  <div>
                    <Label>Client ID</Label>
                    <Input
                      value={serverForm.client_id}
                      onChange={(e) => setServerForm({...serverForm, client_id: e.target.value})}
                      placeholder="OAuth2 Client ID"
                    />
                  </div>
                  <div>
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      value={serverForm.client_secret}
                      onChange={(e) => setServerForm({...serverForm, client_secret: e.target.value})}
                      placeholder="OAuth2 Client Secret"
                    />
                  </div>
                  <div>
                    <Label>Scope</Label>
                    <Input
                      value={serverForm.scope}
                      onChange={(e) => setServerForm({...serverForm, scope: e.target.value})}
                      placeholder="launch patient/*.read"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={addServer}
                  disabled={!serverForm.name || !serverForm.url}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowServerModal(false)
                    setServerForm({
                      name: '',
                      url: '',
                      fhir_version: 'R4',
                      auth_type: 'none',
                      client_id: '',
                      client_secret: '',
                      scope: 'launch patient/*.read'
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
