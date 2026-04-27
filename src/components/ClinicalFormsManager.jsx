/**
 * Clinical Forms Manager - Manage all clinical forms
 * Supports all 30+ OpenEMR form types
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { FileText, Plus, Edit, Trash2, Lock, CheckCircle } from 'lucide-react';

export default function ClinicalFormsManager({ patientId, encounterId }) {
  const [formTypes, setFormTypes] = useState({});
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormType, setSelectedFormType] = useState(null);

  useEffect(() => {
    loadFormTypes();
    if (patientId) {
      loadPatientForms();
    }
  }, [patientId]);

  const loadFormTypes = async () => {
    try {
      const result = await apiService.request('/clinical-forms/types', 'GET');
      if (result.success) {
        setFormTypes(result.form_types);
      }
    } catch (err) {
      console.error('Error loading form types:', err);
    }
  };

  const loadPatientForms = async () => {
    if (!patientId) {
      setForms([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await apiService.request(`/clinical-forms/patient/${patientId}`, 'GET');
      if (result.success) {
        setForms(result.forms || []);
      }
    } catch (err) {
      console.error('Error loading forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const createForm = async (formType) => {
    if (!patientId) return;
    try {
      const result = await apiService.request(`/clinical-forms/${formType}/${patientId}`, 'POST', {
        encounter_id: encounterId,
        form_data: {}
      });
      
      if (result.success) {
        loadPatientForms();
        setSelectedFormType(formType);
      }
    } catch (err) {
      console.error('Error creating form:', err);
    }
  };

  if (loading) {
    return <div className="p-4">Loading forms...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clinical Forms</CardTitle>
            <Button onClick={() => setSelectedFormType('soap')}>
              <Plus className="w-4 h-4 mr-2" />
              New Form
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedFormType || 'all'} onValueChange={setSelectedFormType}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Forms</TabsTrigger>
              <TabsTrigger value="soap">SOAP</TabsTrigger>
              <TabsTrigger value="physical_exam">Physical Exam</TabsTrigger>
              <TabsTrigger value="ros">Review of Systems</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {Object.entries(formTypes).map(([key, label]) => (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => createForm(key)}
                    className="justify-start"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                {forms.map((form) => (
                  <Card key={form.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{form.form_name}</p>
                        <p className="text-sm text-gray-600">
                          {form.form_date && new Date(form.form_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={form.form_status === 'completed' ? 'default' : 'secondary'}>
                          {form.form_status}
                        </Badge>
                        {form.is_locked && <Lock className="w-4 h-4" />}
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="soap" className="mt-4">
              <p className="text-gray-500">SOAP forms will be displayed here</p>
            </TabsContent>

            <TabsContent value="physical_exam" className="mt-4">
              <p className="text-gray-500">Physical exam forms will be displayed here</p>
            </TabsContent>

            <TabsContent value="ros" className="mt-4">
              <p className="text-gray-500">Review of Systems forms will be displayed here</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

