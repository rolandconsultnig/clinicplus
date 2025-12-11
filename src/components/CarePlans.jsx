import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  ClipboardList, 
  Plus, 
  Edit, 
  Save, 
  X,
  Target,
  CheckCircle2
} from 'lucide-react';

const CarePlans = ({ patientId }) => {
  const [plans, setPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    plan_name: '',
    description: '',
    plan_type: 'chronic_disease',
    goals: [],
    target_date: '',
    interventions: [],
    status: 'active',
    start_date: '',
    review_frequency: 'monthly'
  });

  useEffect(() => {
    loadPlans();
    loadTemplates();
  }, [patientId]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const params = {};
      if (patientId) params.patient_id = patientId;
      
      const result = await apiService.request('/care-plans', { method: 'GET' }, params);
      if (result.success) {
        setPlans(result.care_plans || []);
      }
    } catch (error) {
      console.error('Error loading care plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await apiService.request('/care-plan-templates', { method: 'GET' });
      if (result.success) {
        setTemplates(result.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        const result = await apiService.request(`/care-plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadPlans();
          setShowForm(false);
          setEditingPlan(null);
          alert('Care plan updated successfully');
        }
      } else {
        const result = await apiService.request('/care-plans', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadPlans();
          setShowForm(false);
          resetForm();
          alert('Care plan created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving care plan:', error);
      alert('Error saving care plan: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      patient_id: plan.patient_id,
      plan_name: plan.plan_name,
      description: plan.description || '',
      plan_type: plan.plan_type || 'chronic_disease',
      goals: plan.goals ? JSON.parse(plan.goals) : [],
      target_date: plan.target_date ? plan.target_date.split('T')[0] : '',
      interventions: plan.interventions ? JSON.parse(plan.interventions) : [],
      status: plan.status,
      start_date: plan.start_date ? plan.start_date.split('T')[0] : '',
      review_frequency: plan.review_frequency || 'monthly'
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      patient_id: patientId || '',
      plan_name: '',
      description: '',
      plan_type: 'chronic_disease',
      goals: [],
      target_date: '',
      interventions: [],
      status: 'active',
      start_date: '',
      review_frequency: 'monthly'
    });
    setEditingPlan(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageWrapper
      title="Care Plans"
      description="Comprehensive care planning with templates"
      icon={ClipboardList}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Care Plan
        </Button>
      }
    >
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingPlan ? 'Edit' : 'New'} Care Plan</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plan Name *</Label>
                  <Input
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Plan Type</Label>
                  <select
                    value={formData.plan_type}
                    onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="chronic_disease">Chronic Disease</option>
                    <option value="preventive">Preventive</option>
                    <option value="acute_care">Acute Care</option>
                    <option value="post_surgical">Post-Surgical</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Review Frequency</Label>
                <select
                  value={formData.review_frequency}
                  onChange={(e) => setFormData({ ...formData, review_frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingPlan ? 'Update' : 'Create'} Care Plan
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
          <CardTitle>Care Plans ({plans.length})</CardTitle>
          <CardDescription>Patient care planning records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading care plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No care plans found. Create your first care plan above.
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{plan.plan_name}</h3>
                        <Badge className={getStatusColor(plan.status)}>
                          {plan.status}
                        </Badge>
                        <Badge variant="outline">{plan.plan_type}</Badge>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        {plan.start_date && (
                          <div>
                            <p className="font-semibold text-gray-700">Start Date</p>
                            <p>{new Date(plan.start_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {plan.target_date && (
                          <div>
                            <p className="font-semibold text-gray-700">Target Date</p>
                            <p>{new Date(plan.target_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {plan.next_review_date && (
                          <div>
                            <p className="font-semibold text-gray-700">Next Review</p>
                            <p>{new Date(plan.next_review_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {plan.review_frequency && (
                          <div>
                            <p className="font-semibold text-gray-700">Review Frequency</p>
                            <p>{plan.review_frequency}</p>
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

export default CarePlans;

