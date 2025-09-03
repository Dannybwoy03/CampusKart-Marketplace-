"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, Truck, CheckCircle, XCircle, Clock, User, MapPin, Calendar } from "lucide-react";

interface Order {
  id: string;
  product: {
    id: string;
    title: string;
    images: Array<{ url: string }>;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  seller: {
    id: string;
    name: string;
    email: string;
  };
  amount: number;
  status: string;
  createdAt: string;
  shippingAddress: string;
  notes?: string;
}

export default function OrdersPage() {
  const { user, token } = useAuth();
  const { toast } = useToast ? useToast() : { toast: () => {} };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("buyer");

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, activeTab]);

  const fetchOrders = async () => {
    try {
      const role = activeTab === "seller" ? "seller" : "buyer";
      const res = await fetch(`http://localhost:5000/api/orders?role=${role}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        throw new Error("Failed to fetch orders");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch orders" });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Order status updated" });
        fetchOrders(); // Refresh orders
      } else {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order status" });
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast({ title: "Success", description: "Order cancelled successfully" });
        fetchOrders(); // Refresh orders
      } else {
        throw new Error("Failed to cancel order");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to cancel order" });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      confirmed: { color: "bg-blue-100 text-blue-800", icon: Package },
      shipped: { color: "bg-purple-100 text-purple-800", icon: Truck },
      delivered: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusActions = (order: Order) => {
    if (activeTab === "seller") {
      // Seller actions
      switch (order.status) {
        case "pending":
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateOrderStatus(order.id, "confirmed")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirm Order
              </Button>
            </div>
          );
        case "confirmed":
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateOrderStatus(order.id, "shipped")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Mark as Shipped
              </Button>
            </div>
          );
        case "shipped":
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateOrderStatus(order.id, "delivered")}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Delivered
              </Button>
            </div>
          );
        default:
          return null;
      }
    } else {
      // Buyer actions
      if (order.status === "pending") {
        return (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => cancelOrder(order.id)}
          >
            Cancel Order
          </Button>
        );
      }
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseShippingAddress = (addressString: string) => {
    try {
      return JSON.parse(addressString);
    } catch {
      return { fullName: "N/A", address: "N/A", city: "N/A" };
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-gray-600 mt-4">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600">Manage your orders and track their status</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buyer">My Purchases</TabsTrigger>
          <TabsTrigger value="seller">My Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="buyer" className="space-y-6">
          <div className="grid gap-6">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases yet</h3>
                  <p className="text-gray-600">Start shopping to see your orders here</p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => {
                const shippingAddress = parseShippingAddress(order.shippingAddress);
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                          <p className="text-sm text-gray-600">
                            Placed on {formatDate(order.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Product Info */}
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            {order.product.images?.[0]?.url ? (
                              <img
                                src={order.product.images[0].url}
                                alt={order.product.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="text-gray-400 text-xs text-center">No Image</div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{order.product.title}</h3>
                            <p className="text-lg font-bold text-green-600">₵{order.amount}</p>
                          </div>
                        </div>

                        {/* Seller Info */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Seller</span>
                          </div>
                          <p className="font-medium text-gray-900">{order.seller.name}</p>
                          <p className="text-sm text-gray-600">{order.seller.email}</p>
                        </div>

                        {/* Shipping Info */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Shipping to</span>
                          </div>
                          <p className="font-medium text-gray-900">{shippingAddress.fullName}</p>
                          <p className="text-sm text-gray-600">
                            {shippingAddress.address}, {shippingAddress.city}
                          </p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Notes:</strong> {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-6 flex justify-end">
                        {getStatusActions(order)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="seller" className="space-y-6">
          <div className="grid gap-6">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sales yet</h3>
                  <p className="text-gray-600">Start selling to see your orders here</p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => {
                const shippingAddress = parseShippingAddress(order.shippingAddress);
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                          <p className="text-sm text-gray-600">
                            Received on {formatDate(order.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Product Info */}
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            {order.product.images?.[0]?.url ? (
                              <img
                                src={order.product.images[0].url}
                                alt={order.product.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="text-gray-400 text-xs text-center">No Image</div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{order.product.title}</h3>
                            <p className="text-lg font-bold text-green-600">₵{order.amount}</p>
                          </div>
                        </div>

                        {/* Buyer Info */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Buyer</span>
                          </div>
                          <p className="font-medium text-gray-900">{order.buyer.name}</p>
                          <p className="text-sm text-gray-600">{order.buyer.email}</p>
                        </div>

                        {/* Shipping Info */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Shipping to</span>
                          </div>
                          <p className="font-medium text-gray-900">{shippingAddress.fullName}</p>
                          <p className="text-sm text-gray-600">
                            {shippingAddress.address}, {shippingAddress.city}
                          </p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Notes:</strong> {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-6 flex justify-end">
                        {getStatusActions(order)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}




