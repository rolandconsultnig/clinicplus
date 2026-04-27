/**
 * Unified Patient Selector
 * Consistent patient search and selection across all modules
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { useAppContext } from '../contexts/AppContext.jsx'
import {
  Search,
  User,
  Calendar,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'

export default function UnifiedPatientSelector({ onSelect, showQuickInfo = true }) {
  const { selectedPatient, selectPatient } = useAppContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Search patients
  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.patients || [])
        setShowResults(true)
      }
    } catch (error) {
      console.error('Error searching patients:', error)
    } finally {
      setSearching(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Select patient
  const handleSelectPatient = async (patient) => {
    await selectPatient(patient)
    setShowResults(false)
    setSearchQuery('')
    if (onSelect) {
      onSelect(patient)
    }
  }

  // Clear selection
  const handleClearSelection = () => {
    selectPatient(null)
  }

  // Calculate age
  const calculateAge = (dob) => {
    if (!dob) return 'N/A'
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Patient Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search by name, MRN, phone, or DOB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto">
              {searching ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto"></div>
                  <p className="mt-2 text-sm">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                            <span>MRN: {patient.universal_patient_id}</span>
                            <span>•</span>
                            <span>{patient.gender}</span>
                            <span>•</span>
                            <span>{calculateAge(patient.date_of_birth)} years</span>
                          </div>
                          {patient.phone_primary && (
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3 mr-1" />
                              {patient.phone_primary}
                            </div>
                          )}
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No patients found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Patient Info */}
      {selectedPatient && showQuickInfo && (
        <Card className="border-teal-300 bg-teal-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-lg text-teal-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {selectedPatient.gender}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-xs text-teal-700">MRN</p>
                      <p className="font-semibold text-teal-900">
                        {selectedPatient.universal_patient_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-700">Age</p>
                      <p className="font-semibold text-teal-900">
                        {calculateAge(selectedPatient.date_of_birth)} years
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-700">DOB</p>
                      <p className="font-semibold text-teal-900">
                        {selectedPatient.date_of_birth}
                      </p>
                    </div>
                    {selectedPatient.phone_primary && (
                      <div>
                        <p className="text-xs text-teal-700">Phone</p>
                        <p className="font-semibold text-teal-900">
                          {selectedPatient.phone_primary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Alerts */}
                  {selectedPatient.has_allergies && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="font-semibold">Has Allergies</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-teal-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
