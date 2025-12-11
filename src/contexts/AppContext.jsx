/**
 * Unified Application Context
 * Provides global state management for patient context, notifications, and cross-module communication
 */
import React, { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

export function AppProvider({ children, user }) {
  // Patient Context - Shared across all modules
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [currentEncounter, setCurrentEncounter] = useState(null)
  
  // Notifications - System-wide notifications
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Module Communication - Cross-module events
  const [moduleEvents, setModuleEvents] = useState([])
  
  // Pending Actions - Tasks requiring attention
  const [pendingActions, setPendingActions] = useState({
    prescriptions: 0,
    labOrders: 0,
    appointments: 0,
    messages: 0,
    alerts: 0
  })
  
  // System Status
  const [systemStatus, setSystemStatus] = useState({
    online: true,
    lastSync: new Date(),
    pendingSync: 0
  })

  // Load pending actions count
  useEffect(() => {
    if (user) {
      loadPendingActions()
      // Refresh every 60 seconds
      const interval = setInterval(loadPendingActions, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadPendingActions = async () => {
    try {
      const response = await fetch('/api/dashboard/pending-actions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPendingActions(data.pending_actions || {})
      }
    } catch (error) {
      console.error('Error loading pending actions:', error)
    }
  }

  // Select patient - Updates context for all modules
  const selectPatient = async (patient) => {
    setSelectedPatient(patient)
    
    // Broadcast event to all modules
    broadcastEvent({
      type: 'PATIENT_SELECTED',
      payload: { patient }
    })
    
    // Load patient's active encounter if exists
    if (patient) {
      await loadActiveEncounter(patient.id)
    }
  }

  // Load active encounter for patient
  const loadActiveEncounter = async (patientId) => {
    try {
      const response = await fetch(`/api/encounters/patient/${patientId}/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentEncounter(data.encounter)
      }
    } catch (error) {
      console.error('Error loading encounter:', error)
    }
  }

  // Create new encounter
  const createEncounter = async (patientId, encounterData) => {
    try {
      const response = await fetch('/api/encounters/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          ...encounterData
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentEncounter(data.encounter)
        
        broadcastEvent({
          type: 'ENCOUNTER_CREATED',
          payload: { encounter: data.encounter }
        })
        
        addNotification({
          type: 'success',
          message: `New encounter created for ${selectedPatient?.first_name} ${selectedPatient?.last_name}`,
          module: 'encounters'
        })
        
        return data.encounter
      }
    } catch (error) {
      console.error('Error creating encounter:', error)
      return null
    }
  }

  // Add notification
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
  }

  // Mark notification as read
  const markNotificationRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  // Broadcast event to all modules
  const broadcastEvent = (event) => {
    setModuleEvents(prev => [...prev, { ...event, timestamp: new Date() }])
    
    // Clean up old events after 5 minutes
    setTimeout(() => {
      setModuleEvents(prev => prev.filter(e => e !== event))
    }, 300000)
  }

  // Subscribe to module events
  const subscribeToEvents = (callback) => {
    const unsubscribe = () => {
      // Cleanup logic
    }
    return unsubscribe
  }

  // Update pending action count
  const updatePendingCount = (module, count) => {
    setPendingActions(prev => ({
      ...prev,
      [module]: count
    }))
  }

  // Quick actions - Common actions across modules
  const quickActions = {
    // Create prescription
    createPrescription: async (prescriptionData) => {
      if (!selectedPatient || !currentEncounter) {
        addNotification({
          type: 'error',
          message: 'Please select a patient and create an encounter first',
          module: 'prescriptions'
        })
        return null
      }
      
      try {
        const response = await fetch('/api/prescriptions/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            patient_id: selectedPatient.id,
            encounter_id: currentEncounter.id,
            ...prescriptionData
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          broadcastEvent({
            type: 'PRESCRIPTION_CREATED',
            payload: { prescription: data.prescription }
          })
          addNotification({
            type: 'success',
            message: 'Prescription created successfully',
            module: 'prescriptions'
          })
          return data.prescription
        }
      } catch (error) {
        console.error('Error creating prescription:', error)
        addNotification({
          type: 'error',
          message: 'Failed to create prescription',
          module: 'prescriptions'
        })
        return null
      }
    },

    // Create lab order
    createLabOrder: async (labOrderData) => {
      if (!selectedPatient || !currentEncounter) {
        addNotification({
          type: 'error',
          message: 'Please select a patient and create an encounter first',
          module: 'lab_orders'
        })
        return null
      }
      
      try {
        const response = await fetch('/api/lab-orders/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            patient_id: selectedPatient.id,
            encounter_id: currentEncounter.id,
            ...labOrderData
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          broadcastEvent({
            type: 'LAB_ORDER_CREATED',
            payload: { labOrder: data.lab_order }
          })
          addNotification({
            type: 'success',
            message: 'Lab order created successfully',
            module: 'lab_orders'
          })
          return data.lab_order
        }
      } catch (error) {
        console.error('Error creating lab order:', error)
        return null
      }
    },

    // Schedule appointment
    scheduleAppointment: async (appointmentData) => {
      if (!selectedPatient) {
        addNotification({
          type: 'error',
          message: 'Please select a patient first',
          module: 'scheduling'
        })
        return null
      }
      
      try {
        const response = await fetch('/api/appointments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            patient_id: selectedPatient.id,
            ...appointmentData
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          broadcastEvent({
            type: 'APPOINTMENT_SCHEDULED',
            payload: { appointment: data.appointment }
          })
          addNotification({
            type: 'success',
            message: 'Appointment scheduled successfully',
            module: 'scheduling'
          })
          return data.appointment
        }
      } catch (error) {
        console.error('Error scheduling appointment:', error)
        return null
      }
    }
  }

  const value = {
    // Patient Context
    selectedPatient,
    selectPatient,
    currentEncounter,
    setCurrentEncounter,
    createEncounter,
    
    // Notifications
    notifications,
    unreadCount,
    addNotification,
    markNotificationRead,
    clearNotifications,
    
    // Module Communication
    moduleEvents,
    broadcastEvent,
    subscribeToEvents,
    
    // Pending Actions
    pendingActions,
    updatePendingCount,
    loadPendingActions,
    
    // System Status
    systemStatus,
    setSystemStatus,
    
    // Quick Actions
    quickActions,
    
    // User
    user
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
