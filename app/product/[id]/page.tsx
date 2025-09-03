"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { addToCart } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, MessageCircle, Heart, Share2 } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { dispatch } = useApp();
  const { toast } = useToast ? useToast() : { toast: () => {} };
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : (params as any)?.id;
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/products/${id}`);
        if (!res.ok) throw new Error("Failed to load product");
        const data = await res.json();
        setProduct(data);
      } catch (e: any) {
        setError(e.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const isOwner = user && product && (user.userId === product.sellerId || user.email === product.seller?.email);

  const handleRequest = async () => {
    if (!user || !product) {
      toast({ title: "Login required", description: "Please login to request this product." });
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, message: "I'm interested in this product" })
      });
      const data = await res.json();
      if (res.ok) {
        setShowSuccess(true);
        toast({ title: "Request sent", description: "Your request has been sent to the seller." });
        setTimeout(() => setShowSuccess(false), 5000);
        
        // Refresh notifications after sending request
        if (typeof window !== 'undefined' && (window as any).refetchNotifications) {
          (window as any).refetchNotifications();
        }
      } else {
        throw new Error(data.error || "Failed to send request");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send request" });
    } finally {
      setRequesting(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to add items to cart." });
      return;
    }
    if (isOwner) {
      toast({ title: "Not allowed", description: "You can't add your own product to cart." });
      return;
    }
    if (product.status === "sold") {
      toast({ title: "Unavailable", description: "This item is sold and cannot be added." });
      return;
    }
    setAddingToCart(true);
    try {
      // First add to local state for immediate UI feedback
      dispatch({ type: "ADD_TO_CART", payload: product });
      
      // Then sync with server
      await addToCart(product.id, 1, token);
      toast({ title: "Added to cart", description: "Item added to your cart." });
    } catch (err: any) {
      // If server call fails, remove from local state
      dispatch({ type: "REMOVE_FROM_CART", payload: product.id });
      const errorMessage = err?.message || "Could not add to cart.";
      toast({ title: "Error", description: errorMessage });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!user || !product) return;
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/products/${product.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        router.push("/dashboard");
      } else {
        alert("Failed to delete product");
      }
    } catch (error) {
      alert("Error deleting product");
    } finally {
      setDeleting(false);
    }
  };

  const handleEditProduct = () => {
    router.push(`/product/${product.id}/edit`);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!product) return <div className="p-6">Not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <img src={product.images?.[0]?.url || "/placeholder-product.jpg"} alt={product.title} className="w-full rounded-lg" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
          <div className="text-2xl text-blue-600 font-semibold mb-4">₵{product.price}</div>
          <p className="text-gray-700 mb-4">{product.description}</p>

          {!isOwner && user && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button 
                  className="bg-green-600 hover:bg-green-700 flex-1" 
                  onClick={handleAddToCart} 
                  disabled={addingToCart || product.status === "sold"}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {addingToCart ? "Adding..." : "Add to Cart"}
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 flex-1" 
                  onClick={handleRequest} 
                  disabled={requesting}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {requesting ? "Requesting..." : "Request to Buy"}
                </Button>
              </div>
              
              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
                  <strong>Request sent successfully!</strong> The seller will be notified and can respond to your request.
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                <p><strong>Add to Cart:</strong> Add this item to your cart for checkout</p>
                <p><strong>Request to Buy:</strong> Send a direct request to the seller</p>
              </div>
            </div>
          )}

          {!user && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">Please login to purchase or request this item</p>
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => router.push("/login")} className="bg-blue-600 hover:bg-blue-700">
                    Login
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/signup")}>
                    Sign Up
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEditProduct}>Edit Product</Button>
              <Button variant="outline" onClick={handleDeleteProduct} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Product"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}