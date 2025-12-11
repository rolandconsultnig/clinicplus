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
  Stethoscope, 
  Plus, 
  Edit, 
  Save, 
  X, 
  CheckCircle2,
  Heart,
  Activity
} from 'lucide-react';

const PhysicalExam = ({ patientId, encounterId }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState({
    encounter_id: encounterId || '',
    patient_id: patientId || '',
    general_appearance: '',
    alertness: 'alert',
    distress: 'none',
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    bmi: '',
    heent: '',
    cardiovascular: '',
    respiratory: '',
    gastrointestinal: '',
    genitourinary: '',
    musculoskeletal: '',
    neurological: '',
    skin: '',
    lymphatic: '',
    additional_findings: '',
    clinical_impression: '',
    status: 'draft'
  });

  useEffect(() => {
    loadExams();
  }, [patientId, encounterId]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const params = {};
      if (patientId) params.patient_id = patientId;
      if (encounterId) params.encounter_id = encounterId;
      
      const result = await apiService.request('/physical-exams', { method: 'GET' }, params);
      if (result.success) {
        setExams(result.physical_exams || []);
      }
    } catch (error) {
      console.error('Error loading physical exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const examData = {
        ...formData,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        blood_pressure_systolic: formData.blood_pressure_systolic ? parseInt(formData.blood_pressure_systolic) : null,
        blood_pressure_diastolic: formData.blood_pressure_diastolic ? parseInt(formData.blood_pressure_diastolic) : null,
        heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
        respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate) : null,
        oxygen_saturation: formData.oxygen_saturation ? parseFloat(formData.oxygen_saturation) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        bmi: formData.bmi ? parseFloat(formData.bmi) : null
      };

      if (editingExam) {
        const result = await apiService.request(`/physical-exams/${editingExam.id}`, {
          method: 'PUT',
          body: JSON.stringify(examData)
        });
        if (result.success) {
          await loadExams();
          setShowForm(false);
          setEditingExam(null);
          alert('Physical exam updated successfully');
        }
      } else {
        const result = await apiService.request('/physical-exams', {
          method: 'POST',
          body: JSON.stringify(examData)
        });
        if (result.success) {
          await loadExams();
          setShowForm(false);
          resetForm();
          alert('Physical exam created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving physical exam:', error);
      alert('Error saving physical exam: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setFormData({
      encounter_id: exam.encounter_id,
      patient_id: exam.patient_id,
      general_appearance: exam.general_appearance || '',
      alertness: exam.alertness || 'alert',
      distress: exam.distress || 'none',
      temperature: exam.temperature || '',
      blood_pressure_systolic: exam.blood_pressure_systolic || '',
      blood_pressure_diastolic: exam.blood_pressure_diastolic || '',
      heart_rate: exam.heart_rate || '',
      respiratory_rate: exam.respiratory_rate || '',
      oxygen_saturation: exam.oxygen_saturation || '',
      weight: exam.weight || '',
      height: exam.height || '',
      bmi: exam.bmi || '',
      heent: exam.heent || '',
      cardiovascular: exam.cardiovascular || '',
      respiratory: exam.respiratory || '',
      gastrointestinal: exam.gastrointestinal || '',
      genitourinary: exam.genitourinary || '',
      musculoskeletal: exam.musculoskeletal || '',
      neurological: exam.neurological || '',
      skin: exam.skin || '',
      lymphatic: exam.lymphatic || '',
      additional_findings: exam.additional_findings || '',
      clinical_impression: exam.clinical_impression || '',
      status: exam.status
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      encounter_id: encounterId || '',
      patient_id: patientId || '',
      general_appearance: '',
      alertness: 'alert',
      distress: 'none',
      temperature: '',
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      heart_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      height: '',
      bmi: '',
      heent: '',
      cardiovascular: '',
      respiratory: '',
      gastrointestinal: '',
      genitourinary: '',
      musculoskeletal: '',
      neurological: '',
      skin: '',
      lymphatic: '',
      additional_findings: '',
      clinical_impression: '',
      status: 'draft'
    });
    setEditingExam(null);
  };

  return (
    <PageWrapper
      title="Physical Examination"
      description="Comprehensive physical examination documentation"
      icon={Stethoscope}
      actions={
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Physical Exam
        </Button>
      }
    >
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingExam ? 'Edit' : 'New'} Physical Examination</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="vitals" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="vitals">Vitals</TabsTrigger>
                  <TabsTrigger value="heent">HEENT</TabsTrigger>
                  <TabsTrigger value="systems">Systems</TabsTrigger>
                  <TabsTrigger value="neuro">Neuro</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>

                <TabsContent value="vitals" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Temperature (°F)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>BP Systolic</Label>
                      <Input
                        type="number"
                        value={formData.blood_pressure_systolic}
                        onChange={(e) => setFormData({ ...formData, blood_pressure_systolic: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>BP Diastolic</Label>
                      <Input
                        type="number"
                        value={formData.blood_pressure_diastolic}
                        onChange={(e) => setFormData({ ...formData, blood_pressure_diastolic: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Heart Rate</Label>
                      <Input
                        type="number"
                        value={formData.heart_rate}
                        onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Respiratory Rate</Label>
                      <Input
                        type="number"
                        value={formData.respiratory_rate}
                        onChange={(e) => setFormData({ ...formData, respiratory_rate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>SpO2 (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.oxygen_saturation}
                        onChange={(e) => setFormData({ ...formData, oxygen_saturation: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>General Appearance</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                      value={formData.general_appearance}
                      onChange={(e) => setFormData({ ...formData, general_appearance: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Alertness</Label>
                      <select
                        value={formData.alertness}
                        onChange={(e) => setFormData({ ...formData, alertness: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="alert">Alert</option>
                        <option value="drowsy">Drowsy</option>
                        <option value="obtunded">Obtunded</option>
                        <option value="comatose">Comatose</option>
                      </select>
                    </div>
                    <div>
                      <Label>Distress</Label>
                      <select
                        value={formData.distress}
                        onChange={(e) => setFormData({ ...formData, distress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="none">None</option>
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="heent" className="space-y-4">
                  <div>
                    <Label>HEENT (Head, Eyes, Ears, Nose, Throat)</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[150px]"
                      value={formData.heent}
                      onChange={(e) => setFormData({ ...formData, heent: e.target.value })}
                      placeholder="Head, eyes, ears, nose, throat examination findings"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="systems" className="space-y-4">
                  <div>
                    <Label>Cardiovascular</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.cardiovascular}
                      onChange={(e) => setFormData({ ...formData, cardiovascular: e.target.value })}
                      placeholder="Heart sounds, murmurs, pulses, edema"
                    />
                  </div>
                  <div>
                    <Label>Respiratory</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.respiratory}
                      onChange={(e) => setFormData({ ...formData, respiratory: e.target.value })}
                      placeholder="Chest symmetry, breath sounds, wheezing, rales"
                    />
                  </div>
                  <div>
                    <Label>Gastrointestinal</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.gastrointestinal}
                      onChange={(e) => setFormData({ ...formData, gastrointestinal: e.target.value })}
                      placeholder="Abdomen appearance, bowel sounds, tenderness, masses"
                    />
                  </div>
                  <div>
                    <Label>Genitourinary</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                      value={formData.genitourinary}
                      onChange={(e) => setFormData({ ...formData, genitourinary: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Musculoskeletal</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.musculoskeletal}
                      onChange={(e) => setFormData({ ...formData, musculoskeletal: e.target.value })}
                      placeholder="Range of motion, strength, deformities"
                    />
                  </div>
                  <div>
                    <Label>Skin</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                      value={formData.skin}
                      onChange={(e) => setFormData({ ...formData, skin: e.target.value })}
                      placeholder="Skin color, condition, lesions, rashes"
                    />
                  </div>
                  <div>
                    <Label>Lymphatic</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                      value={formData.lymphatic}
                      onChange={(e) => setFormData({ ...formData, lymphatic: e.target.value })}
                      placeholder="Lymph node examination"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="neuro" className="space-y-4">
                  <div>
                    <Label>Neurological Examination</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[200px]"
                      value={formData.neurological}
                      onChange={(e) => setFormData({ ...formData, neurological: e.target.value })}
                      placeholder="Mental status, cranial nerves, motor, sensory, reflexes, coordination, gait"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="space-y-4">
                  <div>
                    <Label>Additional Findings</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.additional_findings}
                      onChange={(e) => setFormData({ ...formData, additional_findings: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Clinical Impression</Label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                      value={formData.clinical_impression}
                      onChange={(e) => setFormData({ ...formData, clinical_impression: e.target.value })}
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
                  {editingExam ? 'Update' : 'Create'} Physical Exam
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
          <CardTitle>Physical Examinations ({exams.length})</CardTitle>
          <CardDescription>Physical examination records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading physical exams...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No physical examinations found. Create your first exam above.
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam) => (
                <div key={exam.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={exam.status === 'signed' ? 'default' : 'secondary'}>
                        {exam.status}
                      </Badge>
                      {exam.created_at && (
                        <span className="text-sm text-gray-600">
                          {new Date(exam.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(exam)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {exam.temperature && (
                      <div>
                        <p className="font-semibold text-gray-700">Temperature</p>
                        <p className="text-gray-600">{exam.temperature}°F</p>
                      </div>
                    )}
                    {exam.blood_pressure_systolic && (
                      <div>
                        <p className="font-semibold text-gray-700">Blood Pressure</p>
                        <p className="text-gray-600">{exam.blood_pressure_systolic}/{exam.blood_pressure_diastolic}</p>
                      </div>
                    )}
                    {exam.heart_rate && (
                      <div>
                        <p className="font-semibold text-gray-700">Heart Rate</p>
                        <p className="text-gray-600">{exam.heart_rate} bpm</p>
                      </div>
                    )}
                    {exam.respiratory_rate && (
                      <div>
                        <p className="font-semibold text-gray-700">Respiratory Rate</p>
                        <p className="text-gray-600">{exam.respiratory_rate} /min</p>
                      </div>
                    )}
                  </div>
                  
                  {exam.clinical_impression && (
                    <div className="mt-3">
                      <p className="font-semibold text-gray-700 text-sm">Clinical Impression</p>
                      <p className="text-gray-600 text-sm">{exam.clinical_impression}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
};

export default PhysicalExam;

