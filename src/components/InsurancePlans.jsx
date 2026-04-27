import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.js';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Shield, Users, Car, Check } from 'lucide-react';

export default function InsurancePlans({ onSubscribe }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const result = await apiService.request('/insurance/plans?is_active=true');
      if (result.success) {
        setPlans(result.plans || []);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'family_health':
        return <Users className="w-6 h-6" />;
      case 'passenger_accident':
        return <Car className="w-6 h-6" />;
      default:
        return <Shield className="w-6 h-6" />;
    }
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <PageWrapper
      title="Insurance Plans"
      description="Choose the plan that fits your needs"
      icon={Shield}
    >

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading plans...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map(plan => (
            <Card key={plan.id} className="hover:shadow-xl transition-all border-l-4 border-l-teal-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center text-white">
                    {getPlanIcon(plan.plan_type)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{plan.plan_name}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline">{plan.plan_type.replace('_', ' ').toUpperCase()}</Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(plan.premium_amount, plan.currency)}
                    </div>
                    <div className="text-sm text-gray-600">
                      per {plan.premium_frequency}
                    </div>
                  </div>

                  {plan.coverage_amount && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Coverage up to</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {formatCurrency(plan.coverage_amount, plan.currency)}
                      </div>
                    </div>
                  )}

                  {plan.max_family_size && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Covers up to {plan.max_family_size} family members</span>
                    </div>
                  )}

                  {plan.benefits && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Benefits:</div>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {JSON.parse(plan.benefits || '{}').consultations && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Consultations</span>
                          </li>
                        )}
                        {JSON.parse(plan.benefits || '{}').basic_labs && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Basic Lab Tests</span>
                          </li>
                        )}
                        {JSON.parse(plan.benefits || '{}').formulary_drugs && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Formulary Drugs</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
                    onClick={() => onSubscribe && onSubscribe(plan)}
                  >
                    Subscribe Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

