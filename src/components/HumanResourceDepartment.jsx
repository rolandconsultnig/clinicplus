import React, { useEffect, useMemo, useState } from 'react'
import { apiService } from '../services/apiService'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { PieChart } from './charts/PieChart'
import { BarChart } from './charts/BarChart'

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function HumanResourceDepartment() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [departments, setDepartments] = useState([])
  const [units, setUnits] = useState([])
  const [positions, setPositions] = useState([])
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [payroll, setPayroll] = useState([])
  const [jobPostings, setJobPostings] = useState([])
  const [applicants, setApplicants] = useState([])
  const [reviews, setReviews] = useState([])
  const [training, setTraining] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [leaveBalances, setLeaveBalances] = useState([])

  const [newDept, setNewDept] = useState({ code: '', name: '', description: '' })
  const [newUnit, setNewUnit] = useState({ code: '', name: '', department_id: '', description: '' })
  const [newPosition, setNewPosition] = useState({ code: '', title: '', department_id: '', unit_id: '', employment_type: 'full_time', min_salary: 0, max_salary: 0 })
  const [newEmployee, setNewEmployee] = useState({ first_name: '', last_name: '', email: '', phone: '', hire_date: new Date().toISOString().split('T')[0], department_id: '', unit_id: '', position_id: '', base_salary: 0 })
  const [newAttendance, setNewAttendance] = useState({ employee_id: '', attendance_date: new Date().toISOString().split('T')[0], status: 'present', notes: '' })
  const [newLeave, setNewLeave] = useState({ employee_id: '', leave_type: 'annual', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], reason: '' })
  const [newPayroll, setNewPayroll] = useState({ employee_id: '', pay_period_start: new Date().toISOString().split('T')[0], pay_period_end: new Date().toISOString().split('T')[0], basic_pay: 0, overtime_pay: 0, bonus: 0, deductions: 0, tax: 0 })
  const [newJob, setNewJob] = useState({ title: '', department_id: '', position_id: '', employment_type: 'full_time', location: '', openings_count: 1, description: '' })
  const [newApplicant, setNewApplicant] = useState({ job_posting_id: '', first_name: '', last_name: '', email: '', phone: '', stage: 'applied', score: 0, source: '' })
  const [newReview, setNewReview] = useState({ employee_id: '', reviewer_employee_id: '', review_period_start: new Date().toISOString().split('T')[0], review_period_end: new Date().toISOString().split('T')[0], overall_rating: 0, strengths: '', improvement_areas: '', goals: '', status: 'draft' })
  const [newTraining, setNewTraining] = useState({ employee_id: '', course_name: '', provider_name: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], completion_status: 'assigned', score: 0 })

  const payrollSummary = useMemo(() => {
    const total = payroll.reduce((acc, p) => acc + Number(p.net_pay || 0), 0)
    const pending = payroll.filter((p) => p.payment_status === 'pending').length
    return { total, pending }
  }, [payroll])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [
        dash, dept, unit, pos, emp, att, leave, pay, jobs, apps, rev, trn, anl, balances
      ] = await Promise.allSettled([
        apiService.request('/hr/dashboard', { method: 'GET' }),
        apiService.request('/hr/departments', { method: 'GET' }),
        apiService.request('/hr/units', { method: 'GET' }),
        apiService.request('/hr/positions', { method: 'GET' }),
        apiService.request('/hr/employees', { method: 'GET' }),
        apiService.request('/hr/attendance', { method: 'GET' }),
        apiService.request('/hr/leave-requests', { method: 'GET' }),
        apiService.request('/hr/payroll', { method: 'GET' }),
        apiService.request('/hr/job-postings', { method: 'GET' }),
        apiService.request('/hr/applicants', { method: 'GET' }),
        apiService.request('/hr/performance-reviews', { method: 'GET' }),
        apiService.request('/hr/training', { method: 'GET' }),
        apiService.request('/hr/analytics', { method: 'GET' }),
        apiService.request('/hr/leave-balances', { method: 'GET' }),
      ])

      if (dash.status === 'fulfilled' && dash.value.success) setDashboard(dash.value.dashboard)
      if (dept.status === 'fulfilled' && dept.value.success) setDepartments(dept.value.departments || [])
      if (unit.status === 'fulfilled' && unit.value.success) setUnits(unit.value.units || [])
      if (pos.status === 'fulfilled' && pos.value.success) setPositions(pos.value.positions || [])
      if (emp.status === 'fulfilled' && emp.value.success) setEmployees(emp.value.employees || [])
      if (att.status === 'fulfilled' && att.value.success) setAttendance(att.value.records || [])
      if (leave.status === 'fulfilled' && leave.value.success) setLeaveRequests(leave.value.leave_requests || [])
      if (pay.status === 'fulfilled' && pay.value.success) setPayroll(pay.value.payroll || [])
      if (jobs.status === 'fulfilled' && jobs.value.success) setJobPostings(jobs.value.job_postings || [])
      if (apps.status === 'fulfilled' && apps.value.success) setApplicants(apps.value.applicants || [])
      if (rev.status === 'fulfilled' && rev.value.success) setReviews(rev.value.reviews || [])
      if (trn.status === 'fulfilled' && trn.value.success) setTraining(trn.value.training_records || [])
      if (anl.status === 'fulfilled' && anl.value.success) setAnalytics(anl.value.analytics || null)
      if (balances.status === 'fulfilled' && balances.value.success) setLeaveBalances(balances.value.leave_balances || [])
    } catch (e) {
      console.error('HR load failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const postAndReload = async (url, payload, reset) => {
    await apiService.request(url, { method: 'POST', body: JSON.stringify(payload) })
    if (reset) reset()
    loadAll()
  }

  const patchAndReload = async (url, payload = {}) => {
    await apiService.request(url, { method: 'PATCH', body: JSON.stringify(payload) })
    loadAll()
  }

  const analyticsLeaveStatus = useMemo(() => {
    const raw = analytics?.leave_status || {}
    return Object.entries(raw).map(([name, value]) => ({ name, value }))
  }, [analytics])

  const analyticsRecruitment = useMemo(() => {
    const raw = analytics?.applicant_stage || {}
    return Object.entries(raw).map(([name, value]) => ({ name, value }))
  }, [analytics])

  const analyticsHeadcount = useMemo(() => {
    const raw = analytics?.department_headcount || []
    return raw.map((row) => ({ name: row.name, value: Number(row.value || 0) }))
  }, [analytics])

  if (loading) return <div className="p-6">Loading Human Resource Department...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Portal</h1>
        <p className="text-gray-600">People operations hub: workforce, payroll, leave, recruitment, performance, training, and compliance.</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-9">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="org">Org Setup</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="development">Performance & Training</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Employees</div><div className="text-2xl font-bold">{dashboard?.total_employees || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Open Roles</div><div className="text-2xl font-bold">{dashboard?.open_job_postings || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Pending Leave</div><div className="text-2xl font-bold">{dashboard?.pending_leave_requests || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Active Trainings</div><div className="text-2xl font-bold">{dashboard?.active_training_assignments || 0}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Current Payroll Cost</div><div className="text-xl font-semibold">{money(dashboard?.current_payroll_cost)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Applicants</div><div className="text-xl font-semibold">{dashboard?.total_applicants || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Avg Performance</div><div className="text-xl font-semibold">{Number(dashboard?.average_performance_rating || 0).toFixed(2)} / 5</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="org" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Department</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Code" value={newDept.code} onChange={(e) => setNewDept({ ...newDept, code: e.target.value })} />
              <Input placeholder="Name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} />
              <Input placeholder="Description" value={newDept.description} onChange={(e) => setNewDept({ ...newDept, description: e.target.value })} />
              <Button onClick={() => postAndReload('/hr/departments', newDept, () => setNewDept({ code: '', name: '', description: '' }))}>Add Department</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Create Position</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-8 gap-3">
              <Input placeholder="Code" value={newPosition.code} onChange={(e) => setNewPosition({ ...newPosition, code: e.target.value })} />
              <Input placeholder="Title" value={newPosition.title} onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })} />
              <select className="px-3 py-2 border rounded" value={newPosition.department_id} onChange={(e) => setNewPosition({ ...newPosition, department_id: Number(e.target.value) || '' })}>
                <option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="px-3 py-2 border rounded" value={newPosition.unit_id} onChange={(e) => setNewPosition({ ...newPosition, unit_id: Number(e.target.value) || '' })}>
                <option value="">Unit</option>{units.filter((u) => !newPosition.department_id || u.department_id === Number(newPosition.department_id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <Input placeholder="Employment Type" value={newPosition.employment_type} onChange={(e) => setNewPosition({ ...newPosition, employment_type: e.target.value })} />
              <Input type="number" placeholder="Min Salary" value={newPosition.min_salary} onChange={(e) => setNewPosition({ ...newPosition, min_salary: Number(e.target.value) })} />
              <Input type="number" placeholder="Max Salary" value={newPosition.max_salary} onChange={(e) => setNewPosition({ ...newPosition, max_salary: Number(e.target.value) })} />
              <Button onClick={() => postAndReload('/hr/positions', newPosition, () => setNewPosition({ code: '', title: '', department_id: '', unit_id: '', employment_type: 'full_time', min_salary: 0, max_salary: 0 }))}>Add Position</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Create Unit</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input placeholder="Code" value={newUnit.code} onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })} />
              <Input placeholder="Name" value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} />
              <select className="px-3 py-2 border rounded" value={newUnit.department_id} onChange={(e) => setNewUnit({ ...newUnit, department_id: Number(e.target.value) || '' })}>
                <option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <Input placeholder="Description" value={newUnit.description} onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })} />
              <Button onClick={() => postAndReload('/hr/units', newUnit, () => setNewUnit({ code: '', name: '', department_id: '', description: '' }))}>Add Unit</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Employee</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-9 gap-2">
              <Input placeholder="First name" value={newEmployee.first_name} onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })} />
              <Input placeholder="Last name" value={newEmployee.last_name} onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })} />
              <Input placeholder="Email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} />
              <Input placeholder="Phone" value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
              <Input type="date" value={newEmployee.hire_date} onChange={(e) => setNewEmployee({ ...newEmployee, hire_date: e.target.value })} />
              <select className="px-3 py-2 border rounded" value={newEmployee.department_id} onChange={(e) => setNewEmployee({ ...newEmployee, department_id: Number(e.target.value) || '' })}>
                <option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="px-3 py-2 border rounded" value={newEmployee.unit_id} onChange={(e) => setNewEmployee({ ...newEmployee, unit_id: Number(e.target.value) || '' })}>
                <option value="">Unit</option>{units.filter((u) => !newEmployee.department_id || u.department_id === Number(newEmployee.department_id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select className="px-3 py-2 border rounded" value={newEmployee.position_id} onChange={(e) => setNewEmployee({ ...newEmployee, position_id: Number(e.target.value) || '' })}>
                <option value="">Position</option>{positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <Input type="number" placeholder="Base salary" value={newEmployee.base_salary} onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: Number(e.target.value) })} />
              <Button className="md:col-span-9" onClick={() => postAndReload('/hr/employees', newEmployee, () => setNewEmployee({ first_name: '', last_name: '', email: '', phone: '', hire_date: new Date().toISOString().split('T')[0], department_id: '', unit_id: '', position_id: '', base_salary: 0 }))}>Save Employee</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Employee Master</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {employees.map((e) => (
                <div key={e.id} className="border rounded p-3 flex justify-between">
                  <div><div className="font-medium">{e.employee_number} - {e.full_name}</div><div className="text-xs text-gray-500">{e.department_name || 'No dept'} | {e.unit_name || 'No unit'} | {e.position_title || 'No position'}</div></div>
                  <div className="text-right"><Badge>{e.status}</Badge><div>{money(e.base_salary)}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Check-In Employee</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select className="px-3 py-2 border rounded" value={newAttendance.employee_id} onChange={(e) => setNewAttendance({ ...newAttendance, employee_id: Number(e.target.value) || '' })}>
                <option value="">Employee</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <Input type="date" value={newAttendance.attendance_date} onChange={(e) => setNewAttendance({ ...newAttendance, attendance_date: e.target.value })} />
              <Input placeholder="Status" value={newAttendance.status} onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })} />
              <Input placeholder="Notes" value={newAttendance.notes} onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })} />
              <Button className="md:col-span-2" onClick={() => postAndReload('/hr/attendance/check-in', newAttendance)}>Check-In</Button>
              <Button className="md:col-span-2" variant="outline" onClick={() => postAndReload('/hr/attendance/check-out', { employee_id: newAttendance.employee_id, attendance_date: newAttendance.attendance_date })}>Check-Out</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Attendance Log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {attendance.map((a) => (
                <div key={a.id} className="border rounded p-2 flex justify-between">
                  <div><div className="font-medium">{a.employee_name}</div><div className="text-xs text-gray-500">{a.attendance_date}</div></div>
                  <div className="text-right"><Badge>{a.status}</Badge><div>{Number(a.work_hours || 0).toFixed(2)} h</div></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Leave Request</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select className="px-3 py-2 border rounded" value={newLeave.employee_id} onChange={(e) => setNewLeave({ ...newLeave, employee_id: Number(e.target.value) || '' })}>
                <option value="">Employee</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <Input placeholder="Leave type" value={newLeave.leave_type} onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })} />
              <Input type="date" value={newLeave.start_date} onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })} />
              <Input type="date" value={newLeave.end_date} onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })} />
              <Input placeholder="Reason" value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} />
              <Button className="md:col-span-5" onClick={() => postAndReload('/hr/leave-requests', newLeave)}>Submit Leave Request</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Leave Workflow</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {leaveRequests.map((lr) => (
                <div key={lr.id} className="border rounded p-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{lr.request_number} - {lr.employee_name}</div>
                      <div className="text-xs text-gray-500">{lr.leave_type} | {lr.start_date} to {lr.end_date} ({lr.days_requested} days)</div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge>{lr.status}</Badge>
                      {lr.status === 'pending' && (
                        <div className="space-x-1">
                          <Button size="sm" onClick={() => postAndReload(`/hr/leave-requests/${lr.id}/approve`, {})}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => postAndReload(`/hr/leave-requests/${lr.id}/reject`, { rejection_reason: 'Not approved' })}>Reject</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Payroll Record</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-8 gap-2">
              <select className="px-3 py-2 border rounded" value={newPayroll.employee_id} onChange={(e) => setNewPayroll({ ...newPayroll, employee_id: Number(e.target.value) || '' })}>
                <option value="">Employee</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <Input type="date" value={newPayroll.pay_period_start} onChange={(e) => setNewPayroll({ ...newPayroll, pay_period_start: e.target.value })} />
              <Input type="date" value={newPayroll.pay_period_end} onChange={(e) => setNewPayroll({ ...newPayroll, pay_period_end: e.target.value })} />
              <Input type="number" placeholder="Basic" value={newPayroll.basic_pay} onChange={(e) => setNewPayroll({ ...newPayroll, basic_pay: Number(e.target.value) })} />
              <Input type="number" placeholder="Overtime" value={newPayroll.overtime_pay} onChange={(e) => setNewPayroll({ ...newPayroll, overtime_pay: Number(e.target.value) })} />
              <Input type="number" placeholder="Bonus" value={newPayroll.bonus} onChange={(e) => setNewPayroll({ ...newPayroll, bonus: Number(e.target.value) })} />
              <Input type="number" placeholder="Deductions" value={newPayroll.deductions} onChange={(e) => setNewPayroll({ ...newPayroll, deductions: Number(e.target.value) })} />
              <Input type="number" placeholder="Tax" value={newPayroll.tax} onChange={(e) => setNewPayroll({ ...newPayroll, tax: Number(e.target.value) })} />
              <Button className="md:col-span-8" onClick={() => postAndReload('/hr/payroll', newPayroll)}>Save Payroll</Button>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Total Net Payroll</div><div className="text-2xl font-bold">{money(payrollSummary.total)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Pending Payroll Count</div><div className="text-2xl font-bold">{payrollSummary.pending}</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Payroll Register</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {payroll.map((p) => (
                <div key={p.id} className="border rounded p-2 flex justify-between">
                  <div><div className="font-medium">{p.payroll_number} - {p.employee_name}</div><div className="text-xs text-gray-500">{p.pay_period_start} to {p.pay_period_end}</div></div>
                  <div className="text-right space-y-1">
                    <Badge>{p.payment_status}</Badge>
                    <div>{money(p.net_pay)}</div>
                    {p.payment_status !== 'paid' && (
                      <Button size="sm" onClick={() => patchAndReload(`/hr/payroll/${p.id}/mark-paid`)}>Mark Paid</Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recruitment" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Job Posting</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-7 gap-2">
              <Input placeholder="Title" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />
              <select className="px-3 py-2 border rounded" value={newJob.department_id} onChange={(e) => setNewJob({ ...newJob, department_id: Number(e.target.value) || '' })}>
                <option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="px-3 py-2 border rounded" value={newJob.position_id} onChange={(e) => setNewJob({ ...newJob, position_id: Number(e.target.value) || '' })}>
                <option value="">Position</option>{positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <Input placeholder="Employment type" value={newJob.employment_type} onChange={(e) => setNewJob({ ...newJob, employment_type: e.target.value })} />
              <Input placeholder="Location" value={newJob.location} onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} />
              <Input type="number" placeholder="Openings" value={newJob.openings_count} onChange={(e) => setNewJob({ ...newJob, openings_count: Number(e.target.value) })} />
              <Input placeholder="Description" value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} />
              <Button className="md:col-span-7" onClick={() => postAndReload('/hr/job-postings', newJob)}>Post Job</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Add Applicant</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-8 gap-2">
              <select className="px-3 py-2 border rounded" value={newApplicant.job_posting_id} onChange={(e) => setNewApplicant({ ...newApplicant, job_posting_id: Number(e.target.value) || '' })}>
                <option value="">Job posting</option>{jobPostings.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <Input placeholder="First name" value={newApplicant.first_name} onChange={(e) => setNewApplicant({ ...newApplicant, first_name: e.target.value })} />
              <Input placeholder="Last name" value={newApplicant.last_name} onChange={(e) => setNewApplicant({ ...newApplicant, last_name: e.target.value })} />
              <Input placeholder="Email" value={newApplicant.email} onChange={(e) => setNewApplicant({ ...newApplicant, email: e.target.value })} />
              <Input placeholder="Phone" value={newApplicant.phone} onChange={(e) => setNewApplicant({ ...newApplicant, phone: e.target.value })} />
              <Input placeholder="Stage" value={newApplicant.stage} onChange={(e) => setNewApplicant({ ...newApplicant, stage: e.target.value })} />
              <Input type="number" placeholder="Score" value={newApplicant.score} onChange={(e) => setNewApplicant({ ...newApplicant, score: Number(e.target.value) })} />
              <Input placeholder="Source" value={newApplicant.source} onChange={(e) => setNewApplicant({ ...newApplicant, source: e.target.value })} />
              <Button className="md:col-span-8" onClick={() => postAndReload('/hr/applicants', newApplicant)}>Add Applicant</Button>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Job Openings</CardTitle></CardHeader><CardContent className="space-y-2">{jobPostings.map((j) => <div key={j.id} className="border rounded p-2 flex justify-between"><div><div className="font-medium">{j.title}</div><div className="text-xs text-gray-500">{j.location || 'N/A'}</div></div><Badge>{j.status}</Badge></div>)}</CardContent></Card>
            <Card>
              <CardHeader><CardTitle>Applicant Pipeline</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {applicants.map((a) => (
                  <div key={a.id} className="border rounded p-2 flex justify-between">
                    <div>
                      <div className="font-medium">{a.full_name}</div>
                      <div className="text-xs text-gray-500">{a.job_title || 'N/A'}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge>{a.stage}</Badge>
                      <div>{Number(a.score || 0).toFixed(1)}</div>
                      <div className="space-x-1">
                        <Button size="sm" variant="outline" onClick={() => patchAndReload(`/hr/applicants/${a.id}/stage`, { stage: 'interview' })}>Interview</Button>
                        <Button size="sm" variant="outline" onClick={() => patchAndReload(`/hr/applicants/${a.id}/stage`, { stage: 'offer' })}>Offer</Button>
                        <Button size="sm" onClick={() => patchAndReload(`/hr/applicants/${a.id}/stage`, { stage: 'hired' })}>Hire</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="development" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Performance Review</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-8 gap-2">
              <select className="px-3 py-2 border rounded" value={newReview.employee_id} onChange={(e) => setNewReview({ ...newReview, employee_id: Number(e.target.value) || '' })}><option value="">Employee</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
              <select className="px-3 py-2 border rounded" value={newReview.reviewer_employee_id} onChange={(e) => setNewReview({ ...newReview, reviewer_employee_id: Number(e.target.value) || '' })}><option value="">Reviewer</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
              <Input type="date" value={newReview.review_period_start} onChange={(e) => setNewReview({ ...newReview, review_period_start: e.target.value })} />
              <Input type="date" value={newReview.review_period_end} onChange={(e) => setNewReview({ ...newReview, review_period_end: e.target.value })} />
              <Input type="number" step="0.1" placeholder="Rating" value={newReview.overall_rating} onChange={(e) => setNewReview({ ...newReview, overall_rating: Number(e.target.value) })} />
              <Input placeholder="Strengths" value={newReview.strengths} onChange={(e) => setNewReview({ ...newReview, strengths: e.target.value })} />
              <Input placeholder="Improvement areas" value={newReview.improvement_areas} onChange={(e) => setNewReview({ ...newReview, improvement_areas: e.target.value })} />
              <Input placeholder="Goals" value={newReview.goals} onChange={(e) => setNewReview({ ...newReview, goals: e.target.value })} />
              <Button className="md:col-span-8" onClick={() => postAndReload('/hr/performance-reviews', newReview)}>Save Review</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Assign Training</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-7 gap-2">
              <select className="px-3 py-2 border rounded" value={newTraining.employee_id} onChange={(e) => setNewTraining({ ...newTraining, employee_id: Number(e.target.value) || '' })}><option value="">Employee</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
              <Input placeholder="Course" value={newTraining.course_name} onChange={(e) => setNewTraining({ ...newTraining, course_name: e.target.value })} />
              <Input placeholder="Provider" value={newTraining.provider_name} onChange={(e) => setNewTraining({ ...newTraining, provider_name: e.target.value })} />
              <Input type="date" value={newTraining.start_date} onChange={(e) => setNewTraining({ ...newTraining, start_date: e.target.value })} />
              <Input type="date" value={newTraining.end_date} onChange={(e) => setNewTraining({ ...newTraining, end_date: e.target.value })} />
              <Input placeholder="Status" value={newTraining.completion_status} onChange={(e) => setNewTraining({ ...newTraining, completion_status: e.target.value })} />
              <Input type="number" step="0.1" placeholder="Score" value={newTraining.score} onChange={(e) => setNewTraining({ ...newTraining, score: Number(e.target.value) })} />
              <Button className="md:col-span-7" onClick={() => postAndReload('/hr/training', newTraining)}>Save Training</Button>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Performance Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="border rounded p-2 flex justify-between">
                    <div>
                      <div className="font-medium">{r.review_number}</div>
                      <div className="text-xs text-gray-500">{r.employee_name}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge>{r.status}</Badge>
                      <div>{Number(r.overall_rating || 0).toFixed(1)}</div>
                      {r.status !== 'acknowledged' && (
                        <div className="space-x-1">
                          <Button size="sm" variant="outline" onClick={() => patchAndReload(`/hr/performance-reviews/${r.id}/status`, { status: 'submitted' })}>Submit</Button>
                          <Button size="sm" onClick={() => patchAndReload(`/hr/performance-reviews/${r.id}/status`, { status: 'acknowledged' })}>Acknowledge</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Training Records</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {training.map((t) => (
                  <div key={t.id} className="border rounded p-2 flex justify-between">
                    <div>
                      <div className="font-medium">{t.course_name}</div>
                      <div className="text-xs text-gray-500">{t.employee_name}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge>{t.completion_status}</Badge>
                      <div>{Number(t.score || 0).toFixed(1)}</div>
                      {t.completion_status !== 'completed' && (
                        <Button size="sm" onClick={() => patchAndReload(`/hr/training/${t.id}/status`, { completion_status: 'completed' })}>Mark Completed</Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Attendance Coverage</div><div className="text-2xl font-bold">{Number(analytics?.compliance?.attendance_coverage_pct || 0).toFixed(1)}%</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Training Completion</div><div className="text-2xl font-bold">{Number(analytics?.compliance?.mandatory_training_completion_pct || 0).toFixed(1)}%</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Pending Leave Approvals</div><div className="text-2xl font-bold">{analytics?.compliance?.pending_leave_approvals || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Pending Payroll Disbursements</div><div className="text-2xl font-bold">{analytics?.compliance?.pending_payroll_disbursements || 0}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Department Headcount</CardTitle></CardHeader>
              <CardContent><BarChart data={analyticsHeadcount} dataKey="value" name="Employees" height={260} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Leave Status Distribution</CardTitle></CardHeader>
              <CardContent><PieChart data={analyticsLeaveStatus} dataKey="value" nameKey="name" height={260} /></CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Recruitment Pipeline</CardTitle></CardHeader>
              <CardContent><PieChart data={analyticsRecruitment} dataKey="value" nameKey="name" height={260} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Leave Balances</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {leaveBalances.slice(0, 8).map((row) => (
                  <div key={row.employee_id} className="border rounded p-2">
                    <div className="font-medium">{row.employee_name}</div>
                    <div className="text-xs text-gray-500">Annual: {row.annual_remaining} days remaining · Sick: {row.sick_remaining} days remaining</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

