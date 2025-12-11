import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { TIMEZONES, getUserTimezone, formatTimezoneLabel } from '../utils/timezones';
import { 
  Settings, 
  Save, 
  Shield, 
  Bell, 
  CreditCard, 
  Stethoscope,
  Plug,
  Globe,
  Lock,
  Mail,
  Smartphone,
  Palette,
  FileText,
  Image,
  Type,
  Link
} from 'lucide-react';

const SystemSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [activeCategory, setActiveCategory] = useState('general');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');

  // Define applyAppearanceSettings before it's used in useEffect
  const applyAppearanceSettings = useCallback((appearanceSettings) => {
    if (!appearanceSettings) return;
    
    // Apply colors to CSS variables
    const root = document.documentElement;
    
    if (appearanceSettings.primary_color) {
      root.style.setProperty('--primary-color', appearanceSettings.primary_color);
      root.style.setProperty('--accent-color', appearanceSettings.primary_color);
      // Also update Tailwind CSS variables
      root.style.setProperty('--primary', appearanceSettings.primary_color);
    }
    
    if (appearanceSettings.secondary_color) {
      root.style.setProperty('--secondary-color', appearanceSettings.secondary_color);
      root.style.setProperty('--heading-color', appearanceSettings.secondary_color);
      root.style.setProperty('--secondary', appearanceSettings.secondary_color);
    }
    
    if (appearanceSettings.accent_color) {
      root.style.setProperty('--accent-color', appearanceSettings.accent_color);
    }
    
    // Apply custom CSS if enabled
    if (appearanceSettings.enable_custom_colors && appearanceSettings.custom_css) {
      let styleElement = document.getElementById('custom-appearance-css');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'custom-appearance-css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = appearanceSettings.custom_css;
    } else {
      // Remove custom CSS if disabled
      const styleElement = document.getElementById('custom-appearance-css');
      if (styleElement) {
        styleElement.remove();
      }
    }
    
    // Apply dark mode
    if (appearanceSettings.enable_dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Also update theme CSS variables if theme CSS is loaded
    const themeStylesheets = document.querySelectorAll('link[data-theme]');
    if (themeStylesheets.length > 0 && appearanceSettings.primary_color) {
      // Inject CSS override for theme colors
      let themeOverrideStyle = document.getElementById('theme-color-override');
      if (!themeOverrideStyle) {
        themeOverrideStyle = document.createElement('style');
        themeOverrideStyle.id = 'theme-color-override';
        document.head.appendChild(themeOverrideStyle);
      }
      themeOverrideStyle.textContent = `
        :root {
          --accent-color: ${appearanceSettings.primary_color} !important;
          --heading-color: ${appearanceSettings.secondary_color || appearanceSettings.primary_color} !important;
        }
      `;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  // Apply appearance settings when they're loaded or changed
  useEffect(() => {
    if (settings.appearance) {
      applyAppearanceSettings(settings.appearance);
    }
  }, [settings.appearance, applyAppearanceSettings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/settings', { method: 'GET' });
      if (result.success) {
        const loadedSettings = result.settings || {};
        // Initialize appearance settings if not present
        if (!loadedSettings.appearance) {
          loadedSettings.appearance = {
            theme: 'MediTrust',
            primary_color: '#049ebb',
            secondary_color: '#18444c',
            accent_color: '#049ebb',
            font_family: 'Roboto',
            heading_font: 'Raleway',
            enable_dark_mode: false,
            enable_custom_colors: false,
            logo_path: '/logo.png',
            favicon_path: '/logo.png',
            custom_css: ''
          };
        }
        // Ensure all appearance fields exist
        loadedSettings.appearance = {
          theme: loadedSettings.appearance.theme || 'MediTrust',
          primary_color: loadedSettings.appearance.primary_color || '#049ebb',
          secondary_color: loadedSettings.appearance.secondary_color || '#18444c',
          accent_color: loadedSettings.appearance.accent_color || '#049ebb',
          font_family: loadedSettings.appearance.font_family || 'Roboto',
          heading_font: loadedSettings.appearance.heading_font || 'Raleway',
          enable_dark_mode: loadedSettings.appearance.enable_dark_mode || false,
          enable_custom_colors: loadedSettings.appearance.enable_custom_colors || false,
          logo_path: loadedSettings.appearance.logo_path || '/logo.png',
          favicon_path: loadedSettings.appearance.favicon_path || '/logo.png',
          custom_css: loadedSettings.appearance.custom_css || ''
        };
        
        // Initialize landing_page settings if not present
        if (!loadedSettings.landing_page) {
          loadedSettings.landing_page = {
            hero_title: 'Advanced Medical Care for Your Family\'s Health',
            hero_subtitle: 'Universal Patient-Owned Health Ecosystem',
            hero_description: 'Clinic+ is a comprehensive, patient-centered healthcare platform that puts you in control of your medical records while connecting you with trusted healthcare providers.',
            hero_image: '/themes/MediTrust/assets/img/health/showcase-1.webp',
            hero_primary_button_text: 'Get Started',
            hero_primary_button_link: '/login',
            hero_secondary_button_text: 'Explore Services',
            hero_secondary_button_link: '/services',
            badge_1_icon: 'bi-shield-check-fill',
            badge_1_title: 'HIPAA Compliant',
            badge_1_subtitle: 'Secure & Private',
            badge_2_icon: 'bi-telephone-fill',
            badge_2_title: 'Emergency Line',
            badge_2_subtitle: '24/7 Support Available',
            badge_3_icon: 'bi-star-fill',
            badge_3_title: 'Patient-Centered',
            badge_3_subtitle: '4.9/5 Rating',
            feature_1_icon: 'bi-heart-pulse-fill',
            feature_1_title: 'Patient Records',
            feature_1_description: 'Own and control your complete medical history with secure, encrypted storage.',
            feature_2_icon: 'bi-calendar-check-fill',
            feature_2_title: 'Appointments',
            feature_2_description: 'Schedule and manage appointments with healthcare providers seamlessly.',
            feature_3_icon: 'bi-capsule',
            feature_3_title: 'ePrescribing',
            feature_3_description: 'Digital prescriptions with drug interaction checks and pharmacy integration.',
            about_title: 'Why Choose Clinic+?',
            about_description: 'Complete control over your medical records with enterprise-grade security and seamless healthcare provider integration.',
            about_image: '/themes/MediTrust/assets/img/health/facilities-1.webp',
            meta_title: 'Clinic+ - Advanced Healthcare Management Platform',
            meta_description: 'Comprehensive healthcare platform with patient-centered design',
            meta_keywords: 'healthcare, medical records, patient portal, clinic management'
          };
        }
        // Ensure all landing_page fields exist
        loadedSettings.landing_page = {
          hero_title: loadedSettings.landing_page.hero_title || 'Advanced Medical Care for Your Family\'s Health',
          hero_subtitle: loadedSettings.landing_page.hero_subtitle || 'Universal Patient-Owned Health Ecosystem',
          hero_description: loadedSettings.landing_page.hero_description || 'Clinic+ is a comprehensive, patient-centered healthcare platform.',
          hero_image: loadedSettings.landing_page.hero_image || '/themes/MediTrust/assets/img/health/showcase-1.webp',
          hero_primary_button_text: loadedSettings.landing_page.hero_primary_button_text || 'Get Started',
          hero_primary_button_link: loadedSettings.landing_page.hero_primary_button_link || '/login',
          hero_secondary_button_text: loadedSettings.landing_page.hero_secondary_button_text || 'Explore Services',
          hero_secondary_button_link: loadedSettings.landing_page.hero_secondary_button_link || '/services',
          badge_1_icon: loadedSettings.landing_page.badge_1_icon || 'bi-shield-check-fill',
          badge_1_title: loadedSettings.landing_page.badge_1_title || 'HIPAA Compliant',
          badge_1_subtitle: loadedSettings.landing_page.badge_1_subtitle || 'Secure & Private',
          badge_2_icon: loadedSettings.landing_page.badge_2_icon || 'bi-telephone-fill',
          badge_2_title: loadedSettings.landing_page.badge_2_title || 'Emergency Line',
          badge_2_subtitle: loadedSettings.landing_page.badge_2_subtitle || '24/7 Support Available',
          badge_3_icon: loadedSettings.landing_page.badge_3_icon || 'bi-star-fill',
          badge_3_title: loadedSettings.landing_page.badge_3_title || 'Patient-Centered',
          badge_3_subtitle: loadedSettings.landing_page.badge_3_subtitle || '4.9/5 Rating',
          feature_1_icon: loadedSettings.landing_page.feature_1_icon || 'bi-heart-pulse-fill',
          feature_1_title: loadedSettings.landing_page.feature_1_title || 'Patient Records',
          feature_1_description: loadedSettings.landing_page.feature_1_description || 'Own and control your complete medical history.',
          feature_2_icon: loadedSettings.landing_page.feature_2_icon || 'bi-calendar-check-fill',
          feature_2_title: loadedSettings.landing_page.feature_2_title || 'Appointments',
          feature_2_description: loadedSettings.landing_page.feature_2_description || 'Schedule and manage appointments seamlessly.',
          feature_3_icon: loadedSettings.landing_page.feature_3_icon || 'bi-capsule',
          feature_3_title: loadedSettings.landing_page.feature_3_title || 'ePrescribing',
          feature_3_description: loadedSettings.landing_page.feature_3_description || 'Digital prescriptions with drug interaction checks.',
          about_title: loadedSettings.landing_page.about_title || 'Why Choose Clinic+?',
          about_description: loadedSettings.landing_page.about_description || 'Complete control over your medical records.',
          about_image: loadedSettings.landing_page.about_image || '/themes/MediTrust/assets/img/health/facilities-1.webp',
          meta_title: loadedSettings.landing_page.meta_title || 'Clinic+ - Advanced Healthcare Management Platform',
          meta_description: loadedSettings.landing_page.meta_description || 'Comprehensive healthcare platform',
          meta_keywords: loadedSettings.landing_page.meta_keywords || 'healthcare, medical records, patient portal'
        };
        
        setSettings(loadedSettings);
        setPermissionDenied(false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Check for permission errors in various formats
      const errorMessage = error.message || error.error || JSON.stringify(error);
      const errorStatus = error.status || error.statusCode;
      if (errorMessage.includes('permission') || 
          errorMessage.includes('Insufficient') ||
          errorMessage.includes('403') ||
          errorStatus === 403) {
        setPermissionDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Currency symbols mapping
  const currencySymbols = {
    'NGN': '₦',
    'USD': '$',
    'EUR': '€',
    'RUB': '₽',
    'GBP': '£'
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => {
      // Ensure category exists before updating
      const categorySettings = prev[category] || {};
      
      // Auto-update currency symbol when currency changes
      if (category === 'billing' && key === 'currency' && currencySymbols[value]) {
        return {
          ...prev,
          [category]: {
            ...categorySettings,
            [key]: value,
            currency_symbol: currencySymbols[value]
          }
        };
      }
      
      return {
        ...prev,
        [category]: {
          ...categorySettings,
          [key]: value
        }
      };
    });
  };

  const saveCategory = async (category) => {
    try {
      setSaving(true);
      
      // Ensure category settings exist
      if (!settings[category]) {
        alert(`Settings for ${category} category not loaded. Please refresh the page.`);
        return;
      }
      
      const result = await apiService.request(
        `/settings/${category}`,
        {
          method: 'PUT',
          body: JSON.stringify(settings[category])
        }
      );
      
      if (result.success) {
        // Apply appearance settings immediately if category is appearance
        if (category === 'appearance' && settings.appearance) {
          // Apply colors and custom CSS
          applyAppearanceSettings(settings.appearance);
          
          // If theme was changed, reload it
          if (settings.appearance.theme) {
            try {
              if (window.themeService) {
                await window.themeService.loadTheme(settings.appearance.theme);
                await window.themeService.saveThemePreference(settings.appearance.theme);
                
                // After theme loads, reapply colors
                setTimeout(() => {
                  applyAppearanceSettings(settings.appearance);
                }, 500);
              }
            } catch (themeError) {
              console.warn('Theme service not available:', themeError);
              // Still apply colors even if theme fails
              applyAppearanceSettings(settings.appearance);
            }
          } else {
            // Just apply colors if no theme change
            applyAppearanceSettings(settings.appearance);
          }
        }
        
        alert('Settings saved successfully!');
        // Reload settings to get updated values from server
        await loadSettings();
      } else {
        alert('Failed to save settings: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'landing_page', name: 'Landing Page', icon: FileText },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'clinical', name: 'Clinical', icon: Stethoscope },
    { id: 'integration', name: 'Integration', icon: Plug }
  ];

  if (loading) {
    return (
      <PageWrapper title="System Settings" description="Configure system-wide settings" icon={Settings}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading settings...</p>
        </div>
      </PageWrapper>
    );
  }

  if (permissionDenied) {
    return (
      <PageWrapper title="System Settings" description="Configure system-wide settings" icon={Settings}>
        <Card className="border-2 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h3>
              <p className="text-red-700 mb-4">
                You don't have permission to access system settings.
              </p>
              <p className="text-sm text-gray-600">
                System settings are only accessible to administrators. Please contact your system administrator if you need access.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="System Settings"
      description="Configure system-wide settings and preferences"
      icon={Settings}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        activeCategory === category.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{categories.find(c => c.id === activeCategory)?.name} Settings</CardTitle>
                  <CardDescription>Configure {categories.find(c => c.id === activeCategory)?.name.toLowerCase()} preferences</CardDescription>
                </div>
                <Button onClick={() => saveCategory(activeCategory)} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeCategory === 'general' && settings.general && (
                <div className="space-y-4">
                  <div>
                    <Label>Application Name</Label>
                    <Input
                      value={settings.general.app_name || ''}
                      onChange={(e) => updateSetting('general', 'app_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search timezones..."
                        value={timezoneSearch}
                        onChange={(e) => setTimezoneSearch(e.target.value)}
                        className="mb-2"
                      />
                      <select
                        value={settings.general.timezone || getUserTimezone() || 'UTC'}
                        onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        size={timezoneSearch ? 10 : 1}
                      >
                        {TIMEZONES
                          .filter(tz => 
                            !timezoneSearch || 
                            tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
                            tz.value.toLowerCase().includes(timezoneSearch.toLowerCase())
                          )
                          .map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label} ({tz.offset})
                            </option>
                          ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Current browser timezone: {getUserTimezone()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {TIMEZONES.length} timezones available
                    </p>
                  </div>
                  <div>
                    <Label>Date Format</Label>
                    <Input
                      value={settings.general.date_format || ''}
                      onChange={(e) => updateSetting('general', 'date_format', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Time Format</Label>
                    <select
                      value={settings.general.time_format || '24h'}
                      onChange={(e) => updateSetting('general', 'time_format', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour</option>
                    </select>
                  </div>
                </div>
              )}

              {activeCategory === 'security' && settings.security && (
                <div className="space-y-4">
                  <div>
                    <Label>Minimum Password Length</Label>
                    <Input
                      type="number"
                      value={settings.security.password_min_length || 8}
                      onChange={(e) => updateSetting('security', 'password_min_length', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.security.password_require_uppercase || false}
                      onChange={(e) => updateSetting('security', 'password_require_uppercase', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Require Uppercase Letters</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.security.password_require_lowercase || false}
                      onChange={(e) => updateSetting('security', 'password_require_lowercase', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Require Lowercase Letters</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.security.password_require_numbers || false}
                      onChange={(e) => updateSetting('security', 'password_require_numbers', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Require Numbers</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.security.password_require_special || false}
                      onChange={(e) => updateSetting('security', 'password_require_special', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Require Special Characters</Label>
                  </div>
                  <div>
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.security.session_timeout_minutes || 30}
                      onChange={(e) => updateSetting('security', 'session_timeout_minutes', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Max Login Attempts</Label>
                    <Input
                      type="number"
                      value={settings.security.max_login_attempts || 5}
                      onChange={(e) => updateSetting('security', 'max_login_attempts', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.security.require_mfa || false}
                      onChange={(e) => updateSetting('security', 'require_mfa', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Require Multi-Factor Authentication</Label>
                  </div>
                </div>
              )}

              {activeCategory === 'notifications' && settings.notifications && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email_enabled || false}
                      onChange={(e) => updateSetting('notifications', 'email_enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Enable Email Notifications</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms_enabled || false}
                      onChange={(e) => updateSetting('notifications', 'sms_enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Enable SMS Notifications</Label>
                  </div>
                  <div>
                    <Label>Appointment Reminder (hours before)</Label>
                    <Input
                      type="number"
                      value={settings.notifications.appointment_reminder_hours || 24}
                      onChange={(e) => updateSetting('notifications', 'appointment_reminder_hours', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.notifications.lab_result_notification || false}
                      onChange={(e) => updateSetting('notifications', 'lab_result_notification', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Notify on Lab Results</Label>
                  </div>
                </div>
              )}

              {activeCategory === 'billing' && settings.billing && (
                <div className="space-y-4">
                  <div>
                    <Label>Primary Currency</Label>
                    <select
                      value={settings.billing.currency || 'NGN'}
                      onChange={(e) => updateSetting('billing', 'currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="NGN">NGN - Nigerian Naira (₦) - Primary</option>
                      <option value="USD">USD - US Dollar ($)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                      <option value="RUB">RUB - Russian Ruble (₽)</option>
                      <option value="GBP">GBP - British Pound (£)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported currencies: NGN, USD, EUR, RUB, GBP
                    </p>
                  </div>
                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.billing.tax_rate || 0}
                      onChange={(e) => updateSetting('billing', 'tax_rate', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Payment Gateway</Label>
                    <select
                      value={settings.billing.payment_gateway || 'paystack'}
                      onChange={(e) => updateSetting('billing', 'payment_gateway', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="paystack">Paystack</option>
                      <option value="stripe">Stripe</option>
                      <option value="flutterwave">Flutterwave</option>
                    </select>
                  </div>
                  <div>
                    <Label>Statement Due Days</Label>
                    <Input
                      type="number"
                      value={settings.billing.statement_due_days || 30}
                      onChange={(e) => updateSetting('billing', 'statement_due_days', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {activeCategory === 'clinical' && settings.clinical && (
                <div className="space-y-4">
                  <div>
                    <Label>Default Encounter Type</Label>
                    <Input
                      value={settings.clinical.default_encounter_type || 'office_visit'}
                      onChange={(e) => updateSetting('clinical', 'default_encounter_type', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.clinical.require_vital_signs || false}
                      onChange={(e) => updateSetting('clinical', 'require_vital_signs', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Require Vital Signs</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.clinical.auto_save_notes || false}
                      onChange={(e) => updateSetting('clinical', 'auto_save_notes', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Auto-save Clinical Notes</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.clinical.cds_enabled || false}
                      onChange={(e) => updateSetting('clinical', 'cds_enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Enable Clinical Decision Support</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.clinical.drug_interaction_check || false}
                      onChange={(e) => updateSetting('clinical', 'drug_interaction_check', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Enable Drug Interaction Checks</Label>
                  </div>
                </div>
              )}

              {activeCategory === 'integration' && settings.integration && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.integration.hl7_enabled || false}
                      onChange={(e) => updateSetting('integration', 'hl7_enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Enable HL7 Integration</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.integration.fhir_enabled || false}
                      onChange={(e) => updateSetting('integration', 'fhir_enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Enable FHIR Integration</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.integration.edi_enabled || false}
                      onChange={(e) => updateSetting('integration', 'edi_enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label>Enable EDI Integration</Label>
                  </div>
                  <div>
                    <Label>API Rate Limit (requests/hour)</Label>
                    <Input
                      type="number"
                      value={settings.integration.api_rate_limit || 1000}
                      onChange={(e) => updateSetting('integration', 'api_rate_limit', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {activeCategory === 'appearance' && (
                <div className="space-y-6">
                  {settings.appearance ? (
                    <>
                      <div>
                        <Label className="text-lg font-semibold mb-4 block">Theme Selection</Label>
                        <p className="text-sm text-gray-600 mb-4">Choose a theme for the landing page and public-facing areas</p>
                        <ThemeSelector 
                          currentTheme={settings.appearance.theme || 'MediTrust'}
                          onThemeChange={async (theme) => {
                            updateSetting('appearance', 'theme', theme);
                            // Apply theme immediately
                            try {
                              if (window.themeService) {
                                await window.themeService.loadTheme(theme);
                                await window.themeService.saveThemePreference(theme);
                                // Reapply colors after theme loads
                                setTimeout(() => {
                                  applyAppearanceSettings({
                                    ...settings.appearance,
                                    theme: theme
                                  });
                                }, 500);
                              }
                            } catch (error) {
                              console.error('Error loading theme:', error);
                            }
                          }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Primary Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={settings.appearance.primary_color || '#049ebb'}
                              onChange={(e) => {
                                updateSetting('appearance', 'primary_color', e.target.value);
                                // Apply immediately for preview
                                applyAppearanceSettings({
                                  ...settings.appearance,
                                  primary_color: e.target.value
                                });
                              }}
                              className="w-16 h-10"
                            />
                            <Input
                              type="text"
                              value={settings.appearance.primary_color || '#049ebb'}
                              onChange={(e) => {
                                updateSetting('appearance', 'primary_color', e.target.value);
                                applyAppearanceSettings({
                                  ...settings.appearance,
                                  primary_color: e.target.value
                                });
                              }}
                              className="flex-1"
                              placeholder="#049ebb"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Secondary Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={settings.appearance.secondary_color || '#18444c'}
                              onChange={(e) => {
                                updateSetting('appearance', 'secondary_color', e.target.value);
                                applyAppearanceSettings({
                                  ...settings.appearance,
                                  secondary_color: e.target.value
                                });
                              }}
                              className="w-16 h-10"
                            />
                            <Input
                              type="text"
                              value={settings.appearance.secondary_color || '#18444c'}
                              onChange={(e) => {
                                updateSetting('appearance', 'secondary_color', e.target.value);
                                applyAppearanceSettings({
                                  ...settings.appearance,
                                  secondary_color: e.target.value
                                });
                              }}
                              className="flex-1"
                              placeholder="#18444c"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Accent Color</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={settings.appearance.accent_color || '#049ebb'}
                            onChange={(e) => {
                              updateSetting('appearance', 'accent_color', e.target.value);
                              applyAppearanceSettings({
                                ...settings.appearance,
                                accent_color: e.target.value
                              });
                            }}
                            className="w-16 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.appearance.accent_color || '#049ebb'}
                            onChange={(e) => {
                              updateSetting('appearance', 'accent_color', e.target.value);
                              applyAppearanceSettings({
                                ...settings.appearance,
                                accent_color: e.target.value
                              });
                            }}
                            className="flex-1"
                            placeholder="#049ebb"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Logo Path</Label>
                        <Input
                          value={settings.appearance.logo_path || '/logo.png'}
                          onChange={(e) => updateSetting('appearance', 'logo_path', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label>Favicon Path</Label>
                        <Input
                          value={settings.appearance.favicon_path || '/logo.png'}
                          onChange={(e) => updateSetting('appearance', 'favicon_path', e.target.value)}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.appearance.enable_dark_mode || false}
                          onChange={(e) => updateSetting('appearance', 'enable_dark_mode', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label>Enable Dark Mode</Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.appearance.enable_custom_colors || false}
                          onChange={(e) => updateSetting('appearance', 'enable_custom_colors', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label>Enable Custom Colors</Label>
                      </div>
                      
                      {settings.appearance.enable_custom_colors && (
                        <div>
                          <Label>Custom CSS</Label>
                          <textarea
                            value={settings.appearance.custom_css || ''}
                            onChange={(e) => updateSetting('appearance', 'custom_css', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                            rows={6}
                            placeholder="/* Add custom CSS here */"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading appearance settings...</p>
                    </div>
                  )}
                </div>
              )}

              {activeCategory === 'landing_page' && (
                <div className="space-y-6">
                  {settings.landing_page ? (
                    <>
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                          <Type className="w-5 h-5" />
                          Hero Section
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Hero Title</Label>
                          <Input
                            value={settings.landing_page.hero_title || ''}
                            onChange={(e) => updateSetting('landing_page', 'hero_title', e.target.value)}
                            placeholder="Main headline for landing page"
                          />
                        </div>
                        
                        <div>
                          <Label>Hero Subtitle</Label>
                          <Input
                            value={settings.landing_page.hero_subtitle || ''}
                            onChange={(e) => updateSetting('landing_page', 'hero_subtitle', e.target.value)}
                            placeholder="Subtitle or badge text"
                          />
                        </div>
                        
                        <div>
                          <Label>Hero Description</Label>
                          <textarea
                            value={settings.landing_page.hero_description || ''}
                            onChange={(e) => updateSetting('landing_page', 'hero_description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={3}
                            placeholder="Description text for hero section"
                          />
                        </div>
                        
                        <div>
                          <Label>Hero Image Path</Label>
                          <div className="flex gap-2">
                            <Input
                              value={settings.landing_page.hero_image || ''}
                              onChange={(e) => updateSetting('landing_page', 'hero_image', e.target.value)}
                              placeholder="/themes/MediTrust/assets/img/health/showcase-1.webp"
                            />
                            <Button type="button" variant="outline" size="sm">
                              <Image className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Primary Button Text</Label>
                            <Input
                              value={settings.landing_page.hero_primary_button_text || ''}
                              onChange={(e) => updateSetting('landing_page', 'hero_primary_button_text', e.target.value)}
                              placeholder="Get Started"
                            />
                          </div>
                          <div>
                            <Label>Primary Button Link</Label>
                            <Input
                              value={settings.landing_page.hero_primary_button_link || ''}
                              onChange={(e) => updateSetting('landing_page', 'hero_primary_button_link', e.target.value)}
                              placeholder="/login"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Secondary Button Text</Label>
                            <Input
                              value={settings.landing_page.hero_secondary_button_text || ''}
                              onChange={(e) => updateSetting('landing_page', 'hero_secondary_button_text', e.target.value)}
                              placeholder="Explore Services"
                            />
                          </div>
                          <div>
                            <Label>Secondary Button Link</Label>
                            <Input
                              value={settings.landing_page.hero_secondary_button_link || ''}
                              onChange={(e) => updateSetting('landing_page', 'hero_secondary_button_link', e.target.value)}
                              placeholder="/services"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Trust Badges
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                            <div>
                              <Label className="text-sm">Badge 1 Icon</Label>
                              <Input
                                value={settings.landing_page.badge_1_icon || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_1_icon', e.target.value)}
                                placeholder="bi-shield-check-fill"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Badge 1 Title</Label>
                              <Input
                                value={settings.landing_page.badge_1_title || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_1_title', e.target.value)}
                                placeholder="HIPAA Compliant"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Badge 1 Subtitle</Label>
                              <Input
                                value={settings.landing_page.badge_1_subtitle || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_1_subtitle', e.target.value)}
                                placeholder="Secure & Private"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                            <div>
                              <Label className="text-sm">Badge 2 Icon</Label>
                              <Input
                                value={settings.landing_page.badge_2_icon || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_2_icon', e.target.value)}
                                placeholder="bi-telephone-fill"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Badge 2 Title</Label>
                              <Input
                                value={settings.landing_page.badge_2_title || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_2_title', e.target.value)}
                                placeholder="Emergency Line"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Badge 2 Subtitle</Label>
                              <Input
                                value={settings.landing_page.badge_2_subtitle || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_2_subtitle', e.target.value)}
                                placeholder="24/7 Support Available"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                            <div>
                              <Label className="text-sm">Badge 3 Icon</Label>
                              <Input
                                value={settings.landing_page.badge_3_icon || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_3_icon', e.target.value)}
                                placeholder="bi-star-fill"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Badge 3 Title</Label>
                              <Input
                                value={settings.landing_page.badge_3_title || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_3_title', e.target.value)}
                                placeholder="Patient-Centered"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Badge 3 Subtitle</Label>
                              <Input
                                value={settings.landing_page.badge_3_subtitle || ''}
                                onChange={(e) => updateSetting('landing_page', 'badge_3_subtitle', e.target.value)}
                                placeholder="4.9/5 Rating"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Stethoscope className="w-5 h-5" />
                          Features Section
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold mb-3">Feature 1</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm">Icon</Label>
                                <Input
                                  value={settings.landing_page.feature_1_icon || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_1_icon', e.target.value)}
                                  placeholder="bi-heart-pulse-fill"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Title</Label>
                                <Input
                                  value={settings.landing_page.feature_1_title || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_1_title', e.target.value)}
                                  placeholder="Patient Records"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Description</Label>
                                <textarea
                                  value={settings.landing_page.feature_1_description || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_1_description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  rows={2}
                                  placeholder="Feature description"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold mb-3">Feature 2</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm">Icon</Label>
                                <Input
                                  value={settings.landing_page.feature_2_icon || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_2_icon', e.target.value)}
                                  placeholder="bi-calendar-check-fill"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Title</Label>
                                <Input
                                  value={settings.landing_page.feature_2_title || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_2_title', e.target.value)}
                                  placeholder="Appointments"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Description</Label>
                                <textarea
                                  value={settings.landing_page.feature_2_description || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_2_description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  rows={2}
                                  placeholder="Feature description"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold mb-3">Feature 3</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm">Icon</Label>
                                <Input
                                  value={settings.landing_page.feature_3_icon || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_3_icon', e.target.value)}
                                  placeholder="bi-capsule"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Title</Label>
                                <Input
                                  value={settings.landing_page.feature_3_title || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_3_title', e.target.value)}
                                  placeholder="ePrescribing"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Description</Label>
                                <textarea
                                  value={settings.landing_page.feature_3_description || ''}
                                  onChange={(e) => updateSetting('landing_page', 'feature_3_description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  rows={2}
                                  placeholder="Feature description"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          About Section
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <Label>About Title</Label>
                            <Input
                              value={settings.landing_page.about_title || ''}
                              onChange={(e) => updateSetting('landing_page', 'about_title', e.target.value)}
                              placeholder="Why Choose Clinic+?"
                            />
                          </div>
                          
                          <div>
                            <Label>About Description</Label>
                            <textarea
                              value={settings.landing_page.about_description || ''}
                              onChange={(e) => updateSetting('landing_page', 'about_description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={3}
                              placeholder="About section description"
                            />
                          </div>
                          
                          <div>
                            <Label>About Image Path</Label>
                            <Input
                              value={settings.landing_page.about_image || ''}
                              onChange={(e) => updateSetting('landing_page', 'about_image', e.target.value)}
                              placeholder="/themes/MediTrust/assets/img/health/facilities-1.webp"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Globe className="w-5 h-5" />
                          SEO & Meta Content
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <Label>Meta Title</Label>
                            <Input
                              value={settings.landing_page.meta_title || ''}
                              onChange={(e) => updateSetting('landing_page', 'meta_title', e.target.value)}
                              placeholder="Page title for SEO"
                            />
                          </div>
                          
                          <div>
                            <Label>Meta Description</Label>
                            <textarea
                              value={settings.landing_page.meta_description || ''}
                              onChange={(e) => updateSetting('landing_page', 'meta_description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={2}
                              placeholder="Meta description for SEO"
                            />
                          </div>
                          
                          <div>
                            <Label>Meta Keywords</Label>
                            <Input
                              value={settings.landing_page.meta_keywords || ''}
                              onChange={(e) => updateSetting('landing_page', 'meta_keywords', e.target.value)}
                              placeholder="keyword1, keyword2, keyword3"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading landing page settings...</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

// Theme Selector Component
const ThemeSelector = ({ currentTheme, onThemeChange }) => {
  const themes = [
    {
      id: 'MediTrust',
      name: 'MediTrust',
      description: 'Modern medical template with clean design',
      preview: '/themes/MediTrust/assets/img/health/showcase-1.webp',
      color: 'bg-blue-500'
    },
    {
      id: 'Clinic',
      name: 'Clinic',
      description: 'Professional clinic template',
      preview: '/themes/Clinic/assets/img/health/facilities-1.webp',
      color: 'bg-green-500'
    },
    {
      id: 'MediLab-1.0.0',
      name: 'MediLab',
      description: 'Medical laboratory focused design',
      preview: '/themes/MediLab-1.0.0/assets/img/about.jpg',
      color: 'bg-purple-500'
    },
    {
      id: 'MediNest',
      name: 'MediNest',
      description: 'Nest-like comfortable medical interface',
      preview: '/themes/MediNest/assets/img/health/facilities-1.webp',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {themes.map((theme) => (
        <div
          key={theme.id}
          onClick={() => onThemeChange(theme.id)}
          className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
            currentTheme === theme.id
              ? 'border-blue-600 ring-2 ring-blue-200'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="aspect-video bg-gray-100 relative">
            <img
              src={theme.preview}
              alt={theme.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className={`${theme.color} w-full h-full flex items-center justify-center text-white font-bold text-xl`} style={{ display: 'none' }}>
              {theme.name}
            </div>
          </div>
          <div className="p-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
              </div>
              {currentTheme === theme.id && (
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemSettings;

