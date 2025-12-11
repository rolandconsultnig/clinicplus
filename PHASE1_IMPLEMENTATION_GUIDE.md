# Phase 1 Implementation Guide - Core Modules Integration

## Overview
This guide provides step-by-step instructions for implementing Phase 1 of the unified system integration, focusing on core modules: Receptionist, Doctor, and Pharmacy.

## Step 1: Backend - Add Pending Actions Endpoint

Create or update the dashboard routes to include pending actions:

```python
# In main.py or create src/routes/dashboard.py

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required
from src.models.user import db
from src.models.prescribing import Prescription
from src.models.clinical import LabOrder, Appointment
from src.models.messaging import Message
from src.models.iot_vitals import VitalAlert
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/pending-actions', methods=['GET'])
@token_required
def get_pending_actions():
    """Get count of pending actions for current user"""
    try:
        user_id = request.current_user.id
        user_type = request.current_user.user_type.lower()
        
        pending = {
            'prescriptions': 0,
            'labOrders': 0,
            'appointments': 0,
            'messages': 0,
            'alerts': 0
        }
        
        # Count pending prescriptions (for pharmacists)
        if user_type in ['pharmacist']:
            pending['prescriptions'] = Prescription.query.filter_by(
                status='pending'
            ).count()
        
        # Count pending lab orders (for lab techs)
        if user_type in ['lab_technician', 'lab technician']:
            pending['labOrders'] = LabOrder.query.filter_by(
                status='pending'
            ).count()
        
        # Count upcoming appointments (for doctors/nurses)
        if user_type in ['physician', 'nurse']:
            tomorrow = datetime.now() + timedelta(days=1)
            pending['appointments'] = Appointment.query.filter(
                Appointment.provider_id == user_id,
                Appointment.appointment_date <= tomorrow,
                Appointment.status == 'scheduled'
            ).count()
        
        # Count unread messages
        pending['messages'] = Message.query.filter_by(
            recipient_id=user_id,
            is_read=False
        ).count() if Message.__table__.exists(db.engine) else 0
        
        # Count active vital alerts (for doctors/nurses)
        if user_type in ['physician', 'nurse']:
            pending['alerts'] = VitalAlert.query.filter_by(
                status='active'
            ).count() if VitalAlert.__table__.exists(db.engine) else 0
        
        return jsonify({
            'success': True,
            'pending_actions': pending
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Register blueprint in main.py
# app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
```

## Step 2: Update App.jsx Structure

Replace the existing App.jsx navigation section with the unified system:

```javascript
// In App.jsx, update the return statement of the App component:

return (
  <ThemeProvider>
    <ToastProvider>
      <AppProvider user={user}>
        <Routes>
          <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
          <Route path="/*" element={
            <div className="flex h-screen bg-gray-50">
              {/* Unified Navigation */}
              <UnifiedNavigation
                user={user}
                currentView={currentView}
                setCurrentView={setCurrentView}
                onLogout={handleLogout}
              />
              
              {/* Main Content */}
              <div className="flex-1 overflow-auto">
                {renderContent()}
              </div>
            </div>
          } />
        </Routes>
      </AppProvider>
    </ToastProvider>
  </ThemeProvider>
)
```

## Step 3: Update ReceptionistDashboard

Add context integration to ReceptionistDashboard.jsx:

```javascript
import { useAppContext } from '../contexts/AppContext.jsx'

export default function ReceptionistDashboard() {
  const { selectPatient, addNotification, broadcastEvent } = useAppContext()
  
  // When patient is registered
  const handlePatientRegistered = async (patient) => {
    // Select the patient in global context
    await selectPatient(patient)
    
    // Notify system
    addNotification({
      type: 'success',
      message: `Patient ${patient.first_name} ${patient.last_name} registered successfully`,
      module: 'receptionist'
    })
    
    // Broadcast event
    broadcastEvent({
      type: 'PATIENT_REGISTERED',
      payload: { patient }
    })
  }
  
  // When visit is created
  const handleVisitCreated = (visit) => {
    addNotification({
      type: 'success',
      message: `Visit created for ${visit.patient_name}`,
      module: 'receptionist'
    })
    
    broadcastEvent({
      type: 'VISIT_CREATED',
      payload: { visit }
    })
  }
  
  // Rest of component...
}
```

## Step 4: Update DoctorConsultationPage

The DoctorConsultationPage already uses IoTVitalsPanel which needs patient context:

```javascript
import { useAppContext } from '../contexts/AppContext.jsx'
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

export default function DoctorConsultationPage() {
  const { 
    selectedPatient, 
    currentEncounter,
    createEncounter,
    addNotification,
    broadcastEvent,
    quickActions 
  } = useAppContext()
  
  // If no patient selected, show selector
  if (!selectedPatient) {
    return (
      <div className="p-6">
        <UnifiedPatientSelector showQuickInfo={true} />
      </div>
    )
  }
  
  // If no encounter, create one
  useEffect(() => {
    if (selectedPatient && !currentEncounter) {
      createEncounter(selectedPatient.id, {
        encounter_type: 'OPD',
        chief_complaint: 'Consultation'
      })
    }
  }, [selectedPatient, currentEncounter])
  
  // When prescription is created
  const handlePrescriptionCreated = async (prescriptionData) => {
    const prescription = await quickActions.createPrescription(prescriptionData)
    if (prescription) {
      // Notification already added by quickActions
      loadPrescriptions()
    }
  }
  
  // When lab order is created
  const handleLabOrderCreated = async (labOrderData) => {
    const labOrder = await quickActions.createLabOrder(labOrderData)
    if (labOrder) {
      loadLabOrders()
    }
  }
  
  // Rest of component with patientId={selectedPatient.id}...
}
```

## Step 5: Update PrescriptionManager

Add context integration for pharmacists:

```javascript
import { useAppContext } from '../contexts/AppContext.jsx'
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

export default function PrescriptionManager() {
  const { 
    selectedPatient, 
    currentEncounter,
    addNotification,
    broadcastEvent,
    user 
  } = useAppContext()
  
  const [prescriptions, setPrescriptions] = useState([])
  
  // Load prescriptions based on user role
  useEffect(() => {
    if (user.user_type === 'Pharmacist' || user.user_type === 'pharmacist') {
      // Load all pending prescriptions for pharmacy
      loadPendingPrescriptions()
    } else if (selectedPatient) {
      // Load prescriptions for selected patient
      loadPatientPrescriptions(selectedPatient.id)
    }
  }, [selectedPatient, user])
  
  const loadPendingPrescriptions = async () => {
    try {
      const response = await fetch('/api/prescriptions/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPrescriptions(data.prescriptions || [])
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error)
    }
  }
  
  const handleDispensePrescription = async (prescriptionId) => {
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}/dispense`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        addNotification({
          type: 'success',
          message: 'Prescription dispensed successfully',
          module: 'pharmacy'
        })
        
        broadcastEvent({
          type: 'PRESCRIPTION_DISPENSED',
          payload: { prescriptionId }
        })
        
        loadPendingPrescriptions()
      }
    } catch (error) {
      console.error('Error dispensing prescription:', error)
    }
  }
  
  // Render based on user role
  if (user.user_type === 'Pharmacist' || user.user_type === 'pharmacist') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Pharmacy Queue</h1>
        
        {/* List of pending prescriptions */}
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {prescription.patient_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {prescription.medication_name} - {prescription.dosage}
                    </p>
                  </div>
                  <Button onClick={() => handleDispensePrescription(prescription.id)}>
                    Dispense
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  // For doctors/nurses - show patient selector
  return (
    <div className="p-6 space-y-6">
      <UnifiedPatientSelector />
      
      {selectedPatient && (
        <div>
          {/* Prescription form and list for selected patient */}
        </div>
      )}
    </div>
  )
}
```

## Step 6: Register Dashboard Blueprint

In main.py, add:

```python
# Import and register Dashboard routes
from src.routes.dashboard import dashboard_bp
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
```

## Step 7: Testing Phase 1

### Test 1: Patient Context Sharing
1. Login as Receptionist
2. Navigate to Reception Desk
3. Register or select a patient
4. Navigate to Dashboard
5. Switch to Doctor role (or login as doctor)
6. Navigate to Consultation
7. **Verify**: Patient info should appear automatically

### Test 2: Prescription Flow
1. Login as Doctor
2. Select a patient
3. Create a prescription in Consultation page
4. **Verify**: Notification appears
5. Logout and login as Pharmacist
6. Navigate to Prescriptions
7. **Verify**: Prescription appears in queue
8. **Verify**: Badge shows count

### Test 3: Notifications
1. Perform various actions (register patient, create prescription, etc.)
2. **Verify**: Bell icon shows unread count
3. Click bell icon
4. **Verify**: Notifications appear in dropdown
5. Click notification
6. **Verify**: Marked as read

### Test 4: Pending Actions
1. Login as Pharmacist
2. **Verify**: Prescriptions badge shows correct count
3. Login as Doctor
4. **Verify**: Appointments badge shows upcoming count
5. **Verify**: Alerts badge shows active alerts

### Test 5: Mobile Responsive
1. Resize browser to mobile size
2. **Verify**: Hamburger menu appears
3. Click hamburger menu
4. **Verify**: Navigation drawer slides out
5. **Verify**: All navigation items visible
6. Select a menu item
7. **Verify**: Drawer closes automatically

## Step 8: Troubleshooting

### Issue: Patient context not updating
**Solution**: Ensure all modules are wrapped in AppProvider and using useAppContext()

### Issue: Notifications not appearing
**Solution**: Check that addNotification() is called with correct parameters:
```javascript
addNotification({
  type: 'success', // or 'error', 'warning', 'info'
  message: 'Your message here',
  module: 'module_name'
})
```

### Issue: Navigation not showing correct items
**Solution**: Verify user.user_type is correctly set and matches role definitions in UnifiedNavigation.jsx

### Issue: Pending actions not loading
**Solution**: Check that backend endpoint `/api/dashboard/pending-actions` is registered and accessible

## Step 9: Verification Checklist

- [ ] AppProvider wraps the app
- [ ] UnifiedNavigation replaces old sidebar
- [ ] ReceptionistDashboard uses context
- [ ] DoctorConsultationPage uses context
- [ ] PrescriptionManager uses context
- [ ] Dashboard blueprint registered
- [ ] Pending actions endpoint working
- [ ] Patient context shares across modules
- [ ] Notifications appear and work
- [ ] Pending action badges show counts
- [ ] Mobile responsive design works
- [ ] All user roles tested

## Next Steps

After Phase 1 is complete and tested:
- **Phase 2**: Integrate Lab Orders, Billing, and Scheduling modules
- **Phase 3**: Integrate Admin modules (User Management, Settings)
- **Phase 4**: Add advanced features (Real-time updates, Analytics)
- **Phase 5**: Mobile app integration

## Success Criteria

Phase 1 is considered complete when:
1. ✅ Receptionist can register patients and context is shared
2. ✅ Doctor can see selected patient in consultation
3. ✅ Prescriptions flow from doctor to pharmacist
4. ✅ Notifications work across all modules
5. ✅ Pending action badges show correct counts
6. ✅ Mobile responsive design works
7. ✅ No console errors
8. ✅ All three core modules (Receptionist, Doctor, Pharmacy) are fully integrated

---

**Status**: Ready for Implementation  
**Estimated Time**: 4-6 hours  
**Priority**: High
