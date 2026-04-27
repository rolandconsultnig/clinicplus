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
  ClipboardList, 
  Plus, 
  Edit, 
  Save, 
  X, 
  CheckCircle2
} from 'lucide-react';

const ReviewOfSystems = ({ patientId, encounterId }) => {
  const [rosRecords, setRosRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    encounter_id: encounterId || '',
    patient_id: patientId || '',
    constitutional: '',
    eyes: '',
    ent: '',
    cardiovascular: '',
    respiratory: '',
    gastrointestinal: '',
    genitourinary: '',
    musculoskeletal: '',
    neurological: '',
    psychiatric: '',
    endocrine: '',
    hematologic: '',
    allergic: '',
    skin: '',
    additional_notes: '',
    status: 'draft'
  });

  useEffect(() => {
    loadRecords();
  }, [patientId, encounterId]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const params = {};
      if (patientId) params.patient_id = patientId;
      if (encounterId) params.encounter_id = encounterId;
      
      const result = await apiService.request('/review-of-systems', { method: 'GET' }, params);
      if (result.success) {
        setRosRecords(result.review_of_systems || []);
      }
    } catch (error) {
      console.error('Error loading Review of Systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        const result = await apiService.request(`/review-of-systems/${editingRecord.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadRecords();
          setShowForm(false);
          setEditingRecord(null);
          alert('Review of Systems updated successfully');
        }
      } else {
        const result = await apiService.request('/review-of-systems', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadRecords();
          setShowForm(false);
          resetForm();
          alert('Review of Systems created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving Review of Systems:', error);
      alert('Error saving Review of Systems: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      encounter_id: record.encounter_id,
      patient_id: record.patient_id,
      constitutional: record.constitutional || '',
      eyes: record.eyes || '',
      ent: record.ent || '',
      cardiovascular: record.cardiovascular || '',
      respiratory: record.respiratory || '',
      gastrointestinal: record.gastrointestinal || '',
      genitourinary: record.genitourinary || '',
      musculoskeletal: record.musculoskeletal || '',
      neurological: record.neurological || '',
      psychiatric: record.psychiatric || '',
      endocrine: record.endocrine || '',
      hematologic: record.hematologic || '',
      allergic: record.allergic || '',
      skin: record.skin || '',
      additional_notes: record.additional_notes || '',
      status: record.status
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      encounter_id: encounterId || '',
      patient_id: patientId || '',
      constitutional: '',
      eyes: '',
      ent: '',
      cardiovascular: '',
      respiratory: '',
      gastrointestinal: '',
      genitourinary: '',
      musculoskeletal: '',
      neurological: '',
      psychiatric: '',
      endocrine: '',
      hematologic: '',
      allergic: '',
      skin: '',
      additional_notes: '',
      status: 'draft'
    });
    setEditingRecord(null);
  };

  const systemFields = [
    { key: 'constitutional', label: 'Constitutional', icon: '🌡️' },
    { key: 'eyes', label: 'Eyes', icon: '👁️' },
    { key: 'ent', label: 'Ears, Nose, Throat', icon: '👂' },
    { key: 'cardiovascular', label: 'Cardiovascular', icon: '❤️' },
    { key: 'respiratory', label: 'Respiratory', icon: '🫁' },
    { key: 'gastrointestinal', label: 'Gastrointestinal', icon: '🫀' },
    { key: 'genitourinary', label: 'Genitourinary', icon: '🔬' },
    { key: 'musculoskeletal', label: 'Musculoskeletal', icon: '🦴' },
    { key: 'neurological', label: 'Neurological', icon: '🧠' },
    { key: 'psychiatric', label: 'Psychiatric', icon: '🧘' },
    { key: 'endocrine', label: 'Endocrine', icon: '⚕️' },
    { key: 'hematologic', label: 'Hematologic/Lymphatic', icon: '🩸' },
    { key: 'allergic', label: 'Allergic/Immunologic', icon: '🤧' },
    { key: 'skin', label: 'Skin', icon: '👋' }
  ];

  return (
    <PageWrapper
      title="Review of Systems"
      description="Systematic review of body systems"
      icon={ClipboardList}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New ROS
        </Button>
      }
    >
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingRecord ? 'Edit' : 'New'} Review of Systems</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemFields.map((field) => (
                  <div key={field.key}>
                    <Label>{field.icon} {field.label}</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                      value={formData[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={`${field.label} symptoms and findings`}
                    />
                  </div>
                ))}
              </div>
              
              <div>
                <Label>Additional Notes</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="draft">Draft</option>
                  <option value="final">Final</option>
                </select>
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingRecord ? 'Update' : 'Create'} ROS
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
          <CardTitle>Review of Systems ({rosRecords.length})</CardTitle>
          <CardDescription>Systematic body system reviews</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading Review of Systems...</p>
            </div>
          ) : rosRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No Review of Systems records found. Create your first ROS above.
            </div>
          ) : (
            <div className="space-y-4">
              {rosRecords.map((record) => (
                <div key={record.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={record.status === 'signed' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                      {record.created_at && (
                        <span className="text-sm text-gray-600">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {record.constitutional && (
                      <div>
                        <p className="font-semibold text-gray-700">Constitutional</p>
                        <p className="text-gray-600 line-clamp-2">{record.constitutional}</p>
                      </div>
                    )}
                    {record.cardiovascular && (
                      <div>
                        <p className="font-semibold text-gray-700">Cardiovascular</p>
                        <p className="text-gray-600 line-clamp-2">{record.cardiovascular}</p>
                      </div>
                    )}
                    {record.respiratory && (
                      <div>
                        <p className="font-semibold text-gray-700">Respiratory</p>
                        <p className="text-gray-600 line-clamp-2">{record.respiratory}</p>
                      </div>
                    )}
                    {record.gastrointestinal && (
                      <div>
                        <p className="font-semibold text-gray-700">Gastrointestinal</p>
                        <p className="text-gray-600 line-clamp-2">{record.gastrointestinal}</p>
                      </div>
                    )}
                    {record.neurological && (
                      <div>
                        <p className="font-semibold text-gray-700">Neurological</p>
                        <p className="text-gray-600 line-clamp-2">{record.neurological}</p>
                      </div>
                    )}
                    {record.skin && (
                      <div>
                        <p className="font-semibold text-gray-700">Skin</p>
                        <p className="text-gray-600 line-clamp-2">{record.skin}</p>
                      </div>
                    )}
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

export default ReviewOfSystems;

