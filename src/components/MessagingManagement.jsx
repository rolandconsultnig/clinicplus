/**
 * Messaging Management — /api/messages + poll for new items
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { apiService } from '../services/apiService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import {
  MessageSquare,
  Send,
  Mail,
  Phone,
  Bell,
  Search,
  PhoneCall,
  Users,
  Paperclip,
  MoreHorizontal
} from 'lucide-react'

const msgTime = (m) => m?.sent_at || m?.created_at

export default function MessagingManagement() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inbox')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sendBusy, setSendBusy] = useState(false)
  const [pollInfo, setPollInfo] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [sentFilesById, setSentFilesById] = useState({})
  const [sentUploadBusyId, setSentUploadBusyId] = useState(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')
  const [attachmentInfo, setAttachmentInfo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const pollTimer = useRef(null)
  const messagesRef = useRef([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const getCurrentUser = () => apiService.user || JSON.parse(localStorage.getItem('auth_user') || 'null')

  const loadMessages = useCallback(async () => {
    if (activeTab === 'batch') {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const folder = activeTab === 'inbox' ? 'inbox' : activeTab === 'sent' ? 'sent' : 'all'
      const endpoint = searchQuery.trim().length >= 2
        ? `/messages/search?q=${encodeURIComponent(searchQuery.trim())}&limit=100`
        : `/messages?folder=${encodeURIComponent(folder)}&per_page=100`
      const result = await apiService.request(endpoint, { method: 'GET' })
      if (result.success) {
        const nextMessages = result.messages || []
        setMessages(nextMessages)
        if (nextMessages.length > 0) {
          setSelectedMessage((prev) => (prev && nextMessages.some((m) => m.id === prev.id) ? prev : nextMessages[0]))
        } else {
          setSelectedMessage(null)
        }
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const pollInbox = useCallback(async () => {
    if (activeTab !== 'inbox') return
    const list = messagesRef.current
    const maxId = list.length ? Math.max(...list.map((m) => m.id)) : 0
    try {
      const result = await apiService.request(
        `/messages/poll?folder=inbox&after_id=${maxId}&limit=30`,
        { method: 'GET' }
      )
      if (result.success && (result.messages || []).length > 0) {
        setPollInfo({ at: new Date().toLocaleTimeString(), n: result.count || result.messages.length })
        if (typeof result.unread_count === 'number') setUnreadCount(result.unread_count)
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...(result.messages || [])]
            .filter((m) => !seen.has(m.id))
            .concat(prev)
          merged.sort((a, b) => (msgTime(b) || '').localeCompare(msgTime(a) || ''))
          return merged
        })
      }
      if (result.success && typeof result.unread_count === 'number') {
        setUnreadCount(result.unread_count)
      }
    } catch (e) {
      console.error('poll:', e)
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'inbox') {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
      return
    }
    pollTimer.current = setInterval(pollInbox, 30_000)
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [activeTab, pollInbox])

  useEffect(() => {
    const loadUnread = async () => {
      try {
        const result = await apiService.request('/messages/unread-summary', { method: 'GET' })
        if (result?.success && typeof result.unread_count === 'number') {
          setUnreadCount(result.unread_count)
        }
      } catch (_) {
        // noop
      }
    }
    loadUnread()
  }, [])

  const sendReply = async () => {
    const u = getCurrentUser()
    if (!selectedMessage || !u?.id || !replyText.trim()) return
    setSendBusy(true)
    try {
      const to =
        u.id === selectedMessage.sender_id ? selectedMessage.recipient_id : selectedMessage.sender_id
      await apiService.request('/messages', 'POST', {
        recipient_id: to,
        subject: selectedMessage.subject?.startsWith('Re:')
          ? selectedMessage.subject
          : `Re: ${selectedMessage.subject || ''}`,
        message_body: replyText.trim(),
        thread_id: selectedMessage.thread_id,
        parent_message_id: selectedMessage.id,
        related_patient_id: selectedMessage.related_patient_id,
      })
      setReplyText('')
      await loadMessages()
    } catch (e) {
      console.error(e)
    } finally {
      setSendBusy(false)
    }
  }

  const formatMessageTime = (value) => {
    if (!value) return 'No time'
    return new Date(value).toLocaleString()
  }

  const sentAttachmentCount = activeTab === 'sent'
    ? messages.reduce((sum, msg) => sum + parseAttachments(msg).length, 0)
    : 0

  const parseAttachments = (msg) => {
    if (!msg?.attachments) return []
    if (Array.isArray(msg.attachments)) return msg.attachments
    try {
      const parsed = JSON.parse(msg.attachments)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const refreshAndReselectMessage = async (messageId) => {
    await loadMessages()
    if (!messageId) return
    try {
      const result = await apiService.request(`/messages/${messageId}`, { method: 'GET' })
      if (result?.success && result.message) {
        setSelectedMessage(result.message)
      }
    } catch (_) {
      // Ignore refresh errors; loadMessages already updated list.
    }
  }

  const uploadAttachment = async () => {
    if (!selectedMessage?.id || !selectedFile) return
    setUploadBusy(true)
    setAttachmentError('')
    setAttachmentInfo('')
    try {
      const signed = await apiService.request('/messages/attachments/sign-upload', 'POST', {
        message_id: selectedMessage.id,
        file_name: selectedFile.name,
        content_type: selectedFile.type || 'application/octet-stream',
        size_bytes: selectedFile.size,
      })
      const form = new FormData()
      form.append('upload_token', signed.upload_token)
      form.append('file', selectedFile)
      const uploaded = await apiService.request('/messages/attachments/upload', {
        method: 'POST',
        body: form,
      })
      setAttachmentInfo(`Uploaded: ${uploaded?.attachment?.file_name || selectedFile.name}`)
      setSelectedFile(null)
      await refreshAndReselectMessage(selectedMessage.id)
    } catch (e) {
      setAttachmentError(e.message || 'Upload failed')
    } finally {
      setUploadBusy(false)
    }
  }

  const uploadAttachmentForMessage = async (messageId, file) => {
    if (!messageId || !file) return
    const signed = await apiService.request('/messages/attachments/sign-upload', 'POST', {
      message_id: messageId,
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
    })
    const form = new FormData()
    form.append('upload_token', signed.upload_token)
    form.append('file', file)
    return apiService.request('/messages/attachments/upload', {
      method: 'POST',
      body: form,
    })
  }

  const uploadAttachmentForSent = async (msg) => {
    const file = sentFilesById[msg.id]
    if (!file) return
    setAttachmentError('')
    setAttachmentInfo('')
    setSentUploadBusyId(msg.id)
    try {
      await uploadAttachmentForMessage(msg.id, file)
      setAttachmentInfo(`Uploaded to sent message: ${msg.subject || msg.id}`)
      setSentFilesById((prev) => {
        const next = { ...prev }
        delete next[msg.id]
        return next
      })
      await loadMessages()
    } catch (e) {
      setAttachmentError(e.message || 'Upload failed')
    } finally {
      setSentUploadBusyId(null)
    }
  }

  const downloadAttachment = async (msg, att) => {
    if (!msg?.id || !att?.id) return
    setAttachmentError('')
    setAttachmentInfo('')
    try {
      const signed = await apiService.request('/messages/attachments/sign-download', 'POST', {
        message_id: msg.id,
        attachment_id: att.id,
      })
      const token = localStorage.getItem('auth_token')
      const base = import.meta.env.VITE_API_BASE_URL || '/api'
      const url = `${base.replace(/\/$/, '')}/messages/attachments/download?token=${encodeURIComponent(signed.download_token)}`
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Download failed (${res.status})`)
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = att.file_name || 'attachment'
      a.click()
      URL.revokeObjectURL(a.href)
      setAttachmentInfo(`Downloaded: ${att.file_name || 'attachment'}`)
    } catch (e) {
      setAttachmentError(e.message || 'Download failed')
    }
  }

  const deleteAttachment = async (msg, att) => {
    if (!msg?.id || !att?.id) return
    setAttachmentError('')
    setAttachmentInfo('')
    try {
      await apiService.request(`/messages/attachments/${encodeURIComponent(att.id)}?message_id=${msg.id}`, {
        method: 'DELETE',
      })
      setAttachmentInfo(`Removed: ${att.file_name || 'attachment'}`)
      await refreshAndReselectMessage(msg.id)
    } catch (e) {
      setAttachmentError(e.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-700" />
            Chat and Call
          </h2>
          <p className="text-xs text-gray-500">DigiClinic-style communication workspace</p>
        </div>
        {activeTab === 'inbox' && (
          <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            {pollInfo ? `Poll · +${pollInfo.n || 0} · ${pollInfo.at}` : 'Inbox live · 30s'}
          </Badge>
        )}
      </div>

      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Messaging Management</CardTitle>
              <CardDescription className="text-xs">Inbox, sent items, and batch outreach</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="inbox" className="text-xs">
                  Inbox
                  {unreadCount > 0 && (
                    <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="text-xs">
                  Sent
                  {sentAttachmentCount > 0 && (
                    <span className="ml-1 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                      {sentAttachmentCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="batch" className="text-xs">Batch</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="inbox" className="m-0">
              <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_280px] gap-4">
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        className="pl-9 h-9 text-xs"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-0">
                    {loading ? (
                      <div className="px-4 py-8 text-xs text-gray-500">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="px-4 py-8 text-xs text-gray-500">No inbox messages found.</div>
                    ) : (
                      <div className="divide-y">
                        {messages.map((msg) => (
                          <button
                            key={msg.id}
                            type="button"
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                              selectedMessage?.id === msg.id ? 'bg-teal-50/70' : ''
                            }`}
                            onClick={() => setSelectedMessage(msg)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{msg.subject || 'No subject'}</p>
                                <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{msg.message_body || ''}</p>
                              </div>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {msgTime(msg) ? new Date(msgTime(msg)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
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
                          {selectedMessage ? formatMessageTime(msgTime(selectedMessage)) : 'Choose a chat from the left panel'}
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
                            DR
                          </div>
                          <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-teal-50 text-gray-800">
                            {selectedMessage.message_body}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-gray-100 text-gray-700">
                            Quick reply preview. Existing behavior and APIs are preserved.
                          </div>
                        </div>
                        <div className="pt-2 border-t flex items-center gap-2">
                          <input
                            type="file"
                            className="text-[11px] max-w-[170px]"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9"
                            onClick={uploadAttachment}
                            disabled={uploadBusy || !selectedFile}
                          >
                            <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                            {uploadBusy ? 'Uploading…' : 'Attach'}
                          </Button>
                          <Input
                            className="h-9 text-xs"
                            placeholder="Type your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                sendReply()
                              }
                            }}
                          />
                          <Button size="sm" className="h-9" onClick={sendReply} disabled={sendBusy || !replyText.trim()}>
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            {sendBusy ? '…' : 'Send'}
                          </Button>
                        </div>
                        {attachmentError && <p className="text-[11px] text-red-600">{attachmentError}</p>}
                        {attachmentInfo && <p className="text-[11px] text-emerald-700">{attachmentInfo}</p>}
                        {parseAttachments(selectedMessage).length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-[11px] text-gray-500 mb-2">Attachments</p>
                            <div className="space-y-1.5">
                              {parseAttachments(selectedMessage).map((att) => (
                                <div key={att.id} className="flex items-center gap-2 rounded border px-2 py-1 text-[11px]">
                                  <button
                                    type="button"
                                    className="text-left flex-1 hover:underline"
                                    onClick={() => downloadAttachment(selectedMessage, att)}
                                  >
                                    <span className="font-medium">{att.file_name || 'attachment'}</span>
                                    {' '}
                                    <span className="text-gray-500">({Math.round((att.size_bytes || 0) / 1024)} KB)</span>
                                  </button>
                                  {getCurrentUser()?.id === selectedMessage?.sender_id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => deleteAttachment(selectedMessage, att)}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-gray-500">
                        Select a conversation to view details.
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
                      <span className="font-medium text-gray-800">23 team members</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Shared files</span>
                      <span className="font-medium text-gray-800">365 photos</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Attachments</span>
                      <span className="font-medium text-gray-800">{parseAttachments(selectedMessage).length || 0} files</span>
                    </div>
                    <div className="pt-2 border-t space-y-2">
                      {parseAttachments(selectedMessage).length > 0 ? (
                        parseAttachments(selectedMessage).slice(0, 6).map((att) => (
                          <Button
                            key={att.id}
                            variant="outline"
                            className="w-full justify-start text-xs h-8"
                            onClick={() => downloadAttachment(selectedMessage, att)}
                          >
                            <Paperclip className="w-3.5 h-3.5 mr-2" />
                            {att.file_name || 'attachment'}
                          </Button>
                        ))
                      ) : (
                        <p className="text-[11px] text-gray-500">No attachments on selected message.</p>
                      )}
                      <Button variant="outline" className="w-full justify-start text-xs h-8">
                        <MoreHorizontal className="w-3.5 h-3.5 mr-2" />
                        More actions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sent" className="m-0">
              <Card className="border-gray-200 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-700 mb-4">Sent messages</p>
                  {loading ? (
                    <p className="text-xs text-gray-500">Loading sent messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-gray-500">No sent messages found.</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className="rounded-lg border p-3">
                          <p className="text-sm font-medium text-gray-900">{msg.subject || 'No subject'}</p>
                          <p className="text-xs text-gray-600 mt-1">{msg.message_body || ''}</p>
                          <p className="text-[11px] text-gray-400 mt-2">{formatMessageTime(msgTime(msg))}</p>
                          <div className="mt-3 border-t pt-2 space-y-2">
                            <p className="text-[11px] text-gray-500">Attach files</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="file"
                                className="text-[11px] max-w-[220px]"
                                onChange={(e) =>
                                  setSentFilesById((prev) => ({
                                    ...prev,
                                    [msg.id]: e.target.files?.[0] || null,
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => uploadAttachmentForSent(msg)}
                                disabled={sentUploadBusyId === msg.id || !sentFilesById[msg.id]}
                              >
                                <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                                {sentUploadBusyId === msg.id ? 'Uploading…' : 'Attach'}
                              </Button>
                            </div>
                            {parseAttachments(msg).length > 0 ? (
                              <div className="space-y-1">
                                {parseAttachments(msg).map((att) => (
                                  <div key={att.id} className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[11px] justify-start flex-1"
                                      onClick={() => downloadAttachment(msg, att)}
                                    >
                                      <Paperclip className="w-3 h-3 mr-1.5" />
                                      {att.file_name || 'attachment'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={() => deleteAttachment(msg, att)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-500">No attachments yet.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="batch" className="m-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="border-gray-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Batch Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label className="text-xs">Subject</Label>
                    <Input placeholder="Email subject" className="h-9 text-xs" />
                    <Label className="text-xs">Message</Label>
                    <Textarea rows={4} placeholder="Email message" className="text-xs min-h-[100px]" />
                    <Button className="w-full">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Batch Email
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Batch SMS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label className="text-xs">Message</Label>
                    <Textarea rows={4} placeholder="SMS message" className="text-xs min-h-[100px]" />
                    <Button className="w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      Send Batch SMS
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Batch Reminders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label className="text-xs">Days Ahead</Label>
                    <Input type="number" defaultValue="1" className="h-9 text-xs" />
                    <Button className="w-full">
                      <Bell className="w-4 h-4 mr-2" />
                      Send Reminders
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

