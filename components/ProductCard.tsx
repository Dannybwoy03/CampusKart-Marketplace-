"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Heart, MessageCircle, ShoppingCart, Share2, Star } from "lucide-react"
import { useAuth } from "@/components/AuthContext";
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { addToWishlist, removeFromWishlist, isInWishlist, addToCart } from "@/lib/api";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { startConversation, getMessages, sendMessage } from "@/lib/api";
import { useApp } from "@/lib/store";

interface Product {
  id: string
  title: string
  price: number
  image: string
  category: string
  seller: {
    id: string;
    name?: string;
    email?: string;
  } | string
  sellerName?: string
  status: "active" | "sold" | "pending"
  views: number
  requests: number
  imageUrl?: string;
  description?: string;
  condition?: string;
  postedDate?: string;
  reports?: any[];
}

interface ProductCardProps {
  product: Product,
  reviewCount?: number,
  avgRating?: number,
}

export default function ProductCard({ product, reviewCount = 0, avgRating = 0 }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const { user, token } = useAuth();
  const { toast } = useToast ? useToast() : { toast: () => {} }
  const [showQuickView, setShowQuickView] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { dispatch } = useApp();
  const [addingToCart, setAddingToCart] = useState(false);


  // On mount, check if product is in wishlist
  useEffect(() => {
    if (user && product.id) {
      isInWishlist(product.id, token).then(setIsSaved).catch(() => {})
    }
  }, [user, product.id, token])

  const isOwner = user?.name === product.seller || user?.userId === product.seller
  const isSold = product.status === "sold"

  // Helper to get seller display name
  function getSellerDisplay(seller: any) {
    if (!seller) return "Unknown";
    if (typeof seller === "string") return seller;
    if (typeof seller === "object") return seller.name || seller.email || "Unknown";
    return "Unknown";
  }

  const handleSaveItem = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast({ title: "Login required", description: "Please login to save items." })
      return
    }
    try {
      if (isSaved) {
        await removeFromWishlist(product.id, token)
        setIsSaved(false)
        toast({ title: "Removed from wishlist", description: "Item removed from your saved items" })
      } else {
        await addToWishlist(product.id, token)
        setIsSaved(true)
        toast({ title: "Added to wishlist", description: "Item added to your saved items" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Could not update wishlist." })
    }
  }

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickView(true);
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ title: "Login required", description: "Please login to chat." });
      return;
    }
    setShowChat(true);
    setChatLoading(true);
    try {
      // Debug: Log product seller information
      console.log("Full product object:", product);
      console.log("Product seller:", product.seller);
      console.log("Product seller type:", typeof product.seller);
      
      // Get seller ID - products have a sellerId field
      let sellerId;
      
      // First try to get from seller object
      if (typeof product.seller === 'object' && product.seller?.id) {
        sellerId = product.seller.id;
      } 
      // Then try the sellerId field on the product (this is the correct field from Prisma schema)
      else if ((product as any).sellerId) {
        sellerId = (product as any).sellerId;
      }
      else {
        console.error("Seller info issue:", { 
          seller: product.seller, 
          sellerId: (product as any).sellerId,
          fullProduct: product 
        });
        toast({ title: "Error", description: "Seller information not available." });
        return;
      }
      
      console.log("Using seller ID:", sellerId);
      
      const convo = await startConversation(user.userId, sellerId, token);
      setConversationId(convo.id);
      const msgs = await getMessages(convo.id, token);
      setMessages(msgs);
    } catch (e) {
      toast({ title: "Error", description: "Could not load chat." });
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;
    
    try {
      console.log("Sending message:", { conversationId, userId: user.userId, message: newMessage });
      const msg = await sendMessage(conversationId, user.userId, newMessage, token);
      console.log("Message sent successfully:", msg);
      setMessages([...messages, msg]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Failed to send message" });
    }
  };

  const handleAddToCart = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!user) {
      toast({ title: "Login required", description: "Please login to add items to cart." });
      return;
    }
    if (isOwner) {
      toast({ title: "Not allowed", description: "You can't add your own product to cart." });
      return;
    }
    if (isSold) {
      toast({ title: "Unavailable", description: "This item is sold and cannot be added." });
      return;
    }
    setAddingToCart(true);
    try {
      // First add to local state for immediate UI feedback
      dispatch({ type: "ADD_TO_CART", payload: product as any });
      
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

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(window.location.origin + "/product/" + product.id);
      toast({ title: "Link copied!", description: "Product link copied to clipboard." });
    } catch {
      toast({ title: "Error", description: "Could not copy link." });
    }
  };

  return (
    <>
      <Dialog open={showQuickView} onOpenChange={setShowQuickView}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{product.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center">
            <Image src={product.imageUrl || "/placeholder.svg"} alt={product.title} width={200} height={200} className="object-contain mb-4" />
            <div className="mb-2 font-bold text-lg text-green-600">₵{product.price}</div>
            <div className="mb-2">{product.description}</div>
            <div className="mb-2 text-sm text-gray-500">Category: {product.category}</div>
            <div className="mb-2 text-sm text-gray-500">Condition: {product.condition}</div>
            <Link href={`/product/${product.id}`} className="text-blue-600 underline">View Full Details</Link>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat with Seller</DialogTitle>
          </DialogHeader>
          {chatLoading ? (
            <div>Loading chat...</div>
          ) : (
            <div className="flex flex-col h-80">
              <div className="flex-1 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-gray-400 text-center">No messages yet.</div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`mb-2 ${msg.senderId === user?.userId ? "text-right" : "text-left"}`}>
                      <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-900 max-w-xs">
                        {msg.content}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-2 py-1"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <motion.div
        whileHover={{ y: -5 }}
        className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 border border-gray-100 ${
          isHovered ? "shadow-xl" : ""
        } ${isSold ? "opacity-75" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div>
          <div className="relative h-56 bg-gray-100 flex items-center justify-center">
            <Image
              src={product.imageUrl || "/placeholder.svg"}
              alt={product.title}
              fill
              className={`object-contain transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}

            <div className="absolute top-2 left-2 z-10">
              <Badge
                variant={product.category === "Electronics" ? "default" : "secondary"}
                className="bg-white/90 text-gray-800 backdrop-blur-sm text-xs px-2 py-0.5 shadow"
              >
                {product.category}
              </Badge>
            </div>

            {isSold && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  SOLD
                </Badge>
              </div>
            )}

            {isOwner && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-blue-600">Your Product</Badge>
              </div>
            )}

            {/* Hover overlay */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center p-4"
              >
                <div className="flex space-x-2">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Link href={`/product/${product.id}`} className="inline-flex">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white rounded-full"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      className={`${
                        isSaved
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-white/90 hover:bg-white"
                      } rounded-full`}
                      onClick={handleSaveItem}
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                    </Button>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white rounded-full"
                      onClick={handleMessage}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
            {/* Share button always visible, top right */}
            <button
              onClick={handleShare}
              className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-blue-100 border border-gray-200 shadow z-10"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-blue-600" />
            </button>
          </div>

          <div className="p-4">
            <Link href={`/product/${product.id}`} className="block">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">{product.title}</h3>
            </Link>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">by {getSellerDisplay(product.seller)}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Eye className="h-3 w-3 mr-1" />
                  {product.views}
                </span>
                {product.requests > 0 && (
                  <span className="flex items-center">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    {product.requests}
                  </span>
                )}
                <span className="flex items-center"><Star className="h-3 w-3 mr-1 text-yellow-500" />{reviewCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">₵{product.price}</span>
              <Button
                size="sm"
                disabled={addingToCart}
                className={`transition-all duration-200 ${isHovered && !isSold ? "bg-blue-700" : ""} ${
                  (isSold || isOwner) ? "opacity-60 cursor-not-allowed" : ""
                }`}
                onClick={handleAddToCart}
              >
                {addingToCart ? 'Adding...' : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-1" /> Add to Cart
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
