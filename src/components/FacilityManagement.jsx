import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  XCircle,
  Filter,
  Users,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { COUNTRIES, DEFAULT_COUNTRY } from '../utils/countries';

const FacilityManagement = () => {
  const [facilities, setFacilities] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('facilities');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddProviderForm, setShowAddProviderForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingProvider, setSubmittingProvider] = useState(false);
  const [formData, setFormData] = useState({
    facility_name: '',
    facility_type: 'clinic',
    facility_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: DEFAULT_COUNTRY,
    phone: '',
    fax: '',
    email: '',
    website: '',
    license_number: '',
    accreditation_body: '',
    accreditation_status: '',
    is_active: true
  });
  const [providerFormData, setProviderFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    title: '',
    provider_type: 'physician',
    specialty: '',
    sub_specialty: '',
    medical_license_number: '',
    medical_license_state: '',
    npi_number: '',
    dea_number: '',
    phone: '',
    email: '',
    employment_status: 'active',
    hire_date: '',
    facility_id: '',
    role: 'attending',
    department: '',
    is_primary_facility: false,
    is_active: true
  });

  useEffect(() => {
    loadFacilities();
    loadProviders();
  }, [filterType]);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      let url = '/providers/facilities';
      if (filterType !== 'all') {
        url += `?facility_type=${filterType}`;
      }
      const result = await apiService.request(url, { method: 'GET' });
      if (result.success) {
        setFacilities(result.facilities || []);
      }
    } catch (error) {
      console.error('Error loading facilities:', error);
      alert('Error loading facilities: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const result = await apiService.request('/providers/facilities', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        alert('Facility created successfully!');
        setShowAddForm(false);
        resetForm();
        loadFacilities();
      } else {
        alert('Failed to create facility: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating facility:', error);
      alert('Error creating facility: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      facility_name: '',
      facility_type: 'clinic',
      facility_id: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      country: DEFAULT_COUNTRY,
      phone: '',
      fax: '',
      email: '',
      website: '',
      license_number: '',
      accreditation_body: '',
      accreditation_status: '',
      is_active: true
    });
  };

  const handleDeleteFacility = async (facilityId) => {
    if (!confirm('Are you sure you want to delete this facility?')) return;
    
    try {
      const result = await apiService.request(`/providers/facilities/${facilityId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        alert('Facility deleted successfully');
        loadFacilities();
      } else {
        alert('Failed to delete facility: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting facility:', error);
      alert('Error deleting facility: ' + (error.message || 'Unknown error'));
    }
  };

  const handleAddProvider = async (e) => {
    e.preventDefault();
    setSubmittingProvider(true);
    
    try {
      const result = await apiService.request('/providers', {
        method: 'POST',
        body: JSON.stringify(providerFormData)
      });
      
      if (result.success) {
        alert('Provider created successfully!');
        setShowAddProviderForm(false);
        resetProviderForm();
        loadProviders();
      } else {
        alert('Failed to create provider: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating provider:', error);
      alert('Error creating provider: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmittingProvider(false);
    }
  };

  const resetProviderForm = () => {
    setProviderFormData({
      first_name: '',
      last_name: '',
      middle_name: '',
      title: '',
      provider_type: 'physician',
      specialty: '',
      sub_specialty: '',
      medical_license_number: '',
      medical_license_state: '',
      npi_number: '',
      dea_number: '',
      phone: '',
      email: '',
      employment_status: 'active',
      hire_date: '',
      facility_id: '',
      role: 'attending',
      department: '',
      is_primary_facility: false,
      is_active: true
    });
  };

  const loadProviders = async () => {
    try {
      const result = await apiService.request('/providers', { method: 'GET' });
      if (result.success) {
        setProviders(result.providers || []);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const filteredFacilities = facilities.filter(facility =>
    facility.facility_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.facility_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facility.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageWrapper
      title="Facility Management"
      description="Manage healthcare facilities and provider affiliations"
      icon={Building2}
      actions={
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Facility
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="facilities" className="space-y-6">
          {/* Add Facility Form Modal */}
          {showAddForm && (
            <Card className="border-2 border-blue-500 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add New Facility</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddFacility} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="facility_name">Facility Name *</Label>
                      <Input
                        id="facility_name"
                        required
                        value={formData.facility_name}
                        onChange={(e) => setFormData({...formData, facility_name: e.target.value})}
                        placeholder="Enter facility name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facility_type">Facility Type *</Label>
                      <select
                        id="facility_type"
                        required
                        value={formData.facility_type}
                        onChange={(e) => setFormData({...formData, facility_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="hospital">Hospital</option>
                        <option value="clinic">Clinic</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="lab">Laboratory</option>
                        <option value="imaging_center">Imaging Center</option>
                        <option value="urgent_care">Urgent Care</option>
                        <option value="specialty_clinic">Specialty Clinic</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="facility_id">Facility ID (Optional - Auto-generated if empty)</Label>
                    <Input
                      id="facility_id"
                      value={formData.facility_id}
                      onChange={(e) => setFormData({...formData, facility_id: e.target.value})}
                      placeholder="Leave empty for auto-generation"
                    />
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-2 block">Address Information</Label>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="address_line1">Address Line 1</Label>
                        <Input
                          id="address_line1"
                          value={formData.address_line1}
                          onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                          placeholder="Street address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address_line2">Address Line 2</Label>
                        <Input
                          id="address_line2"
                          value={formData.address_line2}
                          onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
                          placeholder="Suite, unit, etc."
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({...formData, state: e.target.value})}
                            placeholder="State"
                            maxLength="2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="zip_code">ZIP Code</Label>
                          <Input
                            id="zip_code"
                            value={formData.zip_code}
                            onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                            placeholder="ZIP"
                            maxLength="10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <select
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({...formData, country: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          {COUNTRIES.map((country) => (
                            <option key={country.value} value={country.value}>
                              {country.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-2 block">Contact Information</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fax">Fax</Label>
                        <Input
                          id="fax"
                          type="tel"
                          value={formData.fax}
                          onChange={(e) => setFormData({...formData, fax: e.target.value})}
                          placeholder="(555) 123-4568"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="facility@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-2 block">Licensing & Accreditation</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="license_number">License Number</Label>
                        <Input
                          id="license_number"
                          value={formData.license_number}
                          onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                          placeholder="License #"
                        />
                      </div>
                      <div>
                        <Label htmlFor="accreditation_body">Accreditation Body</Label>
                        <Input
                          id="accreditation_body"
                          value={formData.accreditation_body}
                          onChange={(e) => setFormData({...formData, accreditation_body: e.target.value})}
                          placeholder="e.g., Joint Commission"
                        />
                      </div>
                      <div>
                        <Label htmlFor="accreditation_status">Accreditation Status</Label>
                        <select
                          id="accreditation_status"
                          value={formData.accreditation_status}
                          onChange={(e) => setFormData({...formData, accreditation_status: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select Status</option>
                          <option value="accredited">Accredited</option>
                          <option value="pending">Pending</option>
                          <option value="expired">Expired</option>
                          <option value="not_accredited">Not Accredited</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Facility is active
                    </Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Create Facility
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search facilities by name, ID, or location..."
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
                    <option value="all">All Types</option>
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="lab">Lab</option>
                    <option value="imaging_center">Imaging Center</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facilities List */}
          <Card>
            <CardHeader>
              <CardTitle>Facilities ({filteredFacilities.length})</CardTitle>
              <CardDescription>Manage healthcare facilities</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading facilities...</p>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No facilities found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFacilities.map((facility) => (
                    <Card 
                      key={facility.id} 
                      hover
                      className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 transition-transform">
                                <Building2 className="w-8 h-8 text-white" />
                              </div>
                              {facility.is_active && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="font-bold text-xl text-gray-900 group-hover:text-emerald-600 transition-colors">
                                  {facility.facility_name}
                                </h3>
                                <Badge variant={facility.is_active ? 'success' : 'secondary'} className="text-xs">
                                  {facility.is_active ? (
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                  ) : (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  )}
                                  {facility.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {facility.facility_type.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                {facility.address_line1 && (
                                  <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-gray-900">{facility.address_line1}</p>
                                      {facility.city && (
                                        <p className="text-gray-600">
                                          {facility.city}{facility.state && `, ${facility.state}`} {facility.zip_code}
                                        </p>
                                      )}
                                      {facility.country && (
                                        <p className="text-gray-500 text-xs mt-1">{facility.country}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-4">
                                  {facility.phone && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                                      <Phone className="w-4 h-4 text-blue-600" />
                                      <span className="font-medium text-gray-900">{facility.phone}</span>
                                    </div>
                                  )}
                                  {facility.email && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                                      <Mail className="w-4 h-4 text-purple-600" />
                                      <span className="font-medium text-gray-900">{facility.email}</span>
                                    </div>
                                  )}
                                  {facility.website && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                                      <Globe className="w-4 h-4 text-indigo-600" />
                                      <a href={facility.website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                                        Visit Website
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="shadow-sm">
                              <Edit className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteFacility(facility.id)}
                              className="shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          {/* Add Provider Form Modal */}
          {showAddProviderForm && (
            <Card className="border-2 border-blue-500 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add New Provider</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddProviderForm(false);
                      resetProviderForm();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddProvider} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <select
                        id="title"
                        value={providerFormData.title}
                        onChange={(e) => setProviderFormData({...providerFormData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Title</option>
                        <option value="Dr.">Dr.</option>
                        <option value="MD">MD</option>
                        <option value="DO">DO</option>
                        <option value="RN">RN</option>
                        <option value="NP">NP</option>
                        <option value="PA">PA</option>
                        <option value="PharmD">PharmD</option>
                        <option value="DDS">DDS</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        required
                        value={providerFormData.first_name}
                        onChange={(e) => setProviderFormData({...providerFormData, first_name: e.target.value})}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        required
                        value={providerFormData.last_name}
                        onChange={(e) => setProviderFormData({...providerFormData, last_name: e.target.value})}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input
                      id="middle_name"
                      value={providerFormData.middle_name}
                      onChange={(e) => setProviderFormData({...providerFormData, middle_name: e.target.value})}
                      placeholder="Middle name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="provider_type">Provider Type *</Label>
                      <select
                        id="provider_type"
                        required
                        value={providerFormData.provider_type}
                        onChange={(e) => setProviderFormData({...providerFormData, provider_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="physician">Physician</option>
                        <option value="nurse">Nurse</option>
                        <option value="nurse_practitioner">Nurse Practitioner</option>
                        <option value="physician_assistant">Physician Assistant</option>
                        <option value="pharmacist">Pharmacist</option>
                        <option value="lab_tech">Lab Technician</option>
                        <option value="radiographer">Radiographer</option>
                        <option value="therapist">Therapist</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        value={providerFormData.specialty}
                        onChange={(e) => setProviderFormData({...providerFormData, specialty: e.target.value})}
                        placeholder="e.g., Cardiology, Pediatrics"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sub_specialty">Sub-Specialty</Label>
                    <Input
                      id="sub_specialty"
                      value={providerFormData.sub_specialty}
                      onChange={(e) => setProviderFormData({...providerFormData, sub_specialty: e.target.value})}
                      placeholder="Sub-specialty"
                    />
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-2 block">Licensing Information</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="medical_license_number">License Number</Label>
                        <Input
                          id="medical_license_number"
                          value={providerFormData.medical_license_number}
                          onChange={(e) => setProviderFormData({...providerFormData, medical_license_number: e.target.value})}
                          placeholder="License #"
                        />
                      </div>
                      <div>
                        <Label htmlFor="medical_license_state">License State</Label>
                        <Input
                          id="medical_license_state"
                          value={providerFormData.medical_license_state}
                          onChange={(e) => setProviderFormData({...providerFormData, medical_license_state: e.target.value})}
                          placeholder="State"
                          maxLength="2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="npi_number">NPI Number</Label>
                        <Input
                          id="npi_number"
                          value={providerFormData.npi_number}
                          onChange={(e) => setProviderFormData({...providerFormData, npi_number: e.target.value})}
                          placeholder="NPI"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dea_number">DEA Number</Label>
                        <Input
                          id="dea_number"
                          value={providerFormData.dea_number}
                          onChange={(e) => setProviderFormData({...providerFormData, dea_number: e.target.value})}
                          placeholder="DEA #"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-2 block">Contact Information</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={providerFormData.phone}
                          onChange={(e) => setProviderFormData({...providerFormData, phone: e.target.value})}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={providerFormData.email}
                          onChange={(e) => setProviderFormData({...providerFormData, email: e.target.value})}
                          placeholder="provider@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold mb-2 block">Facility Affiliation</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="facility_id">Facility</Label>
                        <select
                          id="facility_id"
                          value={providerFormData.facility_id}
                          onChange={(e) => setProviderFormData({...providerFormData, facility_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select Facility</option>
                          {facilities.map((facility) => (
                            <option key={facility.id} value={facility.id}>
                              {facility.facility_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="role">Role at Facility</Label>
                        <select
                          id="role"
                          value={providerFormData.role}
                          onChange={(e) => setProviderFormData({...providerFormData, role: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="attending">Attending</option>
                          <option value="resident">Resident</option>
                          <option value="consultant">Consultant</option>
                          <option value="staff">Staff</option>
                          <option value="contractor">Contractor</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={providerFormData.department}
                          onChange={(e) => setProviderFormData({...providerFormData, department: e.target.value})}
                          placeholder="Department"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="checkbox"
                        id="is_primary_facility"
                        checked={providerFormData.is_primary_facility}
                        onChange={(e) => setProviderFormData({...providerFormData, is_primary_facility: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="is_primary_facility" className="cursor-pointer">
                        Primary facility
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employment_status">Employment Status</Label>
                      <select
                        id="employment_status"
                        value={providerFormData.employment_status}
                        onChange={(e) => setProviderFormData({...providerFormData, employment_status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="hire_date">Hire Date</Label>
                      <Input
                        id="hire_date"
                        type="date"
                        value={providerFormData.hire_date}
                        onChange={(e) => setProviderFormData({...providerFormData, hire_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="provider_is_active"
                      checked={providerFormData.is_active}
                      onChange={(e) => setProviderFormData({...providerFormData, is_active: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="provider_is_active" className="cursor-pointer">
                      Provider is active
                    </Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={submittingProvider}
                      className="flex-1"
                    >
                      {submittingProvider ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Create Provider
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddProviderForm(false);
                        resetProviderForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Providers ({providers.length})</CardTitle>
                  <CardDescription>Manage provider accounts and facility affiliations</CardDescription>
                </div>
                <Button onClick={() => setShowAddProviderForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Provider
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {providers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No providers found
                </div>
              ) : (
                <div className="space-y-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {provider.first_name?.charAt(0)}{provider.last_name?.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {provider.title} {provider.first_name} {provider.last_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <Badge variant="outline">{provider.provider_type}</Badge>
                              {provider.specialty && (
                                <span>{provider.specialty}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
};

export default FacilityManagement;

