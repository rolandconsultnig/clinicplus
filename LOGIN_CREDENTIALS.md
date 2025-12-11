# Clinic+ Login Credentials
**Last Updated:** December 3, 2025, 7:56 AM

---

## ✅ APP IS RUNNING!

### **Servers Status:**
- ✅ **Backend (Flask):** Running on `http://localhost:5000`
- ✅ **Frontend (Vite):** Running on `http://localhost:5173`
- ✅ **Browser Preview:** Available at `http://127.0.0.1:42485`

---

## 🔑 CONFIRMED LOGIN CREDENTIALS

### **Admin Users:**

#### 1. Admin Demo
```
Username: admin_demo
Password: admin123
User Type: admin
```

#### 2. Root Admin
```
Username: root_admin
Password: root123
User Type: admin
```

#### 3. Test User
```
Username: test_user
Password: test123
User Type: admin
```

---

### **Provider User:**

#### 4. Provider Demo (Physician)
```
Username: provider_demo
Password: provider123
User Type: provider
```

---

### **Patient User:**

#### 5. Patient Demo
```
Username: patient_demo
Password: patient123
User Type: patient
```

---

### **Receptionist User:**

#### 6. Receptionist
```
Username: receptionist
Password: recept123
User Type: Receptionist
```

---

## 🎯 RECOMMENDED TEST CREDENTIALS

### **For Testing Pharmacy Module:**
Since we need a pharmacist user, use the **Provider Demo** account:
```
Username: provider_demo
Password: provider123
```

### **For Testing Admin Features:**
```
Username: admin_demo
Password: admin123
```

### **For Testing Receptionist Features:**
```
Username: receptionist
Password: recept123
```

---

## 🚀 HOW TO LOGIN

### **Step 1: Open the App**
Click the browser preview button or navigate to:
```
http://localhost:5173
```

### **Step 2: Enter Credentials**
Use any of the credentials above. For example:
- **Username:** `admin_demo`
- **Password:** `admin123`

### **Step 3: Click Sign In**

### **Step 4: Navigate**
After login, you'll see the dashboard with navigation menu based on your user type.

---

## 📋 TESTING CHECKLIST

### **Test Login:**
- [ ] Try `admin_demo` / `admin123`
- [ ] Verify dashboard loads
- [ ] Check navigation menu appears

### **Test Navigation:**
- [ ] Click different menu items
- [ ] Verify views change
- [ ] Check no console errors

### **Test Modules:**
- [ ] Pharmacy & Inventory (if available for user type)
- [ ] Laboratory (LIS)
- [ ] Workflow Builder
- [ ] Professional Credentialing

---

## 🔧 IF LOGIN FAILS

### **Option 1: Reset Passwords**
Run this command to reset all passwords:
```bash
Invoke-WebRequest -Uri "http://localhost:5000/api/dev/reset-passwords" -Method POST
```

### **Option 2: Check User List**
Verify users exist:
```bash
Invoke-WebRequest -Uri "http://localhost:5000/api/dev/list-users" -Method GET
```

### **Option 3: Check Console**
- Open browser DevTools (F12)
- Look for errors in Console tab
- Check Network tab for failed requests

---

## 💡 QUICK TIPS

### **Best Credentials for Testing:**
1. **Admin Features:** `admin_demo` / `admin123`
2. **General Testing:** `provider_demo` / `provider123`
3. **Receptionist Features:** `receptionist` / `recept123`

### **After Login:**
- Check the sidebar for available modules
- Different user types see different menus
- Admin users have the most access

---

## 🎉 READY TO TEST!

**Your app is running and ready!**

**Quick Start:**
```
1. Open: http://localhost:5173
2. Login: admin_demo / admin123
3. Explore the modules!
```

---

## 📊 USER TYPES & ACCESS

| Username | Password | User Type | Access Level |
|----------|----------|-----------|--------------|
| admin_demo | admin123 | admin | Full access |
| root_admin | root123 | admin | Full access |
| test_user | test123 | admin | Full access |
| provider_demo | provider123 | provider | Provider features |
| patient_demo | patient123 | patient | Patient portal |
| receptionist | recept123 | Receptionist | Front desk |

---

## 🔐 SECURITY NOTE

**These are development/testing credentials only!**
- Do NOT use in production
- Change passwords before deployment
- Implement proper user management for production

---

**Status:** ✅ **APP RUNNING - READY TO LOGIN!**

**Open:** http://localhost:5173  
**Login:** admin_demo / admin123
