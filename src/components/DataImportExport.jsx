/**
 * Data Import/Export Component - Enhanced
 * Bulk data migration and backup with progress tracking
 */
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Upload, Download, Database, FileJson, FileSpreadsheet, CheckCircle, Loader2, AlertCircle, FileCheck, XCircle, Calendar } from 'lucide-react'
import { apiService } from '../services/apiService.js'

export default function DataImportExport() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportFormat, setExportFormat] = useState('json')
  const [dataType, setDataType] = useState('patients')
  const [importHistory, setImportHistory] = useState([])
  const [exportHistory, setExportHistory] = useState([])
  const [importFile, setImportFile] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [exportStats, setExportStats] = useState(null)

  const dataTypes = [
    { value: 'patients', label: 'Patients', icon: '👥' },
    { value: 'encounters', label: 'Encounters', icon: '🏥' },
    { value: 'prescriptions', label: 'Prescriptions', icon: '💊' },
    { value: 'lab_results', label: 'Lab Results', icon: '🧪' },
    { value: 'billing', label: 'Billing Records', icon: '💰' },
    { value: 'all', label: 'Complete Backup', icon: '💾' }
  ]

  const formats = [
    { value: 'json', label: 'JSON', icon: FileJson },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
    { value: 'xml', label: 'XML', icon: FileCheck }
  ]

  const handleExport = async () => {
    setLoading(true)
    setProgress(0)
    setExportStats(null)
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await apiService.request(`/data/export/${dataType}?format=${exportFormat}`, {
        method: 'POST'
      })
      
      clearInterval(progressInterval)
      setProgress(100)
      
      if (response.success) {
        // Download file
        const blob = new Blob([response.data || JSON.stringify(response)], { 
          type: exportFormat === 'csv' ? 'text/csv' : 
                exportFormat === 'xml' ? 'application/xml' : 
                'application/json' 
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${dataType}-export-${Date.now()}.${exportFormat}`
        a.click()
        window.URL.revokeObjectURL(url)
        
        setExportStats({
          count: response.count || 0,
          format: exportFormat,
          timestamp: new Date().toISOString()
        })
        
        setExportHistory(prev => [{
          id: Date.now(),
          data_type: dataType,
          format: exportFormat,
          count: response.count || 0,
          timestamp: new Date().toISOString(),
          status: 'success'
        }, ...prev])
        
        alert(`Exported ${response.count || 0} records successfully`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 2000)
    }
  }

  const handleImport = async (file) => {
    if (!file) return
    
    setLoading(true)
    setProgress(0)
    setImportErrors([])
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('data_type', dataType)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)
      
      const response = await apiService.request('/data/import', {
        method: 'POST',
        body: formData
      })
      
      clearInterval(progressInterval)
      setProgress(100)
      
      if (response.success) {
        setImportHistory(prev => [{
          id: Date.now(),
          filename: file.name,
          data_type: dataType,
          imported_count: response.imported_count || 0,
          failed_count: response.failed_count || 0,
          timestamp: new Date().toISOString(),
          status: 'success'
        }, ...prev])
        
        if (response.errors && response.errors.length > 0) {
          setImportErrors(response.errors)
        }
        
        alert(`Imported ${response.imported_count || 0} records successfully${response.failed_count ? ` (${response.failed_count} failed)` : ''}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportHistory(prev => [{
        id: Date.now(),
        filename: file.name,
        data_type: dataType,
        imported_count: 0,
        failed_count: 0,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      }, ...prev])
      alert('Import failed: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 2000)
    }
  }

  const validateFile = (file) => {
    const validExtensions = exportFormat === 'csv' ? ['.csv'] : 
                           exportFormat === 'xml' ? ['.xml'] : 
                           ['.json']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      alert(`Invalid file type. Expected: ${validExtensions.join(', ')}`)
      return false
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert('File size exceeds 100MB limit')
      return false
    }
    
    return true
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-teal-700" />
            Data Import/Export
          </h1>
          <p className="text-gray-600 mt-1">Bulk data migration and backup tools</p>
        </div>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Export Data */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-teal-700" />
                Export Data
              </CardTitle>
              <CardDescription>Download data in various formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Type</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md mt-1"
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value)}
                  >
                    {dataTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Format</Label>
                  <div className="flex gap-2 mt-1">
                    {formats.map(format => {
                      const FormatIcon = format.icon
                      return (
                        <Button
                          key={format.value}
                          variant={exportFormat === format.value ? 'default' : 'outline'}
                          onClick={() => setExportFormat(format.value)}
                          className="flex-1"
                        >
                          <FormatIcon className="w-4 h-4 mr-2" />
                          {format.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {exportStats && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">Export Completed</p>
                        <p className="text-sm text-green-800">
                          {exportStats.count} records exported in {exportStats.format.toUpperCase()} format
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleExport} 
                disabled={loading} 
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting... {progress}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export {dataTypes.find(t => t.value === dataType)?.label}
                  </>
                )}
              </Button>

              {loading && (
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-teal-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <h4 className="font-semibold text-teal-900 mb-2">Export Information:</h4>
                <ul className="text-sm text-teal-800 space-y-1">
                  <li>• Exports include all related data</li>
                  <li>• JSON format preserves relationships</li>
                  <li>• CSV format is flat (single table)</li>
                  <li>• Large exports may take several minutes</li>
                  <li>• Files are downloaded automatically</li>
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
                Import Data
              </CardTitle>
              <CardDescription>Upload data files to import</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Data Type</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                >
                  {dataTypes.filter(t => t.value !== 'all').map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Upload File</Label>
                <Input
                  type="file"
                  accept={exportFormat === 'csv' ? '.csv' : 
                         exportFormat === 'xml' ? '.xml' : 
                         '.json'}
                  className="mt-1"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file && validateFile(file)) {
                      setImportFile(file)
                    }
                  }}
                  disabled={loading}
                />
                {importFile && (
                  <div className="mt-2 p-2 bg-gray-50 rounded border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{importFile.name}</span>
                      <Badge variant="outline">
                        {(importFile.size / 1024).toFixed(2)} KB
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setImportFile(null)
                        document.querySelector('input[type="file"]').value = ''
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {importFile && (
                <Button
                  onClick={() => handleImport(importFile)}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing... {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import File
                    </>
                  )}
                </Button>
              )}

              {loading && (
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {importErrors.length > 0 && (
                <Card className="bg-red-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Import Errors ({importErrors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {importErrors.map((error, index) => (
                        <div key={index} className="text-sm text-red-800 p-2 bg-white rounded border">
                          Row {error.row}: {error.message}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Import Guidelines:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Ensure data format matches the selected type</li>
                  <li>• Duplicate records will be skipped</li>
                  <li>• Invalid data will be logged</li>
                  <li>• Large files may take several minutes</li>
                  <li>• Maximum file size: 100MB</li>
                  <li>• Backup your data before importing</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-teal-700" />
                  Export History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exportHistory.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {exportHistory.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{item.data_type}</Badge>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Success
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {item.count} records • {item.format.toUpperCase()} • {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Download className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>No export history</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-green-600" />
                  Import History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {importHistory.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importHistory.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{item.data_type}</Badge>
                          <Badge className={item.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {item.status === 'success' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{item.filename}</p>
                        <p className="text-xs text-gray-500">
                          {item.imported_count} imported
                          {item.failed_count > 0 && ` • ${item.failed_count} failed`}
                          {' • '}
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                        {item.error && (
                          <p className="text-xs text-red-600 mt-1">{item.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Upload className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>No import history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
