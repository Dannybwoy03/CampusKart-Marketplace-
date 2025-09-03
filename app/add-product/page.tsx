"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Camera, Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AddProductPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    price: "",
    description: "",
    category: "",
    condition: "New",
  });
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInput = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (name === "images" && files) {
      setImages(Array.from(files));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("You must be logged in to add a product.");
      return;
    }
    if (!form.title || !form.price || !form.description || !form.category || !form.condition) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem("jwt");
      if (!token) {
        setError("Authentication required.");
        setUploading(false);
        return;
      }

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("price", String(Number(form.price)));
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("condition", form.condition);
      images.forEach((img) => fd.append("images", img));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to add product");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-white/20">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
            <p className="text-gray-600">You must be logged in to add a product.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Sell Your Item
          </h1>
          <p className="text-gray-600">Share your products with the campus community</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Package className="h-6 w-6 text-blue-600" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Product Title</label>
                    <Input name="title" value={form.title} onChange={handleChange} required placeholder="Enter product title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Price (₵)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₵</span>
                      <Input name="price" type="number" value={form.price} onChange={handleChange} required className="pl-8" placeholder="Enter price" step="0.01" min="0" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" value={(form as any).description} onChange={handleChange} required rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none" />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <select name="category" value={form.category} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm">
                      <option value="">Select category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Books">Books</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Condition</label>
                    <select name="condition" value={form.condition} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm">
                      <option value="New">New</option>
                      <option value="Used">Used</option>
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Product Images
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400">
                    <input name="images" type="file" accept="image/*" ref={fileInput} onChange={handleChange} className="hidden" multiple />
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Drag and drop or click to browse</p>
                    <Button type="button" variant="outline" className="mt-3" onClick={() => fileInput.current?.click()}>
                      Choose Files
                    </Button>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={URL.createObjectURL(img)} alt="preview" className="h-24 w-full object-cover rounded-lg border shadow-sm" />
                          <Button type="button" size="sm" variant="secondary" onClick={() => removeImage(i)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700 font-medium">{error}</span>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-700 font-medium">Product added successfully! Redirecting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" disabled={uploading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-medium">
                  {uploading ? "Uploading..." : "Add Product"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}