"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, Truck, CheckCircle, XCircle, Clock, User, MapPin, Calendar, Bell } from "lucide-react";

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
  paymentStatus: string;
  createdAt: string;
  shippingAddress: string;
  notes?: string;
  sellerAmount?: number;
  transferredAt?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: string;
  isRead: boolean;
  createdAt: string;
}

export default function OrdersPage() {
  const { user, token } = useAuth();
  const { toast } = useToast ? useToast() : { toast: () => {} };
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("buyer");
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchNotifications();
    }
  }, [user, activeTab]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
        console.log(`📋 Orders Page (${role}):`, data);
        console.log(`📋 Orders with payment status:`, data.map((o: any) => ({
          id: o.id.slice(-8),
          paymentStatus: o.paymentStatus,
          sellerAmount: o.sellerAmount,
          transferredAt: o.transferredAt
        })));
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

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const orderNotifications = data.filter((notif: Notification) => notif.type === 'order');
        setNotifications(orderNotifications);
        
        // Show toast for new unread notifications
        const newUnread = orderNotifications.filter((notif: Notification) => !notif.isRead);
        if (newUnread.length > 0 && notifications.length > 0) {
          const hasNewNotifications = newUnread.some((notif: Notification) => 
            !notifications.find(existing => existing.id === notif.id)
          );
          if (hasNewNotifications) {
            toast({ 
              title: "New Order Notification", 
              description: `You have ${newUnread.length} new order notification(s)` 
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/auth/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/auth/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Remove from local state
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        toast({ title: "Success", description: "Notification deleted" });
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast({ title: "Error", description: "Failed to delete notification" });
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/notifications/mark-all-read", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Update local state
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
        toast({ title: "Success", description: "All notifications marked as read" });
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Manage your orders and track their status</p>
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </Button>
            
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Order Notifications</h3>
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b hover:bg-gray-50 ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => !notification.isRead && markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center space-x-1">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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
                          <p className="font-medium text-gray-900">{order.seller?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{order.seller?.email || 'N/A'}</p>
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
                            {order.paymentStatus === "released" && (
                              <div className="mt-2">
                                <Badge className="bg-green-100 text-green-800">
                                  Payment Released
                                </Badge>
                                {order.sellerAmount && (
                                  <p className="text-sm text-green-600 mt-1">
                                    You received: ₵{order.sellerAmount}
                                  </p>
                                )}
                                {order.transferredAt && (
                                  <p className="text-xs text-gray-500">
                                    Transferred: {formatDate(order.transferredAt)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Buyer Info */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Buyer</span>
                          </div>
                          <p className="font-medium text-gray-900">{order.buyer?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{order.buyer?.email || 'N/A'}</p>
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




