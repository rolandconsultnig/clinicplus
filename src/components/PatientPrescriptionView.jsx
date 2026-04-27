import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton, SkeletonCard } from './ui/skeleton';
import { useToast } from './ui/toast';
import { Pill, Calendar, User, AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';

export default function PatientPrescriptionView({ patientId }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed, cancelled
  const { error: showError } = useToast();

  useEffect(() => {
    if (patientId) {
      loadPrescriptions();
    }
  }, [patientId]);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const result = await apiService.request(`/prescribing/prescriptions?patient_id=${patientId}`);
      if (result.success) {
        setPrescriptions(result.prescriptions || []);
      } else {
        showError('Failed to load prescriptions');
      }
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
      showError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPrescriptions = () => {
    if (filter === 'all') return prescriptions;
    return prescriptions.filter(p => p.status === filter);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
      filled: { variant: 'secondary', className: 'bg-teal-100 text-teal-800 border-teal-200' },
      completed: { variant: 'outline', className: 'bg-gray-100 text-gray-800 border-gray-200' },
      cancelled: { variant: 'outline', className: 'bg-red-100 text-red-800 border-red-200' }
    };
    
    const config = variants[status] || variants.completed;
    return (
      <Badge className={config.className}>
        {status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'cancelled' && <AlertCircle className="w-3 h-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const filteredPrescriptions = getFilteredPrescriptions();
  const activeCount = prescriptions.filter(p => p.status === 'active').length;
  const totalCount = prescriptions.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-teal-700" />
            My Prescriptions
          </h2>
          <p className="text-gray-600 mt-1">
            View all prescriptions assigned by your healthcare providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {activeCount} Active
          </Badge>
          <Badge variant="outline" className="text-sm">
            {totalCount} Total
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed ({prescriptions.filter(p => p.status === 'completed').length})
        </button>
      </div>

      {/* Info Banner */}
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-teal-900">
              <p className="font-medium mb-1">Prescription Information</p>
              <p>
                Prescriptions can only be assigned by your healthcare providers. 
                If you have questions about your medications, please contact your provider.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      {filteredPrescriptions.length === 0 ? (
        <Card className="enhanced-card">
          <CardContent className="p-12 text-center">
            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prescriptions Found</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? "You don't have any prescriptions yet."
                : `No ${filter} prescriptions found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrescriptions.map((prescription) => (
            <Card
              key={prescription.id}
              className="enhanced-card hover:shadow-lg transition-all duration-300 border-l-4 border-l-teal-500"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Pill className="w-6 h-6 text-teal-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {prescription.drug_name || 'Unknown Medication'}
                        </h3>
                        {getStatusBadge(prescription.status)}
                      </div>
                      
                      {prescription.generic_name && prescription.generic_name !== prescription.drug_name && (
                        <p className="text-sm text-gray-600 mb-2">
                          Generic: {prescription.generic_name}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Dosage:</span>
                          <span className="font-medium text-gray-900">
                            {prescription.dosage || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Frequency:</span>
                          <span className="font-medium text-gray-900">
                            {prescription.frequency || 'N/A'}
                          </span>
                        </div>
                        {prescription.quantity && (
                          <div className="flex items-center gap-2 text-sm">
                            <Pill className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Quantity:</span>
                            <span className="font-medium text-gray-900">
                              {prescription.quantity}
                            </span>
                          </div>
                        )}
                        {prescription.refills_remaining !== undefined && (
                          <div className="flex items-center gap-2 text-sm">
                            <Info className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Refills:</span>
                            <span className="font-medium text-gray-900">
                              {prescription.refills_remaining} of {prescription.refills || 0} remaining
                            </span>
                          </div>
                        )}
                      </div>

                      {prescription.sig && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">Instructions:</p>
                          <p className="text-sm text-gray-900">{prescription.sig}</p>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {prescription.provider_name && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Prescribed by:</span>
                            <span className="font-medium text-gray-900">
                              {prescription.provider_name}
                            </span>
                          </div>
                        )}
                        {prescription.prescribed_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Prescribed:</span>
                            <span className="font-medium text-gray-900">
                              {formatDate(prescription.prescribed_date)}
                            </span>
                          </div>
                        )}
                        {prescription.start_date && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Start Date:</span>
                            <span className="font-medium text-gray-900">
                              {formatDate(prescription.start_date)}
                            </span>
                          </div>
                        )}
                        {prescription.end_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">End Date:</span>
                            <span className="font-medium text-gray-900">
                              {formatDate(prescription.end_date)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

















