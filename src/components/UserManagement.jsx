import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  Mail, 
  Phone,
  CheckCircle2,
  XCircle,
  Filter,
  Key,
  Save,
  X,
  Plus
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    user_type: 'patient',
    is_active: true,
    is_verified: false
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [filterType]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let endpoint = '/users';
      if (filterType !== 'all') {
        endpoint += `?user_type=${filterType}`;
      }
      const result = await apiService.request(endpoint, { method: 'GET' });
      if (result.success) {
        setUsers(result.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const result = await apiService.request('/roles', { method: 'GET' });
      if (result.success) {
        setRoles(result.roles || []);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleActive = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }
    
    try {
      const result = await apiService.request(`/users/${userId}/toggle-active`, { method: 'POST' });
      if (result.success) {
        await loadUsers();
        alert(result.message || 'User status updated successfully');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await apiService.request(`/users/${userId}`, { method: 'DELETE' });
      if (result.success) {
        await loadUsers();
        alert('User deactivated successfully');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      user_type: user.user_type || 'patient',
      is_active: user.is_active !== undefined ? user.is_active : true,
      is_verified: user.is_verified !== undefined ? user.is_verified : false
    });
    setShowEditModal(true);
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      user_type: 'patient',
      is_active: true,
      is_verified: false
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      if (showAddModal) {
        // Create new user
        if (!formData.username || !formData.email || !formData.password) {
          alert('Username, email, and password are required');
          return;
        }
        const result = await apiService.request('/users', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (result.success) {
          await loadUsers();
          setShowAddModal(false);
          alert('User created successfully');
        }
      } else if (showEditModal) {
        // Update user
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't send empty password
        }
        const result = await apiService.request(`/users/${selectedUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });
        if (result.success) {
          await loadUsers();
          setShowEditModal(false);
          alert('User updated successfully');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt('Enter new password (minimum 8 characters):');
    if (!newPassword) return;
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    
    try {
      const result = await apiService.request(`/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          new_password: newPassword,
          must_change_password: true
        })
      });
      if (result.success) {
        alert('Password reset successfully');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAssignRole = async (userId, roleId) => {
    try {
      const result = await apiService.request(`/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({
          role_id: roleId
        })
      });
      if (result.success) {
        await loadUsers();
        alert('Role assigned successfully');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('Error assigning role: ' + (error.message || 'Unknown error'));
    }
  };

  const handleRemoveRole = async (userId, roleId) => {
    if (!window.confirm('Are you sure you want to remove this role?')) {
      return;
    }
    
    try {
      const result = await apiService.request(`/users/${userId}/roles/${roleId}`, {
        method: 'DELETE'
      });
      if (result.success) {
        await loadUsers();
        alert('Role removed successfully');
      }
    } catch (error) {
      console.error('Error removing role:', error);
      alert('Error removing role: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <PageWrapper
      title="User Management"
      description="Manage system users, roles, and permissions"
      icon={Users}
      actions={
        <Button onClick={handleAdd}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search users by name, email, or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="admin">Admin</option>
                    <option value="provider">Provider</option>
                    <option value="patient">Patient</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Manage user accounts and access</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username}
                            </h3>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                              {user.is_active ? (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">{user.user_type}</Badge>
                            {user.roles && user.roles.length > 0 && (
                              <div className="flex gap-1">
                                {user.roles.map((role, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {role.role_name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            {user.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </div>
                            )}
                            {user.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </div>
                            )}
                            {user.last_login && (
                              <div className="text-xs text-gray-500">
                                Last login: {new Date(user.last_login).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(user.id)}
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(user.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Configure role-based access control</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{user.username}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignRole(user.id, parseInt(e.target.value));
                            e.target.value = '';
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Assign Role...</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.role_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role, idx) => (
                          <Badge key={idx} variant="default" className="flex items-center gap-1">
                            {role.role_name}
                            <button
                              onClick={() => handleRemoveRole(user.id, role.id)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No roles assigned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New User</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password (min 8 characters)"
                />
              </div>
              <div>
                <Label>User Type</Label>
                <select
                  value={formData.user_type}
                  onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="patient">Patient</option>
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_verified}
                  onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Verified</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Create User
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit User</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label>New Password (leave blank to keep current)</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password (optional)"
                />
              </div>
              <div>
                <Label>User Type</Label>
                <select
                  value={formData.user_type}
                  onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="patient">Patient</option>
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_verified}
                  onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Verified</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
};

export default UserManagement;
