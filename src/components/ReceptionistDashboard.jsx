import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import CalendarWidget from './CalendarWidget'
import { useAppContext } from '../contexts/AppContext.jsx'
import { 
  UserPlus, 
  Search, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Shield,
  Upload,
  Printer,
  MessageSquare,
  Activity,
  ArrowRight,
  User,
  Stethoscope,
  ClipboardList,
  BarChart3,
  Bell,
  TrendingUp,
  Edit
} from 'lucide-react'
import { apiService } from '../services/apiService.js'
import { formatCurrencySimple } from '../utils/currency'
import { COUNTRIES, DEFAULT_COUNTRY } from '../utils/countries'

export default function ReceptionistDashboard() {
  const { selectedPatient, setSelectedPatient, addNotification, broadcastEvent } = useAppContext()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    todayRegistrations: 0,
    waitingPatients: 0,
    totalCollections: 0,
    avgWaitTime: 0
  })
  const [refreshInterval, setRefreshInterval] = useState(null)

  useEffect(() => {
    loadDashboardStats()
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => {
      loadDashboardStats()
    }, 30000)
    setRefreshInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const loadDashboardStats = async () => {
    try {
      const response = await apiService.get('/receptionist/stats')
      if (response.stats) {
        setStats(response.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      // Use fallback stats on error
      setStats({
        todayRegistrations: 0,
        waitingPatients: 0,
        totalCollections: 0,
        avgWaitTime: 0
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reception Desk</h1>
          <p className="text-gray-600">Patient Registration & Flow Management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Clock className="w-4 h-4 mr-2" />
            {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card hover className="group border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Today's Registrations</p>
                <p className="text-4xl font-bold text-blue-700 mb-1">{stats.todayRegistrations}</p>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>Active</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 transform group-hover:scale-110 transition-transform">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="group border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full -mr-16 -mt-16"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-2">Waiting Patients</p>
                <p className="text-4xl font-bold text-orange-700 mb-1">{stats.waitingPatients}</p>
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <Clock className="w-3 h-3" />
                  <span>In Queue</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 transform group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="group border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -mr-16 -mt-16"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Total Collections</p>
                <p className="text-4xl font-bold text-emerald-700 mb-1">{formatCurrencySimple(stats.totalCollections, 0)}</p>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>Revenue</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 transition-transform">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="group border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full -mr-16 -mt-16"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">Avg Wait Time</p>
                <p className="text-4xl font-bold text-purple-700 mb-1">{stats.avgWaitTime} min</p>
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <Clock className="w-3 h-3" />
                  <span>Average</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 transform group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="register">New Patient</TabsTrigger>
          <TabsTrigger value="search">Search Patient</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewPanel />
        </TabsContent>

        {/* New Patient Registration Tab */}
        <TabsContent value="register" className="space-y-4">
          <NewPatientRegistration onSuccess={loadDashboardStats} />
        </TabsContent>

        {/* Patient Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <PatientSearchPanel />
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <AppointmentsPanel />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <BillingPanel />
        </TabsContent>

        {/* Queue Management Tab */}
        <TabsContent value="queue" className="space-y-4">
          <QueueManagementPanel />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <ReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Overview Panel Component
function OverviewPanel() {
  const [todayAppointments, setTodayAppointments] = useState([])
  const [recentRegistrations, setRecentRegistrations] = useState([])

  useEffect(() => {
    loadOverviewData()
  }, [])

  const loadOverviewData = async () => {
    try {
      const response = await fetch('/api/receptionist/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setTodayAppointments(data.appointments || [])
        setRecentRegistrations(data.registrations || [])
      }
    } catch (error) {
      console.error('Error loading overview:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CalendarWidget compact={false} />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Appointments */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Today's Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todayAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No appointments scheduled</p>
            ) : (
              todayAppointments.map((apt, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{apt.patient_name}</p>
                      <p className="text-sm text-gray-600">{apt.appointment_time}</p>
                    </div>
                  </div>
                  <Badge variant={apt.status === 'checked_in' ? 'default' : 'outline'}>
                    {apt.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Recent Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentRegistrations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent registrations</p>
            ) : (
              recentRegistrations.map((reg, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{reg.patient_name}</p>
                      <p className="text-sm text-gray-600">MRN: {reg.mrn}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{reg.time_ago}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  )
}

// New Patient Registration Component
function NewPatientRegistration({ onSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    nin: '',
    phone_primary: '',
    phone_secondary: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: DEFAULT_COUNTRY,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_group_number: '',
    id_proof_type: '',
    id_proof_number: '',
    referring_doctor: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [insuranceVerifying, setInsuranceVerifying] = useState(false)
  const [insuranceStatus, setInsuranceStatus] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear insurance status when policy number changes
    if (name === 'insurance_policy_number' || name === 'insurance_provider') {
      setInsuranceStatus(null)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage({ type: 'error', text: 'Photo size must be less than 5MB' })
        return
      }
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const verifyInsurance = async () => {
    if (!formData.insurance_provider || !formData.insurance_policy_number) {
      setMessage({ type: 'error', text: 'Please enter insurance provider and policy number' })
      return
    }
    
    setInsuranceVerifying(true)
    try {
      const response = await apiService.post('/receptionist/verify-insurance', {
        provider: formData.insurance_provider,
        policy_number: formData.insurance_policy_number,
        group_number: formData.insurance_group_number
      })
      
      setInsuranceStatus(response.status)
      if (response.status === 'active') {
        setMessage({ type: 'success', text: 'Insurance verified successfully!' })
      } else {
        setMessage({ type: 'warning', text: 'Insurance verification failed or inactive' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Insurance verification failed' })
    } finally {
      setInsuranceVerifying(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Create FormData for file upload
      const submitData = new FormData()
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key])
      })
      
      if (photoFile) {
        submitData.append('photo', photoFile)
      }

      const response = await fetch('/api/receptionist/register-patient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: submitData
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: `Patient registered successfully! MRN: ${data.patient.universal_patient_id}` })
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          middle_name: '',
          date_of_birth: '',
          gender: '',
          nin: '',
          phone_primary: '',
          phone_secondary: '',
          email: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          zip_code: '',
          country: DEFAULT_COUNTRY,
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
          insurance_provider: '',
          insurance_policy_number: '',
          insurance_group_number: '',
          id_proof_type: '',
          id_proof_number: '',
          referring_doctor: ''
        })
        setPhotoFile(null)
        setPhotoPreview(null)
        setInsuranceStatus(null)
        if (onSuccess) onSuccess()
        
        // Show success notification
        setTimeout(() => {
          setMessage({ type: '', text: '' })
        }, 5000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Registration failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-white text-2xl">New Patient Registration</CardTitle>
            <CardDescription className="text-white/80 mt-1">Fast registration form for walk-in patients</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Enhanced Message Display */}
          {message.text && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border-2 shadow-md animate-in slide-in-from-top-2 ${
              message.type === 'success' 
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border-emerald-200' 
                : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <p className="font-medium">{message.text}</p>
            </div>
          )}

          {/* Enhanced Photo Upload Section */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Patient Photo</h3>
                <p className="text-sm text-gray-600">Optional - Upload patient identification photo</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {photoPreview && (
                <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-blue-300 shadow-md">
                  <img src={photoPreview} alt="Patient preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer h-12"
                  variant="filled"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>Max size: 5MB</span>
                  <span>•</span>
                  <span>Formats: JPG, PNG</span>
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Demographics Section */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Demographics</h3>
                <p className="text-sm text-gray-600">Basic patient information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="first_name" className="text-sm font-semibold text-gray-700 mb-2 block">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  variant="filled"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="middle_name" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Middle Name
                </Label>
                <Input
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  variant="filled"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  variant="filled"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  variant="filled"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="gender" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full h-11 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none enhanced"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <Label htmlFor="nin" className="text-sm font-semibold text-gray-700 mb-2 block">
                  National Identification Number (NIN)
                </Label>
                <Input
                  id="nin"
                  name="nin"
                  value={formData.nin}
                  onChange={handleChange}
                  placeholder="Enter NIN"
                  maxLength="11"
                  variant="filled"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Contact Information Section */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-green-50/30 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
                <p className="text-sm text-gray-600">Phone numbers and email address</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_primary" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Primary Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone_primary"
                  name="phone_primary"
                  type="tel"
                  value={formData.phone_primary}
                  onChange={handleChange}
                  required
                  variant="filled"
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="phone_secondary" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Secondary Phone
                </Label>
                <Input
                  id="phone_secondary"
                  name="phone_secondary"
                  type="tel"
                  value={formData.phone_secondary}
                  onChange={handleChange}
                  variant="filled"
                  className="h-11"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  variant="filled"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Address Section */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Address</h3>
                <p className="text-sm text-gray-600">Residential address information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Enhanced Emergency Contact Section */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-orange-50/30 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Emergency Contact</h3>
                <p className="text-sm text-gray-600">Emergency contact person details</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Enhanced Insurance Section */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-cyan-50/30 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Insurance Information</h3>
                <p className="text-sm text-gray-600">Health insurance provider details</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  name="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={handleChange}
                  placeholder="e.g., Blue Cross, Aetna"
                />
              </div>
              <div>
                <Label htmlFor="insurance_policy_number">Policy Number</Label>
                <Input
                  id="insurance_policy_number"
                  name="insurance_policy_number"
                  value={formData.insurance_policy_number}
                  onChange={handleChange}
                  placeholder="Enter policy number"
                />
              </div>
              <div>
                <Label htmlFor="insurance_group_number">Group Number</Label>
                <Input
                  id="insurance_group_number"
                  name="insurance_group_number"
                  value={formData.insurance_group_number}
                  onChange={handleChange}
                  placeholder="Enter group number"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-4">
              <Button
                type="button"
                onClick={verifyInsurance}
                disabled={insuranceVerifying || !formData.insurance_provider || !formData.insurance_policy_number}
                variant="outline"
              >
                {insuranceVerifying ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Insurance
                  </>
                )}
              </Button>
              {insuranceStatus && (
                <Badge variant={insuranceStatus === 'active' ? 'success' : 'destructive'}>
                  {insuranceStatus === 'active' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Not Verified
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>

          {/* Enhanced ID Proof & Referring Doctor */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-teal-50/30 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Additional Information</h3>
                <p className="text-sm text-gray-600">ID proof and referral details</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="id_proof_type">ID Proof Type</Label>
                <select
                  id="id_proof_type"
                  name="id_proof_type"
                  value={formData.id_proof_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select ID Type</option>
                  <option value="Driver License">Driver License</option>
                  <option value="Passport">Passport</option>
                  <option value="National ID">National ID</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="id_proof_number">ID Proof Number</Label>
                <Input
                  id="id_proof_number"
                  name="id_proof_number"
                  value={formData.id_proof_number}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="referring_doctor">Referring Doctor</Label>
                <Input
                  id="referring_doctor"
                  name="referring_doctor"
                  value={formData.referring_doctor}
                  onChange={handleChange}
                  placeholder="If any"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setFormData({
                first_name: '',
                last_name: '',
                middle_name: '',
                date_of_birth: '',
                gender: '',
                nin: '',
                phone_primary: '',
                phone_secondary: '',
                email: '',
                address_line1: '',
                address_line2: '',
                city: '',
                state: '',
                zip_code: '',
                country: DEFAULT_COUNTRY,
                emergency_contact_name: '',
                emergency_contact_phone: '',
                emergency_contact_relationship: '',
                insurance_provider: '',
                insurance_policy_number: '',
                insurance_group_number: '',
                id_proof_type: '',
                id_proof_number: '',
                referring_doctor: ''
              })}
              className="shadow-sm"
            >
              Clear Form
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 min-w-[180px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Register Patient
                </span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Patient Search Panel Component
function PatientSearchPanel() {
  const [searchType, setSearchType] = useState('mrn')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/receptionist/search-patient?type=${searchType}&query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.patients || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVisit = async (patientId) => {
    try {
      const response = await fetch('/api/receptionist/create-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ patient_id: patientId })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Visit created! Token: ${data.visit.registration_token}`)
      }
    } catch (error) {
      console.error('Error creating visit:', error)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Patient Search
          </CardTitle>
          <CardDescription>Search for existing patients using multiple parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Type Selection */}
            <div className="flex space-x-4">
              <Button
                variant={searchType === 'mrn' ? 'default' : 'outline'}
                onClick={() => setSearchType('mrn')}
              >
                MRN
              </Button>
              <Button
                variant={searchType === 'name' ? 'default' : 'outline'}
                onClick={() => setSearchType('name')}
              >
                Name
              </Button>
              <Button
                variant={searchType === 'phone' ? 'default' : 'outline'}
                onClick={() => setSearchType('phone')}
              >
                Phone
              </Button>
              <Button
                variant={searchType === 'dob' ? 'default' : 'outline'}
                onClick={() => setSearchType('dob')}
              >
                Date of Birth
              </Button>
            </div>

            {/* Search Input */}
            <div className="flex space-x-2">
              <Input
                placeholder={`Search by ${searchType.toUpperCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                type={searchType === 'dob' ? 'date' : 'text'}
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Search Results */}
      {searchResults.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Search Results</CardTitle>
              <Badge variant="default" className="text-sm px-3 py-1">
                {searchResults.length} {searchResults.length === 1 ? 'Patient' : 'Patients'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                          {patient.first_name} {patient.last_name}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">MRN:</span>
                          <code className="px-2 py-0.5 bg-gray-100 rounded text-blue-600 font-mono text-xs">
                            {patient.universal_patient_id}
                          </code>
                        </span>
                        <span>DOB: {patient.date_of_birth}</span>
                        <span>Gender: {patient.gender}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateVisit(patient.id);
                      }}
                      className="shadow-md"
                    >
                      Create Visit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatient(patient);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Details */}
      {selectedPatient && (
        <PatientDetailsCard patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}
    </div>
  )
}

// Enhanced Patient Details Card Component
function PatientDetailsCard({ patient, onClose }) {
  return (
    <Card className="border-0 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-white text-2xl">
                {patient.first_name} {patient.last_name}
              </CardTitle>
              <CardDescription className="text-white/80 mt-1">
                Patient Details & Information
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white hover:bg-white/20 hover:text-white"
          >
            <XCircle className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-lg text-gray-900">Demographics</h4>
            </div>
            <div className="space-y-3 pl-7">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</p>
                <p className="font-semibold text-gray-900">{patient.first_name} {patient.last_name}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Medical Record Number</p>
                <code className="text-blue-600 font-mono font-semibold">{patient.universal_patient_id}</code>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Date of Birth</p>
                <p className="font-semibold text-gray-900">{patient.date_of_birth}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Gender</p>
                <p className="font-semibold text-gray-900">{patient.gender}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-lg text-gray-900">Contact Information</h4>
            </div>
            <div className="space-y-3 pl-7">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
                <p className="font-semibold text-gray-900">{patient.phone_primary || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
                <p className="font-semibold text-gray-900">{patient.email || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Address</p>
                <p className="font-semibold text-gray-900">{patient.address_line1 || 'N/A'}</p>
                {patient.city && (
                  <p className="text-sm text-gray-600 mt-1">
                    {patient.city}, {patient.state} {patient.zip_code}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-purple-600" />
              <h4 className="font-bold text-lg text-gray-900">Insurance</h4>
            </div>
            <div className="space-y-3 pl-7">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Provider</p>
                <p className="font-semibold text-gray-900">{patient.insurance_provider || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Policy Number</p>
                <p className="font-semibold text-gray-900">{patient.insurance_policy_number || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h4 className="font-bold text-lg text-gray-900">Emergency Contact</h4>
            </div>
            <div className="space-y-3 pl-7">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Contact Name</p>
                <p className="font-semibold text-gray-900">{patient.emergency_contact_name || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Contact Phone</p>
                <p className="font-semibold text-gray-900">{patient.emergency_contact_phone || 'N/A'}</p>
              </div>
              {patient.emergency_contact_relationship && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Relationship</p>
                  <p className="font-semibold text-gray-900">{patient.emergency_contact_relationship}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
          <Button className="flex-1 shadow-md">
            <FileText className="w-4 h-4 mr-2" />
            View Full Record
          </Button>
          <Button variant="outline" className="flex-1">
            <Edit className="w-4 h-4 mr-2" />
            Edit Patient
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Appointments Panel Component
function AppointmentsPanel() {
  const [appointments, setAppointments] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAppointments()
  }, [selectedDate])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/receptionist/appointments?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (appointmentId) => {
    try {
      const response = await fetch(`/api/receptionist/check-in/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        loadAppointments()
        alert('Patient checked in successfully!')
      }
    } catch (error) {
      console.error('Error checking in:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Appointment Management
        </CardTitle>
        <CardDescription>View and manage scheduled appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date Selector */}
          <div className="flex items-center space-x-4">
            <Label>Select Date:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <Button onClick={loadAppointments} size="sm">
              Refresh
            </Button>
          </div>

          {/* Appointments List */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No appointments for this date</p>
            ) : (
              appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{apt.time}</p>
                      <p className="text-xs text-gray-600">{apt.duration} min</p>
                    </div>
                    <div>
                      <p className="font-semibold">{apt.patient_name}</p>
                      <p className="text-sm text-gray-600">MRN: {apt.mrn}</p>
                      <p className="text-sm text-gray-600">Dr. {apt.provider_name}</p>
                      <p className="text-sm text-gray-500">{apt.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      apt.status === 'checked_in' ? 'default' :
                      apt.status === 'completed' ? 'secondary' :
                      'outline'
                    }>
                      {apt.status}
                    </Badge>
                    {apt.status === 'scheduled' && (
                      <Button size="sm" onClick={() => handleCheckIn(apt.id)}>
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Billing Panel Component
function BillingPanel() {
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [billItems, setBillItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amount, setAmount] = useState('')

  const handleGenerateBill = async () => {
    if (!selectedPatient) {
      alert('Please select a patient first')
      return
    }

    try {
      const response = await fetch('/api/receptionist/generate-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          items: billItems,
          payment_method: paymentMethod,
          amount: parseFloat(amount)
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Bill generated! Receipt ID: ${data.receipt_id}`)
        // Reset form
        setBillItems([])
        setAmount('')
      }
    } catch (error) {
      console.error('Error generating bill:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* OPD Fee Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            OPD/Consultation Fee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Patient MRN</Label>
              <Input
                placeholder="Search patient..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Consultation Fee</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
            <Button className="w-full" onClick={handleGenerateBill}>
              <CreditCard className="w-4 h-4 mr-2" />
              Process Payment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Insurance Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Insurance Provider</Label>
              <Input placeholder="Provider name" />
            </div>
            <div>
              <Label>Policy Number</Label>
              <Input placeholder="Policy number" />
            </div>
            <div>
              <Label>Group Number</Label>
              <Input placeholder="Group number" />
            </div>
            <Button className="w-full" variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Verify Coverage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Queue Management Panel Component
function QueueManagementPanel() {
  const [queueEntries, setQueueEntries] = useState([])
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('')

  useEffect(() => {
    loadQueue()
    loadProviders()
  }, [selectedProvider])

  const loadQueue = async () => {
    try {
      const url = selectedProvider 
        ? `/api/receptionist/queue?provider_id=${selectedProvider}`
        : '/api/receptionist/queue'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQueueEntries(data.queue || [])
      }
    } catch (error) {
      console.error('Error loading queue:', error)
    }
  }

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/receptionist/providers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || [])
      }
    } catch (error) {
      console.error('Error loading providers:', error)
    }
  }

  const updateStatus = async (queueId, newStatus) => {
    try {
      const response = await fetch(`/api/receptionist/queue/${queueId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        loadQueue()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardList className="w-5 h-5 mr-2" />
          Queue Management & Patient Flow
        </CardTitle>
        <CardDescription>Track patient status and waiting times</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Provider Filter */}
          <div className="flex items-center space-x-4">
            <Label>Filter by Provider:</Label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Providers</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  Dr. {provider.name} - {provider.specialty}
                </option>
              ))}
            </select>
            <Button onClick={loadQueue} size="sm">
              Refresh
            </Button>
          </div>

          {/* Queue Display */}
          <div className="space-y-3">
            {queueEntries.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No patients in queue</p>
            ) : (
              queueEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4"
                  style={{
                    borderLeftColor: 
                      entry.status === 'waiting' ? '#f59e0b' :
                      entry.status === 'in_consultation' ? '#3b82f6' :
                      entry.status === 'completed' ? '#10b981' : '#6b7280'
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">{entry.token}</p>
                      <p className="text-xs text-gray-600">Token</p>
                    </div>
                    <div>
                      <p className="font-semibold">{entry.patient_name}</p>
                      <p className="text-sm text-gray-600">MRN: {entry.mrn}</p>
                      <p className="text-sm text-gray-600">Dr. {entry.provider_name}</p>
                      <p className="text-xs text-gray-500">Wait time: {entry.wait_time} min</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      entry.status === 'waiting' ? 'outline' :
                      entry.status === 'in_consultation' ? 'default' :
                      'secondary'
                    }>
                      {entry.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {entry.status === 'waiting' && (
                      <Button size="sm" onClick={() => updateStatus(entry.id, 'in_consultation')}>
                        Call Patient
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Reports Panel Component
function ReportsPanel() {
  const [reportType, setReportType] = useState('daily')
  const [reportData, setReportData] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const generateReport = async () => {
    try {
      const response = await fetch(`/api/receptionist/reports/${reportType}?start=${dateRange.start}&end=${dateRange.end}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(data.report)
      }
    } catch (error) {
      console.error('Error generating report:', error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Report Type</Label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="daily">Daily Summary</option>
                  <option value="shift">Shift Report</option>
                  <option value="collections">Collections Report</option>
                  <option value="wait_times">Wait Times Analysis</option>
                </select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={generateReport}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.total_patients || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Collections</p>
                <p className="text-2xl font-bold text-green-600">${reportData.total_collections || 0}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.avg_wait_time || 0} min</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">No Shows</p>
                <p className="text-2xl font-bold text-orange-600">{reportData.no_shows || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
