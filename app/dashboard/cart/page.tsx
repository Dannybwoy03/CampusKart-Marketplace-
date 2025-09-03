"use client";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { state, dispatch } = useApp();
  const cart = state.cart || [];
  const [showCheckout, setShowCheckout] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Fix hydration mismatch by only rendering on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleRemove = (id: string) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: id });
  };

  const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setOrderSuccess(true);
      setShowCheckout(false);
      setSubmitting(false);
    }, 1500);
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full flex items-center mb-4">
          <Link
            href="#"
            onClick={e => { e.preventDefault(); router.back(); }}
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
          onClick={e => { e.preventDefault(); router.back(); }}
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
                    <img src={item.imageUrl || item.image || "/placeholder.jpg"} alt={item.title} className="w-16 h-16 object-contain rounded bg-secondary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-primary text-lg">{item.title}</div>
                      <div className="text-sm text-foreground font-semibold">₵{item.price}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10 transition"
                    onClick={() => handleRemove(item.id)}
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
                    onChange={e => setName(e.target.value)}
                    required
                  />
                  <input
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <input
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-primary"
                    placeholder="Address"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
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