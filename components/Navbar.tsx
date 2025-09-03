"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingCart, Bell, AlertCircle, Menu, X, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useApp } from "@/lib/store";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const navLinks = [
  { href: "/", label: "Browse", roles: ["buyer", "seller", "admin", "superadmin"] },
  { href: "/become-seller", label: "Become a Seller", roles: ["buyer"], requiresAuth: true },
  { href: "/add-product", label: "+ Sell Item", roles: ["seller", "admin", "superadmin"] },
  { href: "/dashboard", label: "Dashboard", roles: ["seller", "admin", "superadmin"], requiresAuth: true },
  { href: "/admin", label: "Admin Panel", roles: ["admin", "superadmin"], requiresAuth: true },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { state } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Add a function to refetch notifications from backend
  const refetchNotifications = async () => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        setNotifications([]);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else if (res.status === 401) {
        // Token is invalid, clear notifications
        setNotifications([]);
      } else {
        console.warn("Failed to fetch notifications:", res.status);
      }
    } catch (error) {
      console.warn("Error fetching notifications:", error);
    }
  };

  // Make refetchNotifications available globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refetchNotifications = refetchNotifications;
    }
  }, []);

  useEffect(() => {
    // Set isClient to true after component mounts
    setIsClient(true);
    
    // Only fetch notifications if user is logged in
    if (user) {
      refetchNotifications();
    }
  }, [user]);

  const handleViewNotification = async (notif: any) => {
    if (!notif.id || notif.isRead) return;
    try {
      const token = localStorage.getItem("jwt");
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/notifications/${notif.id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        setNotifications((n: any) => n.map((x: any) => x.id === notif.id ? { ...x, isRead: true } : x));
      }
    } catch (error) {
      console.warn("Error marking notification as read:", error);
    }
  };
      
  const handleBecomeSellerClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  // Determine user's primary role for navigation
  let role: "buyer" | "seller" | "admin" | "superadmin" = "buyer";
  if (user?.role === "SUPERADMIN") role = "superadmin";
  else if (user?.isAdmin || user?.role === "ADMIN") role = "admin";
  else if (user?.role === "SELLER") role = "seller";
  else role = "buyer";

  console.log("Navbar - Current user:", user); // Debug log
  console.log("Navbar - Determined role:", role); // Debug log

  // Special case: If user is admin but not yet a seller, show "Become a Seller" option
  const shouldShowBecomeSeller = user && (user.role === "BUYER" || (user.isAdmin && user.role !== "SELLER"));

  // Filter navigation links based on role
  const filteredNavLinks = navLinks.filter(link => {
    if (link.requiresAuth && !user) return false;
    
    // Special handling for "Become a Seller" - show to buyers and admins who aren't sellers yet
    if (link.href === "/become-seller") {
      return shouldShowBecomeSeller;
    }
    
    return link.roles.includes(role);
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  // Close menus on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUserMenu(false);
        setShowNotifications(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-white font-bold text-xl">CampusKart</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {filteredNavLinks.map(link => {
            if (link.href === "/become-seller" && link.requiresAuth && !user) {
              return (
                <button
                  key={link.href}
                  onClick={handleBecomeSellerClick}
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-blue-900/30"
                >
                  {link.label}
                </button>
              );
            }
            return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-blue-900/30"
                  >
                    {link.label}
                  </Link>
            );
          })}
            </div>

            {/* Right side - User actions */}
            <div className="flex items-center space-x-4">
              {/* Cart */}
              <Link href="/dashboard/cart" className="text-gray-300 hover:text-white p-2 relative">
                <ShoppingCart className="h-6 w-6" />
                {isClient && state.cart && state.cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {state.cart.length || 0}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              {user && (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-gray-300 hover:text-white p-2 relative"
                >
                  <Bell className="h-6 w-6" />
                  {isClient && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* User menu */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    aria-expanded={showUserMenu}
                    aria-haspopup="menu"
                    className="flex items-center space-x-2 text-gray-300 hover:text-white p-2 rounded-md hover:bg-gray-800 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={user.avatarUrl ? `http://localhost:5000${user.avatarUrl}` : undefined} 
                        alt={user.name || user.email} 
                      />
                      <AvatarFallback className="text-sm">
                        {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block">{user.name || user.email}</span>
                  </button>
                  
                  {/* Dropdown menu */}
                  {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                      <Link onClick={() => setShowUserMenu(false)} href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                      <Link onClick={() => setShowUserMenu(false)} href="/dashboard" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                      <Settings className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                    {/* Admin Panel link - only visible to admins */}
                    {(user?.isAdmin || user?.role === "ADMIN" || user?.role === "SUPERADMIN") && (
                      <Link onClick={() => setShowUserMenu(false)} href="/admin" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-blue-900/30"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-gray-300 hover:text-white p-2"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-800">
                {filteredNavLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-900/30"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNotifications(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No notifications</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n: any, i: number) => (
                  <div 
                    key={i} 
                    className={`px-3 py-3 border-b text-sm cursor-pointer transition-colors ${n.isRead ? 'bg-gray-50 text-gray-600' : 'bg-blue-50 border-l-4 border-l-blue-500'}`}
                    onClick={() => handleViewNotification(n)}
                  >
                    <div className="font-semibold text-gray-900 mb-1">{n.title || n.type}</div>
                    <div className="text-gray-700 mb-2">{n.message}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                    {n.data && typeof n.data === 'string' && (
                      <div className="mt-2 text-xs text-gray-500">
                        {JSON.parse(n.data).productId && <span>Product ID: {JSON.parse(n.data).productId}</span>}
                        {JSON.parse(n.data).orderId && <span>Order ID: {JSON.parse(n.data).orderId}</span>}
                        {JSON.parse(n.data).status && <span>Status: {JSON.parse(n.data).status}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 animate-slide-up">
            <div className="text-center mb-6">
              <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please sign in or create an account to become a seller</p>
            </div>
            
            <div className="flex gap-4">
              <Link
                href="/login"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-center"
                onClick={() => setShowAuthModal(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 text-center"
                onClick={() => setShowAuthModal(false)}
              >
                Sign Up
              </Link>
            </div>
            
            <button
              onClick={() => setShowAuthModal(false)}
              className="mt-4 w-full text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>  );
}
