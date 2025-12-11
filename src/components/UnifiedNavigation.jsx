/**
 * Unified Navigation System
 * Provides role-based navigation with consistent UI across all user types
 */
import React, { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Avatar, AvatarFallback } from '@/components/ui/avatar.jsx'
import { useAppContext } from '../contexts/AppContext.jsx'
import {
  Home,
  Users,
  Calendar,
  FileText,
  Pill,
  TestTube,
  Activity,
  CreditCard,
  Settings,
  Bell,
  Search,
  User,
  LogOut,
  Stethoscope,
  UserCheck,
  Building,
  Shield,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  Heart,
  Smartphone,
  Menu,
  X,
  ChevronDown
} from 'lucide-react'

export default function UnifiedNavigation({ user, currentView, setCurrentView, onLogout }) {
  const { selectedPatient, notifications, unreadCount, pendingActions } = useAppContext()
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const userType = user?.user_type?.toLowerCase()
    
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['all'] },
      { id: 'messages', label: 'Messages', icon: MessageSquare, badge: pendingActions.messages, roles: ['all'] }
    ]

    const roleSpecificItems = {
      // Receptionist Navigation
      receptionist: [
        { id: 'receptionist', label: 'Reception Desk', icon: UserCheck },
        { id: 'patients', label: 'Patient Search', icon: Users },
        { id: 'scheduling', label: 'Appointments', icon: Calendar, badge: pendingActions.appointments },
        { id: 'billing', label: 'Billing', icon: CreditCard }
      ],

      // Physician/Doctor Navigation
      physician: [
        { id: 'doctor-consultation', label: 'Consultation', icon: Stethoscope },
        { id: 'patients', label: 'My Patients', icon: Users },
        { id: 'prescriptions', label: 'Prescriptions', icon: Pill, badge: pendingActions.prescriptions },
        { id: 'lab-orders', label: 'Lab Orders', icon: TestTube, badge: pendingActions.labOrders },
        { id: 'rpm-monitor', label: 'Remote Monitoring', icon: Activity, badge: pendingActions.alerts },
        { id: 'scheduling', label: 'My Schedule', icon: Calendar },
        { id: 'documents', label: 'Documents', icon: FileText }
      ],

      // Nurse Navigation
      nurse: [
        { id: 'patients', label: 'Patient Care', icon: Users },
        { id: 'vitals', label: 'Vitals Entry', icon: Activity },
        { id: 'medications', label: 'Medications', icon: Pill },
        { id: 'lab-orders', label: 'Lab Orders', icon: TestTube },
        { id: 'scheduling', label: 'Schedule', icon: Calendar },
        { id: 'care-plans', label: 'Care Plans', icon: ClipboardList }
      ],

      // Pharmacist Navigation
      pharmacist: [
        { id: 'prescriptions', label: 'Prescriptions', icon: Pill, badge: pendingActions.prescriptions },
        { id: 'pharmacy-search', label: 'Drug Search', icon: Search },
        { id: 'patients', label: 'Patient Lookup', icon: Users },
        { id: 'inventory', label: 'Inventory', icon: TrendingUp }
      ],

      // Lab Technician Navigation
      lab_technician: [
        { id: 'lab-orders', label: 'Lab Orders', icon: TestTube, badge: pendingActions.labOrders },
        { id: 'results', label: 'Results Entry', icon: FileText },
        { id: 'patients', label: 'Patient Lookup', icon: Users }
      ],

      // Billing Staff Navigation
      billing: [
        { id: 'billing', label: 'Billing Dashboard', icon: CreditCard },
        { id: 'billing-tracker', label: 'Claims Tracker', icon: TrendingUp },
        { id: 'insurance-plans', label: 'Insurance Plans', icon: Shield },
        { id: 'patients', label: 'Patient Accounts', icon: Users }
      ],

      // System Administrator Navigation
      admin: [
        { id: 'dashboard', label: 'Admin Dashboard', icon: Shield },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'facilities', label: 'Facilities', icon: Building },
        { id: 'system-settings', label: 'System Settings', icon: Settings },
        { id: 'security-audit', label: 'Security Audit', icon: Shield },
        { id: 'reports', label: 'Reports', icon: FileText }
      ],

      // Root Admin Navigation
      root_admin: [
        { id: 'root-admin', label: 'Root Dashboard', icon: Shield },
        { id: 'organizations', label: 'Organizations', icon: Building },
        { id: 'users', label: 'All Users', icon: Users },
        { id: 'system-settings', label: 'System Config', icon: Settings },
        { id: 'security-audit', label: 'Security', icon: Shield }
      ]
    }

    // Get role-specific items
    let items = [...commonItems]
    const roleItems = roleSpecificItems[userType] || roleSpecificItems['physician']
    items = [...items, ...roleItems]

    // Add settings at the end
    items.push({ id: 'settings', label: 'Settings', icon: Settings, roles: ['all'] })

    return items
  }

  const navigationItems = getNavigationItems()

  return (
    <>
      {/* Top Header Bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        {/* Left: Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <div className="flex items-center space-x-2">
            <Heart className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg hidden sm:inline">Clinic+</span>
          </div>
        </div>

        {/* Center: Patient Context (if selected) */}
        {selectedPatient && (
          <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
            <User className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
              <p className="text-xs text-blue-600">MRN: {selectedPatient.universal_patient_id}</p>
            </div>
          </div>
        )}

        {/* Right: Notifications and User Menu */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                {notifications.length > 0 ? (
                  <div className="divide-y">
                    {notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm font-medium">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No notifications
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {user?.username?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.user_type?.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Logout */}
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start ${isActive ? 'bg-blue-600 text-white' : ''}`}
                  onClick={() => {
                    setCurrentView(item.id)
                    setMobileMenuOpen(false)
                  }}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge > 0 && (
                    <Badge variant={isActive ? 'secondary' : 'default'} className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
