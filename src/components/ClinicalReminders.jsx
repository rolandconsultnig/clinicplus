import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Bell, 
  Plus, 
  Edit, 
  Save, 
  X, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';

const ClinicalReminders = ({ patientId }) => {
  const [reminders, setReminders] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('reminders');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    reminder_type: 'general',
    reminder_category: 'preventive',
    title: '',
    description: '',
    due_date: '',
    priority: 'normal',
    status: 'active'
  });

  useEffect(() => {
    loadReminders();
    loadRules();
  }, [patientId, filterStatus]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      
      // Try patient-file endpoint first (broader access), fallback to clinical-reminders
      let result = null;
      let error = null;
      
      if (patientId) {
        try {
          // Use patient-file endpoint which has broader role access
          result = await apiService.request(`/patient-file/reminders/${patientId}`, 'GET');
        } catch (err) {
          error = err;
          // Fallback to clinical-reminders endpoint
          try {
            const params = new URLSearchParams();
            params.append('patient_id', patientId);
            if (filterStatus !== 'all') params.append('status', filterStatus);
            result = await apiService.request(`/clinical-reminders?${params}`, 'GET');
          } catch (fallbackErr) {
            console.error('Error loading clinical reminders:', fallbackErr);
            // Don't show alert for permission errors, just log
            if (fallbackErr.status !== 403) {
              alert('Error loading clinical reminders: ' + (fallbackErr.message || 'Unknown error'));
            }
            setReminders([]);
            return;
          }
        }
      } else {
        // No patient ID, use general endpoint
        const params = new URLSearchParams();
        if (filterStatus !== 'all') params.append('status', filterStatus);
        const queryString = params.toString();
        const endpoint = queryString ? `/clinical-reminders?${queryString}` : '/clinical-reminders';
        
        try {
          result = await apiService.request(endpoint, 'GET');
        } catch (err) {
          console.error('Error loading clinical reminders:', err);
          if (err.status !== 403) {
            alert('Error loading clinical reminders: ' + (err.message || 'Unknown error'));
          }
          setReminders([]);
          return;
        }
      }
      
      if (result && result.success) {
        setReminders(result.reminders || []);
      } else {
        setReminders([]);
      }
    } catch (error) {
      console.error('Error loading clinical reminders:', error);
      // Don't show alert for permission errors
      if (error.status !== 403) {
        alert('Error loading clinical reminders: ' + (error.message || 'Unknown error'));
      }
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const result = await apiService.request('/reminder-rules', { method: 'GET' });
      if (result.success) {
        setRules(result.rules || []);
      }
    } catch (error) {
      console.error('Error loading reminder rules:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReminder) {
        const result = await apiService.request(`/clinical-reminders/${editingReminder.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadReminders();
          setShowForm(false);
          setEditingReminder(null);
          alert('Clinical reminder updated successfully');
        }
      } else {
        const result = await apiService.request('/clinical-reminders', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadReminders();
          setShowForm(false);
          resetForm();
          alert('Clinical reminder created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving clinical reminder:', error);
      alert('Error saving clinical reminder: ' + (error.message || 'Unknown error'));
    }
  };

  const handleComplete = async (reminderId) => {
    try {
      const result = await apiService.request(`/clinical-reminders/${reminderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' })
      });
      if (result.success) {
        await loadReminders();
        alert('Reminder marked as completed');
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
      alert('Error completing reminder: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      patient_id: reminder.patient_id,
      reminder_type: reminder.reminder_type,
      reminder_category: reminder.reminder_category,
      title: reminder.title,
      description: reminder.description,
      due_date: reminder.due_date ? reminder.due_date.split('T')[0] : '',
      priority: reminder.priority,
      status: reminder.status
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      patient_id: patientId || '',
      reminder_type: 'general',
      reminder_category: 'preventive',
      title: '',
      description: '',
      due_date: '',
      priority: 'normal',
      status: 'active'
    });
    setEditingReminder(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-teal-100 text-teal-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-teal-100 text-teal-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReminders = reminders.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  return (
    <PageWrapper
      title="Clinical Reminders"
      description="Automated clinical reminders and care gap management"
      icon={Bell}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Reminder
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="rules">Reminder Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="space-y-6">
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingReminder ? 'Edit' : 'New'} Clinical Reminder</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reminder Type</Label>
                      <select
                        value={formData.reminder_type}
                        onChange={(e) => setFormData({ ...formData, reminder_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="general">General</option>
                        <option value="immunization">Immunization</option>
                        <option value="screening">Screening</option>
                        <option value="medication">Medication</option>
                        <option value="lab">Lab</option>
                        <option value="followup">Follow-up</option>
                      </select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select
                        value={formData.reminder_category}
                        onChange={(e) => setFormData({ ...formData, reminder_category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="preventive">Preventive</option>
                        <option value="chronic_care">Chronic Care</option>
                        <option value="acute_care">Acute Care</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Reminder title"
                      required
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Reminder description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      {editingReminder ? 'Update' : 'Create'} Reminder
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
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinical Reminders ({filteredReminders.length})</CardTitle>
              <CardDescription>Patient care reminders and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading reminders...</p>
                </div>
              ) : filteredReminders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No reminders found. Create your first reminder above.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReminders.map((reminder) => (
                    <div key={reminder.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                            <Badge className={getPriorityColor(reminder.priority)}>
                              {reminder.priority}
                            </Badge>
                            <Badge className={getStatusColor(reminder.status)}>
                              {reminder.status}
                            </Badge>
                            <Badge variant="outline">{reminder.reminder_type}</Badge>
                          </div>
                          {reminder.description && (
                            <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {reminder.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Due: {new Date(reminder.due_date).toLocaleDateString()}
                              </div>
                            )}
                            {reminder.completed_date && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed: {new Date(reminder.completed_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {reminder.status === 'active' && (
                            <Button variant="ghost" size="sm" onClick={() => handleComplete(reminder.id)}>
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(reminder)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder Rules ({rules.length})</CardTitle>
              <CardDescription>Automated reminder generation rules</CardDescription>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No reminder rules configured
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{rule.rule_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{rule.rule_description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{rule.rule_type}</Badge>
                            <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
};

export default ClinicalReminders;

