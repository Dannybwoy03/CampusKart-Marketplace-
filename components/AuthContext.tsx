"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

interface User {
  userId: string;
  email: string;
  isAdmin: boolean;
  role?: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("jwt");
    if (stored) {
      setToken(stored);
      try {
        setUser(jwtDecode<User>(stored));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const login = (newToken: string) => {
    console.log("Login called with new token"); // Debug log
    // Clear any previous user's client-scoped data first
    try {
      if (typeof window !== 'undefined' && (window as any).clearCart) {
        (window as any).clearCart();
      } else {
        localStorage.removeItem('cart');
      }
      // Reset notifications panel state if the app exposed a helper
      if (typeof window !== 'undefined' && (window as any).refetchNotifications) {
        (window as any).refetchNotifications();
      }
    } catch {}

    localStorage.setItem("jwt", newToken);
    setToken(newToken);
    const decodedUser = jwtDecode<User>(newToken);
    console.log("Decoded user:", decodedUser); // Debug log
    setUser(decodedUser);
  };

  const logout = () => {
    // Remove auth and user-scoped client data
    localStorage.removeItem("jwt");
    try {
      if (typeof window !== 'undefined' && (window as any).clearCart) {
        (window as any).clearCart();
      } else {
        localStorage.removeItem('cart');
      }
      // Clear notifications immediately in UI
      if (typeof window !== 'undefined' && (window as any).refetchNotifications) {
        (window as any).refetchNotifications();
      }
    } catch {}
    setToken(null);
    setUser(null);
  };

  const refreshUser = () => {
    const stored = localStorage.getItem("jwt");
    if (stored) {
      try {
        setUser(jwtDecode<User>(stored));
      } catch {
        setUser(null);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}; 