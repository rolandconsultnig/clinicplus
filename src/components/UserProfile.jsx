import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getStoredProfilePhoto, setStoredProfilePhoto } from '../utils/profilePhoto';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Key, 
  Save, 
  Edit,
  CheckCircle2,
  XCircle,
  Building2,
  Stethoscope,
  Heart,
  UserCircle,
  Lock,
  Bell,
  MessageSquare,
  TestTube,
  Pill,
  CreditCard,
  Clock,
  AlertTriangle,
  Smartphone,
  Moon,
  Camera,
  Trash2
} from 'lucide-react';

const isPatientAccount = (ut) => String(ut || '').toLowerCase() === 'patient';

const hasProviderProfile = (p) => !!(p?.provider_id || p?.provider_data);

const MAX_PROFILE_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

const UserProfile = ({ user: currentUser, onUserUpdate }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const result = await apiService.getProfile();
      if (result.success && result.user) {
        // Transform the API response to match component expectations
        const user = result.user;
        const profileData = {
          id: user.id,
          username: user.username,
          email: user.email,
          user_type: user.user_type,
          is_active: user.is_active,
          patient_id: user.patient_id,
          provider_id: user.provider_id,
          roles: user.roles || [],
          mfa_enabled: user.mfa_enabled || false,
          avatar_url: user.avatar_url || getStoredProfilePhoto(user) || '',
          // Map patient_info to patient_data for consistency
          patient_data: user.patient_info ? {
            first_name: user.patient_info.first_name,
            last_name: user.patient_info.last_name,
            phone: user.patient_info.phone_primary,
            date_of_birth: user.patient_info.date_of_birth,
            address: user.patient_info.address || ''
          } : null,
          // Map provider_info to provider_data for consistency
          provider_data: user.provider_info ? {
            first_name: user.provider_info.first_name,
            last_name: user.provider_info.last_name,
            phone: user.provider_info.phone || '',
            email: user.provider_info.email || user.email,
            specialty: user.provider_info.specialty,
            license_number: user.provider_info.license_number
          } : null
        };
        setProfile(profileData);
        setPhotoPreview(profileData.avatar_url || '');
        const pd = profileData.patient_data || {};
        const pr = profileData.provider_data || {};
        setFormData({
          username: profileData.username,
          email: profileData.email,
          first_name: pd.first_name ?? pr.first_name ?? '',
          last_name: pd.last_name ?? pr.last_name ?? '',
          phone: pd.phone ?? pr.phone ?? '',
          address: pd.address ?? '',
          specialty: pr.specialty ?? '',
          license_number: pr.license_number ?? '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAuthStorageAndUser = (avatarUrl) => {
    const baseUser = {
      ...currentUser,
      id: profile?.id || currentUser?.id,
      username: profile?.username || currentUser?.username,
      email: profile?.email || currentUser?.email,
    };
    const nextUser = {
      ...baseUser,
      avatar_url: avatarUrl || null,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(nextUser));
    }
    if (typeof onUserUpdate === 'function') {
      onUserUpdate(nextUser);
    }
    setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl || '' } : prev));
  };

  const handleProfilePhotoSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setPhotoError('Use JPG, PNG, or WEBP image format.');
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
      setPhotoError('Image must be 2MB or smaller.');
      return;
    }

    try {
      setPhotoSaving(true);
      setPhotoError('');
      const dataUrl = await fileToDataUrl(file);
      const identityUser = profile || currentUser;
      setStoredProfilePhoto(identityUser, dataUrl);
      setPhotoPreview(dataUrl);
      updateAuthStorageAndUser(dataUrl);
    } catch (error) {
      setPhotoError(error?.message || 'Failed to save profile photo.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleRemoveProfilePhoto = () => {
    const identityUser = profile || currentUser;
    setStoredProfilePhoto(identityUser, null);
    setPhotoPreview('');
    setPhotoError('');
    updateAuthStorageAndUser(null);
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const updateData = {
        username: formData.username,
        email: formData.email
      };

      if (isPatientAccount(profile.user_type) && profile.patient_id) {
        updateData.patient_data = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address
        };
      }

      if (hasProviderProfile(profile)) {
        updateData.provider_data = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
          specialty: formData.specialty,
          license_number: formData.license_number
        };
      }

      const result = await apiService.request('/auth/jwt/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (result.success) {
        await loadProfile();
        setEditMode(false);
        alert('Profile updated successfully!');
      } else {
        alert(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error updating profile: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      const result = await apiService.request('/auth/jwt/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (result.success) {
        alert('Password changed successfully!');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        alert(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = (roleCategory) => {
    switch (roleCategory) {
      case 'clinical':
        return Stethoscope;
      case 'administrative':
        return Building2;
      case 'patient':
        return Heart;
      default:
        return UserCircle;
    }
  };

  const getRoleColor = (roleCategory) => {
    switch (roleCategory) {
      case 'clinical':
        return 'bg-teal-100 text-teal-800';
      case 'administrative':
        return 'bg-teal-100 text-teal-900';
      case 'patient':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <PageWrapper title="My Profile" description="View and manage your profile" icon={User}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading profile...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!profile) {
    return (
      <PageWrapper title="My Profile" description="View and manage your profile" icon={User}>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Profile not found</p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My Profile"
      description="View and manage your profile information"
      icon={User}
      actions={
        <div className="flex gap-2">
          {editMode && (
            <>
              <Button variant="outline" onClick={() => { setEditMode(false); loadProfile(); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
          {!editMode && (
            <Button onClick={() => setEditMode(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload a profile photo for your account identity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 ring-1 ring-slate-200">
                    {photoPreview ? (
                      <AvatarImage src={photoPreview} alt={profile?.username || currentUser?.username || 'Profile photo'} />
                    ) : null}
                    <AvatarFallback className="bg-teal-600 text-white text-xl font-semibold">
                      {(profile?.username || currentUser?.username || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {photoSaving ? 'Saving photo...' : 'Visible in your app header'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, WEBP up to 2MB
                    </p>
                    {photoError ? (
                      <p className="text-xs text-red-600 mt-2">{photoError}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Label htmlFor="profile-photo-upload" className="cursor-pointer">
                    <span className="inline-flex h-9 items-center rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800">
                      <Camera className="w-4 h-4 mr-2" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </span>
                    <Input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleProfilePhotoSelected}
                    />
                  </Label>
                  {photoPreview ? (
                    <Button type="button" variant="outline" onClick={handleRemoveProfilePhoto} disabled={photoSaving}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  {editMode ? (
                    <Input
                      value={formData.username || profile.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  ) : (
                    <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                      <p className="text-gray-900 font-medium">{profile.username}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditMode(true)}
                        className="h-8"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  {editMode ? (
                    <Input
                      type="email"
                      value={formData.email || profile.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  ) : (
                    <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                      <p className="text-gray-900 font-medium">{profile.email}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditMode(true)}
                        className="h-8"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>User Type</Label>
                  <Badge variant="outline" className="mt-1">
                    {profile.user_type}
                  </Badge>
                </div>
                <div>
                  <Label>Account Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {profile.is_active ? (
                      <><CheckCircle2 className="w-4 h-4 text-green-600" /> <span className="text-green-600">Active</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-red-600" /> <span className="text-red-600">Inactive</span></>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role-Specific Information */}
          {isPatientAccount(profile.user_type) && profile.patient_data && (
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Your medical record details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    {editMode ? (
                      <Input
                        value={formData.first_name || ''}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.patient_data.first_name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    {editMode ? (
                      <Input
                        value={formData.last_name || ''}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.patient_data.last_name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Phone</Label>
                    {editMode ? (
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.patient_data.phone || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <p className="text-gray-900 font-medium">
                      {profile.patient_data.date_of_birth ? new Date(profile.patient_data.date_of_birth).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    {editMode ? (
                      <Input
                        value={formData.address || profile.patient_data?.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter address"
                      />
                    ) : (
                      <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                        <p className="text-gray-900 font-medium">{profile.patient_data.address || 'N/A'}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditMode(true)}
                          className="h-8"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasProviderProfile(profile) && profile.provider_data && (
            <Card>
              <CardHeader>
                <CardTitle>Clinical / provider profile</CardTitle>
                <CardDescription>Professional details linked to your account ({profile.user_type})</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    {editMode ? (
                      <Input
                        value={formData.first_name || ''}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.provider_data.first_name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    {editMode ? (
                      <Input
                        value={formData.last_name || ''}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.provider_data.last_name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Specialty</Label>
                    {editMode ? (
                      <Input
                        value={formData.specialty || ''}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        placeholder="e.g. Internal Medicine"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.provider_data.specialty || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>License Number</Label>
                    {editMode ? (
                      <Input
                        value={formData.license_number || ''}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        placeholder="Medical license #"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.provider_data.license_number || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Phone</Label>
                    {editMode ? (
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.provider_data.phone || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Email</Label>
                    {editMode ? (
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile.provider_data.email || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Roles</CardTitle>
              <CardDescription>Roles and permissions assigned to your account</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.roles && profile.roles.length > 0 ? (
                <div className="space-y-4">
                  {profile.roles.map((role, index) => {
                    const RoleIcon = getRoleIcon(role.category);
                    return (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${getRoleColor(role.category)}`}>
                            <RoleIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{role.name}</h3>
                            <p className="text-sm text-gray-600">{role.description || 'No description'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {role.category}
                              </Badge>
                              {role.facility_id && (
                                <Badge variant="outline" className="text-xs">
                                  Facility: {role.facility_id}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {role.assigned_at && (
                            <p>Assigned: {new Date(role.assigned_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600">No roles assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                />
              </div>
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                />
              </div>
              <Button onClick={handlePasswordChange} disabled={saving}>
                <Key className="w-4 h-4 mr-2" />
                {saving ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">MFA Status</p>
                  <p className="text-sm text-gray-600">
                    {profile.mfa_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <Button
                  variant={profile.mfa_enabled ? 'outline' : 'default'}
                  onClick={async () => {
                    try {
                      const result = await apiService.request('/auth/jwt/profile/mfa', {
                        method: 'PUT',
                        body: JSON.stringify({ enabled: !profile.mfa_enabled })
                      });
                      if (result.success) {
                        setProfile((prev) => (prev ? { ...prev, mfa_enabled: result.mfa_enabled } : prev));
                      } else {
                        alert(result.error || 'Could not update MFA');
                      }
                    } catch (error) {
                      console.error('Error toggling MFA:', error);
                    }
                  }}
                >
                  {profile.mfa_enabled ? 'Disable' : 'Enable'} MFA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <NotificationPreferencesPanel 
            userAccountId={profile.id}
            saving={saving}
            setSaving={setSaving}
          />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
};

// Notification Preferences Panel Component
const NotificationPreferencesPanel = ({ userAccountId, saving, setSaving }) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, [userAccountId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/auth/jwt/profile/notifications', { method: 'GET' });
      if (result.success) {
        setPreferences(result.preferences);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      // Set default preferences if API fails
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPreferences = () => {
    return {
      email: {
        appointments: true,
        messages: true,
        lab_results: true,
        prescriptions: true,
        billing: true,
        reminders: true,
        alerts: true,
        newsletter: false
      },
      sms: {
        appointments: true,
        messages: false,
        lab_results: true,
        prescriptions: false,
        billing: false,
        reminders: true,
        alerts: true
      },
      push: {
        appointments: true,
        messages: true,
        lab_results: true,
        prescriptions: true,
        billing: true,
        reminders: true,
        alerts: true
      },
      in_app: {
        appointments: true,
        messages: true,
        lab_results: true,
        prescriptions: true,
        billing: true,
        reminders: true,
        alerts: true
      },
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      urgent_override: true
    };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await apiService.request('/auth/jwt/profile/notifications', {
        method: 'PUT',
        body: JSON.stringify(preferences)
      });

      if (result.success) {
        alert('Notification preferences saved successfully!');
        await loadPreferences();
      } else {
        alert(result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (category, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const updateQuietHours = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading preferences...</p>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">Failed to load preferences</p>
        </CardContent>
      </Card>
    );
  }

  const notificationTypes = [
    { key: 'appointments', label: 'Appointments', icon: Calendar },
    { key: 'messages', label: 'Messages', icon: MessageSquare },
    { key: 'lab_results', label: 'Lab Results', icon: TestTube },
    { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    { key: 'reminders', label: 'Reminders', icon: Clock },
    { key: 'alerts', label: 'Alerts', icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-teal-700" />
              <h3 className="text-lg font-semibold">Email Notifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4 text-gray-600" />
                    <Label className="font-normal">{type.label}</Label>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.email[type.key] || false}
                    onChange={(e) => updatePreference('email', type.key, e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <Label className="font-normal">Newsletter & Updates</Label>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email.newsletter || false}
                  onChange={(e) => updatePreference('email', 'newsletter', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* SMS Notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">SMS Notifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4 text-gray-600" />
                    <Label className="font-normal">{type.label}</Label>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.sms[type.key] || false}
                    onChange={(e) => updatePreference('sms', type.key, e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Push Notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-teal-700" />
              <h3 className="text-lg font-semibold">Push Notifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4 text-gray-600" />
                    <Label className="font-normal">{type.label}</Label>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.push[type.key] || false}
                    onChange={(e) => updatePreference('push', type.key, e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* In-App Notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">In-App Notifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4 text-gray-600" />
                    <Label className="font-normal">{type.label}</Label>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.in_app[type.key] || false}
                    onChange={(e) => updatePreference('in_app', type.key, e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="w-5 h-5 text-teal-700" />
              <h3 className="text-lg font-semibold">Quiet Hours</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Enable Quiet Hours</Label>
                  <p className="text-sm text-gray-600">Pause notifications during specified hours</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.quiet_hours.enabled || false}
                  onChange={(e) => updateQuietHours('enabled', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
                />
              </div>
              {preferences.quiet_hours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours.start || '22:00'}
                      onChange={(e) => updateQuietHours('start', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours.end || '08:00'}
                      onChange={(e) => updateQuietHours('end', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Urgent Override */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
              <div>
                <Label className="font-semibold">Urgent Notifications</Label>
                <p className="text-sm text-gray-600">Always receive urgent alerts regardless of preferences</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.urgent_override !== false}
                onChange={(e) => setPreferences({ ...preferences, urgent_override: e.target.checked })}
                className="w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;

