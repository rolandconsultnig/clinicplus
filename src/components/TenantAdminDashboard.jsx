import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, BarChart, PieChart, AreaChart, ComposedChart } from './charts';
import CalendarWidget from './CalendarWidget';
import { formatCurrencySimple } from '../utils/currency';
import { 
  Building2, 
  Users, 
  UserCheck,
  Calendar,
  DollarSign,
  FileText,
  Pill,
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Building,
  BarChart3,
  CreditCard,
  Shield
} from 'lucide-react';

const TenantAdminDashboard = ({ organizationId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    patientGrowth: [],
    appointmentTrends: [],
    revenueData: []
  });

  useEffect(() => {
    if (organizationId) {
      loadDashboardData();
    }
  }, [organizationId, activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      let endpoint = `/api/admin/tenant/${organizationId}/overview`;
      
      if (activeTab === 'statistics') {
        endpoint = `/api/admin/tenant/${organizationId}/statistics`;
      } else if (activeTab === 'users') {
        endpoint = `/api/admin/tenant/${organizationId}/users`;
      }
      
      const response = await apiService.request(endpoint, { method: 'GET' });
      setDashboardData(response);
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

  if (!dashboardData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const org = dashboardData.dashboard?.organization || {};
  const summary = dashboardData.dashboard?.summary || {};
  const facilities = dashboardData.dashboard?.facilities || [];
  const statistics = dashboardData.statistics || {};
  const users = dashboardData.users || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-md border-l-4 border-l-teal-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-teal-700" />
                  {org.organization_name || 'Organization'} Admin Dashboard
                </CardTitle>
                <CardDescription className="mt-2 flex items-center gap-4">
                  <Badge variant="outline" className="capitalize">
                    {org.organization_type?.replace('_', ' ') || 'N/A'}
                  </Badge>
                  <span className="flex items-center gap-2">
                    Status: 
                    <Badge className={org.is_active ? 'bg-green-600' : 'bg-yellow-600'}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </span>
                  {org.subscription_tier && (
                    <Badge variant="secondary" className="capitalize">
                      {org.subscription_tier} Plan
                    </Badge>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-teal-700" />
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Admin Access
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Calendar and Primary Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <CalendarWidget compact={true} />
              </div>
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-l-4 border-l-teal-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Facilities</CardTitle>
                  <Building className="h-5 w-5 text-teal-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{summary.facilities || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Healthcare locations</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle>
                  <Users className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{summary.total_patients || 0}</div>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    +{summary.patients_this_month || 0} this month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Providers</CardTitle>
                  <Stethoscope className="h-5 w-5 text-teal-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-700">{summary.total_providers || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Healthcare professionals</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Appointments Today</CardTitle>
                  <Calendar className="h-5 w-5 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">{summary.appointments_today || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">{summary.total_appointments || 0} total</p>
                </CardContent>
              </Card>
                </div>
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-emerald-500 shadow-md bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Revenue This Month</CardTitle>
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-700">
                    {formatCurrencySimple(summary.revenue_this_month || 0, 0)}
                  </div>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Monthly earnings
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Claims</CardTitle>
                  <FileText className="h-5 w-5 text-teal-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-700">{summary.total_claims || 0}</div>
                  <p className="text-xs text-teal-700 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    +{summary.claims_this_month || 0} this month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-teal-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
                  <CreditCard className="h-5 w-5 text-teal-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">{summary.total_payments || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Processed payments</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-600" />
                    Prescriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_prescriptions || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Total prescriptions issued</p>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Insurance Subscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_subscriptions || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Active subscriptions</p>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    RPM Devices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_rpm_devices || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Remote patient monitoring</p>
                </CardContent>
              </Card>
            </div>

            {/* Facilities List */}
            {facilities.length > 0 && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Facilities
                  </CardTitle>
                  <CardDescription>Organization healthcare facilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {facilities.map((facility) => (
                      <div 
                        key={facility.id} 
                        className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{facility.facility_name}</h3>
                          {facility.is_active ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 capitalize mb-1">{facility.facility_type}</p>
                        <p className="text-xs text-gray-500">
                          {facility.city}, {facility.state} {facility.zip_code}
                        </p>
                        {facility.phone && (
                          <p className="text-xs text-gray-500 mt-1">{facility.phone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Patient Growth Chart */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-700" />
                    Patient Growth
                  </CardTitle>
                  <CardDescription>Monthly patient and encounter trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <AreaChart
                    data={chartData.patientGrowth}
                    dataKey="patients"
                    name="Patients"
                    color="#3b82f6"
                    height={300}
                  />
                </CardContent>
              </Card>

              {/* Appointment Trends */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Appointment Trends
                  </CardTitle>
                  <CardDescription>Monthly appointment statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={chartData.appointmentTrends}
                    dataKey="scheduled"
                    name="Scheduled"
                    color="#10b981"
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-teal-700" />
                  Revenue & Expenses
                </CardTitle>
                <CardDescription>Financial overview over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ComposedChart
                  data={chartData.revenueData}
                  barDataKey="revenue"
                  lineDataKey="expenses"
                  barName="Revenue"
                  lineName="Expenses"
                  barColor="#8b5cf6"
                  lineColor="#f59e0b"
                  height={300}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Patients */}
              {statistics.monthly_patients && statistics.monthly_patients.length > 0 && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Monthly Patient Growth
                    </CardTitle>
                    <CardDescription>New patients by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {statistics.monthly_patients.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-700">{item.month}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-teal-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min((item.count / Math.max(...statistics.monthly_patients.map(m => m.count))) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                            <span className="font-bold text-teal-700 min-w-[3rem] text-right">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Monthly Revenue */}
              {statistics.monthly_revenue && statistics.monthly_revenue.length > 0 && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Monthly Revenue
                    </CardTitle>
                    <CardDescription>Revenue trends over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {statistics.monthly_revenue.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-700">{item.month}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min((item.total / Math.max(...statistics.monthly_revenue.map(m => m.total))) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                            <span className="font-bold text-emerald-600 min-w-[6rem] text-right">
                              {formatCurrencySimple(item.total, 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Facility Statistics */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Facility Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                    <div className="text-sm font-medium text-teal-800 mb-1">Total Facilities</div>
                    <div className="text-3xl font-bold text-teal-900">{statistics.facility_count || 0}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-700 mb-1">Active Facilities</div>
                    <div className="text-3xl font-bold text-green-900">{statistics.active_facilities || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Organization Users
                </CardTitle>
                <CardDescription>
                  {dashboardData.total || 0} total users in this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Username</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Email</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">User Type</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="p-3 font-medium text-gray-900">{user.username}</td>
                            <td className="p-3 text-sm text-gray-600">{user.email}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {user.user_type || 'N/A'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {user.is_active ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                    Active
                                  </>
                                ) : (
                                  'Inactive'
                                )}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TenantAdminDashboard;
