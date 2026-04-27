import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  Search,
  Filter,
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react';

const BillingTracker = () => {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTrackers();
  }, [filterStatus]);

  const loadTrackers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      
      const result = await apiService.request('/billing-trackers', { method: 'GET' }, params);
      if (result.success) {
        setTrackers(result.trackers || []);
      }
    } catch (error) {
      console.error('Error loading billing trackers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-teal-100 text-teal-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTrackers = trackers.filter(tracker => {
    if (searchTerm) {
      return tracker.tracker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             tracker.claim_id?.toString().includes(searchTerm);
    }
    return true;
  });

  return (
    <PageWrapper
      title="Billing Tracker"
      description="Track billing status and workflow"
      icon={TrendingUp}
    >
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by tracker ID or claim ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Trackers ({filteredTrackers.length})</CardTitle>
          <CardDescription>Claim tracking and status management</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading billing trackers...</p>
            </div>
          ) : filteredTrackers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No billing trackers found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrackers.map((tracker) => (
                <div key={tracker.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{tracker.tracker_id}</h3>
                        <Badge className={getStatusColor(tracker.current_status)}>
                          {tracker.current_status}
                        </Badge>
                        {tracker.appeal_required && (
                          <Badge variant="destructive">Appeal Required</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                        <div>
                          <p className="font-semibold text-gray-700">Claim ID</p>
                          <p>{tracker.claim_id}</p>
                        </div>
                        {tracker.expected_payment && (
                          <div>
                            <p className="font-semibold text-gray-700">Expected</p>
                            <p className="text-green-600">${tracker.expected_payment.toFixed(2)}</p>
                          </div>
                        )}
                        {tracker.actual_payment && (
                          <div>
                            <p className="font-semibold text-gray-700">Paid</p>
                            <p className="text-teal-700">${tracker.actual_payment.toFixed(2)}</p>
                          </div>
                        )}
                        {tracker.submitted_at && (
                          <div>
                            <p className="font-semibold text-gray-700">Submitted</p>
                            <p>{new Date(tracker.submitted_at).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      {tracker.denial_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Denial: {tracker.denial_reason}
                          </p>
                        </div>
                      )}
                      {tracker.followup_notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p><strong>Follow-up:</strong> {tracker.followup_notes}</p>
                        </div>
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

export default BillingTracker;

