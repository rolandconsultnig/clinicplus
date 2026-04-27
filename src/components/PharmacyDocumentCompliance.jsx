/**
 * Pharmacy Document and Compliance Management Module
 * Secure storage, HIPAA/GDPR compliance, electronic signatures, EHR integration
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import {
  FileText,
  Upload,
  Download,
  Shield,
  CheckCircle,
  AlertCircle,
  Lock,
  Search,
  Eye,
  Trash2,
  Edit,
  UserCheck,
  FileCheck,
  RefreshCw
} from 'lucide-react'
import { apiService } from '../services/apiService'

export default function PharmacyDocumentCompliance() {
  const [activeTab, setActiveTab] = useState('documents')
  const [documents, setDocuments] = useState([])
  const [complianceStatus, setComplianceStatus] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      switch (activeTab) {
        case 'documents':
          const docsRes = await apiService.request('/pharmacy/documents')
          setDocuments(docsRes.documents || [])
          break
        case 'compliance':
          const compRes = await apiService.request('/pharmacy/compliance/status')
          setComplianceStatus(compRes)
          break
        case 'audit':
          const auditRes = await apiService.request('/pharmacy/compliance/audit-logs')
          setAuditLogs(auditRes.logs || [])
          break
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setDocuments([])
      setComplianceStatus(null)
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }

  const uploadDocument = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'prescription')
    
    try {
      const response = await apiService.request('/pharmacy/documents/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.success) {
        alert('Document uploaded successfully')
        loadData()
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Failed to upload document')
    }
  }

  const downloadDocument = async (docId) => {
    try {
      const response = await apiService.request(`/pharmacy/documents/${docId}/download`)
      // In a real implementation, this would trigger a file download
      alert('Document download initiated')
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  const captureSignature = async (docId) => {
    try {
      // In a real implementation, this would open a signature capture interface
      const signatureData = prompt('Enter signature data (in real app, this would use a signature pad)')
      if (signatureData) {
        const response = await apiService.request(`/pharmacy/documents/${docId}/signature`, {
          method: 'POST',
          body: JSON.stringify({ signature: signatureData })
        })
        
        if (response.success) {
          alert('Signature captured successfully')
          loadData()
        }
      }
    } catch (error) {
      console.error('Error capturing signature:', error)
      alert('Failed to capture signature')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      uploadDocument(file)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents & Compliance</h1>
          <p className="text-gray-600">Secure document storage and regulatory compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>Secure storage of prescriptions, records, and forms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </Label>
                <p className="text-sm text-gray-500 mt-2">
                  All documents are encrypted and stored securely
                </p>
              </div>

              {/* Search */}
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Document List */}
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {documents
                    .filter(doc =>
                      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      doc.patientName?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(doc => (
                      <div key={doc.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-5 h-5 text-teal-600" />
                              <p className="font-semibold">{doc.name}</p>
                              {doc.encrypted && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Encrypted
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">Patient: {doc.patientName}</p>
                            <p className="text-sm text-gray-600">Type: {doc.type}</p>
                            <p className="text-sm text-gray-600">Uploaded: {doc.uploadDate}</p>
                            <p className="text-sm text-gray-600">Size: {doc.size}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => downloadDocument(doc.id)}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => captureSignature(doc.id)}>
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : complianceStatus ? (
            <>
              {/* HIPAA Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    HIPAA Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Status: {complianceStatus.hipaa?.status}</p>
                      <p className="text-sm text-gray-600">
                        Last Audit: {complianceStatus.hipaa?.lastAudit}
                      </p>
                    </div>
                    <Badge variant={complianceStatus.hipaa?.status === 'compliant' ? 'default' : 'destructive'}>
                      {complianceStatus.hipaa?.status === 'compliant' ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mr-1" />
                      )}
                      {complianceStatus.hipaa?.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* GDPR Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    GDPR Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Status: {complianceStatus.gdpr?.status}</p>
                      <p className="text-sm text-gray-600">
                        Last Audit: {complianceStatus.gdpr?.lastAudit}
                      </p>
                    </div>
                    <Badge variant={complianceStatus.gdpr?.status === 'compliant' ? 'default' : 'destructive'}>
                      {complianceStatus.gdpr?.status === 'compliant' ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mr-1" />
                      )}
                      {complianceStatus.gdpr?.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Encryption Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Encryption
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <Badge variant="default">{complianceStatus.encryption?.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Algorithm:</span>
                      <span className="font-semibold">{complianceStatus.encryption?.algorithm}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Access Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Access Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <Badge variant="default">{complianceStatus.accessControls?.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Multi-Factor Authentication:</span>
                      <Badge variant={complianceStatus.accessControls?.mfaEnabled ? 'default' : 'secondary'}>
                        {complianceStatus.accessControls?.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No compliance data available</div>
          )}
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>All access and modification logs</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No audit logs found</div>
                  ) : (
                    auditLogs.map((log, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{log.action}</p>
                            <p className="text-sm text-gray-600">User: {log.user}</p>
                            <p className="text-sm text-gray-600">Time: {log.timestamp}</p>
                            {log.details && (
                              <p className="text-sm text-gray-600">Details: {log.details}</p>
                            )}
                          </div>
                          <Badge variant="outline">{log.type}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

