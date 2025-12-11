import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LineChart, BarChart, PieChart } from './charts';
import CalendarWidget from './CalendarWidget';
import TodoList from './TodoList';
import FinancialReports from './FinancialReports';
import { 
  Heart, 
  Users, 
  Building2, 
  FileText, 
  Calendar, 
  TestTube, 
  Pill, 
  Shield,
  Activity,
  Stethoscope,
  UserCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Bell,
  CreditCard,
  Settings,
  User,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { apiService } from '../services/apiService';

/**
 * Role-Based Portal Component
 * Displays different portal views based on user roles
 */
const RoleBasedPortal = ({ user, onNavigate }) => {
  const navigate = useNavigate();
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    if (user && user.roles && user.roles.length > 0) {
      // Set the primary role (first active role)
      setActiveRole(user.roles[0]);
      loadPortalData(user.roles[0]);
    } else {
      // Fallback to user_type if no roles
      loadPortalDataByUserType();
    }
  }, [user]);

  const loadPortalData = async (role) => {
    try {
      setLoading(true);
      // Load role-specific data
      const roleCategory = role.category || role.role_category;
      
      switch (roleCategory) {
        case 'clinical':
          await loadClinicalPortalData(role);
          break;
        case 'administrative':
          await loadAdministrativePortalData(role);
          break;
        case 'patient':
          await loadPatientPortalData();
          break;
        default:
          await loadDefaultPortalData();
      }
    } catch (error) {
      console.error('Error loading portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPortalDataByUserType = async () => {
    try {
      setLoading(true);
      switch (user.user_type) {
        case 'patient':
          await loadPatientPortalData();
          break;
        case 'provider':
          await loadClinicalPortalData({ name: 'Provider' });
          break;
        case 'admin':
          await loadAdministrativePortalData({ name: 'Administrator' });
          break;
        default:
          await loadDefaultPortalData();
      }
    } catch (error) {
      console.error('Error loading portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClinicalPortalData = async (role) => {
    // Load clinical provider data
    const [patientsRes, appointmentsRes, encountersRes] = await Promise.allSettled([
      apiService.getPatients(),
      apiService.request('/scheduling/appointments', { method: 'GET' }),
      apiService.request('/clinical/encounters', { method: 'GET' })
    ]);

    const patients = patientsRes.status === 'fulfilled' && patientsRes.value.success 
      ? patientsRes.value.patients || [] : [];
    const appointments = appointmentsRes.status === 'fulfilled' && appointmentsRes.value.success
      ? appointmentsRes.value.appointments || [] : [];
    const encounters = encountersRes.status === 'fulfilled' && encountersRes.value.success
      ? encountersRes.value.encounters || [] : [];

    setPortalData({
      role: role.name || 'Clinical Provider',
      category: 'clinical',
      stats: {
        total_patients: patients.length,
        today_appointments: appointments.filter(a => {
          const apptDate = new Date(a.appointment_date);
          const today = new Date();
          return apptDate.toDateString() === today.toDateString();
        }).length,
        pending_encounters: encounters.filter(e => e.status === 'pending').length,
        completed_encounters: encounters.filter(e => e.status === 'completed').length
      },
      quickActions: [
        { title: 'New Encounter', icon: FileText, action: () => onNavigate ? onNavigate('new-encounter') : navigate('/new-encounter'), color: 'bg-blue-600' },
        { title: 'Patient Search', icon: Users, action: () => onNavigate ? onNavigate('patient-search') : navigate('/patient-search'), color: 'bg-green-600' },
        { title: 'Lab Orders', icon: TestTube, action: () => onNavigate ? onNavigate('lab-orders') : navigate('/lab-orders'), color: 'bg-purple-600' },
        { title: 'Prescriptions', icon: Pill, action: () => onNavigate ? onNavigate('prescriptions') : navigate('/prescriptions'), color: 'bg-orange-600' }
      ],
      recentActivity: appointments.slice(0, 5),
      chartData: generateClinicalChartData(patients, appointments, encounters)
    });
  };

  const loadAdministrativePortalData = async (role) => {
    // Load administrative data
    const [usersRes, facilitiesRes, statsRes] = await Promise.allSettled([
      apiService.request('/users', { method: 'GET' }),
      apiService.getFacilities(),
      apiService.request('/admin/stats', { method: 'GET' })
    ]);

    const users = usersRes.status === 'fulfilled' && usersRes.value.success
      ? usersRes.value.users || [] : [];
    const facilities = facilitiesRes.status === 'fulfilled' && facilitiesRes.value.success
      ? facilitiesRes.value.facilities || [] : [];
    const stats = statsRes.status === 'fulfilled' && statsRes.value.success
      ? statsRes.value : {};

    setPortalData({
      role: role.name || 'Administrator',
      category: 'administrative',
      stats: {
        total_users: users.length,
        total_facilities: facilities.length,
        active_sessions: stats.active_sessions || 0,
        system_health: stats.system_health || 'healthy'
      },
      quickActions: [
        { title: 'User Management', icon: Users, action: () => onNavigate ? onNavigate('user-management') : navigate('/user-management'), color: 'bg-blue-600' },
        { title: 'Facility Management', icon: Building2, action: () => onNavigate ? onNavigate('facility-management') : navigate('/facility-management'), color: 'bg-green-600' },
        { title: 'Security & Audit', icon: Shield, action: () => onNavigate ? onNavigate('security-audit') : navigate('/security-audit'), color: 'bg-purple-600' },
        { title: 'System Settings', icon: Settings, action: () => onNavigate ? onNavigate('system-settings') : navigate('/system-settings'), color: 'bg-orange-600' }
      ],
      recentActivity: users.slice(0, 5),
      chartData: generateAdminChartData(users, facilities)
    });
  };

  const loadPatientPortalData = async () => {
    // Load patient data
    const [appointmentsRes, recordsRes, prescriptionsRes] = await Promise.allSettled([
      apiService.request('/scheduling/appointments', { method: 'GET' }),
      apiService.request('/secure/patients/me/records', { method: 'GET' }),
      apiService.request('/prescribing/prescriptions', { method: 'GET' })
    ]);

    const appointments = appointmentsRes.status === 'fulfilled' && appointmentsRes.value.success
      ? appointmentsRes.value.appointments || [] : [];
    const records = recordsRes.status === 'fulfilled' && recordsRes.value.success
      ? recordsRes.value.records || [] : [];
    const prescriptions = prescriptionsRes.status === 'fulfilled' && prescriptionsRes.value.success
      ? prescriptionsRes.value.prescriptions || [] : [];

    setPortalData({
      role: 'Patient',
      category: 'patient',
      stats: {
        upcoming_appointments: appointments.filter(a => new Date(a.appointment_date) > new Date()).length,
        total_records: records.length,
        active_prescriptions: prescriptions.filter(p => p.status === 'active').length,
        pending_lab_results: 0
      },
      quickActions: [
        { title: 'My Records', icon: FileText, action: () => onNavigate ? onNavigate('patient-data') : navigate('/patient-data'), color: 'bg-blue-600' },
        { title: 'Appointments', icon: Calendar, action: () => onNavigate ? onNavigate('scheduling') : navigate('/scheduling'), color: 'bg-green-600' },
        { title: 'Prescriptions', icon: Pill, action: () => onNavigate ? onNavigate('prescriptions') : navigate('/prescriptions'), color: 'bg-purple-600' },
        { title: 'Messages', icon: Bell, action: () => onNavigate ? onNavigate('messaging') : navigate('/messaging'), color: 'bg-orange-600' }
      ],
      recentActivity: appointments.slice(0, 5),
      chartData: generatePatientChartData(appointments, records, prescriptions)
    });
  };

  const loadDefaultPortalData = async () => {
    setPortalData({
      role: 'User',
      category: 'default',
      stats: {},
      quickActions: [],
      recentActivity: [],
      chartData: {}
    });
  };

  const generateClinicalChartData = (patients, appointments, encounters) => {
    return {
      patientTrend: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        patients: Math.floor(Math.random() * 20) + 10
      })),
      appointmentStatus: [
        { name: 'Scheduled', value: appointments.filter(a => a.status === 'scheduled').length },
        { name: 'Completed', value: appointments.filter(a => a.status === 'completed').length },
        { name: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length }
      ]
    };
  };

  const generateAdminChartData = (users, facilities) => {
    return {
      userGrowth: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }),
        users: Math.floor(Math.random() * 50) + 20
      })),
      userDistribution: [
        { name: 'Patients', value: users.filter(u => u.user_type === 'patient').length },
        { name: 'Providers', value: users.filter(u => u.user_type === 'provider').length },
        { name: 'Admins', value: users.filter(u => u.user_type === 'admin').length }
      ],
      facilityDistribution: [
        { name: 'Active Facilities', value: facilities.filter(f => f.is_active).length },
        { name: 'Inactive Facilities', value: facilities.filter(f => !f.is_active).length }
      ]
    };
  };

  const generatePatientChartData = (appointments, records, prescriptions) => {
    return {
      appointmentTrend: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }),
        appointments: Math.floor(Math.random() * 5) + 1
      })),
      recordTypes: [
        { name: 'Encounters', value: records.filter(r => r.type === 'encounter').length },
        { name: 'Lab Results', value: records.filter(r => r.type === 'lab').length },
        { name: 'Prescriptions', value: prescriptions.length }
      ],
      appointmentStatus: [
        { name: 'Upcoming', value: appointments.filter(a => new Date(a.appointment_date) > new Date()).length },
        { name: 'Completed', value: appointments.filter(a => a.status === 'completed').length },
        { name: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length }
      ]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">No portal data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleColor = (category) => {
    switch (category) {
      case 'clinical':
        return 'from-blue-600 to-indigo-600';
      case 'administrative':
        return 'from-purple-600 to-pink-600';
      case 'patient':
        return 'from-green-600 to-emerald-600';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  const getStatCardColor = (index) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-emerald-500 to-emerald-600',
      'from-purple-500 to-purple-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-indigo-500 to-indigo-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Professional Header */}
        <div className={`relative bg-gradient-to-r ${getRoleColor(portalData.category)} rounded-2xl shadow-2xl p-8 text-white overflow-hidden`}>
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                {portalData.category === 'clinical' && <Stethoscope className="w-8 h-8" />}
                {portalData.category === 'administrative' && <Shield className="w-8 h-8" />}
                {portalData.category === 'patient' && <Heart className="w-8 h-8" />}
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-1">{portalData.role} Portal</h1>
                <p className="text-white/90 text-lg font-medium">Welcome back, {user.username || 'User'}!</p>
                <p className="text-white/70 text-sm mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm font-medium">
                <Activity className="w-4 h-4 mr-2" />
                {portalData.category === 'clinical' ? 'Clinical Portal' : 
                 portalData.category === 'administrative' ? 'Admin Portal' : 
                 'Patient Portal'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Professional Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(portalData.stats).map(([key, value], index) => {
            // Format the key for display
            const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            // Check if value is a status string (like 'healthy')
            const isStatus = typeof value === 'string' && ['healthy', 'active', 'inactive', 'warning', 'error'].includes(value.toLowerCase());
            const statusColor = value === 'healthy' ? 'text-emerald-600' : value === 'active' ? 'text-blue-600' : 'text-gray-600';
            
            return (
              <Card key={key} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${getStatCardColor(index)} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {displayKey}
                      </p>
                      {isStatus ? (
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${value === 'healthy' ? 'bg-emerald-500' : value === 'active' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                          <p className={`text-2xl font-bold ${statusColor} capitalize`}>{value}</p>
                        </div>
                      ) : (
                        <p className="text-4xl font-bold text-gray-900 mb-1">{value}</p>
                      )}
                      {!isStatus && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <TrendingUp className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                    <div className={`w-14 h-14 bg-gradient-to-br ${getStatCardColor(index)} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                      {key === 'system_health' ? (
                        <CheckCircle2 className="w-7 h-7 text-white" />
                      ) : (
                        <BarChart3 className="w-7 h-7 text-white" />
                      )}
                    </div>
                  </div>
                  {!isStatus && (
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${getStatCardColor(index)} rounded-full`} style={{ width: '75%' }}></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Professional Quick Actions */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Quick Actions</CardTitle>
                <CardDescription className="text-base mt-1">Access frequently used features</CardDescription>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {portalData.quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`group relative ${action.color} hover:shadow-2xl text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-lg">{action.title}</p>
                      <p className="text-white/80 text-sm mt-1">Click to access</p>
                    </div>
                    <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Calendar with Booking and Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Widget with Booking */}
          <div className="lg:col-span-1">
            <CalendarWidget 
              userId={user.id} 
              providerId={user.provider_id} 
              facilityId={user.facility_id}
              compact={false}
              onAppointmentBooked={(appointment) => {
                // Refresh dashboard data after booking
                if (user && user.roles && user.roles.length > 0) {
                  loadPortalData(user.roles[0]);
                } else {
                  loadPortalDataByUserType();
                }
              }}
            />
          </div>
          
          {/* Professional Charts */}
          {portalData.chartData && Object.keys(portalData.chartData).length > 0 && (
            <div className="lg:col-span-2 grid grid-cols-1 gap-6">
              {portalData.chartData.patientTrend && (
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Patient Trend</CardTitle>
                        <CardDescription className="mt-1">7-day patient activity overview</CardDescription>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <LineChart data={portalData.chartData.patientTrend} />
                  </CardContent>
                </Card>
              )}
              {portalData.chartData.appointmentStatus && (
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Appointment Status</CardTitle>
                        <CardDescription className="mt-1">Current appointment distribution</CardDescription>
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <PieChart data={portalData.chartData.appointmentStatus} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Additional Report Graphs and Pie Charts */}
        {portalData.chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {portalData.chartData.userDistribution && (
              <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">User Distribution</CardTitle>
                      <CardDescription className="mt-1">User types breakdown</CardDescription>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <PieChart data={portalData.chartData.userDistribution} />
                </CardContent>
              </Card>
            )}
            {portalData.chartData.recordTypes && (
              <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">Record Types</CardTitle>
                      <CardDescription className="mt-1">Medical records distribution</CardDescription>
                    </div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <PieChart data={portalData.chartData.recordTypes} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Todo List and Financial Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Todo List */}
          <TodoList userId={user.id} role={portalData.category} />

          {/* Financial Reports - Only show for admin/administrative roles */}
          {(portalData.category === 'administrative' || user.user_type === 'admin') && (
            <FinancialReports 
              userId={user.id} 
              role={portalData.category} 
              facilityId={user.facility_id}
            />
          )}
        </div>

        {/* Professional Recent Activity */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Recent Activity</CardTitle>
                <CardDescription className="text-base mt-1">Latest updates and events</CardDescription>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {portalData.recentActivity && portalData.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {portalData.recentActivity.map((activity, index) => (
                  <div 
                    key={index} 
                    className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{activity.title || activity.name || 'Activity'}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {activity.date || activity.appointment_date || 'No date'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${
                        activity.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        activity.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      } font-medium`}
                    >
                      {activity.status || 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Activity will appear here as it happens</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleBasedPortal;

