import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, BarChart } from './charts';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Eye,
  User,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Edit
} from 'lucide-react';

const SecurityAudit = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [activeTab, setActiveTab] = useState('logs');

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [filterAction, dateRange]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let url = '/api/audit-logs?page=1&per_page=100';
      if (filterAction !== 'all') {
        url += `&action_type=${filterAction}`;
      }
      const result = await apiService.request(url, { method: 'GET' });
      if (result.success) {
        setLogs(result.logs || []);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const url = `/api/audit-logs/stats?days=${parseInt(dateRange)}`;
      const result = await apiService.request(url, { method: 'GET' });
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.ip_address?.includes(searchTerm)
  );

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'login':
        return <Unlock className="w-4 h-4 text-green-600" />;
      case 'logout':
        return <Lock className="w-4 h-4 text-gray-600" />;
      case 'create':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case 'update':
        return <Edit className="w-4 h-4 text-yellow-600" />;
      case 'delete':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'view':
        return <Eye className="w-4 h-4 text-indigo-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'create':
        return 'bg-blue-100 text-blue-800';
      case 'update':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'view':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Prepare chart data
  const chartData = stats ? {
    actionTypes: Object.entries(stats.action_types || {}).map(([name, value]) => ({
      name,
      value
    })),
    resourceTypes: Object.entries(stats.resource_types || {}).map(([name, value]) => ({
      name,
      value
    }))
  } : null;

  return (
    <PageWrapper
      title="Security & Audit"
      description="Monitor security events and audit logs for compliance"
      icon={Shield}
      actions={
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search logs by user, action, resource, or IP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Actions</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="view">View</option>
                  </select>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Logs</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_logs}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Unique Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.unique_users}</p>
                    </div>
                    <User className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Action Types</p>
                      <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.action_types || {}).length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Resource Types</p>
                      <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.resource_types || {}).length}</p>
                    </div>
                    <Shield className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Logs List */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs ({filteredLogs.length})</CardTitle>
              <CardDescription>Security and access audit trail</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading logs...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No logs found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getActionIcon(log.action_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getActionColor(log.action_type)}>
                                {log.action_type}
                              </Badge>
                              {log.resource_type && (
                                <Badge variant="outline">{log.resource_type}</Badge>
                              )}
                              {log.username && (
                                <span className="text-sm text-gray-600">by {log.username}</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {log.timestamp && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(log.timestamp).toLocaleString()}
                                </div>
                              )}
                              {log.ip_address && (
                                <div className="text-xs text-gray-500">IP: {log.ip_address}</div>
                              )}
                              {log.details && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          {stats && chartData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Actions by Type</CardTitle>
                    <CardDescription>Distribution of audit actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={chartData.actionTypes}
                      xKey="name"
                      yKey="value"
                      height={300}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Resources by Type</CardTitle>
                    <CardDescription>Distribution of accessed resources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={chartData.resourceTypes}
                      xKey="name"
                      yKey="value"
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
};

export default SecurityAudit;

