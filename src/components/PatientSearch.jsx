import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Search, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  Plus,
  X
} from 'lucide-react';

const PatientSearch = ({ onSelectPatient, showCreateButton = false, onCreatePatient }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      // Debounce search
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      const timeout = setTimeout(() => {
        performSearch();
      }, 300);
      setSearchTimeout(timeout);
    } else if (searchTerm.length === 0) {
      // Load recent patients when search is cleared
      loadRecentPatients();
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm]);

  const performSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const result = await apiService.request('/secure/patients/search', { method: 'GET' }, { q: searchTerm });
      if (result.success) {
        setPatients(result.patients || []);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentPatients = async () => {
    setLoading(true);
    try {
      const result = await apiService.request('/secure/patients', { method: 'GET' });
      if (result.success) {
        setPatients((result.patients || []).slice(0, 10)); // Show first 10
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    if (onSelectPatient) {
      onSelectPatient(patient);
    }
  };

  const handleClearSelection = () => {
    setSelectedPatient(null);
    if (onSelectPatient) {
      onSelectPatient(null);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Patient Search
            </CardTitle>
            <CardDescription>Search by name, ID, phone, or email</CardDescription>
          </div>
          {showCreateButton && (
            <Button
              size="sm"
              type="button"
              onClick={() => onCreatePatient?.()}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Patient
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Enter patient name, ID, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected Patient Display */}
        {selectedPatient && (
          <Card className="mb-4 border-teal-300 bg-teal-50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-teal-700" />
                    <h3 className="font-semibold text-lg text-gray-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h3>
                    <Badge variant="outline">{selectedPatient.universal_patient_id}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      DOB: {selectedPatient.date_of_birth}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {selectedPatient.gender}
                    </div>
                    {selectedPatient.phone_primary && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedPatient.phone_primary}
                      </div>
                    )}
                    {selectedPatient.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedPatient.email}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {!selectedPatient && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <p className="mt-2 text-gray-600">Searching...</p>
              </div>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="p-3 border rounded-lg cursor-pointer transition-all hover:bg-teal-50 hover:border-teal-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-teal-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {patient.first_name} {patient.last_name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>ID: {patient.universal_patient_id}</span>
                          {patient.date_of_birth && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {patient.date_of_birth}
                            </span>
                          )}
                          {patient.phone_primary && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {patient.phone_primary}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : searchTerm.length >= 2 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No patients found matching "{searchTerm}"</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>Start typing to search for patients</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientSearch;

