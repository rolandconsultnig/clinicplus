import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Download,
  CheckCircle2,
  AlertCircle,
  DollarSign
} from 'lucide-react';

const ERA = () => {
  const [eras, setEras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadERAs();
  }, [filterStatus]);

  const loadERAs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      
      const result = await apiService.request('/eras', { method: 'GET' }, params);
      if (result.success) {
        setEras(result.eras || []);
      }
    } catch (error) {
      console.error('Error loading ERAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (eraId) => {
    if (!window.confirm('Process this ERA? This will update claim statuses and create payments.')) {
      return;
    }
    
    try {
      const result = await apiService.request(`/eras/${eraId}/process`, { method: 'POST' });
      if (result.success) {
        await loadERAs();
        alert('ERA processed successfully');
      }
    } catch (error) {
      console.error('Error processing ERA:', error);
      alert('Error processing ERA: ' + (error.message || 'Unknown error'));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-teal-100 text-teal-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredERAs = eras;

  return (
    <PageWrapper
      title="ERA (Electronic Remittance Advice)"
      description="Automated payment posting and EOB processing"
      icon={FileText}
    >
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="received">Received</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="error">Error</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ERAs ({filteredERAs.length})</CardTitle>
          <CardDescription>Electronic remittance advice records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading ERAs...</p>
            </div>
          ) : filteredERAs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No ERAs found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredERAs.map((era) => (
                <div key={era.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{era.era_id}</h3>
                        <Badge className={getStatusColor(era.status)}>
                          {era.status}
                        </Badge>
                      </div>
                      {era.payer_name && (
                        <p className="text-sm text-gray-600 mb-2">Payer: {era.payer_name}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                        {era.check_number && (
                          <div>
                            <p className="font-semibold text-gray-700">Check Number</p>
                            <p>{era.check_number}</p>
                          </div>
                        )}
                        {era.check_amount && (
                          <div>
                            <p className="font-semibold text-gray-700">Check Amount</p>
                            <p className="text-green-600">${era.check_amount.toFixed(2)}</p>
                          </div>
                        )}
                        {era.total_claims && (
                          <div>
                            <p className="font-semibold text-gray-700">Total Claims</p>
                            <p>{era.total_claims}</p>
                          </div>
                        )}
                        {era.total_paid && (
                          <div>
                            <p className="font-semibold text-gray-700">Total Paid</p>
                            <p className="text-teal-700">${era.total_paid.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      {era.file_received_date && (
                        <p className="text-xs text-gray-500 mt-2">
                          Received: {new Date(era.file_received_date).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {era.status === 'received' && (
                        <Button variant="outline" size="sm" onClick={() => handleProcess(era.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Process
                        </Button>
                      )}
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

export default ERA;

