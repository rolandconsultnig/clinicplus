import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Plus, 
  Edit, 
  Save, 
  X,
  Send,
  CheckCircle2
} from 'lucide-react';

const UB04Forms = ({ patientId }) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    statement_covers_period_from: '',
    statement_covers_period_to: '',
    admission_date: '',
    discharge_date: '',
    principal_diagnosis_code: '',
    procedure_codes: [],
    revenue_codes: [],
    total_charges: '',
    status: 'draft'
  });

  useEffect(() => {
    loadForms();
  }, [patientId]);

  const loadForms = async () => {
    try {
      setLoading(true);
      const params = {};
      if (patientId) params.patient_id = patientId;
      
      const result = await apiService.request('/ub04-forms', { method: 'GET' }, params);
      if (result.success) {
        setForms(result.forms || []);
      }
    } catch (error) {
      console.error('Error loading UB-04 forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingForm) {
        const result = await apiService.request(`/ub04-forms/${editingForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadForms();
          setShowForm(false);
          setEditingForm(null);
          alert('UB-04 form updated successfully');
        }
      } else {
        const result = await apiService.request('/ub04-forms', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadForms();
          setShowForm(false);
          resetForm();
          alert('UB-04 form created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving UB-04 form:', error);
      alert('Error saving UB-04 form: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSubmitForm = async (formId) => {
    if (!window.confirm('Submit this UB-04 form? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await apiService.request(`/ub04-forms/${formId}/submit`, { method: 'POST' });
      if (result.success) {
        await loadForms();
        alert('UB-04 form submitted successfully');
      }
    } catch (error) {
      console.error('Error submitting UB-04 form:', error);
      alert('Error submitting UB-04 form: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (form) => {
    setEditingForm(form);
    setFormData({
      patient_id: form.patient_id,
      statement_covers_period_from: form.statement_covers_period_from ? form.statement_covers_period_from.split('T')[0] : '',
      statement_covers_period_to: form.statement_covers_period_to ? form.statement_covers_period_to.split('T')[0] : '',
      admission_date: form.admission_date ? form.admission_date.split('T')[0] : '',
      discharge_date: form.discharge_date ? form.discharge_date.split('T')[0] : '',
      principal_diagnosis_code: form.principal_diagnosis_code || '',
      procedure_codes: form.procedure_codes ? JSON.parse(form.procedure_codes) : [],
      revenue_codes: form.revenue_codes ? JSON.parse(form.revenue_codes) : [],
      total_charges: form.total_charges || '',
      status: form.status
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      patient_id: patientId || '',
      statement_covers_period_from: '',
      statement_covers_period_to: '',
      admission_date: '',
      discharge_date: '',
      principal_diagnosis_code: '',
      procedure_codes: [],
      revenue_codes: [],
      total_charges: '',
      status: 'draft'
    });
    setEditingForm(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'accepted': return 'bg-teal-100 text-teal-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageWrapper
      title="UB-04 Forms"
      description="Hospital billing forms (UB-04)"
      icon={FileText}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New UB-04 Form
        </Button>
      }
    >
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingForm ? 'Edit' : 'New'} UB-04 Form</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Statement Period From</Label>
                  <Input
                    type="date"
                    value={formData.statement_covers_period_from}
                    onChange={(e) => setFormData({ ...formData, statement_covers_period_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Statement Period To</Label>
                  <Input
                    type="date"
                    value={formData.statement_covers_period_to}
                    onChange={(e) => setFormData({ ...formData, statement_covers_period_to: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Admission Date</Label>
                  <Input
                    type="date"
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Discharge Date</Label>
                  <Input
                    type="date"
                    value={formData.discharge_date}
                    onChange={(e) => setFormData({ ...formData, discharge_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Principal Diagnosis Code</Label>
                <Input
                  value={formData.principal_diagnosis_code}
                  onChange={(e) => setFormData({ ...formData, principal_diagnosis_code: e.target.value })}
                  placeholder="ICD-10 code"
                />
              </div>
              <div>
                <Label>Total Charges</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_charges}
                  onChange={(e) => setFormData({ ...formData, total_charges: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingForm ? 'Update' : 'Create'} Form
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>UB-04 Forms ({forms.length})</CardTitle>
          <CardDescription>Hospital billing forms</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading UB-04 forms...</p>
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No UB-04 forms found. Create your first form above.
            </div>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div key={form.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{form.form_id}</h3>
                        <Badge className={getStatusColor(form.status)}>
                          {form.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                        {form.admission_date && (
                          <div>
                            <p className="font-semibold text-gray-700">Admission</p>
                            <p>{new Date(form.admission_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {form.discharge_date && (
                          <div>
                            <p className="font-semibold text-gray-700">Discharge</p>
                            <p>{new Date(form.discharge_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {form.principal_diagnosis_code && (
                          <div>
                            <p className="font-semibold text-gray-700">Principal DX</p>
                            <p>{form.principal_diagnosis_code}</p>
                          </div>
                        )}
                        {form.total_charges && (
                          <div>
                            <p className="font-semibold text-gray-700">Total Charges</p>
                            <p className="text-green-600">${form.total_charges.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {form.status === 'draft' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(form)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleSubmitForm(form.id)}>
                            <Send className="w-4 h-4 mr-1" />
                            Submit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
};

export default UB04Forms;

