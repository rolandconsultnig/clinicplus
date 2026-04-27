import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'

const portalGroups = [
  {
    title: 'Receptionist Portal',
    primary: 'Front desk intake, registration, appointment and admission coordination',
    features: [
      'Patient registration with MRN creation and duplicate merge',
      'Real-time appointment booking, reschedule, cancellation, reminders',
      'OPD walk-in token and queue management',
      'OPD to IPD conversion and bed assignment coordination',
      'Advance/registration payment capture and receipt printing',
      'Basic insurance eligibility checks and inquiry support'
    ]
  },
  {
    title: 'Nursing Portal',
    primary: 'Bedside care execution and nursing documentation',
    features: [
      'Ward/bed dashboard with status segmentation',
      'Vitals capture with trend views and out-of-range alerts',
      'Medication Administration Record (MAR) actions',
      'Nursing care plans and daily task tracking',
      'Doctor-order acknowledgement and completion updates',
      'Shift handover reports and discharge preparation checklist'
    ]
  },
  {
    title: 'Doctors Portal',
    primary: 'Clinical decision-making, order entry, and documentation',
    features: [
      'My patient list (OPD/IPD/recent discharges)',
      'Full EMR view (history, labs, imaging, notes)',
      'Order entry for medications, labs, radiology, referrals',
      'SOAP/progress/procedure/discharge documentation',
      'CDSS: allergy, interaction, and guideline alerts',
      'Scheduling, telemedicine launch, e-sign prescriptions and certificates'
    ]
  }
]

const essentialPortals = [
  { portal: 'Lab Technician', key_features: 'Order queue, barcode/sample flow, result entry, critical value flagging' },
  { portal: 'Pharmacist', key_features: 'eRx queue, dispensing, stock/expiry controls, return handling' },
  { portal: 'Radiologist', key_features: 'Imaging worklist, DICOM review, report templates, QC logs' },
  { portal: 'Billing / Cashier', key_features: 'Invoicing, claims, refunds, settlement, daily reconciliation' },
  { portal: 'OT Manager', key_features: 'Surgery scheduling, resource allocation, peri-op tracking' },
  { portal: 'Inventory Manager', key_features: 'Stock/reorder/vendor/asset maintenance management' },
  { portal: 'HR / Admin', key_features: 'Staff schedule, payroll, credentialing, RBAC and audits' },
  { portal: 'Insurance Desk', key_features: 'Eligibility, pre-auth, claim submission and payer tracking' },
  { portal: 'Patient Self-Service', key_features: 'Appointments, reports, bills, telemedicine, feedback' },
  { portal: 'System Administrator', key_features: 'Users/roles, master data, integrations, backups, audit trails' }
]

const rolloutOrder = [
  'Phase 1: Receptionist + Doctor + Billing',
  'Phase 2: Nursing + Pharmacy + Lab',
  'Phase 3: Patient Portal',
  'Phase 4: OT + Inventory + HR/Admin',
  'Phase 5: Insurance Desk + System Admin depth'
]

const crossPortalRules = [
  'Notifications engine: event-driven alerts across all portals',
  'Strict RBAC: permissions enforced per portal capability',
  'Unified patient journey: registration -> consult -> diagnostics -> pharmacy -> billing traceability'
]

export default function HospitalPortalsBlueprint() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HMS Portal Blueprint</CardTitle>
          <CardDescription>
            Actionable role-based portal structure for full hospital workflow execution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {rolloutOrder.map((line, idx) => (
            <p key={idx}>- {line}</p>
          ))}
        </CardContent>
      </Card>

      {portalGroups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{group.title}</CardTitle>
              <Badge variant="outline">Core</Badge>
            </div>
            <CardDescription>{group.primary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            {group.features.map((feature, idx) => (
              <p key={idx}>- {feature}</p>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Other Essential Portals</CardTitle>
          <CardDescription>Required for complete multi-department HMS coverage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {essentialPortals.map((row) => (
            <div key={row.portal} className="border rounded-lg p-3">
              <p className="font-medium text-sm">{row.portal}</p>
              <p className="text-xs text-gray-600 mt-1">{row.key_features}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cross-Portal Integration Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {crossPortalRules.map((rule, idx) => (
            <p key={idx}>- {rule}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
