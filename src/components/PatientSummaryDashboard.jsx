/**
 * Patient Summary Dashboard - Comprehensive OpenEMR-style patient overview
 * Displays all patient information in a unified dashboard
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  User, Calendar, FileText, Pill, AlertTriangle, 
  Activity, Heart, Stethoscope, ClipboardList, 
  TrendingUp, Clock, Edit, Camera, Download
} from 'lucide-react';

export default function PatientSummaryDashboard({ patientId, onEdit }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPatientSummary();
  }, [patientId]);

  const loadPatientSummary = async () => {
    if (!patientId) {
      setSummary(null);
      setError('Select a patient to load summary.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.request(`/patient-file/summary/${patientId}`, 'GET');
      if (result.success) {
        setSummary(result.summary);
      } else {
        setError(result.error || 'Failed to load patient summary');
      }
    } catch (err) {
      setError(err.message || 'Error loading patient summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!summary) {
    return <div className="p-4">No patient data available</div>;
  }

  const { patient, photo, medical_history, allergies, medications, recent_encounters, stats } = summary;

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {photo && (
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                  <img src={photo.photo_url} alt="Patient" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">
                  {patient.first_name} {patient.middle_name} {patient.last_name}
                  {patient.suffix && ` ${patient.suffix}`}
                </CardTitle>
                <CardDescription>
                  {patient.universal_patient_id} • {patient.gender} • 
                  {patient.date_of_birth && ` DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}`}
                  {stats.age && ` (Age: ${stats.age})`}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit && onEdit(patient.id)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Photo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Encounters</p>
                <p className="text-2xl font-bold">{stats.total_encounters || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Conditions</p>
                <p className="text-2xl font-bold">{stats.active_conditions || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Allergies</p>
                <p className="text-2xl font-bold">{stats.active_allergies || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Medications</p>
                <p className="text-2xl font-bold">{stats.active_medications || 0}</p>
              </div>
              <Pill className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="encounters">Encounters</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="allergies">Allergies</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Demographics */}
          <Card>
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{patient.phone_primary || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{patient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">
                    {patient.address_line1 && (
                      <>
                        {patient.address_line1}
                        {patient.address_line2 && `, ${patient.address_line2}`}
                        <br />
                        {patient.city}, {patient.state} {patient.zip_code}
                      </>
                    )}
                    {!patient.address_line1 && 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Emergency Contact</p>
                  <p className="font-medium">
                    {patient.emergency_contact_name || 'N/A'}
                    {patient.emergency_contact_phone && ` - ${patient.emergency_contact_phone}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Encounters */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Encounters</CardTitle>
            </CardHeader>
            <CardContent>
              {recent_encounters && recent_encounters.length > 0 ? (
                <div className="space-y-2">
                  {recent_encounters.map((encounter) => (
                    <div key={encounter.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{encounter.encounter_type || 'Encounter'}</p>
                        <p className="text-sm text-gray-600">
                          {encounter.encounter_date && new Date(encounter.encounter_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>{encounter.encounter_status || 'completed'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent encounters</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Patient History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">History view coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encounters">
          <Card>
            <CardHeader>
              <CardTitle>Encounters</CardTitle>
            </CardHeader>
            <CardContent>
              {recent_encounters && recent_encounters.length > 0 ? (
                <div className="space-y-2">
                  {recent_encounters.map((encounter) => (
                    <div key={encounter.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{encounter.encounter_type || 'Encounter'}</h4>
                        <Badge>{encounter.encounter_status || 'completed'}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {encounter.encounter_date && new Date(encounter.encounter_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No encounters found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications">
          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {medications && medications.length > 0 ? (
                <div className="space-y-2">
                  {medications.map((med) => (
                    <div key={med.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{med.medication_name}</p>
                          <p className="text-sm text-gray-600">
                            {med.dosage} • {med.frequency} • {med.route}
                          </p>
                        </div>
                        <Badge variant={med.status === 'active' ? 'default' : 'secondary'}>
                          {med.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No active medications</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allergies">
          <Card>
            <CardHeader>
              <CardTitle>Allergies</CardTitle>
            </CardHeader>
            <CardContent>
              {allergies && allergies.length > 0 ? (
                <div className="space-y-2">
                  {allergies.map((allergy) => (
                    <div key={allergy.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-800">{allergy.allergen}</p>
                          <p className="text-sm text-red-600">
                            {allergy.reaction} • Severity: {allergy.severity}
                          </p>
                        </div>
                        <Badge variant="destructive">{allergy.severity}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No known allergies</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions">
          <Card>
            <CardHeader>
              <CardTitle>Medical Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              {medical_history && medical_history.length > 0 ? (
                <div className="space-y-2">
                  {medical_history.map((condition) => (
                    <div key={condition.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{condition.condition || condition.condition_name}</p>
                          <p className="text-sm text-gray-600">
                            {condition.condition_code && `Code: ${condition.condition_code} • `}
                            Status: {condition.status}
                            {condition.diagnosis_date && ` • Diagnosed: ${new Date(condition.diagnosis_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant={condition.status === 'active' ? 'default' : 'secondary'}>
                          {condition.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No medical conditions recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

