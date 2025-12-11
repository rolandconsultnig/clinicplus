# Updated App.jsx Integration Guide

## Changes Required to App.jsx

### 1. Add Imports

Add these imports at the top of App.jsx:

```javascript
// Add to existing imports
import { AppProvider } from './contexts/AppContext.jsx'
import UnifiedNavigation from './components/UnifiedNavigation.jsx'
import UnifiedPatientSelector from './components/UnifiedPatientSelector.jsx'
```

### 2. Wrap Main App Component

Wrap the entire app with AppProvider:

```javascript
function App() {
  const [user, setUser] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [checkingAuth, setCheckingAuth] = useState(true)

  // ... existing code ...

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AppProvider user={user}>
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
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
```

### 3. Update renderContent Function

Replace the existing sidebar navigation with the unified system:

```javascript
const renderContent = () => {
  switch (currentView) {
    // Receptionist
    case 'receptionist':
      return <ReceptionistDashboard />
    
    // Doctor/Physician
    case 'doctor-consultation':
      return <DoctorConsultationPage />
    
    // Common
    case 'patients':
      return <PatientDataManager />
    case 'scheduling':
      return <SchedulingCalendar />
    case 'prescriptions':
      return <PrescriptionManager />
    case 'lab-orders':
      return <LabOrders />
    case 'billing':
      return <BillingDashboard />
    case 'billing-tracker':
      return <BillingTracker />
    case 'documents':
      return <DocumentManagement />
    case 'messages':
      return <Messaging />
    case 'rpm-monitor':
      return <RPMMonitor />
    
    // Pharmacy
    case 'pharmacy-search':
      return <PharmacySearch />
    
    // Admin
    case 'users':
      return <UserManagement />
    case 'facilities':
      return <FacilityManagement />
    case 'system-settings':
      return <SystemSettings />
    case 'security-audit':
      return <SecurityAudit />
    case 'root-admin':
      return <RootAdminDashboard />
    case 'organizations':
      return <OrganizationManagement />
    
    // Settings
    case 'settings':
      return <UserProfile />
    
    // Default Dashboard
    case 'dashboard':
    default:
      return <RoleBasedPortal user={user} />
  }
}
```

### 4. Remove Old Sidebar Code

Remove the old sidebar navigation code (lines ~470-600) and replace with UnifiedNavigation component.

### 5. Update Module Components

Each module should be updated to use the unified context:

#### Example: Update PrescriptionManager.jsx

```javascript
import { useAppContext } from '../contexts/AppContext.jsx'
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

export default function PrescriptionManager() {
  const { 
    selectedPatient, 
    currentEncounter,
    addNotification,
    broadcastEvent,
    quickActions 
  } = useAppContext()

  const handleCreatePrescription = async (prescriptionData) => {
    const prescription = await quickActions.createPrescription(prescriptionData)
    if (prescription) {
      // Success - notification already added by quickActions
      loadPrescriptions()
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Patient Selector */}
      <UnifiedPatientSelector />

      {/* Prescription Content */}
      {selectedPatient ? (
        <div>
          {/* Prescription form and list */}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Please select a patient</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

#### Example: Update LabOrders.jsx

```javascript
import { useAppContext } from '../contexts/AppContext.jsx'
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

export default function LabOrders() {
  const { 
    selectedPatient, 
    currentEncounter,
    quickActions 
  } = useAppContext()

  const handleCreateLabOrder = async (labOrderData) => {
    const labOrder = await quickActions.createLabOrder(labOrderData)
    if (labOrder) {
      loadLabOrders()
    }
  }

  return (
    <div className="p-6 space-y-6">
      <UnifiedPatientSelector />
      
      {selectedPatient && (
        <div>
          {/* Lab order form and list */}
        </div>
      )}
    </div>
  )
}
```

#### Example: Update SchedulingCalendar.jsx

```javascript
import { useAppContext } from '../contexts/AppContext.jsx'
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

export default function SchedulingCalendar() {
  const { 
    selectedPatient,
    quickActions 
  } = useAppContext()

  const handleScheduleAppointment = async (appointmentData) => {
    const appointment = await quickActions.scheduleAppointment(appointmentData)
    if (appointment) {
      loadAppointments()
    }
  }

  return (
    <div className="p-6 space-y-6">
      <UnifiedPatientSelector />
      
      {/* Calendar view */}
      <div>
        {/* Appointment calendar */}
      </div>
    </div>
  )
}
```

### 6. Update Backend Routes

Add the pending actions endpoint:

```python
# In main.py or dashboard routes
@app.route('/api/dashboard/pending-actions', methods=['GET'])
@token_required
def get_pending_actions():
    """Get count of pending actions for current user"""
    try:
        user_id = request.current_user.id
        user_type = request.current_user.user_type
        
        pending = {
            'prescriptions': 0,
            'labOrders': 0,
            'appointments': 0,
            'messages': 0,
            'alerts': 0
        }
        
        # Count pending prescriptions (for pharmacists)
        if user_type in ['Pharmacist', 'pharmacist']:
            pending['prescriptions'] = Prescription.query.filter_by(
                status='pending'
            ).count()
        
        # Count pending lab orders (for lab techs)
        if user_type in ['Lab Technician', 'lab_technician']:
            pending['labOrders'] = LabOrder.query.filter_by(
                status='pending'
            ).count()
        
        # Count upcoming appointments (for doctors/nurses)
        if user_type in ['Physician', 'physician', 'Nurse', 'nurse']:
            from datetime import datetime, timedelta
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
        ).count()
        
        # Count active vital alerts (for doctors/nurses)
        if user_type in ['Physician', 'physician', 'Nurse', 'nurse']:
            pending['alerts'] = VitalAlert.query.filter_by(
                status='active'
            ).count()
        
        return jsonify({
            'success': True,
            'pending_actions': pending
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### 7. Testing the Integration

#### Test Patient Context Sharing

1. Open Receptionist Dashboard
2. Register or select a patient
3. Navigate to Doctor Consultation
4. Verify patient info appears automatically
5. Navigate to Prescriptions
6. Verify same patient is selected

#### Test Event Broadcasting

1. Create a prescription in Doctor Consultation
2. Navigate to Pharmacy module
3. Verify prescription appears in queue
4. Check notification bell for alert

#### Test Notifications

1. Perform various actions (create prescription, lab order, etc.)
2. Check notification bell
3. Verify unread count updates
4. Click notification to mark as read

#### Test Pending Actions

1. Create pending items (prescriptions, lab orders, etc.)
2. Check navigation badges
3. Verify counts are accurate
4. Complete items and verify counts decrease

### 8. Migration Checklist

- [ ] Add AppProvider wrapper to App.jsx
- [ ] Replace old navigation with UnifiedNavigation
- [ ] Update ReceptionistDashboard to use context
- [ ] Update DoctorConsultationPage to use context
- [ ] Update PrescriptionManager to use context
- [ ] Update LabOrders to use context
- [ ] Update SchedulingCalendar to use context
- [ ] Update all other modules to use context
- [ ] Add pending actions backend endpoint
- [ ] Test patient context sharing
- [ ] Test event broadcasting
- [ ] Test notifications
- [ ] Test pending action counts
- [ ] Test mobile responsive design
- [ ] Test all user roles

### 9. Benefits of Integration

**For Users**:
- Consistent experience across all modules
- No need to re-select patient in each module
- Real-time notifications of important events
- Quick access to pending tasks
- Seamless workflow between modules

**For Developers**:
- Centralized state management
- Reusable components
- Consistent UI/UX patterns
- Easy to add new modules
- Simplified cross-module communication

**For System**:
- Better data consistency
- Reduced API calls
- Improved performance
- Easier maintenance
- Scalable architecture

### 10. Next Steps

1. **Phase 1**: Integrate core modules (Receptionist, Doctor, Pharmacy)
2. **Phase 2**: Integrate supporting modules (Lab, Billing, Scheduling)
3. **Phase 3**: Integrate admin modules (User Management, Settings)
4. **Phase 4**: Add advanced features (Real-time updates, Analytics)
5. **Phase 5**: Mobile app integration

---

**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Time**: 2-3 days for full integration
