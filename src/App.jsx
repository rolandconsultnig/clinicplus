import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx'
import { 
  Heart, 
  Users, 
  Building2, 
  FileText, 
  Calendar, 
  TestTube, 
  Pill, 
  Shield,
  User,
  LogOut,
  Menu,
  Search,
  Plus,
  Activity,
  UserCheck,
  Building,
  Stethoscope,
  CreditCard,
  Settings,
  MessageSquare,
  Bell,
  FolderOpen,
  Brain,
  Truck,
  Database,
  Download,
  Award,
  DollarSign,
  Receipt,
  ClipboardList,
  Workflow,
  ClipboardCheck,
  FileCheck,
  Eye,
  Scale,
  Microscope,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  History,
  Share2
} from 'lucide-react'
import { apiService } from './services/apiService.js'
import PatientDataManager from './components/PatientDataManager.jsx'
import { PhysicianDashboard, NurseDashboard, PharmacistDashboard } from './components/ProviderDashboards.jsx'
import SchedulingCalendar from './components/SchedulingCalendar.jsx'
import BillingDashboard from './components/BillingDashboard.jsx'
import PrescriptionManager from './components/PrescriptionManager.jsx'
import PharmacySearch from './components/PharmacySearch.jsx'
import InsurancePlans from './components/InsurancePlans.jsx'
import RPMMonitor from './components/RPMMonitor.jsx'
import RootAdminDashboard from './components/RootAdminDashboard.jsx'
import TenantAdminDashboard from './components/TenantAdminDashboard.jsx'
import OrganizationManagement from './components/OrganizationManagement.jsx'
import UserManagement from './components/UserManagement.jsx'
import FacilityManagement from './components/FacilityManagement.jsx'
import SecurityAudit from './components/SecurityAudit.jsx'
import SystemSettings from './components/SystemSettings.jsx'
import SOAPNotes from './components/SOAPNotes.jsx'
import PhysicalExam from './components/PhysicalExam.jsx'
import ReviewOfSystems from './components/ReviewOfSystems.jsx'
import ClinicalReminders from './components/ClinicalReminders.jsx'
import DocumentManagement from './components/DocumentManagement.jsx'
import Messaging from './components/Messaging.jsx'
import BillingTracker from './components/BillingTracker.jsx'
import CarePlans from './components/CarePlans.jsx'
import TreatmentPlans from './components/TreatmentPlans.jsx'
import PatientPortal from './components/PatientPortal.jsx'
import ERA from './components/ERA.jsx'
import UB04Forms from './components/UB04Forms.jsx'
import DynamicLanding from './components/DynamicLanding.jsx'
import PatientSearch from './components/PatientSearch.jsx'
import NewEncounter from './components/NewEncounter.jsx'
import LabOrders from './components/LabOrders.jsx'
import UserProfile from './components/UserProfile.jsx'
import RoleBasedPortal from './components/RoleBasedPortal.jsx'
import PatientPrescriptionView from './components/PatientPrescriptionView.jsx'
import ReceptionistDashboard from './components/ReceptionistDashboard.jsx'
import DoctorConsultationPage from './components/DoctorConsultationPage.jsx'
import AIConsultation from './components/AIConsultation.jsx'
import ClinicalDecisionSupport from './components/ClinicalDecisionSupport.jsx'
import FHIRIntegration from './components/FHIRIntegration.jsx'
import HL7LabIntegration from './components/HL7LabIntegration.jsx'
import DataImportExport from './components/DataImportExport.jsx'
import EmergencyModule from './components/EmergencyModule.jsx'
import OPDQueueManagement from './components/OPDQueueManagement.jsx'
import ProfessionalCredentialing from './components/ProfessionalCredentialing.jsx'
import PaymentProcessing from './components/PaymentProcessing.jsx'
import ProviderWorkflows from './components/ProviderWorkflows.jsx'
import HealthDataManagement from './components/HealthDataManagement.jsx'
import LaboratoryModule from './components/LaboratoryModule.jsx'
import PharmacyInventoryModule from './components/PharmacyInventoryModule.jsx'
import PatientSummaryDashboard from './components/PatientSummaryDashboard.jsx'
import PatientFlowBoard from './components/PatientFlowBoard.jsx'
import ClinicalFormsManager from './components/ClinicalFormsManager.jsx'
import EncounterManagement from './components/EncounterManagement.jsx'
import BillingManagement from './components/BillingManagement.jsx'
import LabManagement from './components/LabManagement.jsx'
import EPrescribing from './components/EPrescribing.jsx'
import ReportsViewer from './components/ReportsViewer.jsx'
import AdminManagement from './components/AdminManagement.jsx'
import MessagingManagement from './components/MessagingManagement.jsx'
import SpecializedFeatures from './components/SpecializedFeatures.jsx'
import AdvancedFeatures from './components/AdvancedFeatures.jsx'
import UtilitiesView from './components/UtilitiesView.jsx'
import ONCCertification from './components/ONCCertification.jsx'
import GDPRCompliance from './components/GDPRCompliance.jsx'
import SMARTonFHIR from './components/SMARTonFHIR.jsx'
import HL7Integration from './components/HL7Integration.jsx'
import { ThemeProvider } from './components/ThemeProvider.jsx'
import { ToastProvider } from './components/ui/toast.jsx'
import { AppProvider } from './contexts/AppContext.jsx'
import './App.css'

// Login Component
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const result = await apiService.login(username, password)
    
    if (result.success) {
      // Store user data
      onLogin(result.user)
      // Navigate to dashboard
      navigate('/')
    } else {
      setError(result.error || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 transform transition-transform hover:scale-105">
              <Heart className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Clinic+
            </CardTitle>
            <CardDescription className="text-base mt-2 text-gray-600">
              Universal Patient-Owned Health Ecosystem
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="h-11 transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-11 transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Demo Credentials
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-gray-600">Patient:</span>
                <code className="text-blue-600 font-mono font-medium">patient_demo / demo123</code>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-gray-600">Provider:</span>
                <code className="text-indigo-600 font-mono font-medium">provider_demo / demo123</code>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-gray-600">Admin:</span>
                <code className="text-purple-600 font-mono font-medium">admin_demo / demo123</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Navigation Component
function Navigation({ user, onLogout }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Clinic+" className="w-8 h-8" />
            <span className="text-xl font-bold text-gray-900">Clinic+</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.username}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </nav>
  )
}

// Patient Management Component
function PatientManagement() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadPatients = async () => {
      const result = await apiService.getPatients()
      if (result.success) {
        setPatients(result.patients || [])
      }
      setLoading(false)
    }
    
    loadPatients()
  }, [])

  const filteredPatients = patients.filter(patient =>
    patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.universal_patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
            Patient Management
          </h1>
          <p className="text-gray-600 mt-2">Manage and search patient records</p>
        </div>
        <Button className="shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add New Patient
        </Button>
      </div>

      {/* Enhanced Search Card */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search patients by name, ID, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base"
              variant="filled"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <Users className="w-6 h-6 text-blue-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="text-gray-600 font-medium">Loading patients...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPatients.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No patients found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding a new patient'}
                </p>
                {!searchTerm && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Patient
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPatients.map((patient, index) => (
                <Card 
                  key={patient.id} 
                  hover 
                  className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="relative">
                          <Avatar className="w-14 h-14 ring-2 ring-blue-100 group-hover:ring-blue-300 transition-all">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-lg">
                              {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                              {patient.first_name} {patient.last_name}
                            </h3>
                            <Badge 
                              variant={patient.allow_cross_facility_sharing ? "default" : "outline"}
                              className="text-xs"
                            >
                              {patient.allow_cross_facility_sharing ? "Sharing Enabled" : "Private"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">ID:</span>
                              <code className="px-2 py-0.5 bg-gray-100 rounded text-blue-600 font-mono">
                                {patient.universal_patient_id}
                              </code>
                            </span>
                            <span>DOB: {patient.date_of_birth}</span>
                            <span>Gender: {patient.gender}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                          View Details
                        </Button>
                        <Button size="sm" className="sm:hidden">
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Main App Component
function App() {
  const [user, setUser] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')

  // Helper function to handle sidebar navigation
  const handleNavClick = (view) => {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentView(view);
    };
  };

  // Helper function for consistent sidebar button styling
  const getSidebarButtonClass = (view) => {
    const isActive = currentView === view;
    return `w-full justify-start h-10 transition-all duration-200 ${
      isActive 
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 font-medium' 
        : 'hover:bg-gray-50 hover:text-gray-900 text-gray-700'
    }`;
  };
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('auth_user')
      
      if (token && storedUser) {
        try {
          // Verify token is still valid by getting profile
          const result = await apiService.getProfile()
          if (result.success) {
            setUser(result.user)
          } else {
            // Token invalid, clear storage silently
            apiService.logout()
          }
        } catch (error) {
          // Token expired or invalid, clear storage silently
          // Don't log errors for expired tokens - this is expected behavior
          if (error.status !== 401) {
            console.error('Auth check error:', error)
          }
          apiService.logout()
        }
      }
      setCheckingAuth(false)
    }
    
    checkAuth()
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    apiService.logout()
    setUser(null)
    setCurrentView('dashboard')
  }

  const renderContent = () => {
    switch (currentView) {
      case 'patients':
        return <PatientManagement />
      case 'patient-data':
        return <PatientDataManager />
      case 'scheduling':
        return <SchedulingCalendar facilityId={user.facility_id} providerId={user.provider_id} />
      case 'billing':
        return <BillingDashboard facilityId={user.facility_id} />
      case 'prescriptions':
        if (user.user_type === 'patient') {
          return <PatientPrescriptionView patientId={user.patient_id} />
        }
        return <PrescriptionManager 
          patientId={user.patient_id} 
          providerId={user.provider_id} 
          facilityId={user.facility_id}
          userType={user.user_type}
        />
      case 'patient-search':
        return <PatientSearch onSelectPatient={(patient) => {
          if (patient) {
            setCurrentView('patient-data');
            // Could pass patient to PatientDataManager
          }
        }} showCreateButton={true} />
      case 'new-encounter':
        return <NewEncounter 
          onEncounterCreated={(encounter) => {
            alert('Encounter created successfully!');
            setCurrentView('dashboard');
          }}
          onCancel={() => setCurrentView('dashboard')}
        />
      case 'lab-orders':
        return <LabOrders />
      case 'pharmacy':
        return <PharmacySearch />
      case 'insurance':
        return <InsurancePlans />
      case 'rpm':
        return <RPMMonitor patientId={user.patient_id} />
      case 'root-admin':
        return <RootAdminDashboard />
      case 'tenant-admin':
        return <TenantAdminDashboard organizationId={user.organization_id || 1} />
      case 'organizations':
        return <OrganizationManagement />
      case 'user-management':
        return <UserManagement />
      case 'facility-management':
        return <FacilityManagement />
      case 'security-audit':
        return <SecurityAudit />
      case 'system-settings':
        return <SystemSettings />
      case 'soap-notes':
        return <SOAPNotes patientId={user.patient_id} encounterId={user.encounter_id} />
      case 'physical-exam':
        return <PhysicalExam patientId={user.patient_id} encounterId={user.encounter_id} />
      case 'review-of-systems':
        return <ReviewOfSystems patientId={user.patient_id} encounterId={user.encounter_id} />
      case 'clinical-reminders':
        return <ClinicalReminders patientId={user.patient_id} />
      case 'documents':
        return <DocumentManagement patientId={user.patient_id} />
      case 'messaging':
        return <Messaging />
      case 'billing-tracker':
        return <BillingTracker />
      case 'care-plans':
        return <CarePlans patientId={user.patient_id} />
      case 'treatment-plans':
        return <TreatmentPlans patientId={user.patient_id} />
      case 'patient-portal':
        return <PatientPortal />
      case 'patient-dashboard':
        return <PatientPortal initialTab="dashboard" />
      case 'patient-messages':
        return <PatientPortal initialTab="messages" />
      case 'patient-appointments':
        return <PatientPortal initialTab="appointments" />
      case 'patient-prescriptions':
        return <PatientPortal initialTab="prescriptions" />
      case 'patient-records':
        return <PatientPortal initialTab="records" />
      case 'patient-history':
        return <PatientPortal initialTab="history" />
      case 'patient-grant-access':
        return <PatientPortal initialTab="grant-access" />
      case 'patient-billing':
        return <PatientPortal initialTab="billing" />
      case 'patient-profile':
        return <PatientPortal initialTab="profile" />
      case 'era':
        return <ERA />
      case 'ub04-forms':
        return <UB04Forms patientId={user.patient_id} />
      case 'provider-dashboard':
        if (user.user_type === 'physician') return <PhysicianDashboard />
        if (user.user_type === 'nurse') return <NurseDashboard />
        if (user.user_type === 'pharmacist') return <PharmacistDashboard />
        return <RoleBasedPortal user={user} />
      case 'profile':
        return <UserProfile user={user} />
      case 'lab-orders':
        return <LabOrders />
      case 'receptionist':
        return <ReceptionistDashboard />
      case 'doctor-consultation':
        return <DoctorConsultationPage patientId={user.patient_id} encounterId={user.encounter_id} />
      case 'ai-consultation':
        return <AIConsultation patientId={user.patient_id} />
      case 'cds':
        return <ClinicalDecisionSupport patientId={user.patient_id} encounterId={user.encounter_id} />
      case 'fhir-integration':
        return <FHIRIntegration />
      case 'hl7-labs':
        return <HL7LabIntegration patientId={user.patient_id} />
      case 'data-import-export':
        return <DataImportExport />
      case 'emergency':
        return <EmergencyModule />
      case 'opd-queue':
        return <OPDQueueManagement />
      case 'credentialing':
        return <ProfessionalCredentialing />
      case 'payments':
        return <PaymentProcessing patientId={user.patient_id} />
      case 'provider-workflows':
        return <ProviderWorkflows />
      case 'health-data':
        return <HealthDataManagement patientId={user.patient_id} />
      case 'laboratory':
        return <LaboratoryModule />
      case 'pharmacy-inventory':
        return <PharmacyInventoryModule />
      case 'patient-summary':
        return <PatientSummaryDashboard patientId={user.patient_id || null} onEdit={(id) => setCurrentView('patient-data')} />
      case 'patient-flow-board':
        return <PatientFlowBoard facilityId={user.facility_id} providerId={user.provider_id} />
      case 'clinical-forms':
        return <ClinicalFormsManager patientId={user.patient_id || null} encounterId={user.encounter_id || null} />
      case 'encounter-management':
        return <EncounterManagement patientId={user.patient_id} encounterId={user.encounter_id} />
      case 'billing-management':
        return <BillingManagement facilityId={user.facility_id} />
      case 'lab-management':
        return <LabManagement patientId={user.patient_id} />
      case 'eprescribing':
        return <EPrescribing patientId={user.patient_id} />
      case 'reports':
        return <ReportsViewer />
      case 'admin-management':
        return <AdminManagement />
      case 'messaging-management':
        return <MessagingManagement />
      case 'document-management':
        return <DocumentManagement patientId={user.patient_id} />
      case 'specialized-features':
        return <SpecializedFeatures />
      case 'advanced-features':
        return <AdvancedFeatures patientId={user.patient_id} />
      case 'patient-finder':
        return <PatientSearch onSelectPatient={(patient) => setCurrentView('patient-data')} showCreateButton={true} />
      case 'utilities':
        return <UtilitiesView patientId={user.patient_id} />
      case 'dashboard':
        return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
      default:
        return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
    }
  }

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Heart className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Loading Clinic+</p>
            <p className="text-sm text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  // If no user, show landing page or login based on route
  if (!user) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
          <Route path="/*" element={<DynamicLanding />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AppProvider user={user}>
          <Routes>
            <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
            <Route path="/*" element={
              <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
                {/* Enhanced Top Navigation Bar */}
                <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Clinic+
                      </span>
                      <p className="text-xs text-gray-500 -mt-0.5">Health Ecosystem</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">{user.username}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.user_type}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleLogout}
                      className="hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Logout</span>
                    </Button>
                  </div>
                </div>

                <div className="flex">
                  {/* Enhanced Sidebar */}
                  <div className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 min-h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto z-40 shadow-sm">
                    <div className="p-4 space-y-2">
                      {/* Search in Sidebar */}
                      <div className="mb-4 px-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search menu..."
                            className="pl-9 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>
                      <nav className="space-y-1">
                        {/* Dashboard - All Users */}
                        <Button
                          type="button"
                          variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                          className={`w-full justify-start h-10 transition-all ${
                            currentView === 'dashboard' 
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                              : 'hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={handleNavClick('dashboard')}
                        >
                          <Activity className="w-4 h-4 mr-3" />
                          <span className="font-medium">Dashboard</span>
                        </Button>
                        <Button
                          type="button"
                          variant={currentView === 'clinical-reminders' ? 'default' : 'ghost'}
                          className={`w-full justify-start h-10 transition-all ${
                            currentView === 'clinical-reminders' 
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                              : 'hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={handleNavClick('clinical-reminders')}
                        >
                          <Bell className="w-4 h-4 mr-3" />
                          <span className="font-medium">Clinical Reminders</span>
                        </Button>

                        {/* Patient Menu */}
                        {(user.user_type === 'patient' || user.user_type === 'Patient') && (
                          <>
                            <Button
                              type="button"
                              variant={currentView === 'patient-dashboard' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-dashboard' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-dashboard')}
                            >
                              <Activity className="w-4 h-4 mr-3" />
                              <span className="font-medium">Dashboard</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-messages' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-messages' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-messages')}
                            >
                              <MessageSquare className="w-4 h-4 mr-3" />
                              <span className="font-medium">Messages</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-appointments' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-appointments' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-appointments')}
                            >
                              <Calendar className="w-4 h-4 mr-3" />
                              <span className="font-medium">Appointments</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-prescriptions' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-prescriptions' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-prescriptions')}
                            >
                              <Pill className="w-4 h-4 mr-3" />
                              <span className="font-medium">Prescriptions</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-records' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-records' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-records')}
                            >
                              <FileText className="w-4 h-4 mr-3" />
                              <span className="font-medium">Records</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-history' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-history' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-history')}
                            >
                              <History className="w-4 h-4 mr-3" />
                              <span className="font-medium">History</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-grant-access' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-grant-access' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-grant-access')}
                            >
                              <Share2 className="w-4 h-4 mr-3" />
                              <span className="font-medium">Grant Access</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-billing' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-billing' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-billing')}
                            >
                              <CreditCard className="w-4 h-4 mr-3" />
                              <span className="font-medium">Billing</span>
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-profile' ? 'default' : 'ghost'}
                              className={`w-full justify-start h-10 transition-all ${
                                currentView === 'patient-profile' 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                                  : 'hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={handleNavClick('patient-profile')}
                            >
                              <User className="w-4 h-4 mr-3" />
                              <span className="font-medium">Profile</span>
                            </Button>
                          </>
                        )}

                        {/* Receptionist Menu */}
                        {(user.user_type === 'receptionist' || user.user_type === 'Receptionist') && (
                          <>
                            <Button
                              type="button"
                              variant={currentView === 'receptionist' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('receptionist')}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Reception Desk
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-search' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-search')}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Patient Search
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-flow-board' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-flow-board')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Patient Flow Board
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-finder' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-finder')}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Patient Finder
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'scheduling' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('scheduling')}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Appointments
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'billing' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('billing')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Billing
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'billing-tracker' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('billing-tracker')}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Claims Tracker
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'era' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('era')}
                            >
                              <Receipt className="w-4 h-4 mr-2" />
                              ERA (Remittance)
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'ub04-forms' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('ub04-forms')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              UB-04 Forms
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'payments' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('payments')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Process Payment
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'opd-queue' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('opd-queue')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              OPD Queue
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'emergency' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('emergency')}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              Emergency
                            </Button>
                          </>
                        )}

                        {/* Physician Menu */}
                        {(user.user_type === 'physician' || user.user_type === 'Physician' || user.user_type === 'provider') && (
                          <>
                            <Button
                              type="button"
                              variant={currentView === 'doctor-consultation' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('doctor-consultation')}
                            >
                              <Stethoscope className="w-4 h-4 mr-2" />
                              Consultation
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'treatment-plans' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('treatment-plans')}
                            >
                              <FileCheck className="w-4 h-4 mr-2" />
                              Treatment Plans
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patients' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('patients')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              My Patients
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'care-plans' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('care-plans')}
                            >
                              <ClipboardList className="w-4 h-4 mr-2" />
                              Care Plans
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'prescriptions' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('prescriptions')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              Prescriptions
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'eprescribing' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('eprescribing')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              ePrescribing
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'lab-orders' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('lab-orders')}
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              Lab Orders
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'laboratory' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('laboratory')}
                            >
                              <Microscope className="w-4 h-4 mr-2" />
                              Laboratory (LIS)
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'lab-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('lab-management')}
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              Lab Management
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'scheduling' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('scheduling')}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              My Schedule
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'soap-notes' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('soap-notes')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              SOAP Notes
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'physical-exam' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('physical-exam')}
                            >
                              <Stethoscope className="w-4 h-4 mr-2" />
                              Physical Exam
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'review-of-systems' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('review-of-systems')}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              Review of Systems
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'clinical-forms' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('clinical-forms')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Clinical Forms
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'encounter-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('encounter-management')}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Encounter Management
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'patient-summary' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-summary')}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Patient Summary
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'rpm' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('rpm')}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Remote Monitoring
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'ai-consultation' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('ai-consultation')}
                            >
                              <Brain className="w-4 h-4 mr-2" />
                              AI Consultation
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'cds' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('cds')}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Clinical Alerts
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'hl7-labs' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('hl7-labs')}
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              HL7 Labs
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'health-data' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('health-data')}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Health Data
                            </Button>
                          </>
                        )}

                        {/* Pharmacist Menu */}
                        {(user.user_type === 'pharmacist' || user.user_type === 'Pharmacist') && (
                          <>
                            <Button
                              type="button"
                              variant={currentView === 'pharmacy-inventory' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-inventory')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              Pharmacy & Inventory
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'prescriptions' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('prescriptions')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Prescriptions
                            </Button>
                          </>
                        )}

                        {/* Admin Menu */}
                        {(user.user_type === 'admin' || user.user_type === 'root_admin') && (
                          <>
                            <Button
                              type="button"
                              variant={currentView === 'user-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('user-management')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              User Management
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'facility-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('facility-management')}
                            >
                              <Building className="w-4 h-4 mr-2" />
                              Facilities
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'system-settings' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('system-settings')}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Settings / MFA & Policies
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'fhir-integration' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('fhir-integration')}
                            >
                              <Database className="w-4 h-4 mr-2" />
                              FHIR Integration
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'data-import-export' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('data-import-export')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Data Import/Export
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'credentialing' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('credentialing')}
                            >
                              <Award className="w-4 h-4 mr-2" />
                              Credentialing
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'provider-workflows' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('provider-workflows')}
                            >
                              <Workflow className="w-4 h-4 mr-2" />
                              Workflows
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'organizations' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('organizations')}
                            >
                              <Building2 className="w-4 h-4 mr-2" />
                              Organization Mgmt
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'billing-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('billing-management')}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Billing Management
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'security-audit' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('security-audit')}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Security & Audit
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'admin-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('admin-management')}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Admin Management
                            </Button>
                          </>
                        )}

                        {/* Common - All Users */}
                        <div className="pt-4 border-t mt-4">
                            <Button
                              type="button"
                              variant={currentView === 'messaging' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('messaging')}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Messages
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'messaging-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('messaging-management')}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Messaging Management
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'documents' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('documents')}
                            >
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Documents
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'document-management' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('document-management')}
                            >
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Document Management
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'specialized-features' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('specialized-features')}
                            >
                              <Workflow className="w-4 h-4 mr-2" />
                              Specialized Features
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'advanced-features' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('advanced-features')}
                            >
                              <Brain className="w-4 h-4 mr-2" />
                              Advanced Features
                            </Button>
                            <Button
                              type="button"
                              variant={currentView === 'utilities' ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={handleNavClick('utilities')}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Utilities
                            </Button>
                          <Button
                            type="button"
                            variant={currentView === 'profile' ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={handleNavClick('profile')}
                          >
                            <User className="w-4 h-4 mr-2" />
                            My Profile
                          </Button>
                        </div>
                      </nav>
                    </div>
                  </div>

                  {/* Enhanced Main Content */}
                  <div className="flex-1 overflow-auto bg-transparent">
                    <div className="p-4 lg:p-6 animate-in fade-in duration-300">
                      {renderContent()}
                    </div>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
