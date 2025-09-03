"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, MessageCircle, User, Package } from "lucide-react";

interface Request {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  message: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    price: number;
    images: Array<{ url: string }>;
  };
  buyer: {
    name: string;
    email: string;
  };
  seller: {
    name: string;
    email: string;
  };
}

export default function RequestsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast ? useToast() : { toast: () => {} };
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user && token) {
      fetchRequests();
    }
  }, [user, token]);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else {
        throw new Error("Failed to fetch requests");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load requests" });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    setUpdating(requestId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/requests/${requestId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        const updatedRequest = await res.json();
        setRequests(prev => prev.map(req => req.id === requestId ? updatedRequest : req));
        toast({ 
          title: "Success", 
          description: `Request ${status} successfully` 
        });
        
        // Refresh notifications after status update
        if (typeof window !== 'undefined' && (window as any).refetchNotifications) {
          (window as any).refetchNotifications();
        }
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to update request");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update request" });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      accepted: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
      cancelled: { color: "bg-gray-100 text-gray-800", icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const isSeller = (request: Request) => request.sellerId === user?.userId;
  const isBuyer = (request: Request) => request.buyerId === user?.userId;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Requests</h1>
        <p className="text-gray-600">Manage your product requests and orders</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
          <p className="text-gray-500">You don't have any requests yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <img 
                    src={request.product.images?.[0]?.url || "/placeholder.svg"} 
                    alt={request.product.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{request.product.title}</h3>
                    <p className="text-green-600 font-medium">₵{request.product.price}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {isSeller(request) ? `Buyer: ${request.buyer.name}` : `Seller: ${request.seller.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(request.status)}
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.message && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Message:</p>
                      <p className="text-sm text-gray-600">{request.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons for sellers */}
              {isSeller(request) && request.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => updateRequestStatus(request.id, "accepted")}
                    disabled={updating === request.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept Request
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => updateRequestStatus(request.id, "rejected")}
                    disabled={updating === request.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject Request
                  </Button>
                </div>
              )}

              {/* Action buttons for buyers */}
              {isBuyer(request) && (request.status === "pending" || request.status === "accepted") && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => updateRequestStatus(request.id, "cancelled")}
                    disabled={updating === request.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel Request
                  </Button>
                </div>
              )}

              {/* Show accepted request actions */}
              {request.status === "accepted" && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Request accepted!</strong> {isSeller(request) 
                      ? "The buyer has been notified. You can now proceed with the sale."
                      : "The seller has accepted your request. You can now proceed with payment."
                    }
                  </p>
                  {isBuyer(request) && (
                    <Button 
                      className="mt-2 bg-green-600 hover:bg-green-700"
                      onClick={() => window.location.href = `/dashboard/checkout?product=${request.productId}`}
                    >
                      Proceed to Payment
                    </Button>
                  )}
                </div>
              )}

              {request.status === "rejected" && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Request rejected.</strong> {isSeller(request) 
                      ? "You have rejected this request."
                      : "The seller has rejected your request."
                    }
                  </p>
                </div>
              )}

              {request.status === "cancelled" && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-800">
                    <strong>Request cancelled.</strong> This request has been cancelled.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
