/**
 * Messaging Management - Comprehensive messaging interface
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MessageSquare, Send, Mail, Phone, Bell } from 'lucide-react';

export default function MessagingManagement() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/api/messaging-mgmt/messages?type=inbox', 'GET');
      if (result.success) {
        setMessages(result.messages || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading messages...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Messaging Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inbox">
            <TabsList>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="batch">Batch Communication</TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="mt-4">
              <div className="space-y-2">
                {messages.map((msg) => (
                  <Card key={msg.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{msg.subject}</p>
                        <p className="text-sm text-gray-600">{msg.message_body}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {msg.created_at && new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm">Reply</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              <p className="text-gray-500">Sent messages will appear here</p>
            </TabsContent>

            <TabsContent value="batch" className="mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Batch Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input placeholder="Email subject" />
                      <Label>Message</Label>
                      <textarea className="w-full px-3 py-2 border rounded" rows="4" placeholder="Email message" />
                      <Button><Mail className="w-4 h-4 mr-2" />Send Batch Email</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Batch SMS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <textarea className="w-full px-3 py-2 border rounded" rows="4" placeholder="SMS message" />
                      <Button><Phone className="w-4 h-4 mr-2" />Send Batch SMS</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Batch Reminders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Days Ahead</Label>
                      <Input type="number" defaultValue="1" />
                      <Button><Bell className="w-4 h-4 mr-2" />Send Reminders</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

