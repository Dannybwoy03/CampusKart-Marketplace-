import express from "express";
import prisma from "../prisma.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// Get user's cart
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
            seller: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(cartItems);
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ error: "Failed to get cart" });
  }
});

// Add item to cart
router.post("/add", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if user is trying to add their own product
    if (product.sellerId === userId) {
      return res.status(400).json({ error: "Cannot add your own product to cart" });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingItem) {
      // Update quantity
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          product: {
            include: {
              images: true,
              seller: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
      res.json(updatedItem);
    } else {
      // Create new cart item
      const newItem = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity
        },
        include: {
          product: {
            include: {
              images: true,
              seller: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
      res.status(201).json(newItem);
    }
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

// Update cart item quantity
router.patch("/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Valid quantity is required" });
    }

    // Check if cart item belongs to user
    const cartItem = await prisma.cartItem.findFirst({
      where: { id, userId }
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: {
            images: true,
            seller: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

// Remove item from cart
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if cart item belongs to user
    const cartItem = await prisma.cartItem.findFirst({
      where: { id, userId }
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    await prisma.cartItem.delete({
      where: { id }
    });

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
});

// Clear user's cart
router.delete("/", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    res.json({ message: "Cart cleared" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

export default router; 