"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Star, TrendingUp, MessageSquare, DollarSign, Eye, Edit, Plus } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("jwt") : null;
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Refresh orders after update
        const api = (p: string) => `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}${p}`;
        const headers = { Authorization: `Bearer ${token}` } as any;
        const ordRes = await fetch(api("/orders?role=seller"), { headers });
        if (ordRes.ok) {
          const ordersData = await ordRes.json();
          setOrders(ordersData);
        }
        alert("Order status updated successfully!");
      } else {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      alert("Failed to update order status");
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("jwt") : null;
    if (!user || !token) return;

    const api = (p: string) => `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}${p}`;
    const headers = { Authorization: `Bearer ${token}` } as any;

    (async () => {
      try {
        const [prodRes, reqRes, ordRes, convRes] = await Promise.all([
          fetch(api("/products/my"), { headers }),
          fetch(api("/requests"), { headers }),
          fetch(api("/orders?role=seller"), { headers }),
          fetch(api("/messages/conversations"), { headers })
        ]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (reqRes.ok) setRequests(await reqRes.json());
        if (ordRes.ok) {
          const ordersData = await ordRes.json();
          console.log('📊 Dashboard Orders Data:', ordersData);
          console.log('📊 Orders with released payments:', ordersData.filter((o: any) => o.paymentStatus === "released"));
          setOrders(ordersData);
        }
        if (convRes.ok) setConversations(await convRes.json());
      } catch {}
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  // Show both pending and released revenue for debugging
  const releasedRevenue = Array.isArray(orders) ? orders.filter((o: any) => o.paymentStatus === "released").reduce((sum: number, o: any) => sum + (o.sellerAmount || o.amount * 0.95 || 0), 0) : 0;
  const pendingRevenue = Array.isArray(orders) ? orders.filter((o: any) => o.paymentStatus === "paid" && o.status === "delivered").reduce((sum: number, o: any) => sum + (o.sellerAmount || o.amount * 0.95 || 0), 0) : 0;
  const totalRevenue = releasedRevenue;
  const pendingRequests = Array.isArray(requests) ? requests.filter((r: any) => r.status === "pending").length : 0;
  const activeProducts = Array.isArray(products) ? products.filter((p: any) => p.status !== "removed").length : 0;
  const featuredProducts = Array.isArray(products) ? products.filter((p: any) => p.featured).length : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Manage your marketplace activities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{Number(totalRevenue).toFixed(2)}</div>
            <p className="text-xs text-blue-100">Released payments</p>
            {pendingRevenue > 0 && (
              <p className="text-xs text-blue-200 mt-1">
                ₵{Number(pendingRevenue).toFixed(2)} pending release
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
            <p className="text-xs text-green-100">Available items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <ShoppingCart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-purple-100">Awaiting response</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Products</CardTitle>
            <Star className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuredProducts}</div>
            <p className="text-xs text-yellow-100">Highlighted items</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            My Products ({products?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Requests ({requests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Orders ({orders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages ({conversations?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  My Products
                </div>
                <Button size="sm" onClick={() => window.location.href = "/add-product"}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-left p-3 font-medium">Price</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products?.map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              {p.images?.[0]?.url ? (
                                <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <div className="flex items-center justify-center w-full h-full">
                                  <span className="text-xs font-medium text-gray-500">{p.title?.substring(0, 2).toUpperCase()}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {p.title}
                                {p.featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                              </div>
                              <div className="text-xs text-gray-500">{p.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-medium">₵{p.price}</td>
                        <td className="p-3">
                          <Badge variant={p.status === "removed" ? "destructive" : "default"}>{p.status || "Active"}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => window.location.href = `/product/${p.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => window.location.href = `/product/${p.id}/edit`}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Requests
                </div>
                <Button size="sm" onClick={() => window.location.href = "/dashboard/requests"}>
                  Manage Requests
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-left p-3 font-medium">Buyer</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests?.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              {r.product?.images?.[0]?.url ? (
                                <img src={r.product.images[0].url} alt={r.product.title} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <Package className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{r.product?.title}</div>
                              <div className="text-xs text-gray-500">₵{r.product?.price}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{r.buyer?.name || "Unknown"}</div>
                            <div className="text-xs text-gray-500">{r.buyer?.email}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={r.status === "accepted" ? "default" : r.status === "declined" ? "destructive" : "secondary"}>{r.status}</Badge>
                        </td>
                        <td className="p-3 text-sm">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                My Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Order ID</th>
                      <th className="text-left p-3 font-medium">Items</th>
                      <th className="text-left p-3 font-medium">Total</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders && orders.length > 0 ? orders.map((o: any) => (
                      <tr key={o.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{o.id.slice(-8)}</td>
                        <td className="p-3">1 item</td>
                        <td className="p-3 font-medium">₵{o.amount || 0}</td>
                        <td className="p-3">
                          <Badge variant={o.status === "delivered" ? "default" : o.status === "pending" ? "secondary" : "outline"}>{o.status}</Badge>
                        </td>
                        <td className="p-3 text-sm">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => window.location.href = "/dashboard/orders"}>
                              <Eye className="h-3 w-3 mr-1" />
                              Manage
                            </Button>
                            {o.status === "pending" && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateOrderStatus(o.id, "confirmed")}>
                                Confirm
                              </Button>
                            )}
                            {o.status === "confirmed" && (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => updateOrderStatus(o.id, "shipped")}>
                                Ship
                              </Button>
                            )}
                            {o.status === "shipped" && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateOrderStatus(o.id, "delivered")}>
                                Deliver
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No orders yet</p>
                          <p className="text-sm">Orders will appear here when customers purchase your products</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Last Message</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations?.map((c: any) => (
                      <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              {(c.buyer?.name || c.seller?.name || "?").charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{c.buyer?.name || c.seller?.name || "Unknown"}</div>
                              <div className="text-xs text-gray-500">ID: {c.buyerId || c.sellerId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{c.messages?.[0]?.content || "No messages"}</td>
                        <td className="p-3 text-sm">{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ""}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Chat
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}