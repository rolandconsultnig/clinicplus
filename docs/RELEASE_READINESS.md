# Clinic+ Release Readiness (Short)

Date: 2026-04-27

## 1) Environment Variables Checklist

Set these before production cutover.

### Core app

- `DATABASE_URL` (required in production)
- `JWT_SECRET_KEY` (required, strong random value)
- `CORS_ALLOWED_ORIGINS` (recommended, restrict to trusted origins)

### Payments / webhooks

- `STRIPE_WEBHOOK_SECRET` (required if Stripe webhooks enabled)

### Reporting + scheduled jobs

- `SENDGRID_API_KEY` (required for email delivery of scheduled reports)
- `REPORTS_FROM_EMAIL` (required when SendGrid delivery is used)

### Observability

- `SENTRY_DSN` (optional but recommended)

### Nightly ops runner (`scripts/ops_nightly.py` + `scripts/ops_nightly.ps1`)

- `UAT_BASE_URL` (default: `http://localhost:4300`)
- `UAT_BEARER` (required for authenticated UAT endpoints)
- `REPORT_RUNNER_BASE_URL` (default: `http://localhost:4300`)
- `REPORT_RUNNER_BEARER` (required for `run-due`)
- `PERF_BASE_URL` (default: `http://localhost:4300`)
- `PERF_BEARER` (required for perf probe)
- `PERF_LOOPS` (default: `5`)
- `UAT_TIMEOUT`, `REPORT_RUNNER_TIMEOUT`, `PERF_TIMEOUT` (default: `30`)
- `OPS_FAIL_ON_UAT`, `OPS_FAIL_ON_RUN_DUE`, `OPS_FAIL_ON_PERF` (default: `true`)
- `OPS_OUTPUT_FILE` (optional; `.ps1` wrapper sets this automatically)

## 2) One-Command Nightly Setup

From project root (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/ops_nightly.ps1" `
  -BaseUrl "https://<your-api-host>" `
  -UatBearer "<uat-token>" `
  -RunDueBearer "<runner-token>" `
  -PerfBearer "<perf-token>" `
  -KeepDays 14
```

What this does:

- Runs UAT checks, scheduled report `run-due`, and perf probe in sequence.
- Produces one consolidated JSON report.
- Saves report in `logs/ops-nightly/` with date/time file naming.
- Prunes old JSON reports older than `KeepDays`.

## 3) Rollback Notes (Minimal, Practical)

If a release introduces instability:

1. Stop nightly automation (disable scheduler / Task Scheduler job).
2. Roll back app deployment to prior known-good build/image.
3. Roll back DB schema only if required and safe:
   - Check current revision: `alembic current`
   - Roll back one step: `alembic downgrade -1`
   - For targeted rollback, use exact revision ID.
4. Verify health after rollback:
   - `python scripts/verify_todo2_smoke.py`
   - Confirm `/api/health` and core login/chart/billing/message flows.
5. Re-enable nightly automation only after smoke checks pass.

Notes:

- Prefer backward-compatible migrations for production releases.
- If data migrations were applied, validate data integrity before downgrade.

## 4) Go / No-Go Criteria (Quick Signoff)

- **GO** if `alembic upgrade head` completes with no errors.
- **GO** if `python scripts/verify_todo2_smoke.py` returns `smoke pass`.
- **GO** if `/api/health` responds `200` (or expected maintenance code during deploy window).
- **GO** if login, chart access, billing action, and messaging send/receive pass spot checks.
- **GO** if `scripts/ops_nightly.py` (or `.ps1` wrapper) runs and produces a consolidated JSON report.
- **GO** if nightly report has no failing gates, or only approved non-blocking failures.
- **GO** if required secrets are present (`DATABASE_URL`, JWT secret, webhook/report tokens).
- **NO-GO** on migration errors, repeated 5xx responses, auth failures, or broken critical-path flows.
- **NO-GO** if rollback plan is untested or previous stable build is unavailable.
- **Decision**: Capture release approver + timestamp in deployment log before cutover.
