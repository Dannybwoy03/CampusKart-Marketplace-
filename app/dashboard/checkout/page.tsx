"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, CreditCard, Mail, Phone, MapPin, AlertCircle } from "lucide-react";

interface CheckoutForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { toast } = useToast ? useToast() : { toast: () => {} };
  
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [formData, setFormData] = useState<CheckoutForm>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    notes: ""
  });

  const productId = searchParams.get("product");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (productId) {
      fetchProduct();
    } else {
      // Load cart items
      loadCartItems();
    }
  }, [productId, user]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        // Pre-fill form with user data
        setFormData(prev => ({
          ...prev,
          fullName: user?.name || "",
          email: user?.email || ""
        }));
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load product details" });
    }
  };

  const loadCartItems = async () => {
    // Load cart items from localStorage or state
    const cartItems = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cartItems.length === 0) {
      router.push("/dashboard/cart");
      return;
    }
    // For now, we'll handle single product checkout
    setProduct(cartItems[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaystackPayment = async () => {
    if (!product || !user) return;

    setLoading(true);
    try {
      // Initialize Paystack payment
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_your_paystack_key",
        email: formData.email,
        amount: product.price * 100, // Paystack expects amount in kobo
        currency: "GHS",
        ref: `CAMPUSKART_${Date.now()}`,
        callback: async (response: any) => {
          // Payment successful, create order
          await createOrder(response.reference);
        },
        onClose: () => {
          toast({ title: "Payment cancelled", description: "Payment was cancelled by user" });
          setLoading(false);
        }
      });
      handler.openIframe();
    } catch (error) {
      toast({ title: "Payment Error", description: "Failed to initialize payment" });
      setLoading(false);
    }
  };

  const createOrder = async (paymentReference: string) => {
    try {
      const orderData = {
        productId: product.id,
        buyerId: user?.userId || user?.id,
        sellerId: product.seller?.id || product.seller,
        amount: product.price,
        paymentReference,
        shippingAddress: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode
        },
        notes: formData.notes,
        status: "pending"
      };

      const res = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        const order = await res.json();
        
        // Send email notifications
        await sendOrderNotifications(order);
        
        // Clear cart if this was a cart item
        if (!productId) {
          localStorage.removeItem("cart");
        }
        
        toast({ title: "Order Placed!", description: "Your order has been placed successfully" });
        router.push(`/dashboard/orders/${order.id}`);
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create order" });
    } finally {
      setLoading(false);
    }
  };

  const sendOrderNotifications = async (order: any) => {
    try {
      // Send notification to seller
      await fetch("http://localhost:5000/api/notifications/seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sellerId: order.sellerId,
          buyerId: order.buyerId,
          productId: order.productId,
          orderId: order.id,
          type: "new_order",
          message: `New order received for ${product.title}`
        })
      });

      // Send confirmation email to buyer
      await fetch("http://localhost:5000/api/notifications/buyer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          buyerId: order.buyerId,
          orderId: order.id,
          type: "order_confirmation",
          message: `Order confirmed for ${product.title}`
        })
      });
    } catch (error) {
      console.error("Failed to send notifications:", error);
    }
  };

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-gray-600 mt-4">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600">Complete your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-gray-400 text-xs text-center">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{product.title}</h3>
                    <p className="text-sm text-gray-600">Seller: {product.seller?.name || product.seller}</p>
                    <p className="text-lg font-bold text-green-600">₵{product.price}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₵{product.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>₵0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>₵{product.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium">Paystack (Card, Mobile Money)</p>
                      <p className="text-sm text-gray-600">Secure payment via Paystack</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Order Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Place Order Button */}
            <Button
              onClick={handlePaystackPayment}
              disabled={loading || !formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.city}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-4"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay ₵{product.price} with Paystack
                </div>
              )}
            </Button>

            {/* Security Notice */}
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Secure Payment</p>
                <p>Your payment information is encrypted and secure. We never store your card details.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
