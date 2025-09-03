"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../components/AuthContext";
import { get, post } from "../../../../lib/api";
import Cropper from "react-easy-crop";
import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Camera, 
  Edit3, 
  Plus, 
  X, 
  Package, 
  FileText, 
  Tag, 
  Settings,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Palette,
  RotateCw,
  ZoomIn,
  Filter,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const categories = ["Electronics", "Books", "Furniture", "Supplies", "Clothing"];
const conditions = ["New", "Like New", "Used", "For Parts"];

export default function EditProductPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [form, setForm] = useState({
    title: "",
    price: "",
    description: "",
    category: categories[0],
    condition: conditions[0],
    images: [] as File[],
  });
  const [variants, setVariants] = useState([
    { size: "", color: "", condition: "", stock: "", priceDiff: "" }
  ]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [editingImgIdx, setEditingImgIdx] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [filter, setFilter] = useState<string>("none");

  // Fetch product data on mount
  useEffect(() => {
    if (productId && token) {
      fetchProduct();
    }
  }, [productId, token]);

  const fetchProduct = async () => {
    try {
      console.log("Fetching product with ID:", productId);
      console.log("Using token:", token ? "Token exists" : "No token");
      console.log("API URL:", process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api");
      
      const product = await get(`/products/${productId}`, token);
      console.log("Product fetched successfully:", product);
      
      if (product) {
        // Check if the product belongs to the current user
        if (product.sellerId !== user?.id) {
          setError("You can only edit your own products");
          setLoading(false);
          return;
        }
        
        setForm({
          title: product.title || "",
          price: product.price?.toString() || "",
          description: product.description || "",
          category: product.category || categories[0],
          condition: product.condition || conditions[0],
          images: [],
        });
        setExistingImages(product.images?.map((img: any) => img.url) || []);
        setVariants(product.variants?.length > 0 ? product.variants.map((v: any) => ({
          size: v.size || "",
          color: v.color || "",
          condition: v.condition || "",
          stock: v.stock?.toString() || "",
          priceDiff: v.priceDiff?.toString() || "",
        })) : [{ size: "", color: "", condition: "", stock: "", priceDiff: "" }]);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError("Cannot connect to server. Please check if the backend is running.");
      } else {
        setError("Failed to load product. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels), []);
  
  const getCroppedImg = async (imageSrc: string, crop: any, rotation: number, filter: string) => {
    const image = new window.Image();
    image.src = imageSrc;
    await new Promise(res => { image.onload = res; });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const rad = rotation * Math.PI / 180;
    const w = crop.width, h = crop.height;
    canvas.width = w;
    canvas.height = h;
    ctx.filter = filter;
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(rad);
    ctx.drawImage(image, -w/2 - crop.x, -h/2 - crop.y);
    ctx.restore();
    return new Promise<File>((resolve) => {
      canvas.toBlob(blob => {
        resolve(new File([blob!], "edited.jpg", { type: "image/jpeg" }));
      }, "image/jpeg");
    });
  };
  
  const handleEditImage = async () => {
    if (editingImgIdx === null) return;
    const img = form.images[editingImgIdx];
    const url = URL.createObjectURL(img);
    const edited = await getCroppedImg(url, croppedAreaPixels, rotation, filter);
    setForm(f => ({ ...f, images: f.images.map((im, i) => i === editingImgIdx ? edited : im) }));
    setEditingImgIdx(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFilter("none");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to edit products.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setForm(prev => ({ ...prev, images: [...prev.images, ...fileArray] }));
    }
  };

  const handleVariantChange = (idx: number, field: string, value: any) => {
    setVariants(vs => vs.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const addVariant = () => setVariants(vs => [...vs, { size: "", color: "", condition: "", stock: "", priceDiff: "" }]);
  const removeVariant = (idx: number) => setVariants(vs => vs.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setUploading(true);
    try {
      if (!form.title || !form.price || !form.description || !form.category || !form.condition) {
        setError("All fields are required");
        setUploading(false);
        return;
      }
      
      const data = new FormData();
      data.append("title", form.title);
      data.append("price", form.price);
      data.append("description", form.description);
      data.append("category", form.category);
      data.append("condition", form.condition);
      
      // Only include non-empty variants
      const filteredVariants = variants.filter(v => v.size || v.color || v.condition).map(v => ({
        ...v,
        stock: v.stock ? Number(v.stock) : 0,
        priceDiff: v.priceDiff ? Number(v.priceDiff) : 0
      }));
      data.append("variants", JSON.stringify(filteredVariants));
      
      // Add new images
      form.images.forEach(img => data.append("images", img));
      
      // Debug: Log what we're sending
      console.log("Sending product update:", {
        productId,
        title: form.title,
        price: form.price,
        category: form.category,
        condition: form.condition,
        variants: filteredVariants,
        imageCount: form.images.length
      });
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/products/${productId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
      
      if (!res.ok) {
        let err;
        try { 
          err = await res.json(); 
          console.error("Server error response:", err);
        } catch { 
          err = { error: "Failed to update product" }; 
          console.error("Failed to parse error response");
        }
        throw new Error(err.error || "Failed to update product");
      }
      
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e: any) {
      setError(e.message || "Failed to update product");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Edit Product
          </h1>
          <p className="text-gray-600">Update your product information</p>
        </motion.div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Edit3 className="h-6 w-6 text-blue-600" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Product Title
                    </label>
                    <Input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      required
                      className="w-full"
                      placeholder="Enter product title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Price (₵)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₵</span>
                      <Input
                        name="price"
                        type="number"
                        value={form.price}
                        onChange={handleChange}
                        required
                        className="w-full pl-8"
                        placeholder="Enter price in Ghanaian Cedis"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none"
                    rows={4}
                    placeholder="Describe your product in detail..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    >
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Condition
                    </label>
                    <select
                      name="condition"
                      value={form.condition}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    >
                      {conditions.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Product Images
                  </label>
                  
                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingImages.map((img, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={img}
                            alt="existing"
                            className="h-24 w-full object-cover rounded-lg border shadow-sm"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs">Existing Image</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      name="images"
                      type="file"
                      accept="image/*"
                      ref={fileInput}
                      onChange={handleFileChange}
                      className="hidden"
                      multiple
                    />
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-700">Add More Images</p>
                        <p className="text-sm text-gray-500">Drag and drop or click to browse</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        variant="outline"
                        className="mx-auto"
                      >
                        Choose Files
                      </Button>
                    </div>
                  </div>

                  {/* New Image Previews */}
                  {form.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {form.images.map((img, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative group"
                        >
                          <img
                            src={URL.createObjectURL(img)}
                            alt="preview"
                            className="h-24 w-full object-cover rounded-lg border shadow-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingImgIdx(i)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variants */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Product Variants</label>
                      <p className="text-xs text-gray-500 mt-1">
                        Add different versions (sizes, colors, conditions) with their own stock and pricing
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariant}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Variant
                    </Button>
                  </div>
                  
                  {variants.map((v, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg"
                    >
                      <Input
                        placeholder="Size (M, L, XL)"
                        value={v.size}
                        onChange={e => handleVariantChange(idx, "size", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Color (Red, Blue)"
                        value={v.color}
                        onChange={e => handleVariantChange(idx, "color", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Condition (New, Used)"
                        value={v.condition}
                        onChange={e => handleVariantChange(idx, "condition", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Stock (Quantity)"
                        type="number"
                        value={v.stock || ""}
                        min={0}
                        onChange={e => handleVariantChange(idx, "stock", e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₵</span>
                          <Input
                            placeholder="Price Diff (Extra cost)"
                            type="number"
                            value={v.priceDiff || ""}
                            onChange={e => handleVariantChange(idx, "priceDiff", e.target.value)}
                            className="text-sm pl-6"
                            step="0.01"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(idx)}
                          className="text-red-500 hover:text-red-700 p-1 h-8 w-8"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Status Messages */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700 font-medium">{error}</span>
                    </motion.div>
                  )}
                  
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700 font-medium">Product updated successfully! Redirecting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-5 w-5" />
                      Update Product
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Image Editor Modal */}
        <AnimatePresence>
          {editingImgIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Edit Image
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingImgIdx(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <Cropper
                    image={URL.createObjectURL(form.images[editingImgIdx])}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    className="w-full h-full"
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Zoom</label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={e => setZoom(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Rotation</label>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={rotation}
                      onChange={e => setRotation(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Filter</label>
                    <select
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="none">None</option>
                      <option value="grayscale(1)">Grayscale</option>
                      <option value="sepia(1)">Sepia</option>
                      <option value="brightness(1.2)">Bright</option>
                      <option value="contrast(1.2)">Contrast</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button onClick={handleEditImage} className="flex-1">
                    Apply Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingImgIdx(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 