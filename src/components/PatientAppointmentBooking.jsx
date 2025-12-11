/**
 * Patient Appointment Booking - Comprehensive appointment booking with payment
 * Allows patients to select facility, provider, describe visit, and pay
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Calendar, Clock, Building2, User, CreditCard, 
  CheckCircle, AlertCircle, DollarSign, FileText
} from 'lucide-react';

export default function PatientAppointmentBooking({ patientId, onBookingSuccess }) {
  const [facilities, setFacilities] = useState([]);
  const [providers, setProviders] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Facility, 2: Provider, 3: Date/Time, 4: Details, 5: Payment
  const [bookingData, setBookingData] = useState({
    facility_id: '',
    provider_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'consultation',
    reason_for_visit: '',
    duration_minutes: 30,
    amount: 0,
    payment_method: 'card'
  });
  const [paymentInfo, setPaymentInfo] = useState({
    card_number: '',
    expiry_date: '',
    cvv: '',
    cardholder_name: ''
  });
  const [errors, setErrors] = useState({});
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    loadFacilities();
  }, []);

  useEffect(() => {
    if (bookingData.facility_id) {
      loadProviders(bookingData.facility_id);
    }
  }, [bookingData.facility_id]);

  useEffect(() => {
    if (bookingData.provider_id && bookingData.appointment_date) {
      loadAvailableSlots();
    }
  }, [bookingData.provider_id, bookingData.appointment_date]);

  const loadFacilities = async () => {
    try {
      const result = await apiService.request('/organization/facilities', 'GET');
      if (result.success) {
        setFacilities(result.facilities || []);
      }
    } catch (err) {
      console.error('Error loading facilities:', err);
    }
  };

  const loadProviders = async (facilityId) => {
    try {
      const result = await apiService.request(`/provider?facility_id=${facilityId}`, 'GET');
      if (result.success) {
        setProviders(result.providers || []);
      }
    } catch (err) {
      console.error('Error loading providers:', err);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        provider_id: bookingData.provider_id,
        date: bookingData.appointment_date,
        facility_id: bookingData.facility_id
      });
      
      const result = await apiService.request(`/scheduling/available-slots?${params}`, 'GET');
      if (result.success) {
        setAvailableSlots(result.slots || []);
      }
    } catch (err) {
      console.error('Error loading available slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = () => {
    // Calculate appointment fee based on type and duration
    const baseFees = {
      consultation: 5000,
      follow_up: 3000,
      emergency: 10000,
      telemedicine: 4000,
      procedure: 15000
    };
    
    const baseFee = baseFees[bookingData.appointment_type] || 5000;
    const durationMultiplier = bookingData.duration_minutes / 30;
    return baseFee * durationMultiplier;
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1 && !bookingData.facility_id) {
      newErrors.facility_id = 'Please select a facility';
    }
    
    if (step === 2 && !bookingData.provider_id) {
      newErrors.provider_id = 'Please select a provider';
    }
    
    if (step === 3 && (!bookingData.appointment_date || !bookingData.appointment_time)) {
      if (!bookingData.appointment_date) newErrors.appointment_date = 'Please select a date';
      if (!bookingData.appointment_time) newErrors.appointment_time = 'Please select a time';
    }
    
    if (step === 4 && !bookingData.reason_for_visit) {
      newErrors.reason_for_visit = 'Please describe the reason for your visit';
    }
    
    if (step === 5) {
      if (!paymentInfo.card_number) newErrors.card_number = 'Card number is required';
      if (!paymentInfo.expiry_date) newErrors.expiry_date = 'Expiry date is required';
      if (!paymentInfo.cvv) newErrors.cvv = 'CVV is required';
      if (!paymentInfo.cardholder_name) newErrors.cardholder_name = 'Cardholder name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step === 4) {
        // Calculate amount before payment step
        const amount = calculateAmount();
        setBookingData({ ...bookingData, amount });
      }
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleBooking = async () => {
    if (!validateStep()) return;
    
    try {
      setLoading(true);
      
      // Create appointment
      const appointmentResult = await apiService.request('/scheduling/appointments', 'POST', {
        patient_id: patientId,
        provider_id: bookingData.provider_id,
        facility_id: bookingData.facility_id,
        appointment_type: bookingData.appointment_type,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        duration_minutes: bookingData.duration_minutes,
        reason_for_visit: bookingData.reason_for_visit,
        status: 'scheduled'
      });
      
      if (appointmentResult.success) {
        // Process payment
        const paymentResult = await apiService.request('/payments/process', 'POST', {
          patient_id: patientId,
          appointment_id: appointmentResult.appointment.id,
          amount: bookingData.amount,
          payment_method: bookingData.payment_method,
          payment_details: {
            card_last4: paymentInfo.card_number.slice(-4),
            cardholder_name: paymentInfo.cardholder_name
          }
        });
        
        if (paymentResult.success) {
          setBookingSuccess(true);
          if (onBookingSuccess) {
            onBookingSuccess(appointmentResult.appointment);
          }
        } else {
          alert('Appointment created but payment failed: ' + (paymentResult.error || 'Unknown error'));
        }
      } else {
        alert('Failed to create appointment: ' + (appointmentResult.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      alert('Error booking appointment: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (bookingSuccess) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Appointment Booked Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your appointment has been confirmed and payment processed.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left">
            <p><strong>Date:</strong> {new Date(bookingData.appointment_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {bookingData.appointment_time}</p>
            <p><strong>Provider:</strong> {providers.find(p => p.id === parseInt(bookingData.provider_id))?.name || 'N/A'}</p>
            <p><strong>Amount Paid:</strong> ₦{bookingData.amount.toLocaleString()}</p>
          </div>
          <Button onClick={() => {
            setBookingSuccess(false);
            setStep(1);
            setBookingData({
              facility_id: '',
              provider_id: '',
              appointment_date: '',
              appointment_time: '',
              appointment_type: 'consultation',
              reason_for_visit: '',
              duration_minutes: 30,
              amount: 0,
              payment_method: 'card'
            });
          }}>
            Book Another Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Book Appointment</CardTitle>
          <CardDescription>Select facility, provider, date, and complete payment</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s}
                  </div>
                  {s < 5 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Facility</span>
              <span>Provider</span>
              <span>Date/Time</span>
              <span>Details</span>
              <span>Payment</span>
            </div>
          </div>

          {/* Step 1: Facility Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Select Facility</Label>
                <select
                  value={bookingData.facility_id}
                  onChange={(e) => {
                    setBookingData({ ...bookingData, facility_id: e.target.value, provider_id: '' });
                    setErrors({ ...errors, facility_id: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded ${errors.facility_id ? 'border-red-500' : ''}`}
                >
                  <option value="">Choose a facility...</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} - {facility.address}
                    </option>
                  ))}
                </select>
                {errors.facility_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.facility_id}</p>
                )}
              </div>
              <Button onClick={handleNext} className="w-full">
                Next: Select Provider
              </Button>
            </div>
          )}

          {/* Step 2: Provider Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Select Provider</Label>
                <select
                  value={bookingData.provider_id}
                  onChange={(e) => {
                    setBookingData({ ...bookingData, provider_id: e.target.value });
                    setErrors({ ...errors, provider_id: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded ${errors.provider_id ? 'border-red-500' : ''}`}
                >
                  <option value="">Choose a provider...</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.specialty || 'General Practice'}
                    </option>
                  ))}
                </select>
                {errors.provider_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.provider_id}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1" disabled={!bookingData.provider_id}>
                  Next: Select Date & Time
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Date & Time Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Appointment Type</Label>
                <select
                  value={bookingData.appointment_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setBookingData({ 
                      ...bookingData, 
                      appointment_type: type,
                      duration_minutes: type === 'emergency' ? 60 : type === 'procedure' ? 90 : 30
                    });
                  }}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                  <option value="telemedicine">Telemedicine</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
              
              <div>
                <Label>Select Date</Label>
                <Input
                  type="date"
                  value={bookingData.appointment_date}
                  onChange={(e) => {
                    setBookingData({ ...bookingData, appointment_date: e.target.value, appointment_time: '' });
                    setErrors({ ...errors, appointment_date: '' });
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className={errors.appointment_date ? 'border-red-500' : ''}
                />
                {errors.appointment_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.appointment_date}</p>
                )}
              </div>

              {bookingData.appointment_date && (
                <div>
                  <Label>Select Time</Label>
                  {loading ? (
                    <p className="text-gray-500">Loading available slots...</p>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={bookingData.appointment_time === slot.time ? 'default' : 'outline'}
                          onClick={() => {
                            setBookingData({ ...bookingData, appointment_time: slot.time });
                            setErrors({ ...errors, appointment_time: '' });
                          }}
                          className="text-sm"
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No available slots for this date. Please select another date.</p>
                  )}
                  {errors.appointment_time && (
                    <p className="text-red-500 text-sm mt-1">{errors.appointment_time}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1" 
                  disabled={!bookingData.appointment_date || !bookingData.appointment_time}
                >
                  Next: Visit Details
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Visit Details */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label>Reason for Visit / Chief Complaint</Label>
                <textarea
                  value={bookingData.reason_for_visit}
                  onChange={(e) => {
                    setBookingData({ ...bookingData, reason_for_visit: e.target.value });
                    setErrors({ ...errors, reason_for_visit: '' });
                  }}
                  rows="4"
                  placeholder="Please describe the reason for your visit, symptoms, or concerns..."
                  className={`w-full px-3 py-2 border rounded ${errors.reason_for_visit ? 'border-red-500' : ''}`}
                />
                {errors.reason_for_visit && (
                  <p className="text-red-500 text-sm mt-1">{errors.reason_for_visit}</p>
                )}
              </div>

              <div>
                <Label>Duration</Label>
                <select
                  value={bookingData.duration_minutes}
                  onChange={(e) => setBookingData({ ...bookingData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estimated Fee:</span>
                  <span className="text-xl font-bold">₦{calculateAmount().toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Based on {bookingData.appointment_type} appointment ({bookingData.duration_minutes} minutes)
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1" disabled={!bookingData.reason_for_visit}>
                  Next: Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Appointment Summary</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Facility:</strong> {facilities.find(f => f.id === parseInt(bookingData.facility_id))?.name || 'N/A'}</p>
                  <p><strong>Provider:</strong> {providers.find(p => p.id === parseInt(bookingData.provider_id))?.name || 'N/A'}</p>
                  <p><strong>Date:</strong> {new Date(bookingData.appointment_date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {bookingData.appointment_time}</p>
                  <p><strong>Type:</strong> {bookingData.appointment_type}</p>
                  <p><strong>Amount:</strong> ₦{bookingData.amount.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <select
                  value={bookingData.payment_method}
                  onChange={(e) => setBookingData({ ...bookingData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="card">Credit/Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="wallet">Mobile Wallet</option>
                </select>
              </div>

              {bookingData.payment_method === 'card' && (
                <div className="space-y-4 border p-4 rounded-lg">
                  <div>
                    <Label>Card Number</Label>
                    <Input
                      type="text"
                      value={paymentInfo.card_number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                        setPaymentInfo({ ...paymentInfo, card_number: formatted });
                        setErrors({ ...errors, card_number: '' });
                      }}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      className={errors.card_number ? 'border-red-500' : ''}
                    />
                    {errors.card_number && (
                      <p className="text-red-500 text-sm mt-1">{errors.card_number}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="text"
                        value={paymentInfo.expiry_date}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value.length >= 2 ? `${value.slice(0, 2)}/${value.slice(2, 4)}` : value;
                          setPaymentInfo({ ...paymentInfo, expiry_date: formatted });
                          setErrors({ ...errors, expiry_date: '' });
                        }}
                        placeholder="MM/YY"
                        maxLength="5"
                        className={errors.expiry_date ? 'border-red-500' : ''}
                      />
                      {errors.expiry_date && (
                        <p className="text-red-500 text-sm mt-1">{errors.expiry_date}</p>
                      )}
                    </div>

                    <div>
                      <Label>CVV</Label>
                      <Input
                        type="text"
                        value={paymentInfo.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPaymentInfo({ ...paymentInfo, cvv: value });
                          setErrors({ ...errors, cvv: '' });
                        }}
                        placeholder="123"
                        maxLength="4"
                        className={errors.cvv ? 'border-red-500' : ''}
                      />
                      {errors.cvv && (
                        <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Cardholder Name</Label>
                    <Input
                      type="text"
                      value={paymentInfo.cardholder_name}
                      onChange={(e) => {
                        setPaymentInfo({ ...paymentInfo, cardholder_name: e.target.value });
                        setErrors({ ...errors, cardholder_name: '' });
                      }}
                      placeholder="John Doe"
                      className={errors.cardholder_name ? 'border-red-500' : ''}
                    />
                    {errors.cardholder_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.cardholder_name}</p>
                    )}
                  </div>
                </div>
              )}

              {bookingData.payment_method === 'bank_transfer' && (
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold mb-2">Bank Transfer Details:</p>
                    <p>Account Name: Clinic+ Medical Services</p>
                    <p>Account Number: 1234567890</p>
                    <p>Bank: Access Bank</p>
                    <p className="mt-2 text-sm text-gray-600">
                      Please transfer ₦{bookingData.amount.toLocaleString()} and upload proof of payment.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {bookingData.payment_method === 'wallet' && (
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold mb-2">Mobile Wallet Payment:</p>
                    <p>Pay ₦{bookingData.amount.toLocaleString()} via:</p>
                    <div className="mt-2 space-y-1">
                      <p>• Paystack</p>
                      <p>• Flutterwave</p>
                      <p>• Bank Transfer</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleBooking} 
                  className="flex-1" 
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `Pay ₦${bookingData.amount.toLocaleString()} & Book`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

