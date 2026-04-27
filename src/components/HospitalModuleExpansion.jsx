import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'

const statusStyle = {
  implemented: 'bg-green-100 text-green-800 border-green-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  planned: 'bg-teal-100 text-teal-800 border-teal-200'
}

const statusLabel = {
  implemented: 'Implemented',
  in_progress: 'In Progress',
  planned: 'Planned'
}

const roadmapSections = [
  {
    title: 'Core Modules',
    items: [
      { module: 'Electronic Medical Records (EMR/EHR)', features: 'Centralized records, allergies, meds, clinical notes, reports', status: 'implemented', priority: 'P0' },
      { module: 'Appointment Scheduling', features: 'Booking, doctor calendars, reminders, waitlist, reschedule', status: 'implemented', priority: 'P0' },
      { module: 'Pharmacy Management', features: 'eRx, dispensing, stock alerts, expiry tracking, POS billing', status: 'implemented', priority: 'P0' },
      { module: 'Laboratory Information System (LIS)', features: 'Orders, accessioning, tracking, result workflow, QC', status: 'implemented', priority: 'P0' },
      { module: 'Radiology / Imaging (RIS + PACS)', features: 'Imaging orders, DICOM viewer, report linking', status: 'planned', priority: 'P1' },
      { module: 'Billing & Revenue Cycle', features: 'Invoices, claims, copay handling, payments, financial reports', status: 'implemented', priority: 'P0' },
      { module: 'Inventory & Supply Chain', features: 'Stock, reorder alerts, vendors, consumables, assets', status: 'in_progress', priority: 'P1' },
      { module: 'Staff / HR Management', features: 'Scheduling, attendance, payroll, credentialing, RBAC', status: 'in_progress', priority: 'P1' },
      { module: 'Facility / Bed Management', features: 'Bed occupancy, room allocation, cleaning, OT scheduling', status: 'planned', priority: 'P1' }
    ]
  },
  {
    title: 'Clinical & Department Modules',
    items: [
      { module: 'Operation Theatre (OT) Management', features: 'Surgery schedule, pre-op checklist, anesthesia, post-op tracking', status: 'planned', priority: 'P1' },
      { module: 'Emergency / Casualty Module', features: 'Fast-track registration, triage, ambulance integration', status: 'implemented', priority: 'P1' },
      { module: 'Nursing Module', features: 'Vitals charting, care plans, MAR, ward rounds', status: 'in_progress', priority: 'P1' },
      { module: 'Dietary / Nutrition Management', features: 'Diet plans, kitchen orders, nutritional assessments', status: 'planned', priority: 'P2' },
      { module: 'Physiotherapy / Rehabilitation', features: 'Session scheduling, exercise prescriptions, progress tracking', status: 'planned', priority: 'P2' },
      { module: 'Blood Bank Management', features: 'Donor records, blood stock, compatibility checks', status: 'planned', priority: 'P2' }
    ]
  },
  {
    title: 'Patient Engagement',
    items: [
      { module: 'Patient Portal / Mobile App', features: 'Reports, appointments, bills, notifications, summaries', status: 'implemented', priority: 'P1' },
      { module: 'Telemedicine / Video Consultation', features: 'Virtual consults with e-prescription support', status: 'planned', priority: 'P1' },
      { module: 'Feedback & Satisfaction', features: 'Post-visit surveys and ratings', status: 'planned', priority: 'P2' },
      { module: 'Discharge Planning & Summary', features: 'Automated discharge workflow and reminders', status: 'implemented', priority: 'P1' }
    ]
  },
  {
    title: 'Admin, Analytics & Advanced',
    items: [
      { module: 'Insurance & Claims Management', features: 'Eligibility verification, pre-auth, claims tracking', status: 'implemented', priority: 'P1' },
      { module: 'Queue Management System', features: 'Digital token, waiting displays, queue alerts', status: 'implemented', priority: 'P0' },
      { module: 'Analytics & BI Dashboard', features: 'Occupancy, revenue, provider performance, forecasting', status: 'in_progress', priority: 'P1' },
      { module: 'Master Data Management', features: 'Departments, tariffs, roles, audit, metadata controls', status: 'in_progress', priority: 'P1' },
      { module: 'Clinical Decision Support (CDSS)', features: 'Drug/allergy checks and guideline alerts', status: 'implemented', priority: 'P1' },
      { module: 'AI / ML', features: 'Readmission risk, no-show prediction, smart triage/chatbot', status: 'in_progress', priority: 'P2' },
      { module: 'IoT Integration', features: 'Bedside vitals and smart device integrations', status: 'implemented', priority: 'P2' },
      { module: 'Compliance & Security', features: 'HIPAA/GDPR controls, encryption, consent, auditing', status: 'implemented', priority: 'P0' },
      { module: 'Multi-Facility Support', features: 'Cross-branch governance and centralized controls', status: 'implemented', priority: 'P0' },
      { module: 'Document Management', features: 'Consent, referrals, insurance files, governance', status: 'implemented', priority: 'P0' },
      { module: 'Mobile App for Staff', features: 'On-the-go orders, chart review, notifications', status: 'planned', priority: 'P2' }
    ]
  }
]

const nextPhase = [
  'P0 stabilization: strengthen existing EMR/OPD/IPD/pharmacy/lab/billing interoperability and guardrails',
  'P1 scale-up: radiology, OT, bed/facility ops, advanced inventory and staff scheduling depth',
  'P2 innovation: telemedicine, AI-assisted forecasting, mobile-first clinician workflows'
]

export default function HospitalModuleExpansion() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HMS Expansion Roadmap (2026+)</CardTitle>
          <CardDescription>
            Structured implementation map for core hospital modules and advanced features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {nextPhase.map((line, idx) => (
            <p key={idx}>- {line}</p>
          ))}
        </CardContent>
      </Card>

      {roadmapSections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.module} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-sm">{item.module}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusStyle[item.status]}>{statusLabel[item.status]}</Badge>
                      <Badge variant="outline">{item.priority}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{item.features}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
