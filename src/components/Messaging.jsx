import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MessageSquare, 
  Plus, 
  Send,
  Inbox,
  Mail,
  Archive,
  AlertCircle,
  Clock
} from 'lucide-react';

const Messaging = () => {
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    message_body: '',
    message_type: 'general',
    priority: 'normal'
  });

  useEffect(() => {
    loadMessages();
    loadTemplates();
  }, [activeTab]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/messages', { method: 'GET' }, { folder: activeTab });
      if (result.success) {
        setMessages(result.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await apiService.request('/message-templates', { method: 'GET' });
      if (result.success) {
        setTemplates(result.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const result = await apiService.request('/messages', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (result.success) {
        await loadMessages();
        setShowCompose(false);
        resetForm();
        alert('Message sent successfully');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + (error.message || 'Unknown error'));
    }
  };

  const handleMarkRead = async (msgId) => {
    try {
      await apiService.request(`/messages/${msgId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'read' })
      });
      await loadMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      recipient_id: '',
      subject: '',
      message_body: '',
      message_type: 'general',
      priority: 'normal'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[150px]"
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
                <Button type="button" variant="outline" onClick={() => { setShowCompose(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); loadMessages(); }} className="space-y-6">
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
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'inbox' && 'Inbox'}
                {activeTab === 'sent' && 'Sent Messages'}
                {activeTab === 'archived' && 'Archived Messages'}
              </CardTitle>
              <CardDescription>{messages.length} messages</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages found.
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${msg.status === 'unread' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                      onClick={() => { setSelectedMessage(msg); if (msg.status === 'unread') handleMarkRead(msg.id); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                            {msg.status === 'unread' && (
                              <Badge className="bg-blue-600">New</Badge>
                            )}
                            <Badge className={getPriorityColor(msg.priority)}>
                              {msg.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{msg.message_body}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            {msg.sent_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(msg.sent_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedMessage && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedMessage.subject}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">{selectedMessage.message_body}</p>
              </div>
              {selectedMessage.sent_at && (
                <div className="text-xs text-gray-500">
                  Sent: {new Date(selectedMessage.sent_at).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
};

export default Messaging;

