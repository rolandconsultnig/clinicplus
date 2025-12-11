import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Database, Send, Download, FileText, CheckCircle2, Copy } from 'lucide-react';

const HL7Integration = () => {
  const [parsedMessage, setParsedMessage] = useState(null);
  const [hl7Message, setHl7Message] = useState('');
  const [messageType, setMessageType] = useState('parse');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const parseMessage = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/api/hl7/parse', {
        method: 'POST',
        body: JSON.stringify({ message: hl7Message })
      });
      
      if (result.success) {
        setParsedMessage(result.parsed_message);
      } else {
        alert('Failed to parse message: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error parsing message: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const createAdmitMessage = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/api/hl7/create/admit', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        setHl7Message(result.message);
        setParsedMessage(null);
        alert('ADT^A01 message created successfully!');
      }
    } catch (error) {
      alert('Failed to create message: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const createDischargeMessage = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/api/hl7/create/discharge', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        setHl7Message(result.message);
        setParsedMessage(null);
        alert('ADT^A03 message created successfully!');
      }
    } catch (error) {
      alert('Failed to create message: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const createORUMessage = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/api/hl7/create/oru', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        setHl7Message(result.message);
        setParsedMessage(null);
        alert('ORU^R01 message created successfully!');
      }
    } catch (error) {
      alert('Failed to create message: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/api/hl7/send', {
        method: 'POST',
        body: JSON.stringify({
          message: hl7Message,
          destination_url: formData.destination_url,
          destination_port: formData.destination_port
        })
      });
      
      if (result.success) {
        alert('Message sent successfully!');
      }
    } catch (error) {
      alert('Failed to send message: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HL7 v2.x Integration</h1>
          <p className="text-gray-600 mt-1">HL7 v2.x message processing and transmission</p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          <Database className="w-4 h-4 mr-2" />
          HL7 v2.5
        </Badge>
      </div>

      <Tabs defaultValue="parse">
        <TabsList>
          <TabsTrigger value="parse">Parse Message</TabsTrigger>
          <TabsTrigger value="create">Create Message</TabsTrigger>
          <TabsTrigger value="send">Send Message</TabsTrigger>
        </TabsList>

        <TabsContent value="parse">
          <Card>
            <CardHeader>
              <CardTitle>Parse HL7 v2.x Message</CardTitle>
              <CardDescription>Parse incoming HL7 v2.x messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>HL7 Message</Label>
                <Textarea
                  value={hl7Message}
                  onChange={(e) => setHl7Message(e.target.value)}
                  placeholder="MSH|^~\&|..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={parseMessage} disabled={loading || !hl7Message}>
                Parse Message
              </Button>

              {parsedMessage && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Parsed Message</h3>
                  <div className="bg-gray-100 p-4 rounded">
                    <p className="text-sm mb-2">
                      <strong>Message Type:</strong> {parsedMessage.message_type}
                    </p>
                    <p className="text-sm mb-2">
                      <strong>Control ID:</strong> {parsedMessage.message_control_id}
                    </p>
                    <div className="mt-4">
                      <p className="font-semibold mb-2">Segments:</p>
                      <div className="space-y-2">
                        {parsedMessage.segments?.map((segment, idx) => (
                          <div key={idx} className="border rounded p-2 bg-white">
                            <Badge className="mb-2">{segment.segment_type}</Badge>
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(segment.fields, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create HL7 v2.x Message</CardTitle>
              <CardDescription>Generate HL7 v2.x messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant={messageType === 'admit' ? 'default' : 'outline'}
                  onClick={() => setMessageType('admit')}
                >
                  ADT^A01 (Admit)
                </Button>
                <Button
                  variant={messageType === 'discharge' ? 'default' : 'outline'}
                  onClick={() => setMessageType('discharge')}
                >
                  ADT^A03 (Discharge)
                </Button>
                <Button
                  variant={messageType === 'oru' ? 'default' : 'outline'}
                  onClick={() => setMessageType('oru')}
                >
                  ORU^R01 (Lab Result)
                </Button>
              </div>

              {messageType === 'admit' && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="font-semibold">Create ADT^A01 (Admit) Message</h3>
                  <div>
                    <Label>Patient ID</Label>
                    <Input
                      value={formData.patient_id || ''}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Encounter ID</Label>
                    <Input
                      value={formData.encounter_id || ''}
                      onChange={(e) => setFormData({ ...formData, encounter_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Facility ID</Label>
                    <Input
                      value={formData.facility_id || ''}
                      onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                    />
                  </div>
                  <Button onClick={createAdmitMessage} disabled={loading}>
                    Create Message
                  </Button>
                </div>
              )}

              {messageType === 'discharge' && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="font-semibold">Create ADT^A03 (Discharge) Message</h3>
                  <div>
                    <Label>Patient ID</Label>
                    <Input
                      value={formData.patient_id || ''}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Encounter ID</Label>
                    <Input
                      value={formData.encounter_id || ''}
                      onChange={(e) => setFormData({ ...formData, encounter_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Facility ID</Label>
                    <Input
                      value={formData.facility_id || ''}
                      onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                    />
                  </div>
                  <Button onClick={createDischargeMessage} disabled={loading}>
                    Create Message
                  </Button>
                </div>
              )}

              {messageType === 'oru' && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="font-semibold">Create ORU^R01 (Lab Result) Message</h3>
                  <div>
                    <Label>Patient ID</Label>
                    <Input
                      value={formData.patient_id || ''}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Lab Result ID</Label>
                    <Input
                      value={formData.lab_result_id || ''}
                      onChange={(e) => setFormData({ ...formData, lab_result_id: e.target.value })}
                    />
                  </div>
                  <Button onClick={createORUMessage} disabled={loading}>
                    Create Message
                  </Button>
                </div>
              )}

              {hl7Message && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Generated Message</h3>
                  <Textarea
                    value={hl7Message}
                    readOnly
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => navigator.clipboard.writeText(hl7Message)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Message
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send HL7 v2.x Message</CardTitle>
              <CardDescription>Transmit HL7 messages to external systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>HL7 Message</Label>
                <Textarea
                  value={hl7Message}
                  onChange={(e) => setHl7Message(e.target.value)}
                  placeholder="MSH|^~\&|..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Destination URL</Label>
                  <Input
                    value={formData.destination_url || ''}
                    onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                    placeholder="http://example.com"
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={formData.destination_port || '8080'}
                    onChange={(e) => setFormData({ ...formData, destination_port: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <Button onClick={sendMessage} disabled={loading || !hl7Message}>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HL7Integration;

