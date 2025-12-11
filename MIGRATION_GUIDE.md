# Migration Guide for Phase 2, 3, 4 Features

## Migration Status

Some tables may already exist from `db.create_all()`. Follow these steps:

### Option 1: If tables already exist (Recommended)

1. **Stamp the database** to mark migrations as applied:
   ```bash
   python -m alembic stamp head
   ```

2. **Verify migration status**:
   ```bash
   python -m alembic current
   ```

### Option 2: If starting fresh

1. **Run all migrations**:
   ```bash
   python -m alembic upgrade head
   ```

### Option 3: If migration fails due to existing tables

1. **Check which tables exist**:
   ```python
   from main import app, db
   with app.app_context():
       print(db.engine.table_names())
   ```

2. **Manually create missing tables** or modify migration to use `IF NOT EXISTS`

## Migration Files

1. **40421d7293bf** - Phase 1 (SOAP Notes, Physical Exam, ROS, Clinical Reminders)
2. **insurance_companies_001** - Insurance Companies table
3. **a1158ae841a2** - Phase 2-4 (All new models)

## Tables Created

### Phase 2:
- `portal_messages`
- `portal_access_logs`
- `documents`
- `document_categories`
- `document_templates`
- `messages`
- `message_templates`

### Phase 3:
- `billing_trackers`
- `eras`
- `era_claims`
- `ub04_forms`

### Phase 4:
- `care_plans`
- `care_plan_templates`
- `treatment_plans`

### Supporting:
- `insurance_companies`

## Troubleshooting

If you encounter "table already exists" errors:
- The tables were likely created by `db.create_all()`
- Use `alembic stamp head` to mark migrations as complete
- Or manually drop tables and re-run migrations

---

*For production, use PostgreSQL which fully supports all foreign key operations.*

