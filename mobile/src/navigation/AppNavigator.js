/**
 * Main Navigation for Clinic+ Patient Mobile App
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MedicalRecordsScreen from '../screens/MedicalRecordsScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import PrescriptionsScreen from '../screens/PrescriptionsScreen';
import LabResultsScreen from '../screens/LabResultsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppointmentDetailScreen from '../screens/AppointmentDetailScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import PrescriptionDetailScreen from '../screens/PrescriptionDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator (shown after login)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Records') {
            iconName = focused ? 'file-document' : 'file-document-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Prescriptions') {
            iconName = focused ? 'pill' : 'pill';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#049ebb',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Records" 
        component={MedicalRecordsScreen}
        options={{ title: 'Medical Records' }}
      />
      <Tab.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{ title: 'Appointments' }}
      />
      <Tab.Screen 
        name="Prescriptions" 
        component={PrescriptionsScreen}
        options={{ title: 'Prescriptions' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // Return a loading screen component
    return null; // You can create a LoadingScreen component
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen 
              name="AppointmentDetail" 
              component={AppointmentDetailScreen}
              options={{ headerShown: true, title: 'Appointment Details' }}
            />
            <Stack.Screen 
              name="RecordDetail" 
              component={RecordDetailScreen}
              options={{ headerShown: true, title: 'Record Details' }}
            />
            <Stack.Screen 
              name="PrescriptionDetail" 
              component={PrescriptionDetailScreen}
              options={{ headerShown: true, title: 'Prescription Details' }}
            />
            <Stack.Screen 
              name="LabResults" 
              component={LabResultsScreen}
              options={{ headerShown: true, title: 'Lab Results' }}
            />
            <Stack.Screen 
              name="Messages" 
              component={MessagesScreen}
              options={{ headerShown: true, title: 'Messages' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

