/**
 * ePrescribing - Electronic prescribing interface
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Pill, AlertTriangle, CheckCircle } from 'lucide-react';

export default function EPrescribing({ patientId }) {
  const [drugName, setDrugName] = useState('');
  const [interactions, setInteractions] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [checking, setChecking] = useState(false);
  const [prescription, setPrescription] = useState(null);

  const checkInteractions = async () => {
    if (!drugName || !patientId) return;
    
    try {
      setChecking(true);
      const result = await apiService.request('/api/eprescribing/check-interactions', 'POST', {
        patient_id: patientId,
        drug_name: drugName
      });
      
      if (result.success) {
        setInteractions(result.interactions || []);
        setWarnings(result.warnings || []);
      }
    } catch (err) {
      console.error('Error checking interactions:', err);
    } finally {
      setChecking(false);
    }
  };

  const createPrescription = async () => {
    if (!drugName || !patientId) return;
    
    try {
      const result = await apiService.request('/api/eprescribing/prescribe', 'POST', {
        patient_id: patientId,
        drug_name: drugName,
        dosage: document.getElementById('dosage')?.value || '',
        frequency: document.getElementById('frequency')?.value || '',
        route: document.getElementById('route')?.value || 'oral',
        quantity: parseInt(document.getElementById('quantity')?.value || '30'),
        refills_allowed: parseInt(document.getElementById('refills')?.value || '0'),
        instructions: document.getElementById('instructions')?.value || ''
      });
      
      if (result.success) {
        setPrescription(result.prescription);
        if (result.interactions?.length > 0 || result.warnings?.length > 0) {
          setInteractions(result.interactions || []);
          setWarnings(result.warnings || []);
        }
      }
    } catch (err) {
      console.error('Error creating prescription:', err);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>ePrescribing</CardTitle>
        </CardHeader>
        <CardContent>
          {!patientId && (
            <Alert>
              <AlertDescription>Please select a patient first</AlertDescription>
            </Alert>
          )}

          {patientId && (
            <div className="space-y-4">
              <div>
                <Label>Drug Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="Enter drug name"
                    onBlur={checkInteractions}
                  />
                  <Button onClick={checkInteractions} disabled={checking}>
                    Check Interactions
                  </Button>
                </div>
              </div>

              {warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {warnings.map((w, i) => (
                        <li key={i}>{w.description}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {interactions.length > 0 && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Drug Interactions:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {interactions.map((i, idx) => (
                        <li key={idx}>
                          {i.interacting_drug}: {i.description} (Severity: {i.severity})
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dosage</Label>
                  <Input id="dosage" placeholder="e.g., 10mg" />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Input id="frequency" placeholder="e.g., Twice daily" />
                </div>
                <div>
                  <Label>Route</Label>
                  <select id="route" className="w-full px-3 py-2 border rounded">
                    <option>oral</option>
                    <option>injection</option>
                    <option>topical</option>
                    <option>inhalation</option>
                  </select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input id="quantity" type="number" defaultValue="30" />
                </div>
                <div>
                  <Label>Refills Allowed</Label>
                  <Input id="refills" type="number" defaultValue="0" />
                </div>
                <div>
                  <Label>Instructions</Label>
                  <Input id="instructions" placeholder="Take with food" />
                </div>
              </div>

              <Button onClick={createPrescription} className="w-full">
                <Pill className="w-4 h-4 mr-2" />
                Create Prescription
              </Button>

              {prescription && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    Prescription created successfully! Prescription ID: {prescription.prescription_id}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

