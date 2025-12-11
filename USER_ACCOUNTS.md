# Clinic+ User Accounts
**Last Updated:** December 2, 2025

---

## 🔐 Available User Accounts

### Administrator Accounts (Full Access)

#### 1. test_user ✅ **UPDATED TO ADMIN**
```
Username: test_user
Password: admin123
Role: Administrator
Status: Active & Verified
```

**Access:**
- ✅ System Settings
- ✅ User Management
- ✅ Organization Management
- ✅ Facility Management
- ✅ Security Audit
- ✅ Data Import/Export
- ✅ FHIR Integration
- ✅ Professional Credentialing
- ✅ All clinical features
- ✅ All administrative features

---

#### 2. root_admin
```
Username: root_admin
Password: admin123
Role: Administrator
Status: Active & Verified
```

**Access:** Same as test_user (full system access)

---

#### 3. admin_demo
```
Username: admin_demo
Password: admin123
Role: Administrator
Status: Active & Verified
```

**Access:** Same as test_user (full system access)

---

### Receptionist Account (Limited Access)

#### 4. receptionist
```
Username: receptionist
Password: receptionist123
Role: Receptionist
Status: Active & Verified
```

**Access:**
- ✅ Reception Desk
- ✅ Patient Registration
- ✅ Patient Search
- ✅ Appointments
- ✅ Billing
- ✅ OPD Queue Management
- ✅ Emergency Triage
- ❌ System Settings (Admin only)
- ❌ User Management (Admin only)
- ❌ Security Audit (Admin only)

---

### Demo Accounts

#### 5. patient_demo
```
Username: patient_demo
Password: (not set - patient portal)
Role: Patient
Status: Active & Verified
```

**Access:**
- Patient Portal
- View own records
- Book appointments
- View prescriptions

---

#### 6. provider_demo
```
Username: provider_demo
Password: (not set)
Role: Provider
Status: Active & Verified
```

**Access:**
- Provider workflows
- Patient consultations
- Clinical documentation

---

## 🎯 Quick Login Guide

### To Access Admin Features:
1. **Logout** if currently logged in as receptionist
2. **Login** with admin credentials:
   ```
   Username: test_user
   Password: admin123
   ```
3. You'll now see the **Admin sidebar** with:
   - System Settings
   - User Management
   - Organization Management
   - Facility Management
   - Security Audit
   - Data Import/Export
   - FHIR Integration
   - Professional Credentialing

### To Access Receptionist Features:
1. **Login** with receptionist credentials:
   ```
   Username: receptionist
   Password: receptionist123
   ```
2. You'll see the **Receptionist sidebar** with:
   - Reception Desk
   - Patient Search
   - Appointments
   - Billing
   - OPD Queue
   - Emergency

---

## 🔧 User Management Scripts

### Update User to Admin
```bash
python update_test_user_admin.py
```

### List All Users
```bash
python list_all_users.py
```

### Create Receptionist
```bash
python create_receptionist.py
```

### Check User Details
```bash
python check_receptionist.py
```

---

## 🛡️ Security Notes

### Password Policy
- Default passwords should be changed on first login
- Passwords are hashed using `scrypt` algorithm
- Account locks after 5 failed login attempts
- Locked accounts unlock after 30 minutes

### Role-Based Access Control
- **Admin:** Full system access
- **Receptionist:** Front desk operations only
- **Physician:** Clinical features only
- **Patient:** Personal records only

### Account Status
All accounts are currently:
- ✅ **Active:** Can login
- ✅ **Verified:** Email verified
- ✅ **Unlocked:** No failed login attempts

---

## 📊 User Statistics

| Role | Count | Active |
|------|-------|--------|
| Administrator | 3 | 3 |
| Receptionist | 1 | 1 |
| Patient | 1 | 1 |
| Provider | 1 | 1 |
| **Total** | **6** | **6** |

---

## 🚀 Testing Different Roles

### Test Admin Features:
1. Login as `test_user` / `admin123`
2. Navigate to System Settings
3. Try User Management
4. Access Security Audit

### Test Receptionist Features:
1. Login as `receptionist` / `receptionist123`
2. Register a new patient
3. Create an appointment
4. Generate OPD token
5. Try to access System Settings (should see "Access Denied")

### Test Permission System:
1. Login as receptionist
2. Try accessing admin features
3. Verify 403 errors are handled gracefully
4. Logout and login as admin
5. Verify full access to all features

---

## 🔄 Password Reset

If you need to reset a password:

```python
# Create a script: reset_password.py
from main import app, db
from src.models.auth import UserAccount

with app.app_context():
    user = UserAccount.query.filter_by(username='USERNAME').first()
    if user:
        user.set_password('NEW_PASSWORD')
        db.session.commit()
        print(f"Password updated for {user.username}")
```

---

## ✅ Current Status

**test_user Account:**
- ✅ **CONFIRMED:** Admin role
- ✅ **CONFIRMED:** Active status
- ✅ **CONFIRMED:** Verified status
- ✅ **CONFIRMED:** Password set to `admin123`
- ✅ **READY:** Can access all admin features

**Next Steps:**
1. Logout from receptionist account
2. Login with `test_user` / `admin123`
3. Access System Settings and other admin features
4. Test all new components (AI Consultation, CDS, FHIR, etc.)

---

## 📝 Notes

- All admin accounts have identical permissions
- Use `test_user` for general testing
- Use `root_admin` for system administration
- Use `admin_demo` for demonstrations
- Receptionist account is for front desk testing only

---

**Last Verification:** December 2, 2025, 6:37 AM  
**Status:** ✅ All accounts verified and working
