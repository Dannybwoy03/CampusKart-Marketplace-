"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Store, Phone, Mail, MapPin, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { jwtDecode } from "jwt-decode";

export default function BecomeSellerPage() {
  const router = useRouter();
  const { user, login, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    storeName: "",
    contact: "",
    address: "",
    paymentMethod: "",
    paymentDetails: {
      mtnNumber: "",
      telecelNumber: "",
      bankName: "",
      accountNumber: "",
      accountName: ""
    }
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('paymentDetails.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        paymentDetails: {
          ...prev.paymentDetails,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBecomeSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Validation
    if (!formData.storeName || !formData.contact || !formData.address || !formData.paymentMethod) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Validate payment details based on selected method
    if (formData.paymentMethod === "mtn" && !formData.paymentDetails.mtnNumber) {
      setError("Please enter your MTN Mobile Money number");
      setLoading(false);
      return;
    }
    if (formData.paymentMethod === "telecel" && !formData.paymentDetails.telecelNumber) {
      setError("Please enter your Telecel Cash number");
      setLoading(false);
      return;
    }
    if (formData.paymentMethod === "bank" && (!formData.paymentDetails.bankName || !formData.paymentDetails.accountNumber || !formData.paymentDetails.accountName)) {
      setError("Please fill in all bank details");
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/become-seller`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Seller registration response:", data); // Debug log
        // Update the JWT token with the new role
        if (data.token) {
          console.log("Updating token with new role"); // Debug log
          login(data.token);
          console.log("Token updated, user state should be refreshed"); // Debug log
          // Verify the token was stored
          const storedToken = localStorage.getItem("jwt");
          console.log("Stored token:", storedToken); // Debug log
          // Decode the token to see what's in it
          try {
            const decoded = jwtDecode(storedToken);
            console.log("Decoded token:", decoded); // Debug log
          } catch (e) {
            console.error("Error decoding token:", e); // Debug log
          }
          // Force refresh user state
          setTimeout(() => {
            refreshUser();
            console.log("User state refreshed"); // Debug log
          }, 100);
        }
        setSuccess(true);
        // Redirect to dashboard after successful registration with a delay to ensure state update
        setTimeout(() => {
          // Force a page refresh to ensure navigation updates
          window.location.href = "/dashboard";
        }, 2500);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to become seller");
      }
    } catch (err: any) {
      setError(err.message || "Failed to become seller");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-100 p-6 rounded-2xl shadow-lg">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Success!</h2>
            <p className="text-green-700">You are now a seller. Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Store className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Become a Seller
          </h1>
          <p className="text-gray-600">Join our marketplace and start selling to students</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
          <form onSubmit={handleBecomeSeller} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 animate-shake">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Registration Failed</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-medium">Success!</p>
                  <p className="text-green-600 text-sm">
                    Seller registration successful! Redirecting to dashboard...
                  </p>
                </div>
              </div>
            )}

            {/* Store Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600" />
                Store Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleInputChange}
                  placeholder="Enter your store name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="e.g., +233 24 123 4567"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your business address"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Payment Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select payment method</option>
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="telecel">Telecel Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              {/* MTN Mobile Money */}
              {formData.paymentMethod === "mtn" && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-3">MTN Mobile Money Details</h4>
                  <input
                    type="tel"
                    name="paymentDetails.mtnNumber"
                    value={formData.paymentDetails.mtnNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your MTN Mobile Money number"
                    className="w-full border border-orange-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* Telecel Cash */}
              {formData.paymentMethod === "telecel" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3">Telecel Cash Details</h4>
                  <input
                    type="tel"
                    name="paymentDetails.telecelNumber"
                    value={formData.paymentDetails.telecelNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your Telecel Cash number"
                    className="w-full border border-blue-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* Bank Transfer */}
              {formData.paymentMethod === "bank" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-green-800">Bank Account Details</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="paymentDetails.bankName"
                      value={formData.paymentDetails.bankName}
                      onChange={handleInputChange}
                      placeholder="e.g., GCB Bank, Ecobank, etc."
                      className="w-full border border-green-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="paymentDetails.accountNumber"
                      value={formData.paymentDetails.accountNumber}
                      onChange={handleInputChange}
                      placeholder="Enter your account number"
                      className="w-full border border-green-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="paymentDetails.accountName"
                      value={formData.paymentDetails.accountName}
                      onChange={handleInputChange}
                      placeholder="Enter account holder name"
                      className="w-full border border-green-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Registering...
                </>
              ) : (
                <>
                  Register as Seller
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Benefits Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Why become a seller?</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Reach thousands of students on campus</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Easy product listing and management</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure payment processing</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>24/7 customer support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Need help getting started?</p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>support@campuskart.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>+1 (555) 123-4567</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}