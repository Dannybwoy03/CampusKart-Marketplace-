"use client";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function CartPage() {
  const { state, dispatch } = useApp();
  const { user, token } = useAuth();
  const cart = state.cart || [];
  const [showCheckout, setShowCheckout] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const router = useRouter();

  // Fetch cart items from server
  const fetchCartItems = async () => {
    if (!user || !token) return;
    
    try {
      const res = await fetch("http://localhost:5000/api/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const serverCartItems = await res.json();
        // Update local cart state with server data
        dispatch({ type: "CLEAR_CART" });
        serverCartItems.forEach((item: any) => {
          // Add cart item ID to product for removal functionality
          const productWithCartId = {
            ...item.product,
            cartItemId: item.id
          };
          dispatch({ type: "ADD_TO_CART", payload: productWithCartId });
        });
      }
    } catch (error) {
      console.error("Failed to fetch cart items:", error);
    }
  };

  // Fix hydration mismatch by only rendering on client
  useEffect(() => {
    setIsClient(true);
    
    // Fetch cart items when component mounts
    if (user && token) {
      fetchCartItems();
    }
    
    // Load Paystack script
    const loadPaystackScript = () => {
      // Check if script already exists
      if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
        setPaystackLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        setPaystackLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Paystack script');
      };
      document.head.appendChild(script);
    };

    loadPaystackScript();
    
    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [user, token]);

  const handleRemove = async (item: any) => {
    try {
      // Use cartItemId for server deletion
      const cartItemId = item.cartItemId;
      if (!cartItemId) {
        // If no cartItemId, try to find it by refetching cart items
        console.log("No cart item ID found, refetching cart...");
        await fetchCartItems();
        return;
      }
      
      const res = await fetch(`http://localhost:5000/api/cart/${cartItemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        // Remove from local state using product ID
        dispatch({ type: "REMOVE_FROM_CART", payload: item.id });
      }
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length || !name || !email || !address) return;
    
    setSubmitting(true);
    
    try {
      // For now, handle single item from cart (first item)
      const item = cart[0];
      
      // Check if Paystack is loaded
      if (!paystackLoaded || typeof (window as any).PaystackPop === 'undefined') {
        console.error('Paystack script not loaded yet');
        setSubmitting(false);
        // Show user-friendly message
        alert('Payment system is still loading. Please try again in a moment.');
        return;
      }
      
      // Initialize Paystack payment
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_your_paystack_key",
        email: email,
        amount: item.price * 100, // Paystack expects amount in kobo
        currency: "GHS", // Ghana Cedis - supported by MTN MoMo
        ref: `CAMPUSKART_${Date.now()}`,
        callback: function(response: any) {
          // Payment successful, create order
          createOrder(response.reference, item);
        },
        onClose: () => {
          setSubmitting(false);
        }
      });
      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization failed:', error);
      setSubmitting(false);
    }
  };

  const createOrder = async (paymentReference: string, item: any) => {
    try {
      const orderData = {
        productId: item.id,
        paymentReference,
        shippingAddress: {
          fullName: name,
          email: email,
          address: address,
        },
        notes: "",
        status: "pending"
      };

      const response = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const order = await response.json();
        
        // Clear cart
        dispatch({ type: "CLEAR_CART" });
        
        // Show success
        setOrderSuccess(true);
        setShowCheckout(false);
        
        // Redirect to orders page after a delay
        setTimeout(() => {
          router.push('/dashboard/orders');
        }, 2000);
      } else {
        const errorData = await response.text();
        console.error('Order creation failed:', response.status, errorData);
        throw new Error(`Failed to create order: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Order creation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full flex items-center mb-4">
          <Link
            href="#"
            onClick={(e: React.MouseEvent) => { e.preventDefault(); router.back(); }}
            className="text-blue-600 font-medium text-sm pl-2"
          >
            &larr; Back to Previous Page
          </Link>
        </div>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-primary drop-shadow-sm mb-4 text-left">
            Your Cart
          </h1>
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="w-full flex items-center mb-4">
        <Link
          href="#"
          onClick={(e: React.MouseEvent) => { e.preventDefault(); router.back(); }}
          className="text-blue-600 font-medium text-sm pl-2"
        >
          &larr; Back to Previous Page
        </Link>
      </div>
      <div className="max-w-3xl mx-auto">
        <motion.h1
          className="text-2xl font-bold text-primary drop-shadow-sm mb-4 text-left"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Your Cart
        </motion.h1>
        {cart.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center text-muted-foreground py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img src="/placeholder.svg" alt="Empty cart" className="w-32 h-32 mb-4 opacity-60" />
            <div className="text-lg font-semibold">Your cart is empty.</div>
            <Link href="/" className="mt-4 text-primary underline font-bold">&larr; Continue Shopping</Link>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-center justify-between border-b py-3 gap-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4 w-full">
                    <img 
                      src={item.images?.[0]?.url || item.image || "/placeholder.svg"} 
                      alt={item.title} 
                      className="w-16 h-16 object-cover rounded bg-secondary" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-primary text-lg">{item.title}</div>
                      <div className="text-sm text-foreground font-semibold">₵{item.price}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10 transition"
                    onClick={() => handleRemove(item)}
                  >
                    Remove
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
            <motion.div
              className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 bg-card rounded-lg p-6 shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="text-xl font-bold text-primary">Total: ₵{total}</div>
              <Button
                className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-full shadow hover:scale-105 hover:shadow-lg transition-all duration-200"
                onClick={() => setShowCheckout(true)}
              >
                Proceed to Checkout
              </Button>
            </motion.div>
          </motion.div>
        )}
        <AnimatePresence>
          {showCheckout && (
            <motion.div
              className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-card rounded-lg shadow-lg p-8 w-full max-w-md mx-auto"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold mb-4 text-primary text-center">Checkout</h2>
                <form onSubmit={handleCheckout} className="space-y-4">
                  <input
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    required
                  />
                  <input
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                  />
                  <input
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary"
                    placeholder="Address"
                    value={address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-full shadow hover:scale-105 hover:shadow-lg transition-all duration-200"
                    disabled={submitting}
                  >
                    {submitting ? "Placing Order..." : "Place Order"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10 transition"
                    onClick={() => setShowCheckout(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {orderSuccess && (
            <motion.div
              className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-card rounded-lg shadow-lg p-8 w-full max-w-md mx-auto text-center"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-2xl font-bold mb-2 text-green-600">Order Placed!</h2>
                <p className="mb-4 text-lg text-foreground">Thank you for your purchase. We will contact you soon.</p>
                <Button className="bg-primary text-primary-foreground w-full font-bold py-2 rounded-full shadow hover:scale-105 hover:shadow-lg transition-all duration-200" onClick={() => setOrderSuccess(false)}>
                  Close
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 