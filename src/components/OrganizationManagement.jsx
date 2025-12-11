import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Building2, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
    loadPendingApprovals();
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await apiService.get('/api/organization/organizations');
      setOrganizations(response.organizations || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const response = await apiService.get('/api/organization/organizations/pending-approvals');
      setPendingApprovals(response.organizations || []);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    }
  };

  const handleApprove = async (orgId, comment = '') => {
    try {
      await apiService.post(`/api/organization/organizations/${orgId}/approve`, { comment });
      alert('Organization approved successfully');
      loadOrganizations();
      loadPendingApprovals();
    } catch (error) {
      alert('Error approving organization: ' + error.message);
    }
  };

  const handleReject = async (orgId, reason) => {
    if (!reason) {
      reason = prompt('Please provide a rejection reason:');
      if (!reason) return;
    }
    
    try {
      await apiService.post(`/api/organization/organizations/${orgId}/reject`, { reason });
      alert('Organization rejected');
      loadOrganizations();
      loadPendingApprovals();
    } catch (error) {
      alert('Error rejecting organization: ' + error.message);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Organization Management" description="Manage organizations and approvals" icon={Building2}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organization Management"
      description="Manage organizations and approval workflows"
      icon={Building2}
      actions={
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Organization
        </Button>
      }
    >

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="w-6 h-6" />
              Pending Approvals ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((org) => (
                <Card key={org.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{org.organization_name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{org.organization_type}</Badge>
                          <Badge variant="secondary">Approval Level: {org.approval_level}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Created: {new Date(org.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(org.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(org.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Organizations */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>All Organizations ({organizations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-semibold">ID</th>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Approval Level</th>
                  <th className="text-left p-4 font-semibold">Created</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">{org.organization_id}</td>
                    <td className="p-4 font-medium">{org.organization_name}</td>
                    <td className="p-4 capitalize">{org.organization_type}</td>
                    <td className="p-4">
                      <Badge variant={
                        org.status === 'approved' ? 'default' :
                        org.status === 'pending_approval' ? 'secondary' :
                        'destructive'
                      }>
                        {org.status}
                      </Badge>
                    </td>
                    <td className="p-4">{org.approval_level}</td>
                    <td className="p-4">{new Date(org.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrg(org)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Organization Modal */}
      {showCreateForm && (
        <CreateOrganizationForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadOrganizations();
            loadPendingApprovals();
          }}
        />
      )}

      {/* Organization Details Modal */}
      {selectedOrg && (
        <OrganizationDetailsModal
          organization={selectedOrg}
          onClose={() => setSelectedOrg(null)}
        />
      )}
    </PageWrapper>
  );
};

const CreateOrganizationForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    organization_name: '',
    organization_type: 'clinic',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    subscription_tier: 'basic'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/api/organization/organizations', formData);
      alert('Organization created successfully. Awaiting 3-level approval.');
      onSuccess();
    } catch (error) {
      alert('Error creating organization: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Create New Organization</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organization Name *</label>
              <Input
                type="text"
                required
                value={formData.organization_name}
                onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization Type *</label>
              <select
                required
                value={formData.organization_type}
                onChange={(e) => setFormData({...formData, organization_type: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="clinic">Clinic</option>
                <option value="hospital">Hospital</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="lab">Laboratory</option>
                <option value="imaging_center">Imaging Center</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription Tier</label>
                <select
                  value={formData.subscription_tier}
                  onChange={(e) => setFormData({...formData, subscription_tier: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                className="mb-2"
                placeholder="Street Address"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="City"
                />
                <Input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  placeholder="State"
                />
                <Input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                  placeholder="ZIP Code"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
              >
                Create Organization
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const OrganizationDetailsModal = ({ organization, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-2xl w-full shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Organization Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">ID</p>
                <p className="font-semibold">{organization.organization_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p className="font-semibold">{organization.organization_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Type</p>
                <Badge variant="outline">{organization.organization_type}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge variant={
                  organization.status === 'approved' ? 'default' :
                  organization.status === 'pending_approval' ? 'secondary' :
                  'destructive'
                }>
                  {organization.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Level</p>
                <p className="font-semibold">{organization.approval_level}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="font-semibold">{new Date(organization.created_at).toLocaleString()}</p>
              </div>
              {organization.approved_at && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="font-semibold">{new Date(organization.approved_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationManagement;

