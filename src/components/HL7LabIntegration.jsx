/**
 * HL7 Lab Integration Component - Enhanced
 * Manage HL7 lab orders and results with message viewer
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { TestTube, Send, Download, RefreshCw, CheckCircle, Clock, AlertCircle, FileText, Code, Search, Filter, Eye } from 'lucide-react'
import { apiService } from '../services/apiService.js'

export default function HL7LabIntegration({ patientId }) {
  const [orders, setOrders] = useState([])
  const [results, setResults] = useState([])
  const [hl7Messages, setHl7Messages] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [parsedMessage, setParsedMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showMessageViewer, setShowMessageViewer] = useState(false)

  useEffect(() => {
    if (patientId) {
      loadOrders()
      loadResults()
    } else {
      setOrders([])
      setResults([])
    }
    loadHL7Messages()
  }, [patientId])

  const loadOrders = async () => {
    if (!patientId) return
    try {
      const response = await apiService.request('/labs/pending-orders')
      if (response.success) {
        const patientScopedOrders = (response.orders || []).filter(
          (order) => `${order.patient_id || ''}` === `${patientId}`
        )
        setOrders(patientScopedOrders)
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const loadResults = async () => {
    if (!patientId) return
    try {
      const response = await apiService.request(`/labs/results?patient_id=${patientId}`)
      if (response.success) {
        setResults(response.results || [])
      }
    } catch (error) {
      console.error('Error loading results:', error)
    }
  }

  const loadHL7Messages = async () => {
    // No dedicated message-list endpoint exists yet; keep this pane stable.
    setHl7Messages([])
  }

  const sendHL7Order = async (orderId) => {
    setLoading(true)
    try {
      const response = await apiService.request(`/labs/hl7/generate-order/${orderId}`)
      if (response.success) {
        alert('HL7 order payload generated successfully')
        loadOrders()
      }
    } catch (error) {
      alert('Failed to send order: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const receiveHL7Message = async (messageText) => {
    setLoading(true)
    try {
      const response = await apiService.request('/labs/hl7/receive', {
        method: 'POST',
        body: JSON.stringify({ message: messageText })
      })
      if (response.success) {
        alert('HL7 message processed successfully')
        loadHL7Messages()
        loadResults()
      }
    } catch (error) {
      alert('Failed to process message: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const parseHL7Message = async () => {
    if (!selectedMessage?.message_text && !selectedMessage?.raw_message) {
      return
    }
    try {
      const response = await apiService.request('/hl7/parse', {
        method: 'POST',
        body: JSON.stringify({
          message: selectedMessage.message_text || selectedMessage.raw_message
        })
      })
      if (response.success) {
        setParsedMessage(response.parsed_message)
        setShowMessageViewer(true)
      }
    } catch (error) {
      console.error('Parse error:', error)
      alert('Failed to parse message')
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'in_progress': return 'text-teal-700 bg-teal-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getMessageTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'orm': return 'bg-teal-100 text-teal-800'
      case 'oru': return 'bg-green-100 text-green-800'
      case 'ack': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toString().includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="w-8 h-8 text-teal-700" />
            HL7 Lab Integration
          </h1>
          <p className="text-gray-600 mt-1">Manage lab orders and results via HL7</p>
        </div>
        <Button onClick={() => { loadOrders(); loadResults(); loadHL7Messages(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Lab Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          <TabsTrigger value="messages">HL7 Messages ({hl7Messages.length})</TabsTrigger>
        </TabsList>

        {/* Lab Orders */}
        <TabsContent value="orders" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{order.test_name}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        {order.priority && (
                          <Badge variant="outline">{order.priority}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Order ID:</span> {order.id}
                        </div>
                        <div>
                          <span className="font-medium">Ordered:</span> {new Date(order.created_at).toLocaleString()}
                        </div>
                        {order.ordering_provider && (
                          <div>
                            <span className="font-medium">Provider:</span> {order.ordering_provider}
                          </div>
                        )}
                        {order.specimen_type && (
                          <div>
                            <span className="font-medium">Specimen:</span> {order.specimen_type}
                          </div>
                        )}
                      </div>
                      {order.hl7_message_id && (
                        <p className="text-xs text-gray-500 mt-2">
                          HL7 Message ID: {order.hl7_message_id}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <Button size="sm" onClick={() => sendHL7Order(order.id)} disabled={loading}>
                          <Send className="w-4 h-4 mr-1" />
                          Send HL7
                        </Button>
                      )}
                      {order.hl7_message_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const message = hl7Messages.find(m => m.id === order.hl7_message_id)
                            if (message) {
                              setSelectedMessage(message)
                              parseHL7Message(message.id)
                            }
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View HL7
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <TestTube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No lab orders found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lab Results */}
        <TabsContent value="results" className="space-y-4">
          {results.length > 0 ? (
            results.map((result) => (
              <Card key={result.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-lg">{result.test_name}</h3>
                        <Badge className={result.abnormal ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {result.abnormal ? 'Abnormal' : 'Normal'}
                        </Badge>
                        {result.critical && (
                          <Badge className="bg-red-600 text-white">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-600 mb-1">Result:</p>
                          <p className="font-semibold text-lg">{result.value} {result.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Reference Range:</p>
                          <p>{result.reference_range || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Status:</p>
                          <Badge className={result.abnormal ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {result.abnormal ? 'Abnormal' : 'Normal'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Resulted: {new Date(result.result_date).toLocaleString()}</span>
                        {result.resulted_by && (
                          <span>By: {result.resulted_by}</span>
                        )}
                        {result.hl7_message_id && (
                          <span>HL7 ID: {result.hl7_message_id}</span>
                        )}
                      </div>
                      {result.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{result.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      {result.hl7_message_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const message = hl7Messages.find(m => m.id === result.hl7_message_id)
                            if (message) {
                              setSelectedMessage(message)
                              parseHL7Message(message.id)
                            }
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View HL7
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <TestTube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No lab results available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HL7 Messages */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>HL7 Messages</CardTitle>
                  <CardDescription>View and manage HL7 messages</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const messageText = prompt('Paste HL7 message:')
                    if (messageText) {
                      receiveHL7Message(messageText)
                    }
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Receive Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hl7Messages.length > 0 ? (
                <div className="space-y-3">
                  {hl7Messages.map((message) => (
                    <Card key={message.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedMessage(message)
                        parseHL7Message(message.id)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getMessageTypeColor(message.message_type)}>
                                {message.message_type || 'HL7'}
                              </Badge>
                              <Badge variant="outline">
                                {message.direction === 'outbound' ? 'Sent' : 'Received'}
                              </Badge>
                              {message.status && (
                                <Badge variant="outline">{message.status}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Message ID: {message.message_id || message.id}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {new Date(message.created_at || message.timestamp).toLocaleString()}
                              </span>
                              {message.patient_id && (
                                <span>Patient ID: {message.patient_id}</span>
                              )}
                            </div>
                            {message.error && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-xs text-red-800">
                                  <AlertCircle className="w-3 h-3 inline mr-1" />
                                  Error: {message.error}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMessage(message)
                                parseHL7Message(message.id)
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No HL7 messages found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* HL7 Message Viewer Modal */}
      {showMessageViewer && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  HL7 Message Viewer
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMessageViewer(false)
                    setSelectedMessage(null)
                    setParsedMessage(null)
                  }}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="raw" className="w-full">
                <TabsList>
                  <TabsTrigger value="raw">Raw Message</TabsTrigger>
                  <TabsTrigger value="parsed">Parsed Data</TabsTrigger>
                </TabsList>

                <TabsContent value="raw">
                  <div>
                    <Label>HL7 Raw Message</Label>
                    <Textarea
                      value={selectedMessage.message_text || selectedMessage.raw_message || ''}
                      readOnly
                      rows={15}
                      className="font-mono text-xs mt-2"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedMessage.message_text || selectedMessage.raw_message)
                          alert('Copied to clipboard!')
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Copy Message
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob([selectedMessage.message_text || selectedMessage.raw_message], { type: 'text/plain' })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `hl7-message-${selectedMessage.id}.hl7`
                          a.click()
                          window.URL.revokeObjectURL(url)
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parsed">
                  {parsedMessage ? (
                    <div>
                      <Label>Parsed HL7 Data</Label>
                      <div className="mt-2 space-y-3">
                        {Object.entries(parsedMessage).map(([key, value]) => (
                          <div key={key} className="p-3 border rounded">
                            <p className="font-semibold text-sm mb-1">{key}:</p>
                            <p className="text-sm text-gray-700">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        className="mt-3"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(parsedMessage, null, 2))
                          alert('Copied to clipboard!')
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Copy Parsed Data
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Code className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p>Click "View" to parse message</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
