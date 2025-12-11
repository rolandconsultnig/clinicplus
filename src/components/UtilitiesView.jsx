/**
 * Utilities - Patient popups, holiday import, dated reminders, patient merge
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, FileText, Users, Download, Upload, Printer } from 'lucide-react';

export default function UtilitiesView({ patientId }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadReminders();
    }
  }, [patientId]);

  const loadReminders = async () => {
    try {
      const result = await apiService.request(`/api/utilities/dated-reminders?patient_id=${patientId}`, 'GET');
      if (result.success) {
        setReminders(result.reminders || []);
      }
    } catch (err) {
      console.error('Error loading reminders:', err);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Utilities</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reminders">
            <TabsList>
              <TabsTrigger value="reminders">Dated Reminders</TabsTrigger>
              <TabsTrigger value="patient-popups">Patient Popups</TabsTrigger>
              <TabsTrigger value="import-export">Import/Export</TabsTrigger>
              <TabsTrigger value="holidays">Holidays</TabsTrigger>
            </TabsList>

            <TabsContent value="reminders" className="mt-4">
              <div className="space-y-4">
                <Button onClick={() => {
                  const title = prompt('Reminder title:');
                  const dueDate = prompt('Due date (YYYY-MM-DD):');
                  if (title && dueDate && patientId) {
                    apiService.request('/api/utilities/dated-reminders', 'POST', {
                      patient_id: patientId,
                      title,
                      due_date: dueDate,
                      reminder_type: 'general'
                    }).then(() => loadReminders());
                  }
                }}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Reminder
                </Button>
                <div className="space-y-2">
                  {reminders.map((reminder) => (
                    <Card key={reminder.id} className="p-3">
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-gray-600">{reminder.description}</p>
                      <p className="text-xs text-gray-500">
                        Due: {reminder.due_date && new Date(reminder.due_date).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="patient-popups" className="mt-4">
              {patientId ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Button variant="outline" onClick={() => {
                    apiService.request(`/api/utilities/popup/issues/${patientId}`, 'GET');
                  }}>
                    <FileText className="w-4 h-4 mr-2" />
                    Issues Popup
                  </Button>
                  <Button variant="outline" onClick={() => {
                    apiService.request(`/api/utilities/popup/appointments/${patientId}`, 'GET');
                  }}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Appointments
                  </Button>
                  <Button variant="outline" onClick={() => {
                    apiService.request(`/api/utilities/popup/superbill/${patientId}`, 'GET');
                  }}>
                    <FileText className="w-4 h-4 mr-2" />
                    Superbill
                  </Button>
                  <Button variant="outline" onClick={() => {
                    apiService.request(`/api/utilities/popup/payment/${patientId}`, 'GET');
                  }}>
                    <FileText className="w-4 h-4 mr-2" />
                    Payment
                  </Button>
                  <Button variant="outline" onClick={() => {
                    apiService.request(`/api/utilities/popup/labels/${patientId}?type=address`, 'GET');
                  }}>
                    <Printer className="w-4 h-4 mr-2" />
                    Labels
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500">Please select a patient first</p>
              )}
            </TabsContent>

            <TabsContent value="import-export" className="mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Export Patient Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {patientId ? (
                      <Button onClick={() => {
                        apiService.request(`/api/utilities/export/xml/${patientId}`, 'GET');
                      }}>
                        <Download className="w-4 h-4 mr-2" />
                        Export as XML
                      </Button>
                    ) : (
                      <p className="text-gray-500">Please select a patient first</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Import Patient Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Input type="file" accept=".xml" />
                      <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        Import XML
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="holidays" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Holidays</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Holiday Data (JSON)</Label>
                    <textarea className="w-full px-3 py-2 border rounded" rows="6" placeholder='[{"name": "New Year", "date": "2024-01-01"}]' />
                    <Button onClick={() => {
                      const data = document.querySelector('textarea').value;
                      apiService.request('/api/utilities/holidays/import', 'POST', {
                        holidays: JSON.parse(data)
                      });
                    }}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Holidays
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

