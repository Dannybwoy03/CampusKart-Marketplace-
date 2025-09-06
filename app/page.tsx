"use client";

import { useState, useEffect } from "react";
import HeroSection from "@/components/hero-section";
import ProductCard from "@/components/ProductCard";
import { useApp } from "@/lib/store";

export default function HomePage() {
  const { state } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    // Show login success banner if redirected from login
    try {
      const flag = typeof window !== 'undefined' ? sessionStorage.getItem('loginSuccess') : null;
      if (flag === '1') {
        setLoginSuccess(true);
        sessionStorage.removeItem('loginSuccess');
        setTimeout(() => setLoginSuccess(false), 3000);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          const mappedProducts = data.map((product: any) => ({
            ...product,
            image: product.images?.[0]?.url || "/placeholder.svg",
            imageUrl: product.images?.[0]?.url || "/placeholder.svg",
            seller: product.seller, // Keep the full seller object with ID
            sellerName: product.seller?.name || product.seller?.email || "Unknown", // Add display name separately
            name: product.title,
            status: product.status || "active"
          }));
          setProducts(mappedProducts);
        } else {
          setError('Failed to fetch products');
        }
      } catch (err) {
        setError('Error fetching products - check if backend is running on port 5000');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product: any) => {
    const hasSearch = !!state.searchTerm && state.searchTerm.trim().length > 0;
    const matchesSearch = !hasSearch ||
      product.title?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(state.searchTerm.toLowerCase());
    const category = (state.selectedCategory || '').toLowerCase();
    const matchesCategory = !category || category === 'all' ||
      product.category?.toLowerCase() === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-900">
      {loginSuccess && (
        <div className="bg-green-600 text-white text-center py-2">Login successful</div>
      )}
      <HeroSection />
      <div className="container mx-auto px-4 py-12">
        {(state.searchTerm || (state.selectedCategory && state.selectedCategory !== 'all')) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {state.searchTerm && `Search results for "${state.searchTerm}"`}
              {state.selectedCategory && state.selectedCategory !== 'all' && ` ${state.searchTerm ? 'in ' : ''}${state.selectedCategory}`}
            </h2>
            <p className="text-gray-400">
              Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 mt-4">Loading products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2 text-red-400">Error</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Make sure your backend server is running on port 5000</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-white">
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-gray-400 mb-4">Try adding a product or check your backend/API connection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}