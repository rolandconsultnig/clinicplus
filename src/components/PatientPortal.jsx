/**
 * Patient Portal Component - Enhanced
 * Complete patient portal with appointments, records, billing, and messaging
 */
import React, { useState, useEffect } from 'react'
import { apiService } from '../services/apiService.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx'
import { Button } from './ui/button.jsx'
import { Input } from './ui/input.jsx'
import { Label } from './ui/label.jsx'
import { Badge } from './ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.jsx'
import { Textarea } from './ui/textarea.jsx'
import { Alert, AlertDescription } from './ui/alert.jsx'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.jsx'
import PatientPrescriptionView from './PatientPrescriptionView'
import PatientAppointmentBooking from './PatientAppointmentBooking'
import { 
  User, 
  MessageSquare,
  Calendar,
  FileText,
  CreditCard,
  TestTube,
  Pill,
  Send,
  Plus,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileCheck,
  Activity,
  Edit,
  Save,
  Key,
  Mail,
  Phone,
  MapPin,
  Shield,
  Lock,
  History,
  Share2,
  Copy,
  CheckCircle2,
  RefreshCw,
  Building2
} from 'lucide-react'

const PatientPortal = ({ initialTab = 'dashboard' }) => {
  const [messages, setMessages] = useState([])
  const [appointments, setAppointments] = useState([])
  const [medicalRecords, setMedicalRecords] = useState([])
  const [labResults, setLabResults] = useState([])
  const [billingStatements, setBillingStatements] = useState([])
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showCompose, setShowCompose] = useState(false)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    unreadMessages: 0,
    pendingLabResults: 0,
    outstandingBalance: 0
  })
  const [prescriptions, setPrescriptions] = useState([])
  const [healthMetrics, setHealthMetrics] = useState(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [formData, setFormData] = useState({
    subject: '',
    message_body: '',
    message_type: 'general'
  })
  const [appointmentForm, setAppointmentForm] = useState({
    provider_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    appointment_type: 'routine'
  })
  const [profileData, setProfileData] = useState(null)
  const [profileEditMode, setProfileEditMode] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileFormData, setProfileFormData] = useState({})
  const [passwordFormData, setPasswordFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [medicalHistory, setMedicalHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [otpData, setOtpData] = useState(null)
  const [generatingOTP, setGeneratingOTP] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState('')
  const [accessScope, setAccessScope] = useState({
    demographics: true,
    medical_history: true,
    allergies: true,
    medications: true,
    lab_results: true,
    encounters: true
  })

  useEffect(() => {
    const userData = localStorage.getItem('auth_user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      // Always load the logged-in user's own data - no patient selection needed
      const patientId = parsedUser.patient_id || parsedUser.id
      if (patientId) {
        loadDashboardData(patientId)
      }
    }
  }, [])

  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  useEffect(() => {
    if (activeTab === 'messages') {
      loadMessages()
    } else if (activeTab === 'appointments') {
      loadAppointments()
    } else if (activeTab === 'records') {
      loadMedicalRecords()
    } else if (activeTab === 'billing') {
      loadBillingStatements()
    } else if (activeTab === 'profile') {
      loadProfile()
    } else if (activeTab === 'history') {
      loadMedicalHistory()
    }
  }, [activeTab])

  const loadDashboardData = async (patientId) => {
    try {
      const [apptsRes, msgsRes, labsRes, billingRes] = await Promise.all([
        apiService.request(`/appointments?patient_id=${patientId}&status=upcoming`),
        apiService.request('/portal/messages'),
        apiService.request(`/labs/results?patient_id=${patientId}&status=pending`),
        apiService.request(`/billing/statements?patient_id=${patientId}`)
      ])

      setStats({
        upcomingAppointments: apptsRes.appointments?.length || 0,
        unreadMessages: msgsRes.messages?.filter(m => m.status === 'unread').length || 0,
        pendingLabResults: labsRes.results?.length || 0,
        outstandingBalance: billingRes.total_balance || 0
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const loadMessages = async () => {
    try {
      const result = await apiService.request('/portal/messages')
      if (result.success) {
        setMessages(result.messages || [])
      }
    } catch (error) {
      console.error('Error loading portal messages:', error)
    }
  }

  const loadAppointments = async () => {
    try {
      const result = await apiService.request(`/appointments?patient_id=${user?.patient_id || user?.id}`)
      if (result.success) {
        setAppointments(result.appointments || [])
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
    }
  }

  const loadMedicalRecords = async () => {
    try {
      const [recordsRes, labsRes] = await Promise.all([
        apiService.request(`/patients/${user?.patient_id || user?.id}/records`),
        apiService.request(`/labs/results?patient_id=${user?.patient_id || user?.id}`)
      ])
      
      setMedicalRecords(recordsRes.records || [])
      setLabResults(labsRes.results || [])
    } catch (error) {
      console.error('Error loading medical records:', error)
    }
  }

  const loadBillingStatements = async () => {
    try {
      const result = await apiService.request(`/billing/statements?patient_id=${user?.patient_id || user?.id}`)
      if (result.success) {
        setBillingStatements(result.statements || [])
      }
    } catch (error) {
      console.error('Error loading billing statements:', error)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    try {
      const result = await apiService.request('/portal/messages', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      if (result.success) {
        await loadMessages()
        setShowCompose(false)
        resetForm()
        alert('Message sent successfully')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message: ' + (error.message || 'Unknown error'))
    }
  }

  const handleBookAppointment = async (e) => {
    e.preventDefault()
    try {
      const result = await apiService.request('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          ...appointmentForm,
          patient_id: user?.patient_id || user?.id
        })
      })
      if (result.success) {
        alert('Appointment booked successfully!')
        setShowAppointmentForm(false)
        setAppointmentForm({
          provider_id: '',
          appointment_date: '',
          appointment_time: '',
          reason: '',
          appointment_type: 'routine'
        })
        loadAppointments()
        loadDashboardData(user?.patient_id || user?.id)
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      alert('Error booking appointment: ' + (error.message || 'Unknown error'))
    }
  }

  const loadPrescriptions = async () => {
    try {
      const result = await apiService.request(`/portal/prescriptions?patient_id=${user?.patient_id || user?.id}`)
      if (result.success) {
        setPrescriptions(result.prescriptions || [])
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error)
    }
  }

  const requestRefill = async (prescriptionId) => {
    try {
      const result = await apiService.request(`/portal/prescriptions/${prescriptionId}/refill`, {
        method: 'POST'
      })
      if (result.success) {
        alert('Refill request submitted successfully!')
        loadPrescriptions()
      }
    } catch (error) {
      console.error('Error requesting refill:', error)
      alert('Error requesting refill')
    }
  }

  const uploadDocument = async (file, documentType) => {
    setUploadingDocument(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', documentType)
      formData.append('patient_id', user?.patient_id || user?.id)

      const response = await fetch('/api/portal/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      })

      if (response.ok) {
        alert('Document uploaded successfully!')
        loadMedicalRecords()
      } else {
        alert('Error uploading document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document')
    } finally {
      setUploadingDocument(false)
    }
  }

  const loadHealthMetrics = async () => {
    try {
      const result = await apiService.request(`/portal/health-metrics?patient_id=${user?.patient_id || user?.id}`)
      if (result.success) {
        setHealthMetrics(result.metrics)
      }
    } catch (error) {
      console.error('Error loading health metrics:', error)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    
    try {
      const result = await apiService.request(`/appointments/${appointmentId}`, {
        method: 'DELETE'
      })
      if (result.success) {
        alert('Appointment cancelled successfully')
        loadAppointments()
        loadDashboardData(user?.patient_id || user?.id)
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Error cancelling appointment')
    }
  }

  const downloadRecord = async (recordId) => {
    try {
      const result = await apiService.request(`/patients/records/${recordId}/download`)
      if (result.success && result.url) {
        window.open(result.url, '_blank')
      }
    } catch (error) {
      console.error('Error downloading record:', error)
      alert('Error downloading record')
    }
  }

  const loadMedicalHistory = async () => {
    try {
      setLoadingHistory(true)
      // Always use the logged-in user's patient ID - no selection needed
      const patientId = user?.patient_id || user?.id
      if (!patientId) {
        console.warn('Patient ID not found for logged-in user')
        setMedicalHistory([])
        return
      }

      const result = await apiService.request(`/secure/medical/patients/${patientId}/medical-history`, 'GET')
      if (result.success) {
        setMedicalHistory(result.medical_history || [])
      } else {
        setMedicalHistory([])
      }
    } catch (error) {
      console.error('Error loading medical history:', error)
      setMedicalHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const generateOTP = async () => {
    try {
      setGeneratingOTP(true)
      setOtpError('')
      setOtpSuccess('')
      
      const patientId = user?.patient_id || user?.id
      if (!patientId) {
        setOtpError('Patient ID not found')
        return
      }

      const scopeArray = Object.entries(accessScope)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => key)

      const result = await apiService.request('/otp/patient/generate', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          access_scope: scopeArray,
          phone_number: user?.phone || user?.phone_primary
        })
      })

      if (result.success) {
        setOtpData({
          otp_id: result.otp_id,
          expires_at: result.expires_at,
          phone_number: result.phone_number
        })
        setOtpSuccess('OTP generated successfully! Check your phone for the code.')
      } else {
        setOtpError(result.error || 'Failed to generate OTP')
      }
    } catch (error) {
      console.error('Error generating OTP:', error)
      setOtpError(error.message || 'Failed to generate OTP')
    } finally {
      setGeneratingOTP(false)
    }
  }

  const copyOTPToClipboard = async (otpCode) => {
    try {
      await navigator.clipboard.writeText(otpCode)
      alert('OTP copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy OTP:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      subject: '',
      message_body: '',
      message_type: 'general'
    })
  }

  const loadProfile = async () => {
    try {
      const result = await apiService.getProfile()
      if (result.success && result.user) {
        const userData = result.user
        setProfileData(userData)
        setProfileFormData({
          username: userData.username || '',
          email: userData.email || '',
          first_name: userData.patient_info?.first_name || '',
          last_name: userData.patient_info?.last_name || '',
          phone: userData.patient_info?.phone_primary || userData.patient_info?.phone || '',
          address: userData.patient_info?.address || '',
          date_of_birth: userData.patient_info?.date_of_birth || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const validateProfileForm = () => {
    setProfileError('')
    
    if (!profileFormData.username || profileFormData.username.trim() === '') {
      setProfileError('Username is required')
      return false
    }
    
    if (!profileFormData.email || profileFormData.email.trim() === '') {
      setProfileError('Email is required')
      return false
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profileFormData.email)) {
      setProfileError('Please enter a valid email address')
      return false
    }
    
    if (!profileFormData.first_name || profileFormData.first_name.trim() === '') {
      setProfileError('First name is required')
      return false
    }
    
    if (!profileFormData.last_name || profileFormData.last_name.trim() === '') {
      setProfileError('Last name is required')
      return false
    }
    
    if (!profileFormData.phone || profileFormData.phone.trim() === '') {
      setProfileError('Phone number is required')
      return false
    }
    
    return true
  }

  const saveProfile = async () => {
    setProfileError('')
    setProfileSuccess('')
    
    if (!validateProfileForm()) {
      return
    }
    
    try {
      setProfileSaving(true)
      const updateData = {
        username: profileFormData.username.trim(),
        email: profileFormData.email.trim(),
        patient_data: {
          first_name: profileFormData.first_name.trim(),
          last_name: profileFormData.last_name.trim(),
          phone: profileFormData.phone.trim(),
          address: profileFormData.address?.trim() || ''
        }
      }

      const result = await apiService.request('/auth/jwt/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      if (result.success) {
        setProfileSuccess('Profile updated successfully!')
        setProfileEditMode(false)
        await loadProfile()
        // Clear success message after 3 seconds
        setTimeout(() => setProfileSuccess(''), 3000)
      } else {
        setProfileError(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setProfileError('Error updating profile: ' + (error.message || 'Unknown error'))
    } finally {
      setProfileSaving(false)
    }
  }

  const changePassword = async () => {
    if (passwordFormData.new_password !== passwordFormData.confirm_password) {
      alert('New passwords do not match')
      return
    }

    if (passwordFormData.new_password.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    try {
      setProfileSaving(true)
      const result = await apiService.request('/auth/jwt/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: passwordFormData.current_password,
          new_password: passwordFormData.new_password
        })
      })

      if (result.success) {
        alert('Password changed successfully!')
        setPasswordFormData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        })
      } else {
        alert(result.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Error changing password: ' + (error.message || 'Unknown error'))
    } finally {
      setProfileSaving(false)
    }
  }

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Patient'
  const avatarFallback = fullName ? fullName.charAt(0).toUpperCase() : 'P'

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 rounded-2xl">
      {/* Hero Profile Header */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-4 ring-white/30">
              <AvatarImage src={user?.photo_url || user?.avatar_url} alt={fullName} />
              <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white/80 text-sm">Welcome back,</p>
              <h1 className="text-3xl font-bold text-white leading-tight">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                  <Shield className="w-4 h-4 mr-1" />
                  Patient Portal
                </Badge>
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-white/15 text-white rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Appointments</p>
              <p className="text-2xl font-bold">{stats.upcomingAppointments}</p>
            </div>
            <div className="bg-white/15 text-white rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Messages</p>
              <p className="text-2xl font-bold">{stats.unreadMessages}</p>
            </div>
            <div className="bg-white/15 text-white rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Lab Results</p>
              <p className="text-2xl font-bold">{stats.pendingLabResults}</p>
            </div>
            <div className="bg-white/15 text-white rounded-xl p-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Balance</p>
              <p className="text-2xl font-bold">${stats.outstandingBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="messages">
            Messages {stats.unreadMessages > 0 && `(${stats.unreadMessages})`}
          </TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="grant-access">Grant Access</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Upcoming Appointments</p>
                    <p className="text-2xl font-bold">{stats.upcomingAppointments}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unread Messages</p>
                    <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Lab Results</p>
                    <p className="text-2xl font-bold">{stats.pendingLabResults}</p>
                  </div>
                  <TestTube className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Balance</p>
                    <p className="text-2xl font-bold">${stats.outstandingBalance.toFixed(2)}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={() => setShowAppointmentForm(true)} variant="outline" className="h-auto py-4 flex-col">
                  <Calendar className="w-6 h-6 mb-2" />
                  Book Appointment
                </Button>
                <Button onClick={() => setActiveTab('messages')} variant="outline" className="h-auto py-4 flex-col">
                  <MessageSquare className="w-6 h-6 mb-2" />
                  Send Message
                </Button>
                <Button onClick={() => setActiveTab('records')} variant="outline" className="h-auto py-4 flex-col">
                  <FileText className="w-6 h-6 mb-2" />
                  View Records
                </Button>
                <Button onClick={() => setActiveTab('billing')} variant="outline" className="h-auto py-4 flex-col">
                  <CreditCard className="w-6 h-6 mb-2" />
                  Pay Bill
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {showCompose && (
            <Card className="mb-6 border-2 border-blue-200">
              <CardHeader>
                <CardTitle>Send Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSend} className="space-y-4">
                  <div>
                    <Label>Subject *</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Message *</Label>
                    <Textarea
                      value={formData.message_body}
                      onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                      required
                      rows={5}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowCompose(false); resetForm(); }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Messages</CardTitle>
                <Button onClick={() => setShowCompose(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No messages found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`p-4 border rounded-lg ${msg.status === 'unread' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                          <p className="text-sm text-gray-600 mt-1">{msg.message_body}</p>
                          {msg.created_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {msg.status === 'unread' && (
                          <Badge className="bg-blue-600">New</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Appointments</CardTitle>
                  <CardDescription>Schedule and manage your appointments</CardDescription>
                </div>
                <Button onClick={() => setShowAppointmentForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAppointmentForm && (
                <div className="mb-6">
                  <PatientAppointmentBooking 
                    patientId={user?.patient_id || user?.id}
                    onBookingSuccess={(appointment) => {
                      setShowAppointmentForm(false);
                      loadAppointments();
                      loadDashboardData(user?.patient_id || user?.id);
                    }}
                  />
                </div>
              )}

              {appointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No appointments scheduled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <Card key={apt.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{apt.provider_name || 'Provider'}</h3>
                              <Badge variant={apt.status === 'confirmed' ? 'default' : 'outline'}>
                                {apt.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(apt.appointment_date).toLocaleDateString()} at {apt.appointment_time}
                            </p>
                            {apt.reason && (
                              <p className="text-sm text-gray-700">{apt.reason}</p>
                            )}
                          </div>
                          {apt.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelAppointment(apt.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          {user && (user.patient_id || user.id) ? (
            <PatientPrescriptionView patientId={user.patient_id || user.id} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading your prescriptions...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="records">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medical Records</CardTitle>
                <CardDescription>View your medical records and documents</CardDescription>
              </CardHeader>
              <CardContent>
                {medicalRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No medical records available.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medicalRecords.map((record) => (
                      <Card key={record.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <h3 className="font-semibold">{record.document_type || 'Medical Record'}</h3>
                                <Badge variant="outline">{record.category}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                Date: {new Date(record.date).toLocaleDateString()}
                              </p>
                              {record.description && (
                                <p className="text-sm text-gray-700">{record.description}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadRecord(record.id)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lab Results</CardTitle>
              </CardHeader>
              <CardContent>
                {labResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TestTube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No lab results available.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {labResults.map((result) => (
                      <Card key={result.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{result.test_name}</h3>
                                <Badge className={result.abnormal ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                  {result.abnormal ? 'Abnormal' : 'Normal'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                Result: {result.value} {result.unit} | 
                                Reference: {result.reference_range} |
                                Date: {new Date(result.result_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <CardTitle>Medical History</CardTitle>
              </div>
              <CardDescription>View your complete medical history, diagnoses, and treatments</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading medical history...</p>
                </div>
              ) : medicalHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No medical history records available.</p>
                  <p className="text-sm mt-2">Your medical history will appear here once records are added by your healthcare provider.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicalHistory.map((history) => (
                    <Card key={history.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900">{history.condition || history.diagnosis || 'Medical Condition'}</h3>
                              {history.status && (
                                <Badge variant={history.status === 'active' ? 'default' : 'outline'}>
                                  {history.status}
                                </Badge>
                              )}
                            </div>
                            {history.diagnosis_date && (
                              <p className="text-sm text-gray-600 mb-2">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Diagnosed: {new Date(history.diagnosis_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            )}
                            {history.description && (
                              <p className="text-sm text-gray-700 mb-2">{history.description}</p>
                            )}
                            {history.treatment && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 mb-1">Treatment:</p>
                                <p className="text-sm text-blue-800">{history.treatment}</p>
                              </div>
                            )}
                            {history.notes && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                                <p className="text-sm text-gray-600">{history.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t">
                          {history.diagnosed_by && (
                            <span>
                              <User className="w-3 h-3 inline mr-1" />
                              Diagnosed by: {history.diagnosed_by}
                            </span>
                          )}
                          {history.facility_name && (
                            <span>
                              <Building2 className="w-3 h-3 inline mr-1" />
                              {history.facility_name}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grant-access" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-green-600" />
                <CardTitle>Grant Access to Medical History</CardTitle>
              </div>
              <CardDescription>Generate a secure OTP code to share with healthcare providers for authorized access to your medical history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Access Scope Selection */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Data to Share</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(accessScope).map(([key, enabled]) => (
                    <div key={key} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setAccessScope({ ...accessScope, [key]: !enabled })}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => setAccessScope({ ...accessScope, [key]: !enabled })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <Label className="cursor-pointer text-sm font-medium capitalize">
                        {key.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* OTP Generation */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-base font-semibold">Generate Authorization Code</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      This code will be sent to your registered phone number and can be shared with healthcare providers
                    </p>
                  </div>
                  <Button 
                    onClick={generateOTP} 
                    disabled={generatingOTP}
                    className="flex items-center gap-2"
                  >
                    {generatingOTP ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Generate OTP
                      </>
                    )}
                  </Button>
                </div>

                {/* Error Message */}
                {otpError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{otpError}</AlertDescription>
                  </Alert>
                )}

                {/* Success Message */}
                {otpSuccess && (
                  <Alert className="mb-4 bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">{otpSuccess}</AlertDescription>
                  </Alert>
                )}

                {/* OTP Display */}
                {otpData && (
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <Shield className="w-6 h-6 text-blue-600" />
                          <h3 className="text-lg font-bold text-gray-900">Authorization Code Generated</h3>
                        </div>
                        
                        <div className="bg-white rounded-lg p-6 border-2 border-dashed border-blue-300">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-semibold text-gray-900">Code sent to your phone!</p>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            Check your SMS messages for the 6-digit authorization code. Share this code with your healthcare provider when they request access to your medical records.
                          </p>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-2">Code Format:</p>
                            <div className="flex items-center justify-center gap-2">
                              <div className="flex gap-1">
                                {[1,2,3,4,5,6].map((i) => (
                                  <div key={i} className="w-8 h-10 bg-white border-2 border-blue-300 rounded flex items-center justify-center">
                                    <span className="text-blue-600 font-bold">•</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-2">6-digit code</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Expires: {new Date(otpData.expires_at).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>Sent to: {otpData.phone_number}</span>
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-semibold mb-1">Security Notice:</p>
                              <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>This code is valid for 15 minutes only</li>
                                <li>Only share with trusted healthcare providers</li>
                                <li>The code can only be used once</li>
                                <li>You will be notified when the code is used</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Instructions */}
                {!otpData && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h4 className="font-semibold text-sm mb-2">How it works:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      <li>Select the data types you want to share</li>
                      <li>Click "Generate OTP" to create an authorization code</li>
                      <li>The code will be sent to your phone via SMS</li>
                      <li>Share the code with your healthcare provider</li>
                      <li>The provider can use this code to access your selected medical information</li>
                    </ol>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Payments</CardTitle>
              <CardDescription>View statements and make payments</CardDescription>
            </CardHeader>
            <CardContent>
              {billingStatements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No billing statements available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {billingStatements.map((statement) => (
                    <Card key={statement.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">Statement #{statement.id}</h3>
                              <Badge variant={statement.status === 'paid' ? 'default' : 'outline'}>
                                {statement.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Date: {new Date(statement.date).toLocaleDateString()} | 
                              Amount: ₦{statement.amount?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {statement.description && (
                              <p className="text-sm text-gray-700">{statement.description}</p>
                            )}
                          </div>
                          {statement.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                // Navigate to payment processing
                                window.location.href = `/payments?statement_id=${statement.id}`
                              }}
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {!profileData ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading profile...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Update your personal details</CardDescription>
                    </div>
                    {!profileEditMode && (
                      <Button onClick={() => setProfileEditMode(true)} variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                    {profileEditMode && (
                      <div className="flex gap-2">
                        <Button onClick={() => { 
                          setProfileEditMode(false)
                          setProfileError('')
                          setProfileSuccess('')
                          loadProfile()
                        }} variant="outline">
                          Cancel
                        </Button>
                        <Button onClick={saveProfile} disabled={profileSaving}>
                          <Save className="w-4 h-4 mr-2" />
                          {profileSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileError && (
                    <Alert variant="destructive">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{profileError}</AlertDescription>
                      </div>
                    </Alert>
                  )}
                  {profileSuccess && (
                    <Alert className="bg-green-50 border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-800">{profileSuccess}</AlertDescription>
                      </div>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Username</Label>
                      {profileEditMode ? (
                        <Input
                          value={profileFormData.username || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, username: e.target.value })}
                          placeholder="Enter username"
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-gray-50">
                          <p className="text-gray-900">{profileData.username || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Email</Label>
                      {profileEditMode ? (
                        <Input
                          type="email"
                          value={profileFormData.email || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                          placeholder="Enter email address"
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-gray-50 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <p className="text-gray-900">{profileData.email || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>First Name</Label>
                      {profileEditMode ? (
                        <Input
                          value={profileFormData.first_name || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, first_name: e.target.value })}
                          placeholder="Enter first name"
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-gray-50">
                          <p className="text-gray-900">{profileData.patient_info?.first_name || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      {profileEditMode ? (
                        <Input
                          value={profileFormData.last_name || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, last_name: e.target.value })}
                          placeholder="Enter last name"
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-gray-50">
                          <p className="text-gray-900">{profileData.patient_info?.last_name || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      {profileEditMode ? (
                        <Input
                          value={profileFormData.phone || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-gray-50 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <p className="text-gray-900">{profileData.patient_info?.phone_primary || profileData.patient_info?.phone || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <div className="p-2 border rounded-md bg-gray-50">
                        <p className="text-gray-900">
                          {profileData.patient_info?.date_of_birth 
                            ? new Date(profileData.patient_info.date_of_birth).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      {profileEditMode ? (
                        <Textarea
                          value={profileFormData.address || ''}
                          onChange={(e) => setProfileFormData({ ...profileFormData, address: e.target.value })}
                          placeholder="Enter your full address"
                          rows={3}
                          className="resize-none"
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-gray-50 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                          <p className="text-gray-900 whitespace-pre-wrap">{profileData.patient_info?.address || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Security
                  </CardTitle>
                  <CardDescription>Change your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={passwordFormData.current_password}
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, current_password: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={passwordFormData.new_password}
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, new_password: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters</p>
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={passwordFormData.confirm_password}
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, confirm_password: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button onClick={changePassword} disabled={profileSaving}>
                    <Key className="w-4 h-4 mr-2" />
                    {profileSaving ? 'Changing...' : 'Change Password'}
                  </Button>
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Account Status</p>
                      <p className="font-medium">{profileData.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    {profileData.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  {profileData.patient_info?.universal_patient_id && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Patient ID</p>
                        <p className="font-medium">{profileData.patient_info.universal_patient_id}</p>
                      </div>
                    </div>
                  )}
                  {profileData.last_login && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Last Login</p>
                        <p className="font-medium">{new Date(profileData.last_login).toLocaleString()}</p>
                      </div>
                      <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PatientPortal
