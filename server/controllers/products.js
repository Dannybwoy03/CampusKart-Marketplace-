import prisma from "../prisma.js";
import cloudinary from "../utils/cloudinary.js";

// List all products
export async function listProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: { not: 'removed' },
      },
      include: {
        seller: {
          select: { id: true, name: true, email: true }
        },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    console.error("Error listing products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
}

// Get single product
export async function getProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, name: true, email: true }
        },
        images: true
      }
    });
    
    if (!product || product.status === 'removed') {
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
}

// Create product
export async function createProduct(req, res) {
  try {
    const { title, description, price, category, condition } = req.body;
    const sellerId = req.user.userId || req.user.id;
    
    if (!title || !description || !price || !category || !condition) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        category,
        condition,
        sellerId
      },
      include: {
        seller: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // Handle images if provided
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      const uploaded = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "campuskart/products",
          });
          uploaded.push({ url: result.secure_url });
        } catch (err) {
          // Fallback to local upload path if cloud upload fails
          uploaded.push({ url: `/uploads/${file.filename}` });
        }
      }
      // Persist images
      for (const img of uploaded) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: img.url,
          },
        });
      }
    }

    // Return product with images
    const created = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        images: true,
      },
    });
    
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
}

// Update product
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { title, description, price, category, condition } = req.body;
    const sellerId = req.user.userId || req.user.id;
    
    // Verify ownership
    const existingProduct = await prisma.product.findFirst({
      where: { id, sellerId }
    });
    
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found or access denied" });
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        category,
        condition
      },
      include: {
        seller: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
}

// Delete product
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const sellerId = req.user.userId || req.user.id;
    
    // Verify ownership
    const existingProduct = await prisma.product.findFirst({
      where: { id, sellerId }
    });
    
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found or access denied" });
    }
    
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
}

// Create review
export async function createReview(req, res) {
  try {
    const { id: productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId || req.user.id;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }
    
    // Check if user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: { productId, userId }
    });
    
    if (existingReview) {
      return res.status(400).json({ error: "You have already reviewed this product" });
    }
    
    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        comment
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
}

// Search products
export async function searchProducts(req, res) {
  try {
    const { q, category, minPrice, maxPrice, condition } = req.query;
    
    const where = { status: { not: 'removed' } };
    
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    
    if (condition) {
      where.condition = condition;
    }
    
    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: { id: true, name: true, email: true }
        },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
}

// Get my products
export async function getMyProducts(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    
    const products = await prisma.product.findMany({
      where: { sellerId: userId },
      include: {
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const productsWithStats = products.map(p => ({
      ...p,
      reviewCount: 0,
      avgRating: 0
    }));
    
    res.json(productsWithStats);
  } catch (error) {
    console.error("Error fetching my products:", error);
    res.status(500).json({ error: "Failed to fetch your products" });
  }
}

// Report product (not implemented in current schema)
export async function reportProduct(req, res) {
  res.status(501).json({ error: "Product reporting not implemented yet" });
}

// Bulk upload products (placeholder)
export async function bulkUploadProducts(req, res) {
  res.status(501).json({ error: "Bulk upload not implemented yet" });
}