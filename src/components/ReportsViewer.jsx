/**
 * Reports Viewer - Comprehensive reports interface
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileText, Download, Calendar, Users, DollarSign, TestTube } from 'lucide-react';

export default function ReportsViewer() {
  const [reportType, setReportType] = useState('clinical');
  const [dateRange, setDateRange] = useState({
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (type) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date
      });

      let endpoint = '';
      switch (type) {
        case 'clinical':
          endpoint = `/api/reports/clinical?${params}`;
          break;
        case 'patient-list':
          endpoint = `/api/reports/patient-list?${params}`;
          break;
        case 'prescriptions':
          endpoint = `/api/reports/prescriptions?${params}`;
          break;
        case 'appointments':
          endpoint = `/api/reports/appointments?${params}`;
          break;
        case 'encounters':
          endpoint = `/api/reports/encounters?${params}`;
          break;
        case 'collections':
          endpoint = `/api/reports/collections?${params}`;
          break;
        default:
          return;
      }

      const result = await apiService.request(endpoint, 'GET');
      if (result.success) {
        setReportData(result);
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(reportType);
  }, [reportType, dateRange]);

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.from_date}
                onChange={(e) => setDateRange({ ...dateRange, from_date: e.target.value })}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.to_date}
                onChange={(e) => setDateRange({ ...dateRange, to_date: e.target.value })}
              />
            </div>
            <Button onClick={() => loadReport(reportType)} className="mt-6">
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>

          <Tabs value={reportType} onValueChange={setReportType}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="clinical">Clinical</TabsTrigger>
              <TabsTrigger value="patient-list">Patients</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="encounters">Encounters</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
            </TabsList>

            <TabsContent value="clinical" className="mt-4">
              {loading ? (
                <p>Loading...</p>
              ) : reportData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Encounters</p>
                        <p className="text-2xl font-bold">{reportData.reports?.encounters || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Lab Orders</p>
                        <p className="text-2xl font-bold">{reportData.reports?.lab_orders || 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Prescriptions</p>
                        <p className="text-2xl font-bold">{reportData.reports?.prescriptions || 0}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </TabsContent>

            <TabsContent value="patient-list" className="mt-4">
              {loading ? (
                <p>Loading...</p>
              ) : reportData?.patients ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Total Patients: {reportData.count || 0}</p>
                  {reportData.patients.slice(0, 20).map((patient) => (
                    <Card key={patient.id} className="p-3">
                      <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                      <p className="text-sm text-gray-600">{patient.universal_patient_id}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-4">
              {loading ? (
                <p>Loading...</p>
              ) : reportData?.prescriptions ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Total Prescriptions: {reportData.count || 0}</p>
                  {reportData.prescriptions.slice(0, 20).map((prescription) => (
                    <Card key={prescription.id} className="p-3">
                      <p className="font-medium">{prescription.drug_name || prescription.medication_name}</p>
                      <p className="text-sm text-gray-600">
                        {prescription.dosage} • {prescription.frequency}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </TabsContent>

            <TabsContent value="appointments" className="mt-4">
              {loading ? (
                <p>Loading...</p>
              ) : reportData?.appointments ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Total Appointments: {reportData.count || 0}</p>
                  {reportData.appointments.slice(0, 20).map((apt) => (
                    <Card key={apt.id} className="p-3">
                      <p className="font-medium">{apt.appointment_type}</p>
                      <p className="text-sm text-gray-600">
                        {apt.appointment_date && new Date(apt.appointment_date).toLocaleDateString()} at {apt.appointment_time}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </TabsContent>

            <TabsContent value="encounters" className="mt-4">
              {loading ? (
                <p>Loading...</p>
              ) : reportData?.encounters ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Total Encounters: {reportData.count || 0}</p>
                  {reportData.encounters.slice(0, 20).map((enc) => (
                    <Card key={enc.id} className="p-3">
                      <p className="font-medium">{enc.encounter_type}</p>
                      <p className="text-sm text-gray-600">
                        {enc.encounter_date && new Date(enc.encounter_date).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </TabsContent>

            <TabsContent value="collections" className="mt-4">
              {loading ? (
                <p>Loading...</p>
              ) : reportData?.aging ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Current</p>
                        <p className="text-xl font-bold">${reportData.aging.current?.toFixed(2) || '0.00'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">30 Days</p>
                        <p className="text-xl font-bold">${reportData.aging['30_days']?.toFixed(2) || '0.00'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">60 Days</p>
                        <p className="text-xl font-bold">${reportData.aging['60_days']?.toFixed(2) || '0.00'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">90 Days</p>
                        <p className="text-xl font-bold">${reportData.aging['90_days']?.toFixed(2) || '0.00'}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Over 90</p>
                        <p className="text-xl font-bold">${reportData.aging.over_90_days?.toFixed(2) || '0.00'}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Total Outstanding</p>
                      <p className="text-2xl font-bold">${reportData.total_outstanding?.toFixed(2) || '0.00'}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

