'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  Shield, 
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  UserCheck,
  DollarSign,
  MessageCircle
} from "lucide-react";

const fetcher = (url: string, token?: string | null) => 
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).then(res => res.json());

const post = (url: string, data: any, token?: string | null) =>
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}${url}`, {
    method: 'POST',
    headers: token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());

export default function AdminPage() {
  const { user, token } = useAuth();
  const { data: users, mutate: mutateUsers } = useSWR(user?.isAdmin ? ["/admin/users", token] : null, ([url, t]) => fetcher(url, t));
  const { data: products, mutate: mutateProducts } = useSWR(user?.isAdmin ? ["/admin/products", token] : null, ([url, t]) => fetcher(url, t));
  const { data: orders, mutate: mutateOrders } = useSWR(user?.isAdmin ? ["/admin/orders", token] : null, ([url, t]) => fetcher(url, t));
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!user?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">Admin access required to view this page.</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders && Array.isArray(orders) ? orders.filter((o: any) => o.status === "pending").length : 0;
  const activeUsers = users && Array.isArray(users) ? users.filter((u: any) => !u.suspended).length : 0;
  const suspendedUsers = users && Array.isArray(users) ? users.filter((u: any) => u.suspended).length : 0;
  const activeProducts = products && Array.isArray(products) ? products.filter((p: any) => p.status !== "removed").length : 0;

  const handleUserAction = async (userId: string, action: string) => {
    setActionLoading(`user-${userId}-${action}`);
    try {
      // Optimistic update so the stats box updates immediately
      const nextSuspended = action === 'suspend';
      await mutateUsers(
        (current: any) =>
          Array.isArray(current)
            ? current.map((u: any) => (u.id === userId ? { ...u, suspended: nextSuspended } : u))
            : current,
        { revalidate: false }
      );

      // Perform the server action
      await post(`/admin/users/${userId}/${action}`, {}, token);

      // Revalidate in background to ensure consistency with server and update stats
      mutateUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
    setActionLoading(null);
  };

  const handleProductAction = async (productId: string, action: string) => {
    setActionLoading(`product-${productId}-${action}`);
    try {
      await post(`/admin/products/${productId}/${action}`, {}, token);
      mutateProducts();
    } catch (error) {
      console.error(`Failed to ${action} product:`, error);
    }
    setActionLoading(null);
  };

  const handlePaymentRelease = async (orderId: string) => {
    setActionLoading(`order-${orderId}-release`);
    try {
      await post(`/admin/orders/${orderId}/release-payment`, {}, token);
      mutateOrders();
    } catch (error) {
      console.error('Failed to release payment:', error);
    }
    setActionLoading(null);
  };

  const handleViewDetails = (order: any) => {
    // Create detailed order information modal or navigate to order details page
    const orderDetails = `
Order ID: ${order.id}
Created: ${new Date(order.createdAt).toLocaleString()}
Status: ${order.status}
Payment Status: ${order.paymentStatus}

Buyer: ${order.buyer?.name || 'Unknown'} (${order.buyer?.email || 'No email'})
Seller: ${order.seller?.name || 'Unknown'} (${order.seller?.email || 'No email'})
Product: ${order.product?.title || 'Unknown Product'}

Amount: ₵${order.amount || 0}
Commission: ₵${(order.commissionAmount || order.amount * 0.05 || 0).toFixed(2)}
Seller Amount: ₵${(order.sellerAmount || order.amount * 0.95 || 0).toFixed(2)}

Delivery: ${order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'Not delivered'}
Auto-Release: ${order.autoReleaseDate ? new Date(order.autoReleaseDate).toLocaleString() : 'Not set'}
    `;
    
    alert(orderDetails); // For now, using alert. In production, use a proper modal
  };

  const handleContactParties = async (order: any) => {
    setActionLoading(`order-${order.id}-contact`);
    try {
      // Send notification to both buyer and seller
      await post(`/admin/orders/${order.id}/contact-parties`, {
        message: `Admin is reviewing your order #${order.id.slice(-8)}. Please be available for any questions or clarifications.`
      }, token);
      
      alert(`Notification sent to both buyer (${order.buyer?.email}) and seller (${order.seller?.email})`);
    } catch (error) {
      console.error('Failed to contact parties:', error);
      alert('Failed to send notifications');
    }
    setActionLoading(null);
  };

  const handleIntervene = async (order: any) => {
    const interventionReason = prompt('Please specify the reason for intervention:');
    if (!interventionReason) return;

    setActionLoading(`order-${order.id}-intervene`);
    try {
      await post(`/admin/orders/${order.id}/intervene`, {
        reason: interventionReason,
        adminAction: 'investigation_started'
      }, token);
      
      mutateOrders();
      alert(`Intervention initiated for order #${order.id.slice(-8)}`);
    } catch (error) {
      console.error('Failed to intervene:', error);
      alert('Failed to initiate intervention');
    }
    setActionLoading(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your marketplace platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-blue-100">
              {activeUsers} active, {suspendedUsers} suspended
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
            <p className="text-xs text-green-100">
              {activeProducts} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
            <p className="text-xs text-purple-100">
              {pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₵{orders && Array.isArray(orders) ? orders.reduce((sum: number, order: any) => sum + ((order.commissionAmount || order.amount * 0.05) || 0), 0).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-yellow-100">
              5% platform commission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users && Array.isArray(users) ? users.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name || 'No name'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserAction(user.id, 'suspend')}
                        disabled={actionLoading === `user-${user.id}-suspend`}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUserAction(user.id, 'activate')}
                        disabled={actionLoading === `user-${user.id}-activate`}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Activate
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products && Array.isArray(products) ? products.map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0].url} 
                            alt={product.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-gray-500">${product.price}</p>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProductAction(product.id, 'remove')}
                        disabled={actionLoading === `product-${product.id}-remove`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProductAction(product.id, 'approve')}
                        disabled={actionLoading === `product-${product.id}-approve`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    No products found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      <TabsContent value="orders" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Management & Payment Oversight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders && Array.isArray(orders) ? orders.map((order: any) => (
                <div key={order.id} className="border rounded-lg p-6 space-y-4">
                  {/* Order Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Order #{order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-500">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          order.status === 'pending' ? 'secondary' : 
                          order.status === 'confirmed' ? 'default' :
                          order.status === 'shipped' ? 'default' :
                          order.status === 'delivered' ? 'default' : 'secondary'
                        }
                        className={
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''
                        }
                      >
                        {order.status?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Financial Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">💰 Financial Details</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Order Amount:</span>
                          <span className="font-medium">₵{order.amount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Commission (5%):</span>
                          <span className="font-medium text-green-600">
                            ₵{(order.commissionAmount || order.amount * 0.05 || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Seller Amount:</span>
                          <span className="font-medium">
                            ₵{(order.sellerAmount || order.amount * 0.95 || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t">
                          <span>Payment Status:</span>
                          <Badge variant="outline" className={
                            order.paymentStatus === 'paid' ? 'border-green-500 text-green-700' :
                            order.paymentStatus === 'released' ? 'border-blue-500 text-blue-700' :
                            'border-yellow-500 text-yellow-700'
                          }>
                            {order.paymentStatus || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Buyer & Seller Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">👥 Participants</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Buyer:</span>
                          <p className="font-medium">{order.buyer?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{order.buyer?.email || 'No email'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Seller:</span>
                          <p className="font-medium">{order.seller?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{order.seller?.email || 'No email'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Product:</span>
                          <p className="font-medium">{order.product?.title || 'Unknown Product'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery & Timeline */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">🚚 Delivery Status</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Delivered At:</span>
                          <span className="font-medium">
                            {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'Not delivered'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto-Release:</span>
                          <span className="font-medium">
                            {order.autoReleaseDate ? new Date(order.autoReleaseDate).toLocaleDateString() : 'Not set'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Days Until Release:</span>
                          <span className="font-medium">
                            {order.autoReleaseDate ? 
                              Math.max(0, Math.ceil((new Date(order.autoReleaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) 
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-blue-600 border-blue-200"
                      onClick={() => handleViewDetails(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    
                    {order.paymentStatus === 'paid' && order.status === 'delivered' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handlePaymentRelease(order.id)}
                        disabled={actionLoading === `order-${order.id}-release`}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Release Payment
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-purple-600 border-purple-200"
                      onClick={() => handleContactParties(order)}
                      disabled={actionLoading === `order-${order.id}-contact`}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Contact Parties
                    </Button>
                    
                    {order.status !== 'delivered' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-orange-600 border-orange-200"
                        onClick={() => handleIntervene(order)}
                        disabled={actionLoading === `order-${order.id}-intervene`}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Intervene
                      </Button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  No orders found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
  );
}