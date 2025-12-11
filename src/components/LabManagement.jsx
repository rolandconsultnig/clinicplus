/**
 * Lab Management - Comprehensive laboratory management interface
 */
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TestTube, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function LabManagement({ patientId }) {
  const [orders, setOrders] = useState([]);
  const [pendingReview, setPendingReview] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLabData();
  }, [patientId]);

  const loadLabData = async () => {
    try {
      setLoading(true);
      
      const [ordersResult, pendingResult, statsResult] = await Promise.all([
        apiService.request(`/api/lab-mgmt/orders${patientId ? `?patient_id=${patientId}` : ''}`, 'GET'),
        apiService.request('/api/lab-mgmt/orders/pending-review', 'GET'),
        apiService.request('/api/lab-mgmt/statistics', 'GET')
      ]);

      if (ordersResult.success) {
        setOrders(ordersResult.orders || []);
      }
      if (pendingResult.success) {
        setPendingReview(pendingResult.orders || []);
      }
      if (statsResult.success) {
        setStatistics(statsResult.statistics);
      }
    } catch (err) {
      console.error('Error loading lab data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading lab data...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Lab Management</CardTitle>
        </CardHeader>
        <CardContent>
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold">{statistics.total_orders || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.pending_orders || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.completed_orders || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Total Results</p>
                  <p className="text-2xl font-bold">{statistics.total_results || 0}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">All Orders</TabsTrigger>
              <TabsTrigger value="pending">
                Pending Review
                {pendingReview.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingReview.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-4">
              <div className="space-y-2">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <Card key={order.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TestTube className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">Order #{order.id}</p>
                            <p className="text-sm text-gray-600">
                              {order.order_date && new Date(order.order_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No orders found</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <div className="space-y-2">
                {pendingReview.length > 0 ? (
                  pendingReview.map((order) => (
                    <Card key={order.id} className="p-3 border-yellow-200 bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="font-medium">Order #{order.id}</p>
                            <p className="text-sm text-gray-600">Requires review</p>
                          </div>
                        </div>
                        <Button size="sm">Review</Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No pending reviews</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="results" className="mt-4">
              <p className="text-gray-500">Results interface coming soon...</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

