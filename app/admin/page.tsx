'use client';

import { useState } from 'react';
import { useAuth } from '../../components/AuthContext';
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
  TrendingUp, 
  Shield, 
  Eye,
  Trash2,
  Star,
  Ban,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  DollarSign,
  BarChart3
} from "lucide-react";

const fetcher = (url: string, token: string) => 
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}${url}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json());

const post = (url: string, data: any, token: string) =>
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}${url}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data)
  }).then(res => res.json());

export default function AdminPage() {
  const { user, token } = useAuth();
  const { data: users, mutate: mutateUsers } = useSWR(user?.isAdmin ? ["/admin/users", token] : null, ([url, t]) => fetcher(url, t));
  const { data: products, mutate: mutateProducts } = useSWR(user?.isAdmin ? ["/admin/products", token] : null, ([url, t]) => fetcher(url, t));
  const { data: orders, mutate: mutateOrders } = useSWR(user?.isAdmin ? ["/order", token] : null, ([url, t]) => fetcher(url, t));
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
      await post(`/admin/users/${userId}/${action}`, {}, token);
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
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${orders && Array.isArray(orders) ? orders.reduce((sum: number, order: any) => sum + (order.amount || 0), 0) : 0}
            </div>
            <p className="text-xs text-yellow-100">
              Total sales
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
              <CardTitle>Order Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders && Array.isArray(orders) ? orders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Order #{order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-500">${order.amount}</p>
                        <Badge variant={order.status === 'pending' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
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