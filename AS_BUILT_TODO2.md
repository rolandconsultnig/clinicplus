# As-built snapshot (todo-2 execution)

**Date:** 2026-04-26

## Backend

- **Product hub** (`/api/hub/...`): RCM (collection notes, payment plans, installments), waitlist, appointment scheduling meta, calendar OAuth placeholder, claim draft + status, formulary search, EPCS/PDMP guidance, pharmacy dispensing queue, lab result update + trends, document revisions, saved reports + schedules, compliance pack list, sample PDF, EOB/ERA and OCR ingest placeholders, refund intake, security posture, ops metrics.
- **Payments**: Stripe **webhook** with signature verification and **idempotency** (`webhook_idempotency` table).
- **Billing**: `GET /api/billing/statements/<id>/export.html` (print/PDF from browser).
- **Scheduling**: `POST /api/scheduling/appointments/<id>/recurrence/expand` (projected dates).
- **Portal**: `GET /api/portal/self-service/balance`, `POST /api/portal/self-service/appointments`.
- **Messaging**: `GET /api/messages/events` (SSE heartbeat stream).
- **Sentry** (optional): set `SENTRY_DSN` to enable.
- **Migration**: `migrations/versions/todo2_2026_04_product_hub_tables.py`.

## Frontend

- **Unified patient selector** integrated into `PatientDataManager` (staff).
- **Removed** unused `UnifiedNavigation.jsx` (adopt or delete).
- `PageWrapper` already used across modules (standardize over time as needed).

## Ops

- Run `alembic upgrade head` after deploy.
- Optional: `pip install -r requirements.txt` for `sentry-sdk` and `fpdf2`.

## Scripts

- `python scripts/verify_todo2_smoke.py` — import + route count + optional hub ping.
