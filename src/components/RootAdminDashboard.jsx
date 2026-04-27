import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, BarChart, PieChart, AreaChart, ComposedChart } from './charts';
import CalendarWidget from './CalendarWidget';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Activity,
  DollarSign,
  FileText,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Shield,
  BarChart3
} from 'lucide-react';

const RootAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    organizationGrowth: [],
    subscriptionDistribution: [],
    approvalTrends: []
  });

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      let endpoint = '/admin/root/overview';
      
      if (activeTab === 'organizations') {
        endpoint = '/admin/root/organizations';
      } else if (activeTab === 'statistics') {
        endpoint = '/admin/root/statistics';
      }
      
      const response = await apiService.request(endpoint, { method: 'GET' });
      setDashboardData(response);
      
      // Generate chart data
      generateChartData(response);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p className="font-semibold">Error loading dashboard</p>
            </div>
            <p className="text-red-500 mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = dashboardData?.dashboard?.summary || {};
  const approvalBreakdown = dashboardData?.dashboard?.approval_breakdown || {};
  const orgTypes = dashboardData?.dashboard?.organization_types || {};
  const subscriptionTiers = dashboardData?.dashboard?.subscription_tiers || {};
  const recentOrgs = dashboardData?.dashboard?.recent_organizations || [];
  const recentApprovals = dashboardData?.dashboard?.recent_approvals || [];
  const statistics = dashboardData?.statistics || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Professional Header */}
        <div className="relative bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 rounded-2xl shadow-2xl p-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-1">Clinic+ Root Admin</h1>
                <p className="text-white/90 text-lg font-medium">Platform-wide administration and monitoring</p>
                <p className="text-white/70 text-sm mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm font-medium">
              <Activity className="w-4 h-4 mr-2" />
              System Active
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Professional Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
                  <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Organizations</CardTitle>
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-4xl font-bold text-gray-900 mb-2">{summary.total_organizations || 0}</div>
                  <p className="text-xs text-gray-500">All registered organizations</p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
                  <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Organizations</CardTitle>
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-4xl font-bold text-emerald-600 mb-2">{summary.active_organizations || 0}</div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {((summary.active_organizations / (summary.total_organizations || 1)) * 100).toFixed(1)}% of total
                  </p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{ width: `${((summary.active_organizations / (summary.total_organizations || 1)) * 100)}%` }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
                  <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</CardTitle>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-4xl font-bold text-amber-600 mb-2">{summary.pending_approvals || 0}</div>
                  <p className="text-xs text-gray-500">Awaiting review</p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-rose-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
                  <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rejected</CardTitle>
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-4xl font-bold text-rose-600 mb-2">{summary.rejected_organizations || 0}</div>
                  <p className="text-xs text-gray-500">Not approved</p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Approval Breakdown */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Approval Workflow Status
                </CardTitle>
                <CardDescription>Current status of multi-level approval process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-teal-50 to-slate-100 p-6 rounded-lg border border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-teal-800">Level 1 Pending</span>
                      <Badge className="bg-teal-600">{approvalBreakdown.level_1_pending || 0}</Badge>
                    </div>
                    <div className="text-3xl font-bold text-teal-900">{approvalBreakdown.level_1_pending || 0}</div>
                    <p className="text-xs text-teal-700 mt-1">Initial review</p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-slate-100 p-6 rounded-lg border border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-teal-800">Level 2 Pending</span>
                      <Badge className="bg-teal-600">{approvalBreakdown.level_2_pending || 0}</Badge>
                    </div>
                    <div className="text-3xl font-bold text-teal-900">{approvalBreakdown.level_2_pending || 0}</div>
                    <p className="text-xs text-teal-700 mt-1">Secondary review</p>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-lg border border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-teal-800">Level 3 Pending</span>
                      <Badge className="bg-teal-600">{approvalBreakdown.level_3_pending || 0}</Badge>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{approvalBreakdown.level_3_pending || 0}</div>
                    <p className="text-xs text-teal-700 mt-1">Final review</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Types & Subscription Tiers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Organization Types
                  </CardTitle>
                  <CardDescription>Distribution by organization type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(orgTypes).length > 0 ? (
                      Object.entries(orgTypes).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium capitalize text-gray-700">{type.replace('_', ' ')}</span>
                          <Badge variant="secondary" className="text-lg px-3 py-1">{count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No organization types yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Subscription Tiers
                  </CardTitle>
                  <CardDescription>Active organizations by subscription plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(subscriptionTiers).length > 0 ? (
                      Object.entries(subscriptionTiers).map(([tier, count]) => (
                        <div key={tier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium capitalize text-gray-700">{tier || 'No Tier'}</span>
                          <Badge variant="secondary" className="text-lg px-3 py-1">{count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No subscription data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Organizations */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Organizations
                </CardTitle>
                <CardDescription>Latest organization registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Organization</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Type</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrgs.length > 0 ? (
                        recentOrgs.map((org) => (
                          <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="font-medium text-gray-900">{org.organization_name}</div>
                              <div className="text-xs text-gray-500">{org.organization_id}</div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {org.organization_type?.replace('_', ' ') || 'N/A'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge 
                                className={
                                  org.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  org.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {org.status?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(org.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-500">
                            No organizations yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Approvals */}
            {recentApprovals.length > 0 && (
              <Card className="shadow-md border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    Recent Approvals
                  </CardTitle>
                  <CardDescription>Recently approved organizations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentApprovals.slice(0, 5).map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                        <div>
                          <div className="font-medium text-gray-900">{org.organization_name}</div>
                          <div className="text-xs text-gray-500">
                            Approved {new Date(org.approved_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Organization Growth Chart */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-700" />
                    Organization Growth
                  </CardTitle>
                  <CardDescription>Monthly organization registration trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <AreaChart
                    data={chartData.organizationGrowth}
                    dataKey="organizations"
                    name="Total Organizations"
                    color="#3b82f6"
                    height={300}
                  />
                </CardContent>
              </Card>

              {/* Subscription Distribution */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-700" />
                    Subscription Tiers
                  </CardTitle>
                  <CardDescription>Distribution of subscription plans</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChart
                    data={chartData.subscriptionDistribution}
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Approval Trends */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Approval Trends
                </CardTitle>
                <CardDescription>Organization approval statistics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ComposedChart
                  data={chartData.approvalTrends}
                  barDataKey="approved"
                  lineDataKey="pending"
                  areaDataKey="rejected"
                  barName="Approved"
                  lineName="Pending"
                  areaName="Rejected"
                  barColor="#10b981"
                  lineColor="#f59e0b"
                  areaColor="#ef4444"
                  height={300}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  All Organizations
                </CardTitle>
                <CardDescription>Complete list of registered organizations</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.organizations?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">ID</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Name</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Type</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Approval Level</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.organizations.map((org) => (
                          <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="p-3 text-sm font-mono text-gray-600">{org.organization_id}</td>
                            <td className="p-3 font-medium text-gray-900">{org.organization_name}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {org.organization_type?.replace('_', ' ') || 'N/A'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge 
                                className={
                                  org.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  org.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {org.status?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">{org.approval_level || 'N/A'}</Badge>
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(org.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No organizations found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-teal-500 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Organizations Created This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-700">{statistics.organizations_created_this_month || 0}</div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    New registrations
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Organizations Approved This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{statistics.organizations_approved_this_month || 0}</div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Successfully approved
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-700">{statistics.total_users || 0}</div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Across all organizations
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-700">{statistics.total_facilities || 0}</div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Healthcare facilities
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Active Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">{statistics.active_organizations || 0}</div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Currently active
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">{statistics.pending_approvals || 0}</div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Awaiting review
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RootAdminDashboard;
