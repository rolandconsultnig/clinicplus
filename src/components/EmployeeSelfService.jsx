import React, { useEffect, useState } from 'react'
import { apiService } from '../services/apiService'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'

const currency = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const NOTIFICATION_READ_KEY = 'ess_notification_reads'

const formatDateTime = (value) => {
  if (!value) return 'Unknown time'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleString()
}

export default function EmployeeSelfService() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [profile, setProfile] = useState(null)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [payslips, setPayslips] = useState([])
  const [training, setTraining] = useState([])
  const [reviews, setReviews] = useState([])
  const [notifications, setNotifications] = useState([])
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATION_READ_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (_) {
      return []
    }
  })

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  })

  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'annual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  })

  const loadEss = async () => {
    setLoading(true)
    setError('')
    try {
      const [dash, prof, leave, pay, trn, rev, notif] = await Promise.allSettled([
        apiService.request('/hr/me/dashboard', { method: 'GET' }),
        apiService.request('/hr/me/profile', { method: 'GET' }),
        apiService.request('/hr/me/leave', { method: 'GET' }),
        apiService.request('/hr/me/payslips', { method: 'GET' }),
        apiService.request('/hr/me/training', { method: 'GET' }),
        apiService.request('/hr/me/performance-reviews', { method: 'GET' }),
        apiService.request('/hr/me/notifications?limit=30', { method: 'GET' }),
      ])

      if (dash.status === 'fulfilled' && dash.value.success) setDashboard(dash.value.dashboard)
      if (prof.status === 'fulfilled' && prof.value.success) {
        setProfile(prof.value.profile)
        const employee = prof.value.profile?.employee || {}
        setProfileForm({
          first_name: employee.first_name || '',
          last_name: employee.last_name || '',
          phone: employee.phone || '',
          address: employee.address || '',
          emergency_contact_name: employee.emergency_contact_name || '',
          emergency_contact_phone: employee.emergency_contact_phone || '',
          notes: employee.notes || '',
        })
      }
      if (leave.status === 'fulfilled' && leave.value.success) setLeaveRequests(leave.value.leave_requests || [])
      if (pay.status === 'fulfilled' && pay.value.success) setPayslips(pay.value.payslips || [])
      if (trn.status === 'fulfilled' && trn.value.success) setTraining(trn.value.training_records || [])
      if (rev.status === 'fulfilled' && rev.value.success) setReviews(rev.value.reviews || [])
      if (notif.status === 'fulfilled' && notif.value.success) setNotifications(notif.value.notifications || [])
    } catch (e) {
      setError(e.message || 'Failed to load ESS portal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEss()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(readNotificationIds))
    } catch (_) {
      // Ignore persistence failure.
    }
  }, [readNotificationIds])

  const saveProfile = async () => {
    try {
      await apiService.request('/hr/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      })
      await loadEss()
    } catch (e) {
      setError(e.message || 'Failed to save profile')
    }
  }

  const submitLeave = async () => {
    try {
      await apiService.request('/hr/me/leave-requests', {
        method: 'POST',
        body: JSON.stringify(leaveForm),
      })
      setLeaveForm({
        leave_type: 'annual',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
      })
      await loadEss()
    } catch (e) {
      setError(e.message || 'Failed to submit leave request')
    }
  }

  const unreadCount = notifications.filter((n) => !readNotificationIds.includes(n.id)).length

  const markAllNotificationsRead = () => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev)
      notifications.forEach((item) => next.add(item.id))
      return Array.from(next)
    })
  }

  if (loading) return <div className="p-6">Loading Employee Self-Service portal...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Self-Service (ESS)</h1>
        <p className="text-gray-600">My leave, payslips, training, performance and personal profile.</p>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">Pending Leave</div><div className="text-2xl font-bold">{dashboard?.leave_pending || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">Approved Leave</div><div className="text-2xl font-bold">{dashboard?.leave_approved || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">Total Payslips</div><div className="text-2xl font-bold">{dashboard?.payslips_total || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">Training In Progress</div><div className="text-2xl font-bold">{dashboard?.training_in_progress || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-gray-500">Training Completed</div><div className="text-2xl font-bold">{dashboard?.training_completed || 0}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notification Center</CardTitle>
          <div className="flex items-center gap-2">
            <Badge>{unreadCount} unread</Badge>
            <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>Mark all as read</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 && (
            <div className="text-sm text-gray-500">No ESS notifications yet.</div>
          )}
          {notifications.slice(0, 8).map((item) => {
            const isRead = readNotificationIds.includes(item.id)
            return (
              <div
                key={item.id}
                className={`border rounded p-3 ${isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.message}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDateTime(item.occurred_at)}</div>
                  </div>
                  <Badge>{item.type}</Badge>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Tabs defaultValue="leave">
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="leave">My Leave</TabsTrigger>
          <TabsTrigger value="payslips">My Payslips</TabsTrigger>
          <TabsTrigger value="training">My Training</TabsTrigger>
          <TabsTrigger value="reviews">My Reviews</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Request Leave</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Leave Type</Label>
                <select className="w-full px-3 py-2 border rounded" value={leaveForm.leave_type} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}>
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
              </div>
              <div>
                <Label>Reason</Label>
                <Input value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Optional reason" />
              </div>
              <Button className="md:col-span-4" onClick={submitLeave}>Submit Leave Request</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>My Leave Requests</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {leaveRequests.map((row) => (
                <div key={row.id} className="border rounded p-3 flex justify-between">
                  <div>
                    <div className="font-medium">{row.request_number} - {row.leave_type}</div>
                    <div className="text-xs text-gray-500">{row.start_date} to {row.end_date} ({row.days_requested} days)</div>
                  </div>
                  <Badge>{row.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="mt-4">
          <Card>
            <CardHeader><CardTitle>My Payslips</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {payslips.map((row) => (
                <div key={row.id} className="border rounded p-3 flex justify-between">
                  <div>
                    <div className="font-medium">{row.payroll_number}</div>
                    <div className="text-xs text-gray-500">{row.pay_period_start} to {row.pay_period_end}</div>
                  </div>
                  <div className="text-right">
                    <Badge>{row.payment_status}</Badge>
                    <div className="font-semibold">{currency(row.net_pay)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="mt-4">
          <Card>
            <CardHeader><CardTitle>My Training</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {training.map((row) => (
                <div key={row.id} className="border rounded p-3 flex justify-between">
                  <div>
                    <div className="font-medium">{row.course_name}</div>
                    <div className="text-xs text-gray-500">{row.provider_name || 'Internal'} · {row.start_date || 'N/A'} to {row.end_date || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <Badge>{row.completion_status}</Badge>
                    <div className="text-xs text-gray-500">Score: {Number(row.score || 0).toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardHeader><CardTitle>My Performance Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {reviews.map((row) => (
                <div key={row.id} className="border rounded p-3 flex justify-between">
                  <div>
                    <div className="font-medium">{row.review_number}</div>
                    <div className="text-xs text-gray-500">{row.review_period_start} to {row.review_period_end}</div>
                  </div>
                  <div className="text-right">
                    <Badge>{row.status}</Badge>
                    <div className="text-xs text-gray-500">Rating: {Number(row.overall_rating || 0).toFixed(1)} / 5</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="First name" value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} />
              <Input placeholder="Last name" value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} />
              <Input placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              <Input placeholder="Address" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
              <Input placeholder="Emergency contact name" value={profileForm.emergency_contact_name} onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })} />
              <Input placeholder="Emergency contact phone" value={profileForm.emergency_contact_phone} onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })} />
              <Input className="md:col-span-2" placeholder="Notes" value={profileForm.notes} onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })} />
              <Button className="md:col-span-2" onClick={saveProfile}>Save Profile</Button>
              {profile?.user?.email && (
                <div className="md:col-span-2 text-xs text-gray-500">
                  Account: {profile.user.username} · {profile.user.email}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
