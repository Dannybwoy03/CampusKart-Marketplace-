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
    localStorage.setItem("jwt", newToken);
    setToken(newToken);
    const decodedUser = jwtDecode<User>(newToken);
    console.log("Decoded user:", decodedUser); // Debug log
    setUser(decodedUser);
  };

  const logout = () => {
    localStorage.removeItem("jwt");
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