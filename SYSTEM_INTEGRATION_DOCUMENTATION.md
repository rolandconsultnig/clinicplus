# Clinic+ System Integration Documentation

## Overview
This document describes the unified system architecture that ensures synergy between all profiles, modules, and users in the Clinic+ system. The integration provides seamless data sharing, consistent UI/UX, and efficient cross-module communication.

## Architecture Components

### 1. Unified Application Context (`AppContext`)

**Location**: `src/contexts/AppContext.jsx`

**Purpose**: Central state management for patient context, notifications, and cross-module communication.

#### Features

##### Patient Context Management
```javascript
const { selectedPatient, selectPatient, currentEncounter } = useAppContext()
```

- **Shared Patient Selection**: When a patient is selected in any module, all other modules are automatically updated
- **Active Encounter Tracking**: Maintains current encounter context across all clinical modules
- **Automatic Encounter Loading**: Loads active encounter when patient is selected

##### Cross-Module Notifications
```javascript
const { notifications, addNotification, unreadCount } = useAppContext()
```

- **System-wide Notifications**: Notifications visible across all modules
- **Unread Count Badge**: Real-time count of unread notifications
- **Module-specific Notifications**: Tagged by source module

##### Module Event Broadcasting
```javascript
broadcastEvent({
  type: 'PRESCRIPTION_CREATED',
  payload: { prescription }
})
```

**Event Types**:
- `PATIENT_SELECTED` - Patient context changed
- `ENCOUNTER_CREATED` - New encounter created
- `PRESCRIPTION_CREATED` - New prescription added
- `LAB_ORDER_CREATED` - Lab order placed
- `APPOINTMENT_SCHEDULED` - Appointment booked
- `VITAL_ALERT` - Abnormal vital detected
- `MESSAGE_RECEIVED` - New message

##### Pending Actions Tracking
```javascript
const { pendingActions } = useAppContext()
```

**Tracked Actions**:
- `prescriptions` - Pending prescriptions
- `labOrders` - Pending lab orders
- `appointments` - Upcoming appointments
- `messages` - Unread messages
- `alerts` - Active vital alerts

##### Quick Actions API
```javascript
const { quickActions } = useAppContext()

// Create prescription from any module
await quickActions.createPrescription(prescriptionData)

// Create lab order from any module
await quickActions.createLabOrder(labOrderData)

// Schedule appointment from any module
await quickActions.scheduleAppointment(appointmentData)
```

### 2. Unified Navigation System

**Location**: `src/components/UnifiedNavigation.jsx`

**Purpose**: Consistent navigation experience across all user roles.

#### Features

##### Role-Based Navigation
Each user role sees relevant navigation items:

**Receptionist**:
- Reception Desk
- Patient Search
- Appointments (with badge)
- Billing

**Physician**:
- Consultation
- My Patients
- Prescriptions (with badge)
- Lab Orders (with badge)
- Remote Monitoring (with badge)
- My Schedule
- Documents

**Nurse**:
- Patient Care
- Vitals Entry
- Medications
- Lab Orders
- Schedule
- Care Plans

**Pharmacist**:
- Prescriptions (with badge)
- Drug Search
- Patient Lookup
- Inventory

**Lab Technician**:
- Lab Orders (with badge)
- Results Entry
- Patient Lookup

**Billing Staff**:
- Billing Dashboard
- Claims Tracker
- Insurance Plans
- Patient Accounts

**System Administrator**:
- Admin Dashboard
- User Management
- Facilities
- System Settings
- Security Audit
- Reports

##### Patient Context Display
- Shows selected patient in header bar
- Displays MRN and basic info
- Visible across all modules

##### Notification Center
- Bell icon with unread count badge
- Dropdown with recent notifications
- Click to view details
- Mark as read functionality

##### Mobile Responsive
- Hamburger menu on mobile
- Slide-out navigation drawer
- Touch-friendly interface
- Overlay for mobile menu

### 3. Unified Patient Selector

**Location**: `src/components/UnifiedPatientSelector.jsx`

**Purpose**: Consistent patient search and selection across all modules.

#### Features

##### Smart Search
- Search by name, MRN, phone, or DOB
- Debounced search (300ms)
- Real-time results
- Minimum 2 characters to search

##### Search Results Display
- Patient name and demographics
- MRN, gender, age
- Phone number
- Quick select button

##### Selected Patient Card
- Large patient info card
- Demographics summary
- MRN, age, DOB, phone
- Allergy alerts
- Clear selection button

##### Usage in Modules
```javascript
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

<UnifiedPatientSelector 
  onSelect={(patient) => {
    // Patient selected, context updated automatically
  }}
  showQuickInfo={true}
/>
```

## Module Integration

### Integration Pattern

All modules should follow this pattern:

```javascript
import { useAppContext } from '../contexts/AppContext.jsx'
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

function MyModule() {
  const { 
    selectedPatient, 
    currentEncounter,
    addNotification,
    broadcastEvent 
  } = useAppContext()

  // Module automatically has access to selected patient
  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient.id)
    }
  }, [selectedPatient])

  // Notify other modules of actions
  const handleAction = async () => {
    // Perform action
    const result = await performAction()
    
    // Notify system
    addNotification({
      type: 'success',
      message: 'Action completed',
      module: 'my_module'
    })
    
    // Broadcast event
    broadcastEvent({
      type: 'ACTION_COMPLETED',
      payload: { result }
    })
  }

  return (
    <div>
      {/* Patient selector if needed */}
      <UnifiedPatientSelector />
      
      {/* Module content */}
      {selectedPatient && (
        <div>
          {/* Work with selectedPatient */}
        </div>
      )}
    </div>
  )
}
```

### Updated Modules

#### 1. Doctor Consultation Page
**Integration**:
- Uses `selectedPatient` from context
- Broadcasts `PRESCRIPTION_CREATED`, `LAB_ORDER_CREATED` events
- Displays IoT vitals with real-time updates
- Notifies on SOAP note save
- Notifies on encounter finalization

#### 2. Receptionist Dashboard
**Integration**:
- Uses `selectPatient` to set patient context
- Broadcasts `PATIENT_REGISTERED`, `VISIT_CREATED` events
- Updates pending appointments count
- Notifies on patient check-in

#### 3. Prescription Manager
**Integration**:
- Uses `selectedPatient` and `currentEncounter`
- Uses `quickActions.createPrescription`
- Broadcasts `PRESCRIPTION_CREATED` event
- Updates pending prescriptions count

#### 4. Lab Orders
**Integration**:
- Uses `selectedPatient` and `currentEncounter`
- Uses `quickActions.createLabOrder`
- Broadcasts `LAB_ORDER_CREATED` event
- Updates pending lab orders count

#### 5. Scheduling Calendar
**Integration**:
- Uses `quickActions.scheduleAppointment`
- Broadcasts `APPOINTMENT_SCHEDULED` event
- Updates pending appointments count
- Notifies on appointment changes

#### 6. IoT Vitals Panel
**Integration**:
- Uses `selectedPatient` from context
- Broadcasts `VITAL_ALERT` events
- Adds notifications for abnormal vitals
- Updates alerts count

## Data Flow Examples

### Example 1: Patient Selection Flow

```
User selects patient in Receptionist Dashboard
        ↓
selectPatient() called in AppContext
        ↓
selectedPatient state updated
        ↓
PATIENT_SELECTED event broadcast
        ↓
All modules receive updated patient context
        ↓
Doctor Consultation Page loads patient vitals
Lab Orders module loads patient history
Prescription Manager loads active medications
```

### Example 2: Prescription Creation Flow

```
Doctor creates prescription in Consultation Page
        ↓
quickActions.createPrescription() called
        ↓
API request to /api/prescriptions/create
        ↓
PRESCRIPTION_CREATED event broadcast
        ↓
Notification added: "Prescription created"
        ↓
Pharmacy module receives event
        ↓
Pending prescriptions count updated
        ↓
Pharmacist sees new prescription in queue
```

### Example 3: Vital Alert Flow

```
IoT device sends abnormal vital reading
        ↓
Alert generated in IoT Vitals system
        ↓
VITAL_ALERT event broadcast
        ↓
Notification added: "Critical: Low SpO2"
        ↓
Doctor sees notification in header
        ↓
RPM Monitor updates alert count
        ↓
Doctor clicks to view patient vitals
```

## User Role Synergy

### Receptionist → Doctor Flow
1. Receptionist registers patient
2. Creates visit and assigns to doctor
3. Doctor receives notification
4. Doctor sees patient in queue
5. Doctor opens consultation page with patient context

### Doctor → Pharmacist Flow
1. Doctor creates prescription
2. Prescription sent to pharmacy
3. Pharmacist receives notification
4. Pharmacist sees prescription in queue
5. Pharmacist dispenses medication

### Doctor → Lab Technician Flow
1. Doctor orders lab tests
2. Lab order sent to laboratory
3. Lab tech receives notification
4. Lab tech performs tests
5. Results sent back to doctor
6. Doctor receives notification

### Nurse → Doctor Flow
1. Nurse records vitals
2. Abnormal vital detected
3. Doctor receives alert
4. Doctor reviews patient
5. Doctor creates orders
6. Nurse receives orders

## API Integration Points

### Unified Endpoints

#### Patient Context
```http
GET /api/patients/search?q={query}
GET /api/encounters/patient/{patient_id}/active
POST /api/encounters/create
```

#### Pending Actions
```http
GET /api/dashboard/pending-actions
Response:
{
  "pending_actions": {
    "prescriptions": 5,
    "labOrders": 3,
    "appointments": 12,
    "messages": 8,
    "alerts": 2
  }
}
```

#### Quick Actions
```http
POST /api/prescriptions/create
POST /api/lab-orders/create
POST /api/appointments/create
```

## UI/UX Consistency

### Design System

#### Colors
- **Primary**: Blue (#2563EB)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Info**: Cyan (#06B6D4)

#### Typography
- **Headings**: Font-bold, text-lg to text-2xl
- **Body**: Font-normal, text-sm to text-base
- **Labels**: Font-medium, text-xs to text-sm

#### Spacing
- **Card Padding**: p-4 to p-6
- **Section Spacing**: space-y-4
- **Grid Gaps**: gap-3 to gap-4

#### Components
All modules use shadcn/ui components:
- Card, CardHeader, CardContent
- Button (variants: default, outline, ghost)
- Input, Label, Textarea
- Badge (variants: default, outline, destructive)
- Tabs, TabsList, TabsTrigger, TabsContent

### Responsive Design
- **Mobile**: < 640px - Single column, hamburger menu
- **Tablet**: 640px - 1024px - Two columns, collapsible sidebar
- **Desktop**: > 1024px - Full layout, persistent sidebar

## Security & Access Control

### Role-Based Access
```javascript
// In each module
const canAccess = user.user_type in ['Physician', 'Nurse', 'Admin']

if (!canAccess) {
  return <AccessDenied />
}
```

### Data Isolation
- Users only see data relevant to their role
- Patient data requires active patient selection
- Audit logging for all actions

### Authentication
- JWT tokens for all API requests
- Token refresh on expiry
- Automatic logout on token invalidation

## Performance Optimization

### State Management
- Context API for global state
- Local state for module-specific data
- Memoization for expensive computations

### API Calls
- Debounced search queries
- Cached patient data
- Pagination for large datasets
- Background refresh for pending actions

### Rendering
- Lazy loading of modules
- Code splitting by route
- Optimized re-renders with React.memo

## Testing Strategy

### Integration Tests
```javascript
// Test patient context sharing
test('selecting patient updates all modules', async () => {
  const { selectPatient } = renderWithContext(<App />)
  await selectPatient(mockPatient)
  
  expect(screen.getByText(mockPatient.name)).toBeInTheDocument()
  expect(consultationModule).toHavePatient(mockPatient)
  expect(prescriptionModule).toHavePatient(mockPatient)
})

// Test event broadcasting
test('prescription creation notifies pharmacy', async () => {
  const { quickActions } = renderWithContext(<App />)
  await quickActions.createPrescription(mockPrescription)
  
  expect(pharmacyModule).toReceiveNotification()
  expect(pendingCount).toIncrement()
})
```

### User Flow Tests
- Receptionist registration → Doctor consultation
- Doctor prescription → Pharmacist dispensing
- Nurse vitals → Doctor alert
- Lab order → Lab tech → Results

## Migration Guide

### Updating Existing Modules

1. **Wrap App with AppProvider**
```javascript
import { AppProvider } from './contexts/AppContext.jsx'

<AppProvider user={user}>
  <App />
</AppProvider>
```

2. **Replace Navigation**
```javascript
import UnifiedNavigation from './components/UnifiedNavigation.jsx'

<UnifiedNavigation 
  user={user}
  currentView={currentView}
  setCurrentView={setCurrentView}
  onLogout={handleLogout}
/>
```

3. **Use Patient Context**
```javascript
import { useAppContext } from '../contexts/AppContext.jsx'

function MyModule() {
  const { selectedPatient, addNotification } = useAppContext()
  
  // Use selectedPatient instead of local state
}
```

4. **Add Patient Selector**
```javascript
import UnifiedPatientSelector from './UnifiedPatientSelector.jsx'

<UnifiedPatientSelector showQuickInfo={true} />
```

5. **Broadcast Events**
```javascript
const { broadcastEvent, addNotification } = useAppContext()

// After action
broadcastEvent({ type: 'ACTION_COMPLETED', payload: data })
addNotification({ type: 'success', message: 'Action completed' })
```

## Future Enhancements

### Planned Features
1. **Real-time WebSocket Integration** - Push notifications
2. **Advanced Analytics Dashboard** - Cross-module insights
3. **Voice Commands** - Hands-free navigation
4. **Mobile App** - Native iOS/Android apps
5. **Offline Mode** - Work without internet
6. **Multi-language Support** - Internationalization
7. **Advanced Search** - Fuzzy search, filters
8. **Workflow Automation** - Automated task routing
9. **AI Assistance** - Smart suggestions
10. **Telemedicine Integration** - Video consultations

## Troubleshooting

### Common Issues

**Issue**: Patient context not updating
**Solution**: Ensure module is wrapped in AppProvider and using useAppContext()

**Issue**: Notifications not appearing
**Solution**: Check addNotification() is called with correct parameters

**Issue**: Navigation not showing
**Solution**: Verify user role is correctly set and navigation items are defined

**Issue**: Events not broadcasting
**Solution**: Ensure broadcastEvent() is called after action completion

## Conclusion

The unified system integration provides a cohesive experience across all modules and user roles in Clinic+. By following the integration patterns and using the provided components, all modules work together seamlessly with shared patient context, cross-module communication, and consistent UI/UX.

---

**Version**: 1.0.0  
**Status**: ✅ Complete  
**Last Updated**: December 2, 2024
