import React, { useState, useEffect, Suspense, lazy } from 'react'
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
import { PhysicianDashboard, NurseDashboard, PharmacistDashboard, RadiographerDashboard, OTManagerDashboard } from './components/ProviderDashboards.jsx'
import SchedulingCalendar from './components/SchedulingCalendar.jsx'
import BillingDashboard from './components/BillingDashboard.jsx'
import PrescriptionManager from './components/PrescriptionManager.jsx'
import PharmacySearch from './components/PharmacySearch.jsx'
import InsurancePlans from './components/InsurancePlans.jsx'
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
import HL7LabIntegration from './components/HL7LabIntegration.jsx'
import DataImportExport from './components/DataImportExport.jsx'
import EmergencyModule from './components/EmergencyModule.jsx'
import OPDQueueManagement from './components/OPDQueueManagement.jsx'
import ProfessionalCredentialing from './components/ProfessionalCredentialing.jsx'
import PaymentProcessing from './components/PaymentProcessing.jsx'
import HealthDataManagement from './components/HealthDataManagement.jsx'
import PharmacyPOS from './components/PharmacyPOS.jsx'
import PharmacyReporting from './components/PharmacyReporting.jsx'
import PharmacyPatientManagement from './components/PharmacyPatientManagement.jsx'
import PharmacyBillingInsurance from './components/PharmacyBillingInsurance.jsx'
import PharmacyDocumentCompliance from './components/PharmacyDocumentCompliance.jsx'
import EmployeeSelfService from './components/EmployeeSelfService.jsx'
import PatientSummaryDashboard from './components/PatientSummaryDashboard.jsx'
import PatientFlowBoard from './components/PatientFlowBoard.jsx'
import ClinicalFormsManager from './components/ClinicalFormsManager.jsx'
import EncounterManagement from './components/EncounterManagement.jsx'
import BillingManagement from './components/BillingManagement.jsx'
import LabManagement from './components/LabManagement.jsx'
import EPrescribing from './components/EPrescribing.jsx'
import ReportsViewer from './components/ReportsViewer.jsx'
import ONCCertification from './components/ONCCertification.jsx'
import GDPRCompliance from './components/GDPRCompliance.jsx'
import SMARTonFHIR from './components/SMARTonFHIR.jsx'
import HL7Integration from './components/HL7Integration.jsx'
import { ThemeProvider } from './components/ThemeProvider.jsx'
import { ToastProvider } from './components/ui/toast.jsx'
import { AppProvider, useAppContext } from './contexts/AppContext.jsx'
import { PersonalizationProvider, usePersonalization } from './contexts/PersonalizationContext.jsx'
import {
  DigiClinicSidebarFooter,
  DigiClinicSidebarFooterLight,
  PersonalizeFloatingDock,
} from './components/shell/DigiClinicPersonalize.jsx'
import './App.css'
import { BRANDING } from './config/branding.js'
import { withStoredProfilePhoto } from './utils/profilePhoto.js'

const FinanceDepartment = lazy(() => import('./components/FinanceDepartment.jsx'))
const HumanResourceDepartment = lazy(() => import('./components/HumanResourceDepartment.jsx'))
const AdminManagement = lazy(() => import('./components/AdminManagement.jsx'))
const MessagingManagement = lazy(() => import('./components/MessagingManagement.jsx'))
const SpecializedFeatures = lazy(() => import('./components/SpecializedFeatures.jsx'))
const AdvancedFeatures = lazy(() => import('./components/AdvancedFeatures.jsx'))
const UtilitiesView = lazy(() => import('./components/UtilitiesView.jsx'))
const OperationTheatreManagement = lazy(() => import('./components/OperationTheatreManagement.jsx'))
const NursingMARWorkflow = lazy(() => import('./components/NursingMARWorkflow.jsx'))
const RadiologyWorkflow = lazy(() => import('./components/RadiologyWorkflow.jsx'))
const RadiologyViewerHandoff = lazy(() => import('./components/RadiologyViewerHandoff.jsx'))
const RPMMonitor = lazy(() => import('./components/RPMMonitor.jsx'))
const FHIRIntegration = lazy(() => import('./components/FHIRIntegration.jsx'))
const ProviderWorkflows = lazy(() => import('./components/ProviderWorkflows.jsx'))
const LaboratoryModule = lazy(() => import('./components/LaboratoryModule.jsx'))
const PharmacyInventoryModule = lazy(() => import('./components/PharmacyInventoryModule.jsx'))

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
    
    // Extract facility subdomain from hostname for multi-tenant support
    let facilityId = null
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      const subdomain = parts[0]
      if (subdomain && subdomain !== 'www' && subdomain !== 'localhost' && subdomain !== '127') {
        // Try to get facility ID from subdomain
        try {
          const facilityResult = await apiService.request(`/facilities/by-subdomain/${subdomain}`, {
            method: 'GET',
            auth: false
          })
          if (facilityResult.success && facilityResult.facility) {
            facilityId = facilityResult.facility.id
          }
        } catch (err) {
          // Facility lookup failed, continue without facility_id
          console.log('Could not determine facility from subdomain:', err)
        }
      }
    }
    
    const result = await apiService.login(username, password, facilityId)
    
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
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden lg:flex lg:flex-col lg:justify-between bg-slate-950 text-slate-100 p-12 border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <img src={BRANDING.logo} alt="" className="h-10 w-10 rounded-md bg-white p-1 object-contain" />
            <div>
              <p className="text-sm font-semibold tracking-wide uppercase text-teal-300">DigiClinic</p>
              <p className="text-xs text-slate-400">Clinical workspace</p>
            </div>
          </div>
          <div className="mt-14 max-w-md">
            <h1 className="text-3xl font-semibold leading-tight text-slate-50">
              Secure access for care delivery teams
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Use your assigned credentials to access patient operations, scheduling, pharmacy, and
              cross-department workflows.
            </p>
          </div>
          <div className="mt-10 space-y-3 max-w-md">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Access model</p>
              <p className="mt-1 text-sm text-slate-200">Role-based permissions and tenant isolation</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Security</p>
              <p className="mt-1 text-sm text-slate-200">Session control, audit trails, and JWT protection</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">DigiClinic platform environment</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-center gap-3">
              <img src={BRANDING.logo} alt="" className="h-11 w-11 rounded-md border border-slate-200 bg-white p-1 object-contain" />
              <div>
                <CardTitle className="text-2xl font-semibold text-slate-900">Sign in</CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  DigiClinic clinical workspace
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="h-11 border-slate-300 focus-visible:ring-teal-600/30 focus-visible:border-teal-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="h-11 border-slate-300 focus-visible:ring-teal-600/30 focus-visible:border-teal-700"
                />
              </div>
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in to DigiClinic'
                )}
              </Button>
            </form>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Demo credentials</p>
              <div className="space-y-1.5 text-xs text-slate-700">
                <p><span className="font-medium text-slate-600">Admin:</span> <code className="font-mono">admin / admin123</code></p>
                <p><span className="font-medium text-slate-600">Doctor:</span> <code className="font-mono">doctor / doctor123</code></p>
                <p><span className="font-medium text-slate-600">Nurse:</span> <code className="font-mono">nurse / nurse123</code></p>
                <p><span className="font-medium text-slate-600">Reception:</span> <code className="font-mono">receptionist / receptionist123</code></p>
                <p><span className="font-medium text-slate-600">Radiology:</span> <code className="font-mono">radiographer / radiographer123</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

// Navigation Component
function Navigation({ user, onLogout }) {
  const profilePhoto = user?.avatar_url || user?.photo_url

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img src={BRANDING.logo} alt="Clinic+" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900">Clinic+</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              {profilePhoto ? (
                <AvatarImage src={profilePhoto} alt={user?.username || 'User'} />
              ) : null}
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
function PatientManagement({ user, onAddPatient = () => {} }) {
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

  // Patients can only see their own record and cannot add new patients
  const isPatient = user?.user_type === 'patient' || user?.user_type === 'Patient'
  const canCreatePatient = !isPatient

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
            {isPatient ? 'My Patient Record' : 'Patient Management'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isPatient ? 'View your patient record' : 'Manage and search patient records'}
          </p>
        </div>
        {canCreatePatient && (
          <Button className="shadow-lg" type="button" onClick={onAddPatient}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Patient
          </Button>
        )}
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
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-600 mx-auto"></div>
              <Users className="w-6 h-6 text-teal-700 absolute inset-0 m-auto animate-pulse" />
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
                  <Button type="button" onClick={onAddPatient}>
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
                          <Avatar className="w-14 h-14 ring-2 ring-teal-100 group-hover:ring-teal-300 transition-all">
                            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-700 text-white font-semibold text-lg">
                              {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-teal-700 transition-colors">
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
                              <code className="px-2 py-0.5 bg-gray-100 rounded text-teal-700 font-mono">
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

function SelectPatientRequired({ onOpenFinder }) {
  return (
    <div className="p-6">
      <Card className="max-w-md mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Select a patient
          </CardTitle>
          <CardDescription>
            Use Patient Finder to choose who you are documenting or treating. Your selection stays active across clinical tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={onOpenFinder} className="w-full">
            <Search className="w-4 h-4 mr-2" />
            Open Patient Finder
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ClinicalContextBar({ selectedPatient, currentEncounter, onChangePatient, onClear }) {
  if (!selectedPatient) return null
  const name = [selectedPatient.first_name, selectedPatient.last_name].filter(Boolean).join(" ").trim() || "Selected patient"
  const pid = selectedPatient.id ?? selectedPatient.patient_id
  const encId = currentEncounter?.id ?? currentEncounter?.encounter_id
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200/80 bg-teal-50/90 px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3 text-slate-800">
        <span className="font-semibold text-teal-900">Active patient</span>
        <span>{name}</span>
        {pid != null && <span className="text-gray-500 tabular-nums">ID: {pid}</span>}
        {encId != null && (
          <Badge variant="outline" className="text-xs">
            Encounter #{encId}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onChangePatient}>
          Change
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-red-700 hover:text-red-800" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}

// Main App Component
function App() {
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  useEffect(() => {
    const restoreUserFromStorage = () => {
      const raw = localStorage.getItem('auth_user')
      if (!raw) return false
      try {
        const u = withStoredProfilePhoto(JSON.parse(raw))
        setUser(u)
        apiService.setUser(u)
        return true
      } catch {
        return false
      }
    }

    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('auth_user')

      // Keep apiService in sync with localStorage (singleton may have been created before storage was ready)
      if (token) {
        apiService.setToken(token)
      }

      if (token && storedUser) {
        const result = await apiService.getProfile()
        if (result.success) {
          setUser(withStoredProfilePhoto(result.user))
        } else if (result.status === 401) {
          apiService.logout()
        } else {
          // Network errors, 403, timeouts, or profile bugs: do not wipe a valid session on refresh
          if (!restoreUserFromStorage()) {
            apiService.logout()
          }
        }
      } else if (token && !storedUser) {
        const result = await apiService.getProfile()
        if (result.success) {
          setUser(withStoredProfilePhoto(result.user))
        } else if (result.status === 401) {
          apiService.logout()
        }
      }
      setCheckingAuth(false)
    }

    checkAuth()
  }, [])

  const handleLogin = (userData) => {
    setUser(withStoredProfilePhoto(userData))
  }

  const handleUserProfileUpdate = (updatedUser) => {
    if (!updatedUser) return
    setUser(updatedUser)
    apiService.setUser(updatedUser)
  }

  const handleLogout = () => {
    apiService.logout()
    setUser(null)
  }

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-teal-50/30 to-slate-100">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-100 border-t-teal-600 mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Heart className="w-6 h-6 text-teal-600 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900 mb-1">Loading DigiClinic</p>
            <p className="text-sm text-slate-600">Please wait...</p>
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
          <PersonalizationProvider user={user}>
            <AuthenticatedApp
              key={user?.id ?? user?.username ?? 'user'}
              user={user}
              onLogin={handleLogin}
              onUserUpdate={handleUserProfileUpdate}
              onLogout={handleLogout}
            />
          </PersonalizationProvider>
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

/** Sidebar heading: portal = role/facility features, not appearance settings */
function getPortalNavHeading(user, isPatientPortalUser) {
  if (user?.facility?.facility_type === 'pharmacy') {
    return {
      kicker: 'Portal features',
      title: 'Pharmacy',
      hint: 'Inventory, prescriptions, POS & patients',
    }
  }
  if (isPatientPortalUser) {
    return {
      kicker: 'Portal features',
      title: 'Patient',
      hint: 'Appointments, records & messages',
    }
  }
  const t = (user?.user_type || '').toLowerCase().replace(/\s+/g, '_')
  const rows = {
    root_admin: ['Administration', 'Cross-tenant & system control'],
    admin: ['Administration', 'Users, facilities & security'],
    system_administrator: ['Administration', 'Users, facilities & security'],
    receptionist: ['Front desk', 'Scheduling, queue & registration'],
    physician: ['Clinical', 'Encounters, documentation & orders'],
    doctor: ['Clinical', 'Encounters, documentation & orders'],
    provider: ['Clinical', 'Encounters, documentation & orders'],
    nurse: ['Nursing', 'Care tasks, MAR & flow'],
    pharmacist: ['Pharmacy', 'Verification, dispensing & inventory'],
    radiographer: ['Imaging', 'Studies & workflow'],
    ot_manager: ['Theatre', 'Cases & scheduling'],
    billing: ['Revenue', 'Claims, ERA & tracking'],
    finance: ['Finance', 'Ledger, AR/AP & budgets'],
    accountant: ['Finance', 'Ledger, AR/AP & budgets'],
    hr: ['Human resources', 'Staff, leave & payroll'],
    human_resource: ['Human resources', 'Staff, leave & payroll'],
    lab: ['Laboratory', 'Orders, results & QC'],
    lab_technologist: ['Laboratory', 'Orders, results & QC'],
    lab_technician: ['Laboratory', 'Orders, results & QC'],
    pathologist: ['Laboratory', 'Orders, results & QC'],
  }
  const row = rows[t]
  if (row) {
    return { kicker: 'Portal features', title: row[0], hint: row[1] }
  }
  return {
    kicker: 'Portal features',
    title: 'Clinical workspace',
    hint: 'Tools for your assigned role',
  }
}

function initialWorkspaceView(user) {
  const t = (user?.user_type || '').toLowerCase()
  if (t === 'patient') return 'patient-dashboard'
  if (t === 'receptionist') return 'receptionist'
  if (t === 'radiographer' || t === 'radiologist') return 'radiology-workflow'
  return 'dashboard'
}

// Logged-in shell (under AppProvider — can use patient / encounter context)
function AuthenticatedApp({ user, onLogin, onUserUpdate, onLogout }) {
  const [currentView, setCurrentView] = useState(() => initialWorkspaceView(user))
  const normalizedUserType = (user?.user_type || '').toLowerCase()
  const normalizedUserTypeKey = normalizedUserType.replace(/\s+/g, '_')
  const isEssEligible =
    !!user &&
    ![
      'patient',
      'admin',
      'root_admin',
      'system_administrator',
      'finance',
      'accountant',
      'hr',
      'human_resource',
    ].includes(normalizedUserTypeKey)
  const canAccessLabOperations = [
    'admin',
    'system administrator',
    'lab',
    'lab_technologist',
    'lab technician',
    'pathologist'
  ].includes(normalizedUserType)

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
    return `w-full justify-start h-10 transition-colors duration-200 ${
      isActive
        ? 'bg-teal-600 text-white shadow-sm border-l-4 border-teal-300 rounded-l-none font-medium'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;
  };
  const { selectedPatient, selectPatient, currentEncounter, setCurrentEncounter } = useAppContext()
  const {
    setAppShellRef,
    mainSurfaceClass,
    mainCanvasStyle,
    sidebarWidthClass,
    sidebarStyle,
    backgroundId,
  } = usePersonalization()

  const navVariant = (view) =>
    currentView === view
      ? 'sidebarActive'
      : sidebarStyle === 'light'
        ? 'sidebarGhostLight'
        : 'sidebarGhost'

  const isPatientPortalUser =
    user?.user_type === 'patient' || user?.user_type === 'Patient'
  const selectedPatientRecordId = selectedPatient?.id ?? selectedPatient?.patient_id ?? null
  const clinicalPatientId = isPatientPortalUser
    ? user?.patient_id
    : selectedPatientRecordId
  const clinicalEncounterId = isPatientPortalUser
    ? user?.encounter_id
    : (currentEncounter?.id ?? currentEncounter?.encounter_id ?? null)

  const openPatientFinder = () => setCurrentView('patient-finder')
  const authToken = (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null) || null

  const portalNav = getPortalNavHeading(user, isPatientPortalUser)

  const asideSectionBorder = sidebarStyle === 'light' ? 'border-slate-200' : 'border-slate-800'
  const searchInputClass =
    sidebarStyle === 'light'
      ? 'pl-9 h-9 text-xs bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[color:var(--dc-ring,rgba(20,184,166,0.35))]'
      : 'pl-9 h-9 text-xs bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[color:var(--dc-ring,rgba(20,184,166,0.35))]'

  const requireStaffPatient = (content) => {
    if (isPatientPortalUser) return content
    if (!clinicalPatientId) {
      return <SelectPatientRequired onOpenFinder={openPatientFinder} />
    }
    return content
  }

  const renderContent = () => {
    switch (currentView) {
      case 'patients':
        // Patients should not access patient management - redirect to their own portal
        if (user?.user_type === 'patient' || user?.user_type === 'Patient') {
          return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
        }
        return (
          <PatientManagement
            user={user}
            onAddPatient={() => {
              try {
                sessionStorage.setItem('digiclinic_open_add_patient', '1')
              } catch (_) {
                /* ignore */
              }
              setCurrentView('patient-data')
            }}
          />
        )
      case 'patient-data':
        // Patients can only access their own data
        return <PatientDataManager 
          userType={user?.user_type} 
          token={authToken}
          currentUser={user}
        />
      case 'scheduling':
        return <SchedulingCalendar facilityId={user.facility_id} providerId={user.provider_id} />
      case 'billing':
        return <BillingDashboard facilityId={user.facility_id} />
      case 'prescriptions':
        if (user.user_type === 'patient') {
          return <PatientPrescriptionView patientId={user.patient_id} />
        }
        return requireStaffPatient(
          <PrescriptionManager 
          patientId={clinicalPatientId} 
          providerId={user.provider_id} 
          facilityId={user.facility_id}
          userType={user.user_type}
        />
        )
      case 'patient-search':
        // Patients cannot search for other patients
        if (user?.user_type === 'patient' || user?.user_type === 'Patient') {
          return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
        }
        return (
          <PatientSearch
            onSelectPatient={(patient) => {
              selectPatient(patient)
              if (patient) {
                setCurrentView('patient-data')
              }
            }}
            showCreateButton={user?.user_type !== 'patient' && user?.user_type !== 'Patient'}
            onCreatePatient={() => {
              try {
                sessionStorage.setItem('digiclinic_open_add_patient', '1')
              } catch (_) {
                /* ignore */
              }
              setCurrentView('patient-data')
            }}
          />
        )
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
        return requireStaffPatient(<RPMMonitor patientId={clinicalPatientId} />)
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
        return requireStaffPatient(<SOAPNotes patientId={clinicalPatientId} encounterId={clinicalEncounterId} />)
      case 'physical-exam':
        return requireStaffPatient(<PhysicalExam patientId={clinicalPatientId} encounterId={clinicalEncounterId} />)
      case 'review-of-systems':
        return requireStaffPatient(<ReviewOfSystems patientId={clinicalPatientId} encounterId={clinicalEncounterId} />)
      case 'clinical-reminders':
        return requireStaffPatient(<ClinicalReminders patientId={clinicalPatientId} />)
      case 'documents':
        return requireStaffPatient(<DocumentManagement patientId={clinicalPatientId} />)
      case 'messaging':
        return <Messaging />
      case 'billing-tracker':
        return <BillingTracker />
      case 'care-plans':
        return requireStaffPatient(<CarePlans patientId={clinicalPatientId} />)
      case 'treatment-plans':
        return requireStaffPatient(<TreatmentPlans patientId={clinicalPatientId} />)
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
        return requireStaffPatient(<UB04Forms patientId={clinicalPatientId} />)
      case 'provider-dashboard':
        {
          const providerType = (user?.user_type || '').toLowerCase()
          if (providerType === 'physician') return <PhysicianDashboard token={authToken} currentUser={user} />
          if (providerType === 'nurse') return <NurseDashboard token={authToken} currentUser={user} />
          if (providerType === 'pharmacist') return <PharmacistDashboard token={authToken} currentUser={user} />
          if (providerType === 'radiographer' || providerType === 'radiologist') return <RadiographerDashboard token={authToken} currentUser={user} />
          if (providerType === 'ot_manager') return <OTManagerDashboard token={authToken} currentUser={user} />
        }
        return <RoleBasedPortal user={user} />
      case 'profile':
        return <UserProfile user={user} onUserUpdate={onUserUpdate} />
      case 'receptionist':
        return <ReceptionistDashboard />
      case 'doctor-consultation':
        return requireStaffPatient(<DoctorConsultationPage patientId={clinicalPatientId} encounterId={clinicalEncounterId} />)
      case 'ai-consultation':
        return requireStaffPatient(<AIConsultation patientId={clinicalPatientId} />)
      case 'cds':
        return requireStaffPatient(<ClinicalDecisionSupport patientId={clinicalPatientId} encounterId={clinicalEncounterId} />)
      case 'fhir-integration':
        return <FHIRIntegration />
      case 'hl7-labs':
        if (!canAccessLabOperations) return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
        return requireStaffPatient(<HL7LabIntegration patientId={clinicalPatientId} />)
      case 'data-import-export':
        return <DataImportExport />
      case 'emergency':
        return <EmergencyModule />
      case 'opd-queue':
        return <OPDQueueManagement />
      case 'credentialing':
        return <ProfessionalCredentialing />
      case 'payments':
        return requireStaffPatient(<PaymentProcessing patientId={clinicalPatientId} />)
      case 'provider-workflows':
        return <ProviderWorkflows />
      case 'ot-management':
        return <OperationTheatreManagement />
      case 'nursing-mar':
        return <NursingMARWorkflow />
      case 'radiology-workflow':
        return <RadiologyWorkflow />
      case 'health-data':
        return requireStaffPatient(<HealthDataManagement patientId={clinicalPatientId} />)
      case 'laboratory':
        if (!canAccessLabOperations) return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
        return <LaboratoryModule />
      case 'pharmacy-inventory':
        return <PharmacyInventoryModule />
      case 'pharmacy-pos':
        return <PharmacyPOS />
      case 'pharmacy-reporting':
        return <PharmacyReporting />
      case 'pharmacy-patient-management':
        return <PharmacyPatientManagement />
      case 'pharmacy-billing-insurance':
        return <PharmacyBillingInsurance />
      case 'pharmacy-document-compliance':
        return <PharmacyDocumentCompliance />
      case 'patient-summary':
        return requireStaffPatient(<PatientSummaryDashboard patientId={clinicalPatientId || null} onEdit={(id) => setCurrentView('patient-data')} />)
      case 'patient-flow-board':
        return <PatientFlowBoard facilityId={user.facility_id} providerId={user.provider_id} />
      case 'clinical-forms':
        return requireStaffPatient(<ClinicalFormsManager patientId={clinicalPatientId || null} encounterId={clinicalEncounterId || null} />)
      case 'encounter-management':
        return requireStaffPatient(<EncounterManagement patientId={clinicalPatientId} encounterId={clinicalEncounterId} />)
      case 'billing-management':
        return <BillingManagement facilityId={user.facility_id} />
      case 'finance-department':
        return <FinanceDepartment />
      case 'human-resource-department':
        return <HumanResourceDepartment />
      case 'employee-self-service':
        return <EmployeeSelfService />
      case 'lab-management':
        if (!canAccessLabOperations) return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
        return requireStaffPatient(<LabManagement patientId={clinicalPatientId} />)
      case 'eprescribing':
        return requireStaffPatient(<EPrescribing patientId={clinicalPatientId} />)
      case 'reports':
        return <ReportsViewer />
      case 'admin-management':
        return <AdminManagement />
      case 'messaging-management':
        return <MessagingManagement />
      case 'document-management':
        return requireStaffPatient(<DocumentManagement patientId={clinicalPatientId} />)
      case 'specialized-features':
        return <SpecializedFeatures />
      case 'advanced-features':
        return requireStaffPatient(<AdvancedFeatures patientId={clinicalPatientId} />)
      case 'patient-finder':
        // Patients cannot search for other patients
        if (user?.user_type === 'patient' || user?.user_type === 'Patient') {
          return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
        }
        return <PatientSearch onSelectPatient={(patient) => { selectPatient(patient); if (patient) setCurrentView('patient-data') }} showCreateButton={user?.user_type !== 'patient' && user?.user_type !== 'Patient'} />
      case 'utilities':
        return requireStaffPatient(<UtilitiesView patientId={clinicalPatientId} />)
      case 'dashboard':
        return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
      default:
        return <RoleBasedPortal user={user} onNavigate={setCurrentView} />
    }
  }

  return (
          <Routes>
            <Route path="/login" element={<LoginForm onLogin={onLogin} />} />
            <Route
              path="/viewer-handoff/:launchToken"
              element={
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-sm text-gray-600">Loading viewer handoff...</div>
                    </div>
                  }
                >
                  <RadiologyViewerHandoff />
                </Suspense>
              }
            />
            <Route
              path="/*"
              element={
                <div
                  ref={setAppShellRef}
                  className="digiclinic-app flex min-h-screen min-w-0 flex-col bg-slate-100"
                >
                  <header className="bg-white dc-header-accent-bar z-50 flex shrink-0 items-center justify-between px-4 py-3 shadow-sm lg:px-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={BRANDING.logo}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-lg object-contain shadow-sm ring-1 ring-slate-200/90 bg-white"
                      />
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--dc-accent, #0d9488)' }}
                        >
                          DigiClinic
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">
                            {user?.display_name || user?.full_name || user?.username || 'Clinician'}
                          </span>
                          <Badge variant="outline" className="text-xs border-teal-200 text-teal-800 bg-teal-50/80">
                            {user?.user_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-9 w-9 ring-1 ring-slate-200">
                        {user?.avatar_url || user?.photo_url ? (
                          <AvatarImage
                            src={user?.avatar_url || user?.photo_url}
                            alt={user?.display_name || user?.username || 'User'}
                          />
                        ) : null}
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
                          {(user?.display_name || user?.full_name || user?.username || 'U')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Online</span>
                        </div>
                        {user?.facility?.name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate max-w-[10rem]">{user.facility.name}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLogout}
                        className="hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Logout</span>
                      </Button>
                    </div>
                  </header>

                  <div className="flex min-h-0 min-w-0 flex-1 flex-row">
                    <aside
                      className={`digiclinic-sidebar shrink-0 min-h-[calc(100vh-3.25rem)] max-h-[calc(100vh-3.25rem)] sticky top-[3.25rem] flex flex-col border-r overflow-hidden ${sidebarWidthClass} ${
                        sidebarStyle === 'light'
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className={`px-4 pt-4 pb-3 border-b shrink-0 ${asideSectionBorder}`}>
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${sidebarStyle === 'light' ? 'text-slate-500' : 'text-slate-500'}`}
                        >
                          {portalNav.kicker}
                        </p>
                        <p
                          className={`text-sm font-semibold truncate ${sidebarStyle === 'light' ? 'text-slate-900' : 'text-white'}`}
                        >
                          {portalNav.title}
                        </p>
                        <p
                          className={`text-xs mt-1 leading-snug ${sidebarStyle === 'light' ? 'text-slate-500' : 'text-slate-400'}`}
                        >
                          {portalNav.hint}
                        </p>
                      </div>
                      <div className="flex flex-col flex-1 min-h-0 p-4">
                        <div className="relative mb-2 shrink-0">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input placeholder="Search apps or pages..." className={searchInputClass} />
                        </div>
                        <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 text-sm min-h-0 pr-0.5">
                        {/* Check if facility is pharmacy - show pharmacy-focused menu */}
                        {user?.facility?.facility_type === 'pharmacy' ? (
                          <>
                            {/* Pharmacy Dashboard */}
                            <Button
                              type="button"
                              variant={navVariant('dashboard')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('dashboard')}
                            >
                              <Activity className="w-4 h-4 mr-3" />
                              <span className="font-medium">Dashboard</span>
                            </Button>
                            
                            {/* Pharmacy Inventory */}
                            <Button
                              type="button"
                              variant={navVariant('pharmacy-inventory')}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-inventory')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              Pharmacy Inventory
                            </Button>
                            
                            {/* Prescription Management */}
                            <Button
                              type="button"
                              variant={navVariant('prescriptions')}
                              className="w-full justify-start"
                              onClick={handleNavClick('prescriptions')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              Prescription Management
                            </Button>
                            
                            {/* Point of Sale */}
                            <Button
                              type="button"
                              variant={navVariant('pharmacy-pos')}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-pos')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Point of Sale
                            </Button>
                            
                            {/* Patient Management */}
                            <Button
                              type="button"
                              variant={navVariant('pharmacy-patient-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-patient-management')}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Patient Management
                            </Button>
                            
                            {/* Billing & Insurance */}
                            <Button
                              type="button"
                              variant={navVariant('pharmacy-billing-insurance')}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-billing-insurance')}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Billing & Insurance
                            </Button>
                            
                            {/* Reporting & Analytics */}
                            <Button
                              type="button"
                              variant={navVariant('pharmacy-reporting')}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-reporting')}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Reports & Analytics
                            </Button>
                            
                            {/* Documents & Compliance */}
                            <Button
                              type="button"
                              variant={navVariant('pharmacy-document-compliance')}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-document-compliance')}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Documents & Compliance
                            </Button>
                            
                            {/* Patient Search - for finding patients */}
                            <Button
                              type="button"
                              variant={navVariant('patient-search')}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-search')}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Find Patient
                            </Button>
                            
                            {/* Billing - for pharmacy billing */}
                            <Button
                              type="button"
                              variant={navVariant('billing')}
                              className="w-full justify-start"
                              onClick={handleNavClick('billing')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Billing
                            </Button>
                            
                            {/* Payments */}
                            <Button
                              type="button"
                              variant={navVariant('payments')}
                              className="w-full justify-start"
                              onClick={handleNavClick('payments')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Process Payment
                            </Button>
                            
                            {/* Admin Menu - Limited for Pharmacy */}
                            {(user.user_type === 'admin' || user.user_type === 'root_admin' || user.user_type === 'billing' || user.user_type === 'finance' || user.user_type === 'accountant' || user.user_type === 'hr' || user.user_type === 'human_resource') && (
                              <>
                                <div className="pt-4 border-t mt-4">
                                  <Button
                                    type="button"
                                    variant={navVariant('user-management')}
                                    className="w-full justify-start"
                                    onClick={handleNavClick('user-management')}
                                  >
                                    <Users className="w-4 h-4 mr-2" />
                                    Users
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={navVariant('finance-department')}
                                    className="w-full justify-start"
                                    onClick={handleNavClick('finance-department')}
                                  >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Finance Department
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={navVariant('human-resource-department')}
                                    className="w-full justify-start"
                                    onClick={handleNavClick('human-resource-department')}
                                  >
                                    <Users className="w-4 h-4 mr-2" />
                                    Human Resource
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={navVariant('system-settings')}
                                    className="w-full justify-start"
                                    onClick={handleNavClick('system-settings')}
                                  >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Settings
                                  </Button>
                                </div>
                              </>
                            )}
                            
                            {/* Common - Messages and Profile */}
                            <div className="pt-4 border-t mt-4">
                              <Button
                                type="button"
                                variant={navVariant('messaging')}
                                className="w-full justify-start"
                                onClick={handleNavClick('messaging')}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Messages
                              </Button>
                              {isEssEligible && (
                                <Button
                                  type="button"
                                  variant={navVariant('employee-self-service')}
                                  className="w-full justify-start"
                                  onClick={handleNavClick('employee-self-service')}
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Employee Self-Service
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant={navVariant('profile')}
                                className="w-full justify-start"
                                onClick={handleNavClick('profile')}
                              >
                                <User className="w-4 h-4 mr-2" />
                                My Profile
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Standard Menu for Non-Pharmacy Facilities */}
                            {/* Dashboard - All Users */}
                            <Button
                              type="button"
                              variant={navVariant('dashboard')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('dashboard')}
                            >
                              <Activity className="w-4 h-4 mr-3" />
                              <span className="font-medium">Dashboard</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('clinical-reminders')}
                              className="w-full justify-start h-10"
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
                              variant={navVariant('patient-dashboard')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-dashboard')}
                            >
                              <Activity className="w-4 h-4 mr-3" />
                              <span className="font-medium">Dashboard</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-messages')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-messages')}
                            >
                              <MessageSquare className="w-4 h-4 mr-3" />
                              <span className="font-medium">Messages</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-appointments')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-appointments')}
                            >
                              <Calendar className="w-4 h-4 mr-3" />
                              <span className="font-medium">Appointments</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-prescriptions')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-prescriptions')}
                            >
                              <Pill className="w-4 h-4 mr-3" />
                              <span className="font-medium">Prescriptions</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-records')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-records')}
                            >
                              <FileText className="w-4 h-4 mr-3" />
                              <span className="font-medium">Records</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-history')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-history')}
                            >
                              <History className="w-4 h-4 mr-3" />
                              <span className="font-medium">History</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-grant-access')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-grant-access')}
                            >
                              <Share2 className="w-4 h-4 mr-3" />
                              <span className="font-medium">Grant Access</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-billing')}
                              className="w-full justify-start h-10"
                              onClick={handleNavClick('patient-billing')}
                            >
                              <CreditCard className="w-4 h-4 mr-3" />
                              <span className="font-medium">Billing</span>
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-profile')}
                              className="w-full justify-start h-10"
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
                              variant={navVariant('receptionist')}
                              className="w-full justify-start"
                              onClick={handleNavClick('receptionist')}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Reception Desk
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-search')}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-search')}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Patient Search
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-flow-board')}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-flow-board')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Patient Flow Board
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-finder')}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-finder')}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Patient Finder
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('scheduling')}
                              className="w-full justify-start"
                              onClick={handleNavClick('scheduling')}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Appointments
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('billing')}
                              className="w-full justify-start"
                              onClick={handleNavClick('billing')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Billing
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('billing-tracker')}
                              className="w-full justify-start"
                              onClick={handleNavClick('billing-tracker')}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Claims Tracker
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('era')}
                              className="w-full justify-start"
                              onClick={handleNavClick('era')}
                            >
                              <Receipt className="w-4 h-4 mr-2" />
                              ERA (Remittance)
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('ub04-forms')}
                              className="w-full justify-start"
                              onClick={handleNavClick('ub04-forms')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              UB-04 Forms
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('payments')}
                              className="w-full justify-start"
                              onClick={handleNavClick('payments')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Process Payment
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('opd-queue')}
                              className="w-full justify-start"
                              onClick={handleNavClick('opd-queue')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              OPD Queue
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('emergency')}
                              className="w-full justify-start"
                              onClick={handleNavClick('emergency')}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              Emergency
                            </Button>
                          </>
                        )}

                        {/* OT Manager Menu */}
                        {(user.user_type === 'ot_manager' || user.user_type === 'OT Manager') && (
                          <>
                            <Button
                              type="button"
                              variant={navVariant('ot-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('ot-management')}
                            >
                              <ClipboardList className="w-4 h-4 mr-2" />
                              OT Management
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('scheduling')}
                              className="w-full justify-start"
                              onClick={handleNavClick('scheduling')}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              OT Schedule
                            </Button>
                          </>
                        )}

                        {/* Nurse Menu */}
                        {(user.user_type === 'nurse' || user.user_type === 'Nurse') && (
                          <>
                            <Button
                              type="button"
                              variant={navVariant('provider-dashboard')}
                              className="w-full justify-start"
                              onClick={handleNavClick('provider-dashboard')}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Nurse Dashboard
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('nursing-mar')}
                              className="w-full justify-start"
                              onClick={handleNavClick('nursing-mar')}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              MAR Workflow
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-flow-board')}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-flow-board')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Patient Flow Board
                            </Button>
                          </>
                        )}

                        {/* Radiology Menu */}
                        {(user.user_type === 'radiographer' || user.user_type === 'Radiographer' || user.user_type === 'radiologist' || user.user_type === 'Radiologist') && (
                          <>
                            <Button
                              type="button"
                              variant={navVariant('provider-dashboard')}
                              className="w-full justify-start"
                              onClick={handleNavClick('provider-dashboard')}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Radiology Dashboard
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('radiology-workflow')}
                              className="w-full justify-start"
                              onClick={handleNavClick('radiology-workflow')}
                            >
                              <Microscope className="w-4 h-4 mr-2" />
                              Radiology Workflow
                            </Button>
                          </>
                        )}

                        {/* Physician Menu */}
                        {(user.user_type === 'physician' || user.user_type === 'Physician') && (
                          <>
                            <Button
                              type="button"
                              variant={navVariant('doctor-consultation')}
                              className="w-full justify-start"
                              onClick={handleNavClick('doctor-consultation')}
                            >
                              <Stethoscope className="w-4 h-4 mr-2" />
                              Consultation
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('treatment-plans')}
                              className="w-full justify-start"
                              onClick={handleNavClick('treatment-plans')}
                            >
                              <FileCheck className="w-4 h-4 mr-2" />
                              Treatment Plans
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patients')}
                              className="w-full justify-start"
                              onClick={handleNavClick('patients')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              My Patients
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('care-plans')}
                              className="w-full justify-start"
                              onClick={handleNavClick('care-plans')}
                            >
                              <ClipboardList className="w-4 h-4 mr-2" />
                              Care Plans
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('prescriptions')}
                              className="w-full justify-start"
                              onClick={handleNavClick('prescriptions')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              Prescriptions
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('eprescribing')}
                              className="w-full justify-start"
                              onClick={handleNavClick('eprescribing')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              ePrescribing
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('lab-orders')}
                              className="w-full justify-start"
                              onClick={handleNavClick('lab-orders')}
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              Lab Orders
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('scheduling')}
                              className="w-full justify-start"
                              onClick={handleNavClick('scheduling')}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              My Schedule
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('soap-notes')}
                              className="w-full justify-start"
                              onClick={handleNavClick('soap-notes')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              SOAP Notes
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('physical-exam')}
                              className="w-full justify-start"
                              onClick={handleNavClick('physical-exam')}
                            >
                              <Stethoscope className="w-4 h-4 mr-2" />
                              Physical Exam
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('review-of-systems')}
                              className="w-full justify-start"
                              onClick={handleNavClick('review-of-systems')}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              Review of Systems
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('clinical-forms')}
                              className="w-full justify-start"
                              onClick={handleNavClick('clinical-forms')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Clinical Forms
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('encounter-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('encounter-management')}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Encounter Management
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('patient-summary')}
                              className="w-full justify-start"
                              onClick={handleNavClick('patient-summary')}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Patient Summary
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('rpm')}
                              className="w-full justify-start"
                              onClick={handleNavClick('rpm')}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Remote Monitoring
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('ai-consultation')}
                              className="w-full justify-start"
                              onClick={handleNavClick('ai-consultation')}
                            >
                              <Brain className="w-4 h-4 mr-2" />
                              AI Consultation
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('cds')}
                              className="w-full justify-start"
                              onClick={handleNavClick('cds')}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Clinical Alerts
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('health-data')}
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
                              variant={navVariant('pharmacy-inventory')}
                              className="w-full justify-start"
                              onClick={handleNavClick('pharmacy-inventory')}
                            >
                              <Pill className="w-4 h-4 mr-2" />
                              Pharmacy & Inventory
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('prescriptions')}
                              className="w-full justify-start"
                              onClick={handleNavClick('prescriptions')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Prescriptions
                            </Button>
                          </>
                        )}

                        {/* Admin Menu */}
                        {(user.user_type === 'admin' || user.user_type === 'root_admin' || user.user_type === 'billing' || user.user_type === 'finance' || user.user_type === 'accountant' || user.user_type === 'hr' || user.user_type === 'human_resource') && (
                          <>
                            <Button
                              type="button"
                              variant={navVariant('user-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('user-management')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              User Management
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('facility-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('facility-management')}
                            >
                              <Building className="w-4 h-4 mr-2" />
                              Facilities
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('system-settings')}
                              className="w-full justify-start"
                              onClick={handleNavClick('system-settings')}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Settings / MFA & Policies
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('fhir-integration')}
                              className="w-full justify-start"
                              onClick={handleNavClick('fhir-integration')}
                            >
                              <Database className="w-4 h-4 mr-2" />
                              FHIR Integration
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('data-import-export')}
                              className="w-full justify-start"
                              onClick={handleNavClick('data-import-export')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Data Import/Export
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('credentialing')}
                              className="w-full justify-start"
                              onClick={handleNavClick('credentialing')}
                            >
                              <Award className="w-4 h-4 mr-2" />
                              Credentialing
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('provider-workflows')}
                              className="w-full justify-start"
                              onClick={handleNavClick('provider-workflows')}
                            >
                              <Workflow className="w-4 h-4 mr-2" />
                              Workflows
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('organizations')}
                              className="w-full justify-start"
                              onClick={handleNavClick('organizations')}
                            >
                              <Building2 className="w-4 h-4 mr-2" />
                              Organization Mgmt
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('billing-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('billing-management')}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Billing Management
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('finance-department')}
                              className="w-full justify-start"
                              onClick={handleNavClick('finance-department')}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Finance Department
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('human-resource-department')}
                              className="w-full justify-start"
                              onClick={handleNavClick('human-resource-department')}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Human Resource
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('security-audit')}
                              className="w-full justify-start"
                              onClick={handleNavClick('security-audit')}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Security & Audit
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('admin-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('admin-management')}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Admin Management
                            </Button>
                          </>
                        )}
                          </>
                        )}

                        {/* Common - All Users (Hidden for Pharmacy facilities) */}
                        {user?.facility?.facility_type !== 'pharmacy' && (
                        <div className="pt-4 border-t mt-4">
                            <Button
                              type="button"
                              variant={navVariant('messaging')}
                              className="w-full justify-start"
                              onClick={handleNavClick('messaging')}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Messages
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('messaging-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('messaging-management')}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Messaging Management
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('documents')}
                              className="w-full justify-start"
                              onClick={handleNavClick('documents')}
                            >
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Documents
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('document-management')}
                              className="w-full justify-start"
                              onClick={handleNavClick('document-management')}
                            >
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Document Management
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('specialized-features')}
                              className="w-full justify-start"
                              onClick={handleNavClick('specialized-features')}
                            >
                              <Workflow className="w-4 h-4 mr-2" />
                              Specialized Features
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('advanced-features')}
                              className="w-full justify-start"
                              onClick={handleNavClick('advanced-features')}
                            >
                              <Brain className="w-4 h-4 mr-2" />
                              Advanced Features
                            </Button>
                            <Button
                              type="button"
                              variant={navVariant('utilities')}
                              className="w-full justify-start"
                              onClick={handleNavClick('utilities')}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Utilities
                            </Button>
                          {isEssEligible && (
                            <Button
                              type="button"
                              variant={navVariant('employee-self-service')}
                              className="w-full justify-start"
                              onClick={handleNavClick('employee-self-service')}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Employee Self-Service
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant={navVariant('profile')}
                            className="w-full justify-start"
                            onClick={handleNavClick('profile')}
                          >
                            <User className="w-4 h-4 mr-2" />
                            My Profile
                          </Button>
                        </div>
                        )}
                      </nav>
                      {sidebarStyle === 'light' ? (
                        <DigiClinicSidebarFooterLight onNavigate={setCurrentView} />
                      ) : (
                        <DigiClinicSidebarFooter onNavigate={setCurrentView} />
                      )}
                    </div>
                  </aside>

                  <div
                    className={`${mainSurfaceClass} min-h-0 flex-1 overflow-auto`}
                    data-dc-bg={backgroundId}
                    style={mainCanvasStyle}
                  >
                    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
                      <ClinicalContextBar
                        selectedPatient={!isPatientPortalUser ? selectedPatient : null}
                        currentEncounter={currentEncounter}
                        onChangePatient={openPatientFinder}
                        onClear={() => {
                          selectPatient(null)
                          setCurrentEncounter(null)
                        }}
                      />

                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center py-12">
                            <div className="text-sm text-gray-600">Loading module...</div>
                          </div>
                        }
                      >
                        {renderContent()}
                      </Suspense>
                    </div>
                  </div>
                </div>
                <PersonalizeFloatingDock />
                </div>
            } />
          </Routes>
  )
}


export default App

