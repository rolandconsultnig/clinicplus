import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Database, Key, Users, Shield, CheckCircle2, Copy } from 'lucide-react';

const SMARTonFHIR = () => {
  const [configuration, setConfiguration] = useState(null);
  const [clients, setClients] = useState([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/fhir/R4/.well-known/smart-configuration', { method: 'GET' });
      if (result.success || result.issuer) {
        setConfiguration(result);
      }
    } catch (error) {
      console.error('Error loading SMART configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerClient = async () => {
    try {
      const result = await apiService.request('/fhir/R4/register', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.client_id) {
        alert(`Client registered successfully!\nClient ID: ${result.client_id}\nClient Secret: ${result.client_secret}`);
        setShowRegisterForm(false);
        setFormData({});
        setClients([...clients, result]);
      }
    } catch (error) {
      alert('Failed to register client: ' + (error.message || 'Unknown error'));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return <div className="p-6">Loading SMART on FHIR configuration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMART on FHIR</h1>
          <p className="text-gray-600 mt-1">OAuth 2.0 & OpenID Connect Integration</p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          <Shield className="w-4 h-4 mr-2" />
          SMART Enabled
        </Badge>
      </div>

      <Tabs defaultValue="configuration">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="clients">Registered Clients</TabsTrigger>
          <TabsTrigger value="authorization">Authorization Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>SMART on FHIR Configuration</CardTitle>
              <CardDescription>OAuth 2.0 endpoints and capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              {configuration && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Issuer</Label>
                      <div className="flex items-center gap-2">
                        <Input value={configuration.issuer || ''} readOnly />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(configuration.issuer)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Authorization Endpoint</Label>
                      <div className="flex items-center gap-2">
                        <Input value={configuration.authorization_endpoint || ''} readOnly />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(configuration.authorization_endpoint)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Token Endpoint</Label>
                      <div className="flex items-center gap-2">
                        <Input value={configuration.token_endpoint || ''} readOnly />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(configuration.token_endpoint)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Registration Endpoint</Label>
                      <div className="flex items-center gap-2">
                        <Input value={configuration.registration_endpoint || ''} readOnly />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(configuration.registration_endpoint)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Supported Scopes</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {configuration.scopes_supported?.map((scope) => (
                        <Badge key={scope} variant="secondary">{scope}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Capabilities</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {configuration.capabilities?.map((capability) => (
                        <Badge key={capability} variant="outline">{capability}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registered Clients</CardTitle>
                  <CardDescription>SMART on FHIR client applications</CardDescription>
                </div>
                <Button onClick={() => setShowRegisterForm(true)}>
                  <Key className="w-4 h-4 mr-2" />
                  Register Client
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No clients registered</p>
              ) : (
                <div className="space-y-4">
                  {clients.map((client) => (
                    <div key={client.client_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>Client ID: {client.client_id}</Badge>
                            <Badge variant="secondary">Secret: {client.client_secret?.substring(0, 8)}...</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Redirect URIs: {client.redirect_uris?.join(', ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Scopes: {client.scope}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authorization">
          <Card>
            <CardHeader>
              <CardTitle>Authorization Flow</CardTitle>
              <CardDescription>OAuth 2.0 authorization code flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Step 1: Authorization Request</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
{`GET ${configuration?.authorization_endpoint}?
  client_id=YOUR_CLIENT_ID
  &redirect_uri=YOUR_REDIRECT_URI
  &response_type=code
  &scope=patient/*.read user/*.read
  &state=YOUR_STATE
  &code_challenge=YOUR_CODE_CHALLENGE
  &code_challenge_method=S256`}
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Step 2: Exchange Authorization Code</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
{`POST ${configuration?.token_endpoint}
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&redirect_uri=YOUR_REDIRECT_URI
&client_id=YOUR_CLIENT_ID
&code_verifier=YOUR_CODE_VERIFIER`}
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Step 3: Use Access Token</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
{`GET /fhir/R4/Patient/123
Authorization: Bearer ACCESS_TOKEN`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Client Registration Form */}
      {showRegisterForm && (
        <Card className="fixed inset-0 z-50 m-auto max-w-2xl max-h-[90vh] overflow-auto">
          <CardHeader>
            <CardTitle>Register SMART Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Client Name</Label>
              <Input
                value={formData.client_name || ''}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="My SMART App"
              />
            </div>
            <div>
              <Label>Redirect URIs (one per line)</Label>
              <Textarea
                value={formData.redirect_uris?.join('\n') || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  redirect_uris: e.target.value.split('\n').filter(uri => uri.trim())
                })}
                placeholder="https://myapp.com/callback"
                rows={3}
              />
            </div>
            <div>
              <Label>Scopes</Label>
              <Input
                value={formData.scope || ''}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="patient/*.read user/*.read"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={registerClient}>Register</Button>
              <Button variant="outline" onClick={() => { setShowRegisterForm(false); setFormData({}); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SMARTonFHIR;

