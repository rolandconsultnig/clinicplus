import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import PatientSearch from './PatientSearch';
import { 
  Stethoscope, 
  Calendar, 
  FileText, 
  X,
  Save,
  Activity,
  Heart,
  Thermometer,
  Droplet
} from 'lucide-react';

const NewEncounter = ({ onEncounterCreated, onCancel }) => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    encounter_type: 'office_visit',
    encounter_date: new Date().toISOString().split('T')[0],
    encounter_time: new Date().toTimeString().slice(0, 5),
    chief_complaint: '',
    history_present_illness: '',
    assessment: '',
    plan: '',
    follow_up_required: false,
    follow_up_date: '',
    notes: '',
    // Vital Signs
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    setLoading(true);
    try {
      // Prepare encounter data
      const encounterDateTime = new Date(`${formData.encounter_date}T${formData.encounter_time}`);
      
      const encounterData = {
        patient_id: selectedPatient.id || selectedPatient.universal_patient_id,
        encounter_type: formData.encounter_type,
        encounter_date: encounterDateTime.toISOString(),
        encounter_status: 'completed',
        chief_complaint: formData.chief_complaint,
        history_present_illness: formData.history_present_illness,
        diagnosis: formData.assessment,
        assessment: formData.assessment,
        treatment_plan: formData.plan,
        plan: formData.plan,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes,
        vital_signs: {
          systolic_bp: formData.systolic_bp ? parseInt(formData.systolic_bp) : null,
          diastolic_bp: formData.diastolic_bp ? parseInt(formData.diastolic_bp) : null,
          heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
          temperature: formData.temperature ? parseFloat(formData.temperature) : null,
          respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate) : null,
          oxygen_saturation: formData.oxygen_saturation ? parseFloat(formData.oxygen_saturation) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null
        }
      };

      const result = await apiService.request('/provider-workflows/physician/encounter', {
        method: 'POST',
        body: JSON.stringify(encounterData)
      });

      if (result.success) {
        alert('Encounter created successfully!');
        if (onEncounterCreated) {
          onEncounterCreated(result.encounter);
        }
        // Reset form
        setSelectedPatient(null);
        setFormData({
          encounter_type: 'office_visit',
          encounter_date: new Date().toISOString().split('T')[0],
          encounter_time: new Date().toTimeString().slice(0, 5),
          chief_complaint: '',
          history_present_illness: '',
          assessment: '',
          plan: '',
          follow_up_required: false,
          follow_up_date: '',
          notes: '',
          systolic_bp: '',
          diastolic_bp: '',
          heart_rate: '',
          temperature: '',
          respiratory_rate: '',
          oxygen_saturation: '',
          weight: '',
          height: ''
        });
      }
    } catch (error) {
      console.error('Error creating encounter:', error);
      alert('Error creating encounter: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="New Encounter"
      description="Create a new clinical encounter"
      icon={Stethoscope}
      actions={
        onCancel && (
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <PatientSearch 
          onSelectPatient={setSelectedPatient}
          showCreateButton={false}
        />

        {selectedPatient && (
          <>
            {/* Encounter Details */}
            <Card>
              <CardHeader>
                <CardTitle>Encounter Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Encounter Type *</Label>
                    <select
                      value={formData.encounter_type}
                      onChange={(e) => setFormData({ ...formData, encounter_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="office_visit">Office Visit</option>
                      <option value="emergency">Emergency</option>
                      <option value="inpatient">Inpatient</option>
                      <option value="telemedicine">Telemedicine</option>
                      <option value="follow_up">Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.encounter_date}
                      onChange={(e) => setFormData({ ...formData, encounter_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.encounter_time}
                    onChange={(e) => setFormData({ ...formData, encounter_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Chief Complaint *</Label>
                  <Input
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                    placeholder="Patient's main concern"
                    required
                  />
                </div>
                <div>
                  <Label>History of Present Illness</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                    value={formData.history_present_illness}
                    onChange={(e) => setFormData({ ...formData, history_present_illness: e.target.value })}
                    placeholder="Detailed history of the current problem"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Vital Signs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      BP (Systolic)
                    </Label>
                    <Input
                      type="number"
                      value={formData.systolic_bp}
                      onChange={(e) => setFormData({ ...formData, systolic_bp: e.target.value })}
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      BP (Diastolic)
                    </Label>
                    <Input
                      type="number"
                      value={formData.diastolic_bp}
                      onChange={(e) => setFormData({ ...formData, diastolic_bp: e.target.value })}
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      Heart Rate
                    </Label>
                    <Input
                      type="number"
                      value={formData.heart_rate}
                      onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                      placeholder="72"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Thermometer className="w-4 h-4" />
                      Temperature (°F)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      placeholder="98.6"
                    />
                  </div>
                  <div>
                    <Label>Respiratory Rate</Label>
                    <Input
                      type="number"
                      value={formData.respiratory_rate}
                      onChange={(e) => setFormData({ ...formData, respiratory_rate: e.target.value })}
                      placeholder="16"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Droplet className="w-4 h-4" />
                      O2 Saturation (%)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.oxygen_saturation}
                      onChange={(e) => setFormData({ ...formData, oxygen_saturation: e.target.value })}
                      placeholder="98"
                    />
                  </div>
                  <div>
                    <Label>Weight (lbs)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <Label>Height (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="68"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assessment & Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment & Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Assessment/Diagnosis</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                    value={formData.assessment}
                    onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                    placeholder="Clinical assessment and diagnosis"
                  />
                </div>
                <div>
                  <Label>Treatment Plan</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    placeholder="Treatment plan, medications, follow-up instructions"
                  />
                </div>
                <div>
                  <Label>Additional Notes</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional clinical notes"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Follow-up */}
            <Card>
              <CardHeader>
                <CardTitle>Follow-up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="follow_up_required"
                    checked={formData.follow_up_required}
                    onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="follow_up_required">Follow-up Required</Label>
                </div>
                {formData.follow_up_required && (
                  <div>
                    <Label>Follow-up Date</Label>
                    <Input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-2 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Encounter'}
              </Button>
            </div>
          </>
        )}

        {!selectedPatient && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>Please select a patient to create an encounter</p>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </PageWrapper>
  );
};

export default NewEncounter;

