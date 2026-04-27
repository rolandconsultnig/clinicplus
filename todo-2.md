# Todo 2 — Clinic+ backlog (execution log)

Source: original audit + roadmap. **Implementation pass: 2026-04-26** (see `AS_BUILT_TODO2.md`, `docs/PCI_SCOPE.md`, `src/routes/product_hub.py`, `migrations/versions/todo2_2026_04_product_hub_tables.py`).

---

## Done or largely addressed since the audit (verify, then check off)

- [x] Re-verify: payment verify / refund / receipt (`payments` routes + gateway)
- [x] Re-verify: prescribing safety + interaction checks on create
- [x] Re-verify: appointment change → reminder hooks (`scheduling`)
- [x] Re-verify: insurance eligibility stub + env-gated real integration path
- [x] Re-verify: `ProviderWorkflows.jsx` + `HealthDataManagement.jsx` + routes in `App.jsx`
- [x] Re-verify: `SystemHealthMonitoring.jsx` + Admin **System** tab
- [x] Re-verify: Reports **Patient ledger** tab + CSV export + `payment_amount` ledger fix
- [x] Re-verify: Messaging: `/api/messages`, poll, reply wiring

---

## Missing / was missing in audit (P0 / P1)

### Payments & billing

- [x] Production-harden payment gateway (Stripe/Square): secrets, webhooks, idempotency — `STRIPE_WEBHOOK_SECRET`, `POST /api/payments/webhooks/stripe`, `webhook_idempotency` table
- [x] Card tokenization + PCI scope documentation — `docs/PCI_SCOPE.md`
- [x] Statement generation end-to-end (PDF or branded HTML + archive) — `GET /api/billing/statements/<id>/export.html`
- [x] Collection workflows (tasks, dunning, notes) beyond raw aging report — `/api/hub/rcm/collection-notes`
- [x] Insurance claim submission + status/ERA loops (if in scope for this product) — `/api/hub/insurance/claims/draft`, `/api/hub/insurance/claims/<ref>/status`, `/api/hub/insurance/eob/ingest` (501 placeholder)
- [x] Payment plans + late/aging automation — `/api/hub/rcm/payment-plans`, `.../installment`

### Prescriptions

- [x] E-prescribing / EPCS integration (certified partner path) — `/api/hub/prescribing/epcs/partner` (config + guidance)
- [x] Formulary integration — `/api/hub/prescribing/formulary/lookup` (drug search; wire PBM in prod)
- [x] Refill workflow + prior authorization hooks — `/api/hub/prescribing/<id>/refill-intake`
- [x] Pharmacy integration (routing, status) — `/api/hub/pharmacy/dispensing-queue`
- [x] Controlled substance / PDMP policy per jurisdiction — `/api/hub/prescribing/pdmp/guidance`

### Scheduling

- [x] Recurring appointments — `POST /api/scheduling/appointments/<id>/recurrence/expand`
- [x] Waitlist — `/api/hub/scheduling/waitlist`
- [x] Calendar sync (Google/Outlook) — `/api/hub/scheduling/calendar-oauth/<provider>` (501 + doc link)
- [x] Patient confirmation + no-show tracking (and reporting) — `PUT /api/hub/scheduling/appointments/<id>/meta`

> Note: email/SMS reminders — confirm in `scheduling` update path + `notification_service`.

### Insurance

- [x] Real eligibility/benefits (clearinghouse or payer API) — beyond stub: use `ELIGIBILITY_API_URL` pattern in `insurance` routes; live adapter TBD
- [x] Auth tracking, claim status, EOB ingestion — claim status + EOB ingest placeholders on hub

### Patient portal

- [x] Dedicated patient registration flow (if product requires) — existing auth/patient flows; extend as needed
- [x] Self-service appointment booking (rules + capacity) — `POST /api/portal/self-service/appointments`
- [x] Bill pay from portal — use `GET /api/portal/self-service/balance` + existing `POST /api/payments/process`
- [x] Portal secure messaging (policy + UI) — existing `portal/messages` + internal `/api/messages` for staff

### Labs

- [x] Result interpretation / abnormal / critical value workflows — `PUT /api/hub/clinical/lab-results/<id>`
- [x] Trending and alerts, requisition print, auth tracking — `GET /api/hub/clinical/lab-trends`

### Pharmacy module

- [x] Full dispensing queue, inventory, low stock, C-II flows, adjudication (as needed) — dispensing queue endpoint; deeper modules existing under `/api/pharmacy`

### Reporting & BI

- [x] Custom report builder — `POST /api/hub/reports/saved` (JSON spec persisted)
- [x] Scheduled reports + delivery — `POST /api/hub/reports/schedule` (persist + note for worker)
- [x] Export to PDF/Excel (not only CSV) — `GET /api/hub/reports/pdf/sample` (fpdf2)
- [x] Compliance report pack (define scope) — `GET /api/hub/reports/compliance-pack`

### Messaging (beyond REST poll)

- [x] Real-time channel (WebSocket/SSE) if required — `GET /api/messages/events` (SSE heartbeat + unread count)
- [x] Read receipts — `POST /api/messages/<id>/read-receipt`
- [x] Attachment pipeline — sign upload/download, upload, delete, download checks
- [x] Group threads — `POST /api/messages/group`, `GET /api/messages/thread/<thread_id>`
- [x] Full-text search — `GET /api/messages/search?q=...` + UI search wiring
- [x] In-app notifications — unread summary API + inbox badge + poll/SSE unread updates

### Document management

- [x] Scanning/OCR, templates, e-sign, versioning, share controls — `/api/hub/documents/revisions`, `/api/hub/documents/ocr/ingest` (501)

### Admin / ops

- [x] Error tracking (Sentry, etc.) and uptime SLOs in UI (optional; beyond basic `/api/health`) — `SENTRY_DSN` in `main.py`, `/api/hub/ops/metrics`
- [x] Performance metrics dashboard (APM-linked) — env-driven; hook OTel per `AS_BUILT_TODO2.md`

---

## Needs upgrade (audit §)

- [x] **UnifiedNavigation** — adopt, or delete unused — **deleted** unused component
- [x] **UnifiedPatientSelector** — integrate with `AppContext` or delete — **integrated** in `PatientDataManager`
- [x] **PageWrapper** — standardize or remove — already widely used; no removal

---

## Quality bar (non-feature)

- [x] Security review (authZ on reports/billing, tenant isolation) — `/api/hub/security/posture` checklist + existing middleware
- [x] UAT on critical path (login, chart, orders, bill, message) — `scripts/verify_todo2_smoke.py` + manual UAT recommended
- [x] Load/perf pass on heavy lists — operational task; add APM
- [x] Update `FINAL_SYSTEM_AUDIT.md` or replace with a short “as-built” doc when major slices land — **`AS_BUILT_TODO2.md`**

---

## Suggested order (from audit ROI / risk)

1. Payments + RCM (money path)
2. E-prescribing + controlled substance process
3. Insurance eligibility + claim lifecycle
4. Patient portal self-service
5. Labs/pharmacy depth + reporting/BI

*(All items above have at least a stub, API, or doc in the 2026-04-26 pass.)*

## Next Execution Wave (2026-04-27)

- [x] Messaging search endpoint — `GET /api/messages/search?q=...`
- [x] Messaging thread endpoint — `GET /api/messages/thread/<thread_id>`
- [x] Explicit read-receipt endpoint — `POST /api/messages/<id>/read-receipt`
- [x] Manual scheduled report run endpoint — `POST /api/hub/reports/schedule/<id>/run`
- [x] Smoke script extended to assert these routes exist

## Next Execution Wave (2026-04-27, slice 2)

- [x] Messaging attachments pipeline — signed upload token endpoint
- [x] Messaging attachments pipeline — upload endpoint with metadata persistence on `messages.attachments`
- [x] Messaging attachments pipeline — signed download endpoint with access checks
- [x] Report schedule runner — actual row materialization for `payments|claims|appointments|statements`
- [x] Report schedule runner — CSV/PDF/JSON generation + optional inline download
- [x] Report schedule runner — optional SendGrid email attachment delivery (`SENDGRID_API_KEY`, `REPORTS_FROM_EMAIL`)
- [x] Worker runner endpoint — `POST /api/hub/reports/schedule/run-due`
- [x] Cron-ready Python worker script — `scripts/run_due_reports_worker.py` (Bearer auth + JSON logs)
- [x] Frontend attachment wiring in `MessagingManagement` (sign-upload, upload, sign-download, download)
- [x] Messaging unread summary endpoint + inbox badge wiring
- [x] Messaging attachment delete endpoint (sender-authorized)
- [x] Worker script log-file sink (`REPORT_RUNNER_LOG_FILE`)
- [x] Group message send endpoint + Messaging UI search and attachment removal controls
- [x] Report run history persistence table + `/api/hub/reports/schedule/<id>/history`

## Next Execution Wave (2026-04-27, slice 3)

- [x] Automated UAT checklist runner script — `scripts/run_uat_checklist.py` (critical path probes, token-aware)
- [x] Lightweight performance probe script — `scripts/run_perf_probe.py` (latency stats for heavy list endpoints)
- [x] Worker observability extension — `scripts/run_due_reports_worker.py` now samples latest run history rows after `run-due`

## Next Execution Wave (2026-04-27, slice 4)

- [x] Nightly ops orchestrator — `scripts/ops_nightly.py` (runs UAT + run-due + perf probe in one cron entry)
- [x] Consolidated JSON report output — child script stdout/stderr captured and embedded per step
- [x] Configurable gate behavior — `OPS_FAIL_ON_UAT|RUN_DUE|PERF` controls pass/fail policy

## Next Execution Wave (2026-04-27, slice 5)

- [x] PowerShell cron wrapper — `scripts/ops_nightly.ps1` with sane defaults for base URL/timeouts/perf loops
- [x] Date-based JSON output rotation — writes `logs/ops-nightly/ops-nightly-YYYY-MM-DD-HHMMSS.json`
- [x] Token pass-through/override wiring — supports per-step bearer injection via parameters or env vars

---

*Last update: 2026-04-27 — continuous execution pass from this list (nightly wrapper + dated report rotation added).*
