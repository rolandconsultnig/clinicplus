import React, { useState, useEffect } from 'react'
import { apiService } from '../services/apiService'
import { PageWrapper } from './PageWrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Textarea } from './ui/textarea'
import {
  MessageSquare,
  Plus,
  Send,
  Inbox,
  Mail,
  Archive,
  Clock,
  Search,
  PhoneCall,
  Users,
  MoreHorizontal,
  Paperclip
} from 'lucide-react'

const Messaging = () => {
  const [messages, setMessages] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inbox')
  const [showCompose, setShowCompose] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    message_body: '',
    message_type: 'general',
    priority: 'normal'
  })

  useEffect(() => {
    loadMessages()
    loadTemplates()
  }, [activeTab])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const result = await apiService.request('/messages', { method: 'GET' }, { folder: activeTab })
      if (result.success) {
        const nextMessages = result.messages || []
        setMessages(nextMessages)
        if (nextMessages.length > 0) {
          setSelectedMessage((prev) => (prev && nextMessages.some((m) => m.id === prev.id) ? prev : nextMessages[0]))
        } else {
          setSelectedMessage(null)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const result = await apiService.request('/message-templates', { method: 'GET' })
      if (result.success) {
        setTemplates(result.templates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    try {
      const result = await apiService.request('/messages', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      if (result.success) {
        await loadMessages()
        setShowCompose(false)
        resetForm()
        alert('Message sent successfully')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert(`Error sending message: ${error.message || 'Unknown error'}`)
    }
  }

  const handleMarkRead = async (msgId) => {
    try {
      await apiService.request(`/messages/${msgId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'read' })
      })
      await loadMessages()
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      recipient_id: '',
      subject: '',
      message_body: '',
      message_type: 'general',
      priority: 'normal'
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-teal-100 text-teal-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const unreadCount = messages.filter((m) => m.status === 'unread').length

  return (
    <PageWrapper
      title="Messaging"
      description="Internal messaging system"
      icon={MessageSquare}
      actions={
        <Button onClick={() => setShowCompose(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Compose
        </Button>
      }
    >
      {showCompose && (
        <Card className="mb-6 border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Compose Message</CardTitle>
            <CardDescription className="text-xs">Send secure messages to team members</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Recipient ID *</Label>
                  <Input
                    value={formData.recipient_id}
                    onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                    placeholder="User ID"
                    required
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              {templates.length > 0 && (
                <div>
                  <Label>Template (optional)</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    onChange={(e) => {
                      const template = templates.find((tpl) => String(tpl.id) === e.target.value)
                      if (!template) return
                      setFormData((prev) => ({
                        ...prev,
                        subject: template.subject || prev.subject,
                        message_body: template.message_body || template.content || prev.message_body
                      }))
                    }}
                    defaultValue=""
                  >
                    <option value="">Select a template</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name || tpl.subject || `Template ${tpl.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea
                  className="min-h-[140px]"
                  value={formData.message_body}
                  onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCompose(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="w-4 h-4 mr-2" />
            Inbox {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Mail className="w-4 h-4 mr-2" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="w-4 h-4 mr-2" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-700" />
                    Chat and Call
                  </CardTitle>
                  <CardDescription className="text-xs">{messages.length} messages</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                  Team online
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_280px] gap-4">
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input className="pl-9 h-9 text-xs" placeholder="Search conversations..." />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-0">
                    {loading ? (
                      <div className="px-4 py-8 text-xs text-gray-500">Loading conversations...</div>
                    ) : messages.length === 0 ? (
                      <div className="px-4 py-8 text-xs text-gray-500">No messages found.</div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {messages.map((msg) => (
                          <button
                            key={msg.id}
                            type="button"
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                              selectedMessage?.id === msg.id ? 'bg-teal-50/70' : ''
                            }`}
                            onClick={() => {
                              setSelectedMessage(msg)
                              if (msg.status === 'unread') handleMarkRead(msg.id)
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium text-gray-900 truncate">{msg.subject || 'No subject'}</p>
                                  {msg.status === 'unread' && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-teal-600" />
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{msg.message_body || ''}</p>
                              </div>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {msg.sent_at
                                  ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : '--'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedMessage?.subject || 'Select a conversation'}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {selectedMessage?.sent_at
                            ? new Date(selectedMessage.sent_at).toLocaleString()
                            : 'Pick a chat to view details'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <PhoneCall className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {selectedMessage ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="h-7 w-7 rounded-full bg-teal-100 text-teal-800 text-[11px] flex items-center justify-center font-semibold">
                            MD
                          </div>
                          <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-teal-50 text-gray-800">
                            {selectedMessage.message_body}
                          </div>
                        </div>
                        <div className="flex items-start gap-2 justify-end">
                          <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-gray-100 text-gray-700">
                            Continue this conversation from Compose for a full outbound message.
                          </div>
                        </div>
                        <div className="pt-2 border-t text-[11px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Updated {selectedMessage.sent_at ? new Date(selectedMessage.sent_at).toLocaleString() : 'just now'}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-gray-500">
                        Select a conversation to open the thread.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Group Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Participants</span>
                      <span className="font-medium text-gray-800">Care team</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Shared files</span>
                      <span className="font-medium text-gray-800">Available</span>
                    </div>
                    <div className="pt-2 border-t space-y-2">
                      <Button variant="outline" className="w-full justify-start text-xs h-8">
                        <Paperclip className="w-3.5 h-3.5 mr-2" />
                        View attachments
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-xs h-8">
                        <MoreHorizontal className="w-3.5 h-3.5 mr-2" />
                        More actions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  )
}

export default Messaging

