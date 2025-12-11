import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Plus, 
  Edit, 
  Download, 
  Upload,
  Search,
  Filter,
  Folder,
  File,
  Eye,
  Share2,
  MessageSquare,
  History,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  Users,
  Archive,
  Trash2,
  Copy,
  FileCheck,
  AlertCircle,
  Calendar,
  Grid,
  List
} from 'lucide-react';

const DocumentManagement = ({ patientId }) => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents'); // documents, categories, templates
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterWorkflow, setFilterWorkflow] = useState('all');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    document_type: 'general',
    category: '',
    patient_id: patientId || '',
    tags: [],
    is_confidential: false,
    requires_signature: false,
    expires_at: ''
  });

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, [patientId, filterType, filterStatus, filterWorkflow]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = { search: searchTerm || undefined };
      if (patientId) params.patient_id = patientId;
      if (filterType !== 'all') params.document_type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterWorkflow !== 'all') params.workflow_status = filterWorkflow;
      
      const result = await apiService.request('/documents', { method: 'GET' }, params);
      if (result.success) {
        setDocuments(result.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await apiService.request('/document-categories', { method: 'GET' });
      if (result.success) {
        setCategories(result.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      if (!uploadFormData.title) {
        setUploadFormData({ ...uploadFormData, title: file.name });
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadFormData.title);
      formData.append('description', uploadFormData.description);
      formData.append('document_type', uploadFormData.document_type);
      formData.append('category', uploadFormData.category);
      if (uploadFormData.patient_id) formData.append('patient_id', uploadFormData.patient_id);
      formData.append('tags', JSON.stringify(uploadFormData.tags));
      formData.append('is_confidential', uploadFormData.is_confidential);
      formData.append('requires_signature', uploadFormData.requires_signature);
      if (uploadFormData.expires_at) formData.append('expires_at', uploadFormData.expires_at);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        await loadDocuments();
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadFormData({
          title: '',
          description: '',
          document_type: 'general',
          category: '',
          patient_id: patientId || '',
          tags: [],
          is_confidential: false,
          requires_signature: false,
          expires_at: ''
        });
        alert('Document uploaded successfully');
      } else {
        alert('Error uploading document: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDownload = async (docId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/documents/${docId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const doc = documents.find(d => d.id === docId);
        a.download = doc?.file_name || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error downloading document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document');
    }
  };

  const handlePreview = async (docId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const previewUrl = `http://localhost:5000/api/documents/${docId}/preview?token=${token}`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error('Error previewing document:', error);
      alert('Error previewing document');
    }
  };

  const handleViewDetails = async (docId) => {
    try {
      const result = await apiService.request(`/documents/${docId}`, { method: 'GET' });
      if (result.success) {
        setSelectedDocument(result.document);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error loading document details:', error);
    }
  };

  const handleShare = async (docId, shareData) => {
    try {
      const result = await apiService.request(`/documents/${docId}/share`, {
        method: 'POST',
        body: JSON.stringify(shareData)
      });
      if (result.success) {
        alert('Document shared successfully');
        if (selectedDocument && selectedDocument.id === docId) {
          await handleViewDetails(docId);
        }
      }
    } catch (error) {
      console.error('Error sharing document:', error);
      alert('Error sharing document: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAddAnnotation = async (docId, annotation) => {
    try {
      const result = await apiService.request(`/documents/${docId}/annotations`, {
        method: 'POST',
        body: JSON.stringify(annotation)
      });
      if (result.success) {
        alert('Annotation added successfully');
        if (selectedDocument && selectedDocument.id === docId) {
          await handleViewDetails(docId);
        }
      }
    } catch (error) {
      console.error('Error adding annotation:', error);
      alert('Error adding annotation: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReview = async (docId, workflowStatus, reviewNotes) => {
    try {
      const result = await apiService.request(`/documents/${docId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          workflow_status: workflowStatus,
          review_notes: reviewNotes
        })
      });
      if (result.success) {
        alert(`Document ${workflowStatus} successfully`);
        await loadDocuments();
        if (selectedDocument && selectedDocument.id === docId) {
          await handleViewDetails(docId);
        }
      }
    } catch (error) {
      console.error('Error reviewing document:', error);
      alert('Error reviewing document: ' + (error.message || 'Unknown error'));
    }
  };

  const handleBulkOperation = async (operation, data = {}) => {
    if (selectedDocuments.length === 0) {
      alert('Please select documents first');
      return;
    }

    try {
      const result = await apiService.request('/documents/bulk', {
        method: 'POST',
        body: JSON.stringify({
          document_ids: selectedDocuments,
          operation: operation,
          ...data
        })
      });
      if (result.success) {
        alert(`Bulk ${operation} completed successfully`);
        setSelectedDocuments([]);
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      alert('Error performing bulk operation: ' + (error.message || 'Unknown error'));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getWorkflowBadge = (status) => {
    const badges = {
      draft: { variant: 'outline', icon: Edit, color: 'text-gray-600' },
      pending_review: { variant: 'default', icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive', icon: XCircle, color: 'text-red-600' }
    };
    return badges[status] || badges.draft;
  };

  return (
    <PageWrapper
      title="Document Management"
      description="Comprehensive document management with upload, versioning, sharing, and workflow"
      icon={FileText}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
            {viewMode === 'list' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>Upload a new document with metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label>File *</Label>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.tiff,.dcm,.xls,.xlsx,.csv"
                    required
                  />
                  {uploadFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={uploadFormData.title}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Document Type</Label>
                    <select
                      value={uploadFormData.document_type}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, document_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="general">General</option>
                      <option value="lab_result">Lab Result</option>
                      <option value="imaging">Imaging</option>
                      <option value="letter">Letter</option>
                      <option value="form">Form</option>
                      <option value="note">Note</option>
                      <option value="report">Report</option>
                      <option value="prescription">Prescription</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <select
                      value={uploadFormData.category}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.category_name}>{cat.category_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Expiration Date</Label>
                    <Input
                      type="date"
                      value={uploadFormData.expires_at}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uploadFormData.is_confidential}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, is_confidential: e.target.checked })}
                    />
                    <span className="text-sm">Confidential</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uploadFormData.requires_signature}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, requires_signature: e.target.checked })}
                    />
                    <span className="text-sm">Requires Signature</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Document Details Modal */}
      {showDetailsModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedDocument.title}</CardTitle>
                  <CardDescription>{selectedDocument.document_type}</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Info */}
              <div>
                <h3 className="font-semibold mb-2">Document Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">File Name:</span>
                    <p className="font-medium">{selectedDocument.file_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Size:</span>
                    <p className="font-medium">{formatFileSize(selectedDocument.file_size)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <p className="font-medium">{new Date(selectedDocument.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Version:</span>
                    <p className="font-medium">v{selectedDocument.version}</p>
                  </div>
                </div>
              </div>

              {/* Versions */}
              {selectedDocument.versions && selectedDocument.versions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Version History</h3>
                  <div className="space-y-2">
                    {selectedDocument.versions.map(version => (
                      <div key={version.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Version {version.version_number}</p>
                            <p className="text-sm text-gray-600">{version.change_summary}</p>
                            <p className="text-xs text-gray-500">{new Date(version.created_at).toLocaleString()}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(version.document_id)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Annotations */}
              {selectedDocument.annotations && selectedDocument.annotations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Annotations</h3>
                  <div className="space-y-2">
                    {selectedDocument.annotations.map(annotation => (
                      <div key={annotation.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm">{annotation.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(annotation.created_at).toLocaleString()}
                            </p>
                          </div>
                          {annotation.is_resolved && (
                            <Badge variant="outline" className="text-green-600">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => handlePreview(selectedDocument.id)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" onClick={() => handleDownload(selectedDocument.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => {/* Share modal */}}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" onClick={() => {/* Add annotation */}}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Annotation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <>
          {/* Filters and Search */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setTimeout(loadDocuments, 500);
                    }}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Types</option>
                  <option value="lab_result">Lab Results</option>
                  <option value="imaging">Imaging</option>
                  <option value="letter">Letters</option>
                  <option value="form">Forms</option>
                  <option value="note">Notes</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={filterWorkflow}
                  onChange={(e) => setFilterWorkflow(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Workflow</option>
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedDocuments.length > 0 && (
            <Card className="mb-4 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedDocuments.length} document(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleBulkOperation('archive')}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkOperation('delete')}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDocuments([])}>
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents List/Grid */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents ({documents.length})</CardTitle>
                  <CardDescription>Manage patient documents and files</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No documents found. Upload your first document above.</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-4">
                  {documents.map((doc) => {
                    const workflowBadge = getWorkflowBadge(doc.workflow_status);
                    const WorkflowIcon = workflowBadge.icon;
                    return (
                      <div
                        key={doc.id}
                        className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                          selectedDocuments.includes(doc.id) ? 'bg-blue-50 border-blue-300' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedDocuments.includes(doc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocuments([...selectedDocuments, doc.id]);
                                } else {
                                  setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                                }
                              }}
                              className="mt-1"
                            />
                            <File className="w-5 h-5 text-blue-600 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                                    onClick={() => handleViewDetails(doc.id)}>
                                  {doc.title}
                                </h3>
                                <Badge variant="outline">{doc.document_type}</Badge>
                                {doc.is_confidential && (
                                  <Badge variant="destructive">Confidential</Badge>
                                )}
                                <Badge variant={workflowBadge.variant} className="flex items-center gap-1">
                                  <WorkflowIcon className="w-3 h-3" />
                                  {doc.workflow_status}
                                </Badge>
                                {doc.expires_at && new Date(doc.expires_at) < new Date() && (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Expired
                                  </Badge>
                                )}
                              </div>
                              {doc.description && (
                                <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                {doc.file_name && <span>{doc.file_name}</span>}
                                {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                                {doc.created_at && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </span>
                                )}
                                {doc.version > 1 && (
                                  <span className="flex items-center gap-1">
                                    <History className="w-3 h-3" />
                                    v{doc.version}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(doc.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handlePreview(doc.id)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.id)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => {
                    const workflowBadge = getWorkflowBadge(doc.workflow_status);
                    const WorkflowIcon = workflowBadge.icon;
                    return (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <File className="w-5 h-5 text-blue-600" />
                            <input
                              type="checkbox"
                              checked={selectedDocuments.includes(doc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocuments([...selectedDocuments, doc.id]);
                                } else {
                                  setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                                }
                              }}
                            />
                          </div>
                          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{doc.title}</h3>
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
                            {doc.is_confidential && <Badge variant="destructive" className="text-xs">Confidential</Badge>}
                          </div>
                          <div className="text-xs text-gray-500 mb-3">
                            {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleViewDetails(doc.id)}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleDownload(doc.id)}>
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle>Document Categories</CardTitle>
            <CardDescription>Manage document categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="p-3 border rounded-lg">
                  <h3 className="font-medium">{cat.category_name}</h3>
                  {cat.description && <p className="text-sm text-gray-600">{cat.description}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Card>
          <CardHeader>
            <CardTitle>Document Templates</CardTitle>
            <CardDescription>Manage document templates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Templates feature coming soon...</p>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
};

export default DocumentManagement;
