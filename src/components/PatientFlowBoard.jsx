/**
 * Patient Flow Board - OpenEMR-style patient tracking
 * Real-time patient flow management with status updates
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Users, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowRight, Calendar, MapPin
} from 'lucide-react';

export default function PatientFlowBoard({ facilityId, providerId }) {
  const [boardData, setBoardData] = useState({
    waiting: [],
    called: [],
    in_progress: [],
    completed: [],
    cancelled: [],
    no_show: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadFlowBoard();
    // Refresh every 30 seconds
    const interval = setInterval(loadFlowBoard, 30000);
    return () => clearInterval(interval);
  }, [facilityId, providerId, dateRange]);

  const loadFlowBoard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        facility_id: facilityId || '',
        provider_id: providerId || '',
        from_date: dateRange.from_date,
        to_date: dateRange.to_date
      });
      
      const result = await apiService.request(`/api/flow-board/board?${params}`, 'GET');
      if (result.success) {
        setBoardData(result.board_data);
      }
    } catch (err) {
      console.error('Error loading flow board:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (item, newStatus) => {
    try {
      const result = await apiService.request('/api/flow-board/update-status', 'PUT', {
        type: item.type,
        id: item.id,
        status: newStatus
      });
      
      if (result.success) {
        loadFlowBoard();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const StatusColumn = ({ title, items, status, color }) => (
    <div className="flex-1 min-w-[250px]">
      <Card className={`border-2 border-${color}-200`}>
        <CardHeader className={`bg-${color}-50`}>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {title}
            <Badge variant="secondary">{items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
          {items.map((item) => (
            <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {item.patient?.first_name} {item.patient?.last_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {item.patient?.universal_patient_id}
                  </p>
                  {item.appointment_time && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {item.appointment_time}
                    </p>
                  )}
                </div>
                <Badge variant={item.priority === 'urgent' ? 'destructive' : 'default'}>
                  {item.priority}
                </Badge>
              </div>
              
              {item.reason_for_visit && (
                <p className="text-xs text-gray-600 mb-2">{item.reason_for_visit}</p>
              )}
              
              <div className="flex gap-1 mt-2">
                {status === 'waiting' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(item, 'called')}
                    className="text-xs"
                  >
                    Call
                  </Button>
                )}
                {status === 'called' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(item, 'in_progress')}
                    className="text-xs"
                  >
                    Start
                  </Button>
                )}
                {status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(item, 'completed')}
                    className="text-xs"
                  >
                    Complete
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {items.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No patients</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (loading && Object.values(boardData).every(arr => arr.length === 0)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flow board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">From Date</label>
              <input
                type="date"
                value={dateRange.from_date}
                onChange={(e) => setDateRange({ ...dateRange, from_date: e.target.value })}
                className="ml-2 px-3 py-1 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <input
                type="date"
                value={dateRange.to_date}
                onChange={(e) => setDateRange({ ...dateRange, to_date: e.target.value })}
                className="ml-2 px-3 py-1 border rounded"
              />
            </div>
            <Button onClick={loadFlowBoard} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Flow Board Columns */}
      <div className="flex gap-4 overflow-x-auto">
        <StatusColumn
          title="Waiting"
          items={boardData.waiting || []}
          status="waiting"
          color="yellow"
        />
        <StatusColumn
          title="Called"
          items={boardData.called || []}
          status="called"
          color="blue"
        />
        <StatusColumn
          title="In Progress"
          items={boardData.in_progress || []}
          status="in_progress"
          color="green"
        />
        <StatusColumn
          title="Completed"
          items={boardData.completed || []}
          status="completed"
          color="gray"
        />
        <StatusColumn
          title="Cancelled"
          items={boardData.cancelled || []}
          status="cancelled"
          color="red"
        />
        <StatusColumn
          title="No Show"
          items={boardData.no_show || []}
          status="no_show"
          color="orange"
        />
      </div>
    </div>
  );
}

