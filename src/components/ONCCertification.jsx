import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle2, XCircle, AlertCircle, Shield, Award, FileText, Activity } from 'lucide-react';

const ONCCertification = () => {
  const [certificationStatus, setCertificationStatus] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [complianceReport, setComplianceReport] = useState(null);
  const [selectedCriteria, setSelectedCriteria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load certification status
      const statusResult = await apiService.request('/api/onc/certification/status', { method: 'GET' });
      if (statusResult.success) {
        setCertificationStatus(statusResult.status);
      }

      // Load all criteria
      const criteriaResult = await apiService.request('/api/onc/criteria', { method: 'GET' });
      if (criteriaResult.success) {
        setCriteria(criteriaResult.criteria);
      }

      // Load compliance report
      const reportResult = await apiService.request('/api/onc/compliance/report', { method: 'GET' });
      if (reportResult.success) {
        setComplianceReport(reportResult);
      }
    } catch (error) {
      console.error('Error loading ONC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCriteria = async (criteriaId) => {
    try {
      setVerifying(true);
      const result = await apiService.request(`/api/onc/criteria/${criteriaId}/verify`, {
        method: 'POST'
      });
      
      if (result.success) {
        setSelectedCriteria(result);
        loadData(); // Reload to update status
      }
    } catch (error) {
      console.error('Error verifying criteria:', error);
      alert('Failed to verify criteria: ' + (error.message || 'Unknown error'));
    } finally {
      setVerifying(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'patient_engagement': 'bg-teal-100 text-teal-800',
      'care_coordination': 'bg-green-100 text-green-800',
      'clinical_decision_support': 'bg-teal-100 text-teal-900',
      'public_health': 'bg-orange-100 text-orange-800',
      'security': 'bg-red-100 text-red-800',
      'api_access': 'bg-teal-100 text-teal-900'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-6">Loading ONC certification data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ONC Health IT Certification</h1>
          <p className="text-gray-600 mt-1">2015 Edition Criteria Compliance</p>
        </div>
        <Badge variant={certificationStatus?.certified ? 'default' : 'secondary'} className="text-lg px-4 py-2">
          {certificationStatus?.certified ? (
            <>
              <Award className="w-4 h-4 mr-2" />
              Certified
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mr-2" />
              Not Certified
            </>
          )}
        </Badge>
      </div>

      {/* Certification Status Overview */}
      {certificationStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Certification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Certification Date</p>
                <p className="text-lg font-semibold">
                  {certificationStatus.certification_date 
                    ? new Date(certificationStatus.certification_date).toLocaleDateString()
                    : 'Not Certified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Criteria</p>
                <p className="text-lg font-semibold">{certificationStatus.total_criteria || criteria.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Met Criteria</p>
                <p className="text-lg font-semibold">{certificationStatus.met_criteria || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Compliance Rate</p>
                <p className="text-lg font-semibold">
                  {certificationStatus.compliance_rate || complianceReport?.overall_compliance_rate || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Report */}
      {complianceReport && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(complianceReport.category_compliance || {}).map(([category, stats]) => (
                <div key={category} className="border rounded-lg p-4">
                  <p className="font-semibold mb-2">{category.replace(/_/g, ' ').toUpperCase()}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Met:</span>
                      <span className="font-semibold">{stats.met}/{stats.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-teal-600 h-2 rounded-full"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">{stats.percentage}% compliant</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Criteria List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Criteria</TabsTrigger>
          <TabsTrigger value="patient_engagement">Patient Engagement</TabsTrigger>
          <TabsTrigger value="care_coordination">Care Coordination</TabsTrigger>
          <TabsTrigger value="clinical_decision_support">CDS</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All ONC Criteria</CardTitle>
              <CardDescription>2015 Edition Criteria ({criteria.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {criteria.map((criterion) => {
                  const isMet = complianceReport?.criteria_status?.find(
                    cs => cs.criteria_id === criterion.criteria_id
                  )?.is_met || false;
                  
                  return (
                    <div
                      key={criterion.criteria_id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => verifyCriteria(criterion.criteria_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getCategoryColor(criterion.category)}>
                              {criterion.category.replace(/_/g, ' ')}
                            </Badge>
                            <span className="font-mono text-sm text-gray-600">{criterion.criteria_id}</span>
                            {isMet ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <h3 className="font-semibold mb-1">{criterion.name}</h3>
                          <p className="text-sm text-gray-600">{criterion.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            verifyCriteria(criterion.criteria_id);
                          }}
                          disabled={verifying}
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {['patient_engagement', 'care_coordination', 'clinical_decision_support', 'security'].map((category) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle>{category.replace(/_/g, ' ').toUpperCase()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criteria
                    .filter(c => c.category === category)
                    .map((criterion) => {
                      const isMet = complianceReport?.criteria_status?.find(
                        cs => cs.criteria_id === criterion.criteria_id
                      )?.is_met || false;
                      
                      return (
                        <div
                          key={criterion.criteria_id}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm text-gray-600">{criterion.criteria_id}</span>
                                {isMet ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                              </div>
                              <h3 className="font-semibold mb-1">{criterion.name}</h3>
                              <p className="text-sm text-gray-600">{criterion.description}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => verifyCriteria(criterion.criteria_id)}
                              disabled={verifying}
                            >
                              Verify
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Criteria Details Modal */}
      {selectedCriteria && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Verification Result: {selectedCriteria.criteria_id}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-semibold mb-2">Status:</p>
                <Badge variant={selectedCriteria.is_met ? 'default' : 'destructive'}>
                  {selectedCriteria.is_met ? 'Met' : 'Not Met'}
                </Badge>
              </div>
              {selectedCriteria.evidence && (
                <div>
                  <p className="font-semibold mb-2">Evidence:</p>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(selectedCriteria.evidence, null, 2)}
                  </pre>
                </div>
              )}
              <Button onClick={() => setSelectedCriteria(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ONCCertification;

