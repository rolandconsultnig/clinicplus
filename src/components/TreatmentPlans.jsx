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
  Pill,
  Activity
} from 'lucide-react';

const TreatmentPlans = ({ patientId }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    plan_name: '',
    diagnosis: '',
    treatment_goals: '',
    treatment_approach: '',
    medications: [],
    procedures: [],
    therapies: [],
    lifestyle_modifications: '',
    patient_education: '',
    start_date: '',
    expected_duration: '',
    follow_up_frequency: '',
    status: 'active'
  });

  useEffect(() => {
    loadPlans();
  }, [patientId]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const params = {};
      if (patientId) params.patient_id = patientId;
      
      const result = await apiService.request('/treatment-plans', { method: 'GET' }, params);
      if (result.success) {
        setPlans(result.treatment_plans || []);
      }
    } catch (error) {
      console.error('Error loading treatment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        const result = await apiService.request(`/treatment-plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadPlans();
          setShowForm(false);
          setEditingPlan(null);
          alert('Treatment plan updated successfully');
        }
      } else {
        const result = await apiService.request('/treatment-plans', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadPlans();
          setShowForm(false);
          resetForm();
          alert('Treatment plan created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving treatment plan:', error);
      alert('Error saving treatment plan: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      patient_id: plan.patient_id,
      plan_name: plan.plan_name,
      diagnosis: plan.diagnosis || '',
      treatment_goals: plan.treatment_goals || '',
      treatment_approach: plan.treatment_approach || '',
      medications: plan.medications ? JSON.parse(plan.medications) : [],
      procedures: plan.procedures ? JSON.parse(plan.procedures) : [],
      therapies: plan.therapies ? JSON.parse(plan.therapies) : [],
      lifestyle_modifications: plan.lifestyle_modifications || '',
      patient_education: plan.patient_education || '',
      start_date: plan.start_date ? plan.start_date.split('T')[0] : '',
      expected_duration: plan.expected_duration || '',
      follow_up_frequency: plan.follow_up_frequency || '',
      status: plan.status
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      patient_id: patientId || '',
      plan_name: '',
      diagnosis: '',
      treatment_goals: '',
      treatment_approach: '',
      medications: [],
      procedures: [],
      therapies: [],
      lifestyle_modifications: '',
      patient_education: '',
      start_date: '',
      expected_duration: '',
      follow_up_frequency: '',
      status: 'active'
    });
    setEditingPlan(null);
  };

  return (
    <PageWrapper
      title="Treatment Plans"
      description="Treatment plan documentation"
      icon={FileText}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Treatment Plan
        </Button>
      }
    >
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingPlan ? 'Edit' : 'New'} Treatment Plan</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Plan Name *</Label>
                <Input
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Diagnosis</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                />
              </div>
              <div>
                <Label>Treatment Goals</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                  value={formData.treatment_goals}
                  onChange={(e) => setFormData({ ...formData, treatment_goals: e.target.value })}
                />
              </div>
              <div>
                <Label>Treatment Approach</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                  value={formData.treatment_approach}
                  onChange={(e) => setFormData({ ...formData, treatment_approach: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Expected Duration</Label>
                  <Input
                    value={formData.expected_duration}
                    onChange={(e) => setFormData({ ...formData, expected_duration: e.target.value })}
                    placeholder="e.g., 6 weeks, 3 months"
                  />
                </div>
              </div>
              <div>
                <Label>Lifestyle Modifications</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                  value={formData.lifestyle_modifications}
                  onChange={(e) => setFormData({ ...formData, lifestyle_modifications: e.target.value })}
                />
              </div>
              <div>
                <Label>Patient Education</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                  value={formData.patient_education}
                  onChange={(e) => setFormData({ ...formData, patient_education: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingPlan ? 'Update' : 'Create'} Treatment Plan
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
          <CardTitle>Treatment Plans ({plans.length})</CardTitle>
          <CardDescription>Treatment plan records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading treatment plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No treatment plans found. Create your first treatment plan above.
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{plan.plan_name}</h3>
                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                          {plan.status}
                        </Badge>
                      </div>
                      {plan.diagnosis && (
                        <p className="text-sm text-gray-600 mb-2"><strong>Diagnosis:</strong> {plan.diagnosis}</p>
                      )}
                      {plan.treatment_goals && (
                        <p className="text-sm text-gray-600 mb-2"><strong>Goals:</strong> {plan.treatment_goals}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mt-2">
                        {plan.start_date && (
                          <div>
                            <p className="font-semibold text-gray-700">Start Date</p>
                            <p>{new Date(plan.start_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {plan.expected_duration && (
                          <div>
                            <p className="font-semibold text-gray-700">Duration</p>
                            <p>{plan.expected_duration}</p>
                          </div>
                        )}
                        {plan.next_follow_up_date && (
                          <div>
                            <p className="font-semibold text-gray-700">Next Follow-up</p>
                            <p>{new Date(plan.next_follow_up_date).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                      <Edit className="w-4 h-4" />
                    </Button>
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

export default TreatmentPlans;

