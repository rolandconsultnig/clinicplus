/**
 * Advanced Features - Care coordination, FHIR, direct messaging, de-identification, telehealth
 */
import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Database, FileText, Shield, Video, Download } from 'lucide-react';

export default function AdvancedFeatures({ patientId }) {
  const [loading, setLoading] = useState(false);

  const generateCCDA = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const result = await apiService.request(`/api/advanced/care-coordination/ccda/${patientId}`, 'GET');
      if (result.success) {
        alert('CCDA generated successfully!');
      }
    } catch (err) {
      console.error('Error generating CCDA:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTelehealthSession = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const result = await apiService.request('/api/advanced/telehealth/sessions', 'POST', {
        patient_id: patientId
      });
      if (result.success) {
        alert(`Telehealth session created! URL: ${result.session.session_url}`);
      }
    } catch (err) {
      console.error('Error creating telehealth session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Features</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="care-coordination">
            <TabsList>
              <TabsTrigger value="care-coordination">Care Coordination</TabsTrigger>
              <TabsTrigger value="direct-messaging">Direct Messaging</TabsTrigger>
              <TabsTrigger value="de-identification">De-identification</TabsTrigger>
              <TabsTrigger value="telehealth">Telehealth</TabsTrigger>
            </TabsList>

            <TabsContent value="care-coordination" className="mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Generate CCDA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {patientId ? (
                      <Button onClick={generateCCDA} disabled={loading}>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate CCDA Document
                      </Button>
                    ) : (
                      <p className="text-gray-500">Please select a patient first</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Generate QRDA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {patientId ? (
                      <Button onClick={() => {
                        apiService.request(`/api/advanced/care-coordination/qrda/${patientId}`, 'GET');
                      }}>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate QRDA Document
                      </Button>
                    ) : (
                      <p className="text-gray-500">Please select a patient first</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="direct-messaging" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-gray-500">Direct messaging log interface coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="de-identification" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>De-identify Patient Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 mb-4">De-identification tools coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="telehealth" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Telehealth Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {patientId ? (
                    <Button onClick={createTelehealthSession} disabled={loading}>
                      <Video className="w-4 h-4 mr-2" />
                      Create Telehealth Session
                    </Button>
                  ) : (
                    <p className="text-gray-500">Please select a patient first</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

