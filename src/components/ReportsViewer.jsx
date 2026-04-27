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
import { Download, Book } from 'lucide-react';

export default function ReportsViewer() {
  const [reportType, setReportType] = useState('clinical');
  const [dateRange, setDateRange] = useState({
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ledgerPatientId, setLedgerPatientId] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState(null);

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

  const loadPatientLedger = async () => {
    const id = parseInt(ledgerPatientId, 10);
    if (!id || id < 1) {
      setLedgerError('Enter a valid patient ID');
      return;
    }
    setLedgerError(null);
    setLedgerLoading(true);
    try {
      const result = await apiService.request(`/api/reports/patient-ledger/${id}`, 'GET');
      if (result.success) {
        setLedgerData(result);
      } else {
        setLedgerData(null);
        setLedgerError(result.error || 'Could not load ledger');
      }
    } catch (err) {
      setLedgerData(null);
      setLedgerError(err.message || 'Could not load ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const downloadPatientLedgerCsv = async () => {
    const id = parseInt(ledgerPatientId, 10);
    if (!id || id < 1) {
      setLedgerError('Enter a valid patient ID');
      return;
    }
    setLedgerError(null);
    const token = localStorage.getItem('auth_token');
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    const url = `${base.replace(/\/$/, '')}/reports/patient-ledger/${id}/export.csv`;
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `patient-${id}-ledger.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setLedgerError(e.message || 'Download failed');
    }
  };

  useEffect(() => {
    if (reportType === 'patient-ledger') return;
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
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1">
              <TabsTrigger value="clinical">Clinical</TabsTrigger>
              <TabsTrigger value="patient-list">Patients</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="encounters">Encounters</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="patient-ledger" className="gap-1">
                <Book className="h-3.5 w-3.5" />
                Ledger
              </TabsTrigger>
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

            <TabsContent value="patient-ledger" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label>Patient ID</Label>
                  <Input
                    type="number"
                    min={1}
                    className="w-40 mt-1"
                    value={ledgerPatientId}
                    onChange={(e) => setLedgerPatientId(e.target.value)}
                    placeholder="e.g. 1"
                  />
                </div>
                <Button onClick={loadPatientLedger} disabled={ledgerLoading}>
                  {ledgerLoading ? 'Loading…' : 'Load ledger'}
                </Button>
                <Button variant="outline" onClick={downloadPatientLedgerCsv}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              {ledgerError && <p className="text-sm text-red-600">{ledgerError}</p>}
              {ledgerData?.success && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {ledgerData.patient?.first_name} {ledgerData.patient?.last_name} — balance:{' '}
                    <span className="font-semibold">${Number(ledgerData.current_balance || 0).toFixed(2)}</span>
                  </p>
                  <div className="border rounded-md overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left">
                          <th className="p-2">Date</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Description</th>
                          <th className="p-2">Debit</th>
                          <th className="p-2">Credit</th>
                          <th className="p-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ledgerData.ledger || []).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 whitespace-nowrap">{row.date || '—'}</td>
                            <td className="p-2">{row.type}</td>
                            <td className="p-2 max-w-md truncate" title={row.description}>{row.description}</td>
                            <td className="p-2">{Number(row.debit || 0).toFixed(2)}</td>
                            <td className="p-2">{Number(row.credit || 0).toFixed(2)}</td>
                            <td className="p-2 font-medium">{Number(row.balance || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

