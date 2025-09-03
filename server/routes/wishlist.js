import express from "express";
import { authenticateJWT } from "../middleware/auth.js";
import { prisma } from "../index.js";

const router = express.Router();

// Get user's wishlist
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            seller: {
              include: {
                sellerProfile: true
              }
            },
            images: true
          }
        }
      }
    });
    res.json(wishlist);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

// Add product to wishlist
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findFirst({
      where: {
        userId: req.user.id,
        productId: productId
      }
    });

    if (existing) {
      return res.status(400).json({ error: "Product already in wishlist" });
    }

    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId: req.user.id,
        productId: productId
      },
      include: {
        product: true
      }
    });

    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ error: "Failed to add to wishlist" });
  }
});

// Remove product from wishlist
router.delete("/:productId", authenticateJWT, async (req, res) => {
  try {
    const { productId } = req.params;
    
    await prisma.wishlistItem.deleteMany({
      where: {
        userId: req.user.id,
        productId: productId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ error: "Failed to remove from wishlist" });
  }
});

export default router;