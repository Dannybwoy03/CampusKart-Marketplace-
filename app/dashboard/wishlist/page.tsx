"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/lib/store";

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    images: Array<{ url: string }>;
    seller: {
      id: string;
      name: string;
      email: string;
      sellerProfile?: {
        storeName: string;
      };
    };
  };
  createdAt: string;
}

export default function WishlistPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { dispatch } = useApp();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/wishlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setWishlistItems(data);
      } else {
        throw new Error("Failed to fetch wishlist");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch wishlist" });
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/wishlist/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setWishlistItems(prev => prev.filter(item => item.productId !== productId));
        toast({ title: "Success", description: "Removed from wishlist" });
      } else {
        throw new Error("Failed to remove from wishlist");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove from wishlist" });
    }
  };

  const addToCart = async (productId: string) => {
    try {
      const res = await fetch("http://localhost:5000/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      if (res.ok) {
        // Find the product to add to local cart state
        const product = wishlistItems.find(item => item.productId === productId)?.product;
        if (product) {
          // Update local cart state
          dispatch({ type: "ADD_TO_CART", payload: product as any });
        }
        toast({ title: "Success", description: "Added to cart" });
      } else {
        throw new Error("Failed to add to cart");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add to cart" });
    }
  };

  const startConversation = async (sellerId: string) => {
    try {
      const res = await fetch("http://localhost:5000/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user1Id: user?.userId,
          user2Id: sellerId,
        }),
      });

      if (res.ok) {
        const conversation = await res.json();
        // Redirect to messages with conversation
        window.location.href = `/dashboard/messages?conversation=${conversation.id}`;
      } else {
        throw new Error("Failed to start conversation");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to start conversation" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-gray-600 mt-4">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
        <p className="text-gray-600">Items you've saved for later</p>
      </div>

      {wishlistItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-600 mb-4">Start browsing to add items to your wishlist</p>
            <Link href="/">
              <Button>Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <div className="aspect-square bg-gray-100">
                  {item.product.images?.[0]?.url ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFromWishlist(item.productId)}
                  className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-red-50 transition-colors"
                  title="Remove from wishlist"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
              
              <CardContent className="p-4">
                <Link href={`/product/${item.productId}`}>
                  <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                    {item.product.title}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {item.product.description}
                </p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  ₵{item.product.price}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  by {item.product.seller?.sellerProfile?.storeName || item.product.seller?.name}
                </p>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => addToCart(item.productId)}
                    className="flex-1"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add to Cart
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startConversation(item.product.seller.id)}
                    className="px-3"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
