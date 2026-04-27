/**
 * Professional Credentialing Component
 * Manage provider credentials, licenses, and certifications
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Award, 
  FileText, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Save,
  X,
  Shield,
  GraduationCap,
  ClipboardList,
  Ban,
  RotateCcw,
  FileCheck,
  BarChart3,
  Clock,
  Search
} from 'lucide-react'
import apiService from '../services/apiService'

export default function ProfessionalCredentialing() {
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [expiringCredentials, setExpiringCredentials] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCredential, setEditingCredential] = useState(null)
  
  // New state for comprehensive features
  const [expirationDashboard, setExpirationDashboard] = useState(null)
  const [privileges, setPrivileges] = useState([])
  const [privilegeDictionary, setPrivilegeDictionary] = useState([])
  const [cmeActivities, setCmeActivities] = useState([])
  const [applications, setApplications] = useState([])
  const [sanctions, setSanctions] = useState([])
  const [recredentialingCycles, setRecredentialingCycles] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [reports, setReports] = useState(null)
  const [activeTab, setActiveTab] = useState('providers')
  const [credentialForm, setCredentialForm] = useState({
    provider_id: '',
    credential_type: 'Medical License',
    credential_number: '',
    issuing_authority: '',
    issuing_state: '',
    issuing_country: 'USA',
    issue_date: '',
    expiry_date: '',
    renewal_date: '',
    status: 'pending'
  })

  useEffect(() => {
    loadProviders()
    loadExpiringCredentials()
    if (activeTab === 'dashboard') loadExpirationDashboard()
    if (activeTab === 'privileges') loadPrivilegeDictionary()
    if (activeTab === 'cme') loadCMEActivities()
    if (activeTab === 'applications') loadApplications()
    if (activeTab === 'sanctions') loadSanctions()
    if (activeTab === 'recredentialing') loadRecredentialingCycles()
    if (activeTab === 'reports') loadReports()
  }, [activeTab])

  const loadProviders = async () => {
    try {
      const response = await apiService.request('/professional/providers')
      setProviders(response.providers || [])
    } catch (error) {
      console.error('Error loading providers:', error)
    }
  }

  const loadCredentials = async (providerId) => {
    try {
      const response = await apiService.request(`/professional/credentials/${providerId}`)
      setCredentials(response.credentials || [])
    } catch (error) {
      console.error('Error loading credentials:', error)
    }
  }

  const loadExpiringCredentials = async () => {
    try {
      const response = await apiService.request('/professional/expiring-credentials')
      setExpiringCredentials(response.credentials || [])
    } catch (error) {
      console.error('Error loading expiring credentials:', error)
    }
  }

  const addCredential = async (credentialData) => {
    setLoading(true)
    try {
      await apiService.request('/professional/credentials', {
        method: 'POST',
        body: JSON.stringify(credentialData)
      })
      
      alert('Credential added successfully')
      if (selectedProvider) {
        loadCredentials(selectedProvider.id)
      }
      loadExpiringCredentials()
    } catch (error) {
      alert('Failed to add credential: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const saveCredential = async () => {
    if (!credentialForm.credential_number || !credentialForm.expiry_date) {
      alert('Please fill in required fields: Credential Number and Expiry Date')
      return
    }

    setLoading(true)
    try {
      if (editingCredential) {
        // Update existing credential
        await apiService.request(`/professional/credentials/${editingCredential.id}`, {
          method: 'PUT',
          body: JSON.stringify(credentialForm)
        })
        alert('Credential updated successfully')
      } else {
        // Add new credential
        await apiService.request('/professional/credentials', {
          method: 'POST',
          body: JSON.stringify(credentialForm)
        })
        alert('Credential added successfully')
      }
      
      resetForm()
      if (selectedProvider) {
        loadCredentials(selectedProvider.id)
      }
      loadProviders()
      loadExpiringCredentials()
    } catch (error) {
      alert('Failed to save credential: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const editCredential = (credential) => {
    setEditingCredential(credential)
    setCredentialForm({
      provider_id: credential.provider_id,
      credential_type: credential.credential_type,
      credential_number: credential.credential_number,
      issuing_authority: credential.issuing_authority,
      issuing_state: credential.issuing_state || '',
      issuing_country: credential.issuing_country || 'USA',
      issue_date: credential.issue_date || '',
      expiry_date: credential.expiry_date,
      renewal_date: credential.renewal_date || '',
      status: credential.status
    })
    setShowAddForm(true)
  }

  const deleteCredential = async (credentialId) => {
    if (!confirm('Are you sure you want to delete this credential?')) return

    setLoading(true)
    try {
      await apiService.request(`/professional/credentials/${credentialId}`, {
        method: 'DELETE'
      })
      alert('Credential deleted successfully')
      if (selectedProvider) {
        loadCredentials(selectedProvider.id)
      }
      loadProviders()
      loadExpiringCredentials()
    } catch (error) {
      alert('Failed to delete credential: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyCredential = async (credentialId) => {
    setLoading(true)
    try {
      await apiService.request(`/professional/credentials/${credentialId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Verified by admin' })
      })
      alert('Credential verified successfully')
      if (selectedProvider) {
        loadCredentials(selectedProvider.id)
      }
      loadProviders()
    } catch (error) {
      alert('Failed to verify credential: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCredentialForm({
      provider_id: selectedProvider?.id || '',
      credential_type: 'Medical License',
      credential_number: '',
      issuing_authority: '',
      issuing_state: '',
      issuing_country: 'USA',
      issue_date: '',
      expiry_date: '',
      renewal_date: '',
      status: 'pending'
    })
    setEditingCredential(null)
    setShowAddForm(false)
  }

  const uploadDocument = async (credentialId, file) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('credential_id', credentialId)
      
      await apiService.request('/professional/upload-document', {
        method: 'POST',
        body: formData
      })
      
      alert('Document uploaded successfully')
      if (selectedProvider) {
        loadCredentials(selectedProvider.id)
      }
    } catch (error) {
      alert('Upload failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expiring': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-teal-100 text-teal-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // New comprehensive feature loaders
  const loadExpirationDashboard = async () => {
    try {
      const response = await apiService.request('/professional/dashboard/expirations')
      if (response.success) {
        setExpirationDashboard(response.dashboard)
      }
    } catch (error) {
      console.error('Error loading expiration dashboard:', error)
    }
  }

  const loadPrivilegeDictionary = async () => {
    try {
      const response = await apiService.request('/professional/privileges/dictionary')
      if (response.success) {
        setPrivilegeDictionary(response.privileges || [])
      }
    } catch (error) {
      console.error('Error loading privilege dictionary:', error)
    }
  }

  const loadCMEActivities = async () => {
    try {
      const response = await apiService.request('/professional/cme')
      if (response.success) {
        setCmeActivities(response.activities || [])
      }
    } catch (error) {
      console.error('Error loading CME activities:', error)
    }
  }

  const loadApplications = async () => {
    try {
      const response = await apiService.request('/professional/applications')
      if (response.success) {
        setApplications(response.applications || [])
      }
    } catch (error) {
      console.error('Error loading applications:', error)
    }
  }

  const loadSanctions = async () => {
    try {
      const response = await apiService.request('/professional/sanctions')
      if (response.success) {
        setSanctions(response.sanctions || [])
      }
    } catch (error) {
      console.error('Error loading sanctions:', error)
    }
  }

  const loadRecredentialingCycles = async () => {
    try {
      const response = await apiService.request('/professional/recredentialing')
      if (response.success) {
        setRecredentialingCycles(response.cycles || [])
      }
    } catch (error) {
      console.error('Error loading recredentialing cycles:', error)
    }
  }

  const loadReports = async () => {
    try {
      const tatResponse = await apiService.request('/professional/reports/turnaround-time')
      const accResponse = await apiService.request('/professional/reports/accreditation-readiness')
      setReports({
        turnaroundTime: tatResponse.report,
        accreditationReadiness: accResponse.checklist
      })
    } catch (error) {
      console.error('Error loading reports:', error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="w-8 h-8 text-teal-700" />
            Professional Credentialing
          </h1>
          <p className="text-gray-600 mt-1">Manage provider licenses and certifications</p>
        </div>
        <Button onClick={() => { loadProviders(); loadExpiringCredentials(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Expiring Credentials Alert */}
      {expiringCredentials.length > 0 && (
        <Card className="border-2 border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">
                  {expiringCredentials.length} Credential(s) Expiring Soon
                </h3>
                <div className="space-y-2">
                  {expiringCredentials.slice(0, 3).map((cred) => (
                    <div key={cred.id} className="text-sm text-yellow-800">
                      <strong>{cred.provider_name}</strong> - {cred.credential_type} 
                      (Expires: {new Date(cred.expiry_date).toLocaleDateString()})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="dashboard">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Expirations
          </TabsTrigger>
          <TabsTrigger value="privileges">
            <Shield className="w-4 h-4 mr-1" />
            Privileges
          </TabsTrigger>
          <TabsTrigger value="cme">
            <GraduationCap className="w-4 h-4 mr-1" />
            CME
          </TabsTrigger>
          <TabsTrigger value="applications">
            <ClipboardList className="w-4 h-4 mr-1" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="sanctions">
            <Ban className="w-4 h-4 mr-1" />
            Sanctions
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="w-4 h-4 mr-1" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-3">
          {providers.map((provider) => (
            <Card 
              key={provider.id} 
              className={`cursor-pointer hover:bg-gray-50 ${selectedProvider?.id === provider.id ? 'border-2 border-teal-500' : ''}`}
              onClick={() => {
                setSelectedProvider(provider)
                loadCredentials(provider.id)
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{provider.name}</h3>
                    <p className="text-sm text-gray-600">{provider.specialty}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{provider.provider_type}</Badge>
                      <Badge className={getStatusColor(provider.credentialing_status)}>
                        {provider.credentialing_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      License: {provider.license_number} | NPI: {provider.npi}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Credentials</p>
                    <p className="text-2xl font-bold text-teal-700">{provider.credential_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          {selectedProvider ? (
            <>
              <Card className="bg-teal-50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-1">{selectedProvider.name}</h3>
                  <p className="text-sm text-gray-600">{selectedProvider.specialty}</p>
                </CardContent>
              </Card>

              {credentials.length > 0 ? (
                credentials.map((credential) => (
                  <Card key={credential.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-teal-700" />
                            {credential.credential_type}
                          </CardTitle>
                          <CardDescription>{credential.issuing_organization}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(credential.status)}>
                          {credential.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Credential Number</p>
                          <p className="font-semibold">{credential.credential_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Issue Date</p>
                          <p className="font-semibold">
                            {new Date(credential.issue_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Expiry Date</p>
                          <p className="font-semibold">
                            {new Date(credential.expiry_date).toLocaleDateString()}
                          </p>
                          {getDaysUntilExpiry(credential.expiry_date) < 90 && (
                            <Badge variant="outline" className="mt-1 text-yellow-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Expires in {getDaysUntilExpiry(credential.expiry_date)} days
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Verification Status</p>
                          <p className="font-semibold flex items-center gap-1">
                            {credential.verified ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Verified
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                Pending Verification
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {credential.document_url && (
                        <div className="flex gap-2 mb-4">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View Document
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      )}

                      {!credential.document_url && (
                        <div>
                          <Label className="text-sm">Upload Supporting Document</Label>
                          <Input
                            type="file"
                            className="mt-1"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) uploadDocument(credential.id, file)
                            }}
                          />
                        </div>
                      )}

                      {!credential.verified && (
                        <Button 
                          size="sm" 
                          className="mt-4"
                          onClick={() => verifyCredential(credential.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark as Verified
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No credentials found for this provider</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>Select a provider to view credentials</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Add Credential Tab */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Credential
              </CardTitle>
              <CardDescription>Register a new professional credential</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                addCredential({
                  provider_id: formData.get('provider_id'),
                  credential_type: formData.get('credential_type'),
                  credential_number: formData.get('credential_number'),
                  issuing_organization: formData.get('issuing_organization'),
                  issue_date: formData.get('issue_date'),
                  expiry_date: formData.get('expiry_date')
                })
                e.target.reset()
              }} className="space-y-4">
                <div>
                  <Label>Provider *</Label>
                  <select name="provider_id" className="w-full px-3 py-2 border rounded-md mt-1" required>
                    <option value="">Select Provider</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Credential Type *</Label>
                    <select name="credential_type" className="w-full px-3 py-2 border rounded-md mt-1" required>
                      <option value="">Select Type</option>
                      <option value="Medical License">Medical License</option>
                      <option value="Board Certification">Board Certification</option>
                      <option value="DEA License">DEA License</option>
                      <option value="State License">State License</option>
                      <option value="Specialty Certification">Specialty Certification</option>
                      <option value="Hospital Privileges">Hospital Privileges</option>
                      <option value="Malpractice Insurance">Malpractice Insurance</option>
                    </select>
                  </div>
                  <div>
                    <Label>Credential Number *</Label>
                    <Input name="credential_number" required placeholder="Enter credential number" />
                  </div>
                </div>

                <div>
                  <Label>Issuing Organization *</Label>
                  <Input name="issuing_organization" required placeholder="e.g., State Medical Board" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Date *</Label>
                    <Input name="issue_date" type="date" required />
                  </div>
                  <div>
                    <Label>Expiry Date *</Label>
                    <Input name="expiry_date" type="date" required />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Adding...' : 'Add Credential'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiration Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {expirationDashboard ? (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Expired</p>
                      <p className="text-3xl font-bold text-red-600">{expirationDashboard.counts.expired}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Expiring in 30 Days</p>
                      <p className="text-3xl font-bold text-orange-600">{expirationDashboard.counts.expiring_30}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Expiring in 60 Days</p>
                      <p className="text-3xl font-bold text-yellow-600">{expirationDashboard.counts.expiring_60}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-teal-50 border-teal-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Expiring in 90 Days</p>
                      <p className="text-3xl font-bold text-teal-700">{expirationDashboard.counts.expiring_90}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {expirationDashboard.expired.length > 0 && (
                <Card className="border-red-500">
                  <CardHeader>
                    <CardTitle className="text-red-600">Expired Credentials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {expirationDashboard.expired.map((cred) => (
                        <div key={cred.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="font-semibold">{cred.credential_type}</span>
                          <span className="text-sm text-gray-600">Expired: {new Date(cred.expiry_date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Loading expiration dashboard...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Privileges Tab */}
        <TabsContent value="privileges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Privilege Dictionary</CardTitle>
              <CardDescription>Manage available clinical privileges</CardDescription>
            </CardHeader>
            <CardContent>
              {privilegeDictionary.length > 0 ? (
                <div className="space-y-2">
                  {privilegeDictionary.map((priv) => (
                    <div key={priv.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-semibold">{priv.privilege_name}</p>
                        <p className="text-sm text-gray-600">{priv.category} • {priv.specialty}</p>
                      </div>
                      <Badge>{priv.risk_level}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No privileges defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CME Tracking Tab */}
        <TabsContent value="cme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Continuing Medical Education</CardTitle>
              <CardDescription>Track CME activities and credits</CardDescription>
            </CardHeader>
            <CardContent>
              {cmeActivities.length > 0 ? (
                <div className="space-y-3">
                  {cmeActivities.map((cme) => (
                    <div key={cme.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-semibold">{cme.activity_name}</p>
                        <p className="text-sm text-gray-600">{cme.activity_type} • {new Date(cme.activity_date).toLocaleDateString()}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">{cme.credits_earned} Credits</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No CME activities recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credentialing Applications</CardTitle>
              <CardDescription>Manage credentialing application workflow</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length > 0 ? (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div key={app.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-semibold">Application #{app.application_id}</p>
                        <p className="text-sm text-gray-600">{app.application_type} • {app.current_step}</p>
                      </div>
                      <Badge className={getStatusColor(app.application_status)}>{app.application_status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No applications found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sanctions Tab */}
        <TabsContent value="sanctions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sanctions & Exclusions</CardTitle>
              <CardDescription>Monitor provider sanctions and exclusions</CardDescription>
            </CardHeader>
            <CardContent>
              {sanctions.length > 0 ? (
                <div className="space-y-3">
                  {sanctions.map((sanction) => (
                    <div key={sanction.id} className={`p-3 border rounded ${sanction.is_active ? 'bg-red-50 border-red-200' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{sanction.sanction_type}</p>
                          <p className="text-sm text-gray-600">Source: {sanction.source}</p>
                          <p className="text-sm text-gray-600">Date: {new Date(sanction.sanction_date).toLocaleDateString()}</p>
                        </div>
                        {sanction.is_active && <Badge className="bg-red-500">Active</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No sanctions found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Turnaround Time Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Average TAT</p>
                      <p className="text-4xl font-bold text-teal-700">{reports.turnaroundTime.average_tat_days.toFixed(1)} days</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-2xl font-bold">{reports.turnaroundTime.breakdown['0-30_days']}</p>
                        <p className="text-sm text-gray-600">0-30 days</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded">
                        <p className="text-2xl font-bold">{reports.turnaroundTime.breakdown['31-60_days']}</p>
                        <p className="text-sm text-gray-600">31-60 days</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded">
                        <p className="text-2xl font-bold">{reports.turnaroundTime.breakdown['61-90_days']}</p>
                        <p className="text-sm text-gray-600">61-90 days</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded">
                        <p className="text-2xl font-bold">{reports.turnaroundTime.breakdown['over_90_days']}</p>
                        <p className="text-sm text-gray-600">Over 90 days</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accreditation Readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Compliance Status</span>
                      <Badge className={reports.accreditationReadiness.compliance_status === 'compliant' ? 'bg-green-500' : 'bg-red-500'}>
                        {reports.accreditationReadiness.compliance_status}
                      </Badge>
                    </div>
                    {reports.accreditationReadiness.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 border rounded">
                        <span>{item.item}</span>
                        <Badge className={item.status === 'pass' ? 'bg-green-500' : item.status === 'fail' ? 'bg-red-500' : 'bg-yellow-500'}>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Loading reports...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
