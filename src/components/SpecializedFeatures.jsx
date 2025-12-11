/**
 * Specialized Features - Therapy groups, authorizations, portal, fax, chart tracker
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Shield, User, Send, FileText, Printer } from 'lucide-react';
import PatientPortalManagement from './PatientPortalManagement';

export default function SpecializedFeatures() {
  const [therapyGroups, setTherapyGroups] = useState([]);
  const [authorizations, setAuthorizations] = useState([]);
  const [faxQueue, setFaxQueue] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsResult, authResult, faxResult] = await Promise.all([
        apiService.request('/api/specialized/therapy-groups', 'GET'),
        apiService.request('/api/specialized/authorizations', 'GET'),
        apiService.request('/api/specialized/fax/queue', 'GET')
      ]);

      if (groupsResult.success) setTherapyGroups(groupsResult.groups || []);
      if (authResult.success) setAuthorizations(authResult.authorizations || []);
      if (faxResult.success) setFaxQueue(faxResult.queue || []);
    } catch (err) {
      console.error('Error loading specialized features:', err);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Specialized Features</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="therapy-groups">
            <TabsList>
              <TabsTrigger value="therapy-groups">Therapy Groups</TabsTrigger>
              <TabsTrigger value="authorizations">Authorizations</TabsTrigger>
              <TabsTrigger value="patient-portal">Patient Portal</TabsTrigger>
              <TabsTrigger value="fax">Fax/Scan</TabsTrigger>
              <TabsTrigger value="chart-tracker">Chart Tracker</TabsTrigger>
            </TabsList>

            <TabsContent value="therapy-groups" className="mt-4">
              <div className="space-y-2">
                {therapyGroups.map((group) => (
                  <Card key={group.id} className="p-3">
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-gray-600">{group.description}</p>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="authorizations" className="mt-4">
              <div className="space-y-2">
                {authorizations.map((auth) => (
                  <Card key={auth.id} className="p-3">
                    <p className="font-medium">Authorization #{auth.id}</p>
                    <p className="text-sm text-gray-600">
                      {auth.authorization_type} • {auth.start_date} to {auth.end_date}
                    </p>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="patient-portal" className="mt-4">
              <PatientPortalManagement />
            </TabsContent>

            <TabsContent value="fax" className="mt-4">
              <div className="space-y-2">
                {faxQueue.map((fax) => (
                  <Card key={fax.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Fax to {fax.to_number}</p>
                        <p className="text-sm text-gray-600">Status: {fax.status}</p>
                      </div>
                      <Button size="sm">View</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="chart-tracker" className="mt-4">
              <p className="text-gray-500">Chart tracker interface coming soon...</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

