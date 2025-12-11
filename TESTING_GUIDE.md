# Testing Guide - Clinic+ System
**Date:** December 2, 2025, 7:59 AM

---

## 🚀 QUICK START TESTING

### Step 1: Start Backend Server
```bash
cd f:/Projects/Clinic+
python main.py
```
**Expected:** Server starts on http://localhost:5000

### Step 2: Start Frontend (New Terminal)
```bash
cd f:/Projects/Clinic+
npm run dev
```
**Expected:** Vite dev server starts on http://localhost:5173

### Step 3: Open Browser
```
Navigate to: http://localhost:5173
```

---

## 🧪 TEST SCENARIOS

### Test 1: Login and Navigation
**User Types to Test:**
- Admin: `admin` / `admin123`
- Physician: `doctor` / `doctor123`
- Pharmacist: `pharmacist` / `pharma123`
- Receptionist: `receptionist` / `recept123`

**Steps:**
1. Enter credentials
2. Click "Sign In"
3. Verify dashboard loads
4. Check sidebar navigation

**Expected:**
- ✅ Successful login
- ✅ Role-specific menu appears
- ✅ No console errors

---

### Test 2: Pharmacy & Inventory Module
**Login as:** Pharmacist

**Steps:**
1. Click "Pharmacy & Inventory" in sidebar
2. View "Pending Prescriptions" tab
3. Check for sample prescription
4. Click "Verify & Process"
5. Go to "Dispensing Queue" tab
6. Click "Dispense" button
7. Go to "Inventory" tab
8. Check stock levels
9. Go to "Low Stock" tab
10. Click "Generate PO"

**Expected:**
- ✅ All tabs load
- ✅ Sample data displays
- ✅ Buttons are clickable
- ✅ Alerts show success messages
- ✅ No console errors

---

### Test 3: Laboratory Module
**Login as:** Physician

**Steps:**
1. Click "Laboratory (LIS)" in sidebar
2. View "Specimen Tracking" tab
3. Check sample specimens
4. Go to "Accessioning" tab
5. Go to "Worklist" tab
6. Go to "Results Validation" tab
7. Go to "Quality Control" tab
8. Go to "Analytics" tab

**Expected:**
- ✅ All tabs load
- ✅ Sample data displays
- ✅ Charts render
- ✅ No console errors

---

### Test 4: Workflow Builder
**Login as:** Admin

**Steps:**
1. Click "Workflows" in sidebar
2. Click "Create Workflow" button
3. Fill in workflow name: "Test Workflow"
4. Select category: "General"
5. Add description
6. Add a step:
   - Name: "Step 1"
   - Description: "Test step"
   - Time: "5 minutes"
7. Click "Add Step"
8. Click "Save Workflow"

**Expected:**
- ✅ Builder form opens
- ✅ Step added to list
- ✅ Workflow saved
- ✅ Success message
- ✅ Appears in templates

---

### Test 5: Professional Credentialing
**Login as:** Admin

**Steps:**
1. Click "Credentialing" in sidebar
2. View providers list
3. Click on a provider
4. View credentials
5. Go to "Add Credential" tab
6. Fill in form
7. Save credential

**Expected:**
- ✅ Providers load
- ✅ Credentials display
- ✅ Form works
- ✅ Save successful

---

## 🔍 WHAT TO CHECK

### Console Errors
**Open Browser DevTools (F12)**
- Check Console tab for errors
- Red errors = issues to fix
- Warnings = can be ignored for now

### Network Requests
**DevTools → Network Tab**
- Check API calls
- Status 200 = success
- Status 404 = endpoint not found
- Status 500 = server error

### UI Responsiveness
- Click all buttons
- Navigate all tabs
- Check forms
- Verify data displays

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: "Cannot GET /api/..."
**Cause:** Backend not running or endpoint doesn't exist  
**Fix:** 
```bash
# Restart backend
python main.py
```

### Issue 2: "Network Error"
**Cause:** Frontend can't reach backend  
**Fix:**
- Check backend is running on port 5000
- Check CORS settings
- Verify apiService.js base URL

### Issue 3: "Module not found"
**Cause:** Missing npm packages  
**Fix:**
```bash
npm install
```

### Issue 4: "Import error" in Python
**Cause:** Missing Python packages  
**Fix:**
```bash
pip install flask flask-cors flask-jwt-extended
```

### Issue 5: Blank page
**Cause:** JavaScript error  
**Fix:**
- Check browser console
- Look for import errors
- Verify component syntax

---

## ✅ TESTING CHECKLIST

### Backend
- [ ] Server starts without errors
- [ ] All blueprints registered
- [ ] Database connected (if applicable)
- [ ] CORS enabled
- [ ] JWT configured

### Frontend
- [ ] Vite dev server starts
- [ ] No build errors
- [ ] All components import correctly
- [ ] No console errors on load

### Authentication
- [ ] Login form appears
- [ ] Can login as admin
- [ ] Can login as physician
- [ ] Can login as pharmacist
- [ ] Can login as receptionist
- [ ] Logout works

### Navigation
- [ ] Sidebar appears
- [ ] Role-specific menus show
- [ ] All menu items clickable
- [ ] Views change correctly

### Modules
- [ ] Pharmacy & Inventory loads
- [ ] Laboratory Module loads
- [ ] Workflow Builder loads
- [ ] Professional Credentialing loads
- [ ] All tabs functional

### Data Display
- [ ] Sample data appears
- [ ] Tables render
- [ ] Cards display
- [ ] Badges show
- [ ] Icons render

### Interactions
- [ ] Buttons clickable
- [ ] Forms submittable
- [ ] Alerts show
- [ ] Modals open/close
- [ ] Tabs switch

---

## 📊 TEST RESULTS TEMPLATE

```
Date: ___________
Tester: ___________

Backend Status: [ ] Running [ ] Error
Frontend Status: [ ] Running [ ] Error

Login Test:
- Admin: [ ] Pass [ ] Fail
- Physician: [ ] Pass [ ] Fail
- Pharmacist: [ ] Pass [ ] Fail

Pharmacy Module: [ ] Pass [ ] Fail
Laboratory Module: [ ] Pass [ ] Fail
Workflow Builder: [ ] Pass [ ] Fail
Credentialing: [ ] Pass [ ] Fail

Console Errors: [ ] None [ ] Some [ ] Many

Notes:
_________________________________
_________________________________
```

---

## 🎯 PRIORITY TESTS

### High Priority (Must Work)
1. ✅ Login/Logout
2. ✅ Navigation
3. ✅ Pharmacy Module loads
4. ✅ Laboratory Module loads
5. ✅ No critical console errors

### Medium Priority (Should Work)
1. ✅ All tabs functional
2. ✅ Buttons clickable
3. ✅ Forms work
4. ✅ Sample data displays

### Low Priority (Nice to Have)
1. ✅ Charts render
2. ✅ Advanced features
3. ✅ Edge cases

---

## 🚀 READY TO TEST!

**Start with:**
```bash
# Terminal 1 - Backend
python main.py

# Terminal 2 - Frontend
npm run dev

# Browser
http://localhost:5173
```

**Test in this order:**
1. Login
2. Navigation
3. Pharmacy Module
4. Laboratory Module
5. Workflow Builder
6. Credentialing

**Report any errors!** 🐛
