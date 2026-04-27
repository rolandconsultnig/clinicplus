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
  FileText, 
  Plus, 
  Edit, 
  Save, 
  X, 
  CheckCircle2,
  Search,
  Calendar,
  User,
  Stethoscope
} from 'lucide-react';

const SOAPNotes = ({ patientId, encounterId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    encounter_id: encounterId || '',
    patient_id: patientId || '',
    chief_complaint: '',
    history_of_present_illness: '',
    review_of_systems: '',
    subjective: '',
    physical_examination: '',
    objective: '',
    assessment_notes: '',
    assessment: '',
    plan_details: '',
    plan: '',
    status: 'draft'
  });

  useEffect(() => {
    loadNotes();
  }, [patientId, encounterId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (patientId) params.patient_id = patientId;
      if (encounterId) params.encounter_id = encounterId;
      
      const result = await apiService.request('/soap-notes', { method: 'GET' }, params);
      if (result.success) {
        setNotes(result.soap_notes || []);
      }
    } catch (error) {
      console.error('Error loading SOAP notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Combine fields into SOAP components
      const soapData = {
        ...formData,
        subjective: formData.chief_complaint + '\n\n' + 
                    formData.history_of_present_illness + '\n\n' + 
                    formData.review_of_systems,
        objective: formData.physical_examination,
        assessment: formData.assessment_notes,
        plan: formData.plan_details
      };

      if (editingNote) {
        const result = await apiService.request(`/soap-notes/${editingNote.id}`, {
          method: 'PUT',
          body: JSON.stringify(soapData)
        });
        if (result.success) {
          await loadNotes();
          setShowForm(false);
          setEditingNote(null);
          alert('SOAP note updated successfully');
        }
      } else {
        const result = await apiService.request('/soap-notes', {
          method: 'POST',
          body: JSON.stringify(soapData)
        });
        if (result.success) {
          await loadNotes();
          setShowForm(false);
          resetForm();
          alert('SOAP note created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving SOAP note:', error);
      alert('Error saving SOAP note: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      encounter_id: note.encounter_id,
      patient_id: note.patient_id,
      chief_complaint: note.chief_complaint || '',
      history_of_present_illness: note.history_of_present_illness || '',
      review_of_systems: note.review_of_systems || '',
      subjective: note.subjective || '',
      physical_examination: note.physical_examination || '',
      objective: note.objective || '',
      assessment_notes: note.assessment_notes || '',
      assessment: note.assessment || '',
      plan_details: note.plan_details || '',
      plan: note.plan || '',
      status: note.status
    });
    setShowForm(true);
  };

  const handleSign = async (noteId) => {
    if (!window.confirm('Are you sure you want to sign this SOAP note? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await apiService.request(`/soap-notes/${noteId}/sign`, { method: 'POST' });
      if (result.success) {
        await loadNotes();
        alert('SOAP note signed successfully');
      }
    } catch (error) {
      console.error('Error signing SOAP note:', error);
      alert('Error signing SOAP note: ' + (error.message || 'Unknown error'));
    }
  };

  const resetForm = () => {
    setFormData({
      encounter_id: encounterId || '',
      patient_id: patientId || '',
      chief_complaint: '',
      history_of_present_illness: '',
      review_of_systems: '',
      subjective: '',
      physical_examination: '',
      objective: '',
      assessment_notes: '',
      assessment: '',
      plan_details: '',
      plan: '',
      status: 'draft'
    });
    setEditingNote(null);
  };

  return (
    <PageWrapper
      title="SOAP Notes"
      description="Structured Subjective, Objective, Assessment, Plan documentation"
      icon={FileText}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New SOAP Note
        </Button>
      }
    >
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingNote ? 'Edit' : 'New'} SOAP Note</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="subjective" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="subjective">Subjective</TabsTrigger>
                  <TabsTrigger value="objective">Objective</TabsTrigger>
                  <TabsTrigger value="assessment">Assessment</TabsTrigger>
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                </TabsList>

                <TabsContent value="subjective" className="space-y-4">
                  <div>
                    <Label>Chief Complaint</Label>
                    <Input
                      value={formData.chief_complaint}
                      onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                      placeholder="Patient's main concern"
                    />
                  </div>
                  <div>
                    <Label>History of Present Illness</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.history_of_present_illness}
                      onChange={(e) => setFormData({ ...formData, history_of_present_illness: e.target.value })}
                      placeholder="Detailed history of the current problem"
                    />
                  </div>
                  <div>
                    <Label>Review of Systems</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.review_of_systems}
                      onChange={(e) => setFormData({ ...formData, review_of_systems: e.target.value })}
                      placeholder="Systematic review of body systems"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="objective" className="space-y-4">
                  <div>
                    <Label>Physical Examination</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[200px]"
                      value={formData.physical_examination}
                      onChange={(e) => setFormData({ ...formData, physical_examination: e.target.value })}
                      placeholder="Physical examination findings, vital signs, lab results"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="assessment" className="space-y-4">
                  <div>
                    <Label>Assessment</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[150px]"
                      value={formData.assessment_notes}
                      onChange={(e) => setFormData({ ...formData, assessment_notes: e.target.value })}
                      placeholder="Diagnosis, differential diagnosis, clinical impression"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="plan" className="space-y-4">
                  <div>
                    <Label>Plan</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[150px]"
                      value={formData.plan_details}
                      onChange={(e) => setFormData({ ...formData, plan_details: e.target.value })}
                      placeholder="Treatment plan, medications, follow-up, patient education"
                    />
                  </div>
                </TabsContent>
              </Tabs>

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
                  {editingNote ? 'Update' : 'Create'} SOAP Note
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
          <CardTitle>SOAP Notes ({notes.length})</CardTitle>
          <CardDescription>Clinical documentation records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading SOAP notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No SOAP notes found. Create your first SOAP note above.
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={note.status === 'signed' ? 'default' : 'secondary'}>
                        {note.status}
                      </Badge>
                      {note.created_at && (
                        <span className="text-sm text-gray-600">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {note.status !== 'signed' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(note)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleSign(note.id)}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Subjective</p>
                      <p className="text-gray-600 line-clamp-2">{note.chief_complaint || note.subjective || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Objective</p>
                      <p className="text-gray-600 line-clamp-2">{note.objective || note.physical_examination || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Assessment</p>
                      <p className="text-gray-600 line-clamp-2">{note.assessment || note.assessment_notes || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Plan</p>
                      <p className="text-gray-600 line-clamp-2">{note.plan || note.plan_details || 'N/A'}</p>
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

export default SOAPNotes;

