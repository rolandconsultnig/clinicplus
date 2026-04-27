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

function getLoggedInDisplayName(user) {
  if (!user) return 'User'
  const fromPatientInfo = [user.patient_info?.first_name, user.patient_info?.last_name].filter(Boolean).join(' ').trim()
  const fromProviderInfo = [user.provider_info?.first_name, user.provider_info?.last_name].filter(Boolean).join(' ').trim()
  const fromPatientData = [user.patient_data?.first_name, user.patient_data?.last_name].filter(Boolean).join(' ').trim()
  const fromProviderData = [user.provider_data?.first_name, user.provider_data?.last_name].filter(Boolean).join(' ').trim()
  const fromNames =
    user.display_name ||
    user.full_name ||
    fromPatientInfo ||
    fromProviderInfo ||
    fromPatientData ||
    fromProviderData ||
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : '')
  const fallback = user.email || user.username || 'User'
  const label = String(fromNames || fallback).trim()
  return label || fallback
}

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
        { title: 'New Encounter', icon: FileText, action: () => onNavigate ? onNavigate('new-encounter') : navigate('/new-encounter'), color: 'bg-teal-600' },
        { title: 'Patient Search', icon: Users, action: () => onNavigate ? onNavigate('patient-search') : navigate('/patient-search'), color: 'bg-green-600' },
        { title: 'Lab Orders', icon: TestTube, action: () => onNavigate ? onNavigate('lab-orders') : navigate('/lab-orders'), color: 'bg-teal-600' },
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
        { title: 'User Management', icon: Users, action: () => onNavigate ? onNavigate('user-management') : navigate('/user-management'), color: 'bg-teal-600' },
        { title: 'Facility Management', icon: Building2, action: () => onNavigate ? onNavigate('facility-management') : navigate('/facility-management'), color: 'bg-green-600' },
        { title: 'Security & Audit', icon: Shield, action: () => onNavigate ? onNavigate('security-audit') : navigate('/security-audit'), color: 'bg-teal-600' },
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
        { title: 'My Records', icon: FileText, action: () => onNavigate ? onNavigate('patient-data') : navigate('/patient-data'), color: 'bg-teal-600' },
        { title: 'Appointments', icon: Calendar, action: () => onNavigate ? onNavigate('scheduling') : navigate('/scheduling'), color: 'bg-green-600' },
        { title: 'Prescriptions', icon: Pill, action: () => onNavigate ? onNavigate('prescriptions') : navigate('/prescriptions'), color: 'bg-teal-600' },
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
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-100 border-t-teal-600 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Loading workspace…</p>
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

  const getStatAccent = () => 'from-teal-500 to-teal-700';

  const isGenericWorkspace = portalData.category === 'default' || portalData.role === 'User'
  const workspaceTitle = isGenericWorkspace
    ? getLoggedInDisplayName(user)
    : `${portalData.role} workspace`

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-teal-600" aria-hidden />
          <div className="relative flex flex-col gap-4 p-6 pl-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-900/15">
                {portalData.category === 'clinical' && <Stethoscope className="w-7 h-7" />}
                {portalData.category === 'administrative' && <Shield className="w-7 h-7" />}
                {portalData.category === 'patient' && <Heart className="w-7 h-7" />}
                {portalData.category === 'default' && <User className="w-7 h-7" />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">DigiClinic</p>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{workspaceTitle}</h1>
                <p className="text-slate-600 mt-1">
                  Welcome back, <span className="font-medium text-slate-800">{getLoggedInDisplayName(user)}</span>
                  <span className="text-slate-400"> · </span>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit border-teal-200 bg-teal-50 text-teal-900 px-3 py-1.5 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 mr-1.5 inline" />
              {portalData.category === 'clinical' ? 'Clinical' :
               portalData.category === 'administrative' ? 'Administration' :
               portalData.category === 'patient' ? 'Patient' :
               'Workspace'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(portalData.stats).map(([key, value]) => {
            const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const isStatus = typeof value === 'string' && ['healthy', 'active', 'inactive', 'warning', 'error'].includes(value.toLowerCase());
            const statusColor = value === 'healthy' ? 'text-teal-700' : value === 'active' ? 'text-teal-700' : 'text-slate-600';
            const accent = getStatAccent();
            return (
              <Card key={key} className="group border border-slate-200 bg-white shadow-sm hover:border-teal-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {displayKey}
                      </p>
                      {isStatus ? (
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${value === 'healthy' ? 'bg-teal-500' : value === 'active' ? 'bg-teal-400' : 'bg-slate-300'}`} />
                          <p className={`text-2xl font-bold ${statusColor} capitalize`}>{value}</p>
                        </div>
                      ) : (
                        <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
                      )}
                      {!isStatus && (
                        <div className="flex items-center gap-1 text-xs text-teal-700/90 font-medium mt-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Live</span>
                        </div>
                      )}
                    </div>
                    <div className={`w-12 h-12 shrink-0 bg-gradient-to-br ${accent} rounded-lg flex items-center justify-center shadow-sm`}>
                      {key === 'system_health' ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : (
                        <BarChart3 className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  {!isStatus && (
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
                      <div className={`h-full bg-gradient-to-r ${accent} rounded-full`} style={{ width: '72%' }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900">Quick actions</CardTitle>
                <CardDescription className="text-sm mt-1 text-slate-600">Shortcuts to common workflows</CardDescription>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {portalData.quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={action.action}
                    className="group text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700 mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-900">{action.title}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      Open
                      <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                    </p>
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
                <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-900">Patient trend</CardTitle>
                        <CardDescription className="mt-1 text-sm">7-day patient activity overview</CardDescription>
                      </div>
                      <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-teal-700" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <LineChart data={portalData.chartData.patientTrend} />
                  </CardContent>
                </Card>
              )}
              {portalData.chartData.appointmentStatus && (
                <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-900">Appointment status</CardTitle>
                        <CardDescription className="mt-1 text-sm">Current appointment distribution</CardDescription>
                      </div>
                      <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-teal-700" />
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
              <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">User distribution</CardTitle>
                      <CardDescription className="mt-1 text-sm">User types breakdown</CardDescription>
                    </div>
                    <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal-700" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <PieChart data={portalData.chartData.userDistribution} />
                </CardContent>
              </Card>
            )}
            {portalData.chartData.recordTypes && (
              <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">Record types</CardTitle>
                      <CardDescription className="mt-1 text-sm">Medical records distribution</CardDescription>
                    </div>
                    <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-teal-700" />
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
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">Recent activity</CardTitle>
                <CardDescription className="text-sm mt-1 text-slate-600">Latest updates and events</CardDescription>
              </div>
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-700" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {portalData.recentActivity && portalData.recentActivity.length > 0 ? (
              <div className="space-y-2">
                {portalData.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 hover:border-teal-200 hover:bg-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{activity.title || activity.name || 'Activity'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          {activity.date || activity.appointment_date || 'No date'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${
                        activity.status === 'completed' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                        activity.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      } text-xs font-medium`}
                    >
                      {activity.status || 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No recent activity</p>
                <p className="text-sm text-slate-500 mt-1">Activity will appear here as it happens</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleBasedPortal;

