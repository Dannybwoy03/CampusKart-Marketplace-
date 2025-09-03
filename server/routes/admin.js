import express from "express";
import { authenticateJWT } from "../middleware/auth.js";
import prisma from "../prisma.js";

const router = express.Router();

// Get all users
router.get("/users", authenticateJWT, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        sellerProfile: true,
        products: true,
        orders: true,
      },
      orderBy: { id: "desc" },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get all products
router.get("/products", authenticateJWT, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        reviews: true,
      },
      orderBy: { id: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get moderation reports
router.get("/moderation/reports", authenticateJWT, async (req, res) => {
  try {
    const reports = await prisma.moderationReport.findMany({
      include: {
        reporter: true,
        reviewedBy: true,
      },
      orderBy: { id: "desc" },
    });
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// User management actions
router.post("/users/:id/suspend", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { suspended: true },
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({ error: "Failed to suspend user" });
  }
});

router.post("/users/:id/activate", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { suspended: false },
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error activating user:", error);
    res.status(500).json({ error: "Failed to activate user" });
  }
});

router.post("/users/:id/promote", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "promote" or "demote"
    
    let newRole = "SELLER";
    if (action === "demote") {
      newRole = "BUYER";
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: { role: newRole },
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error promoting/demoting user:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Product management actions
router.post("/products/:id/remove", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.update({
      where: { id },
      data: { status: "removed" },
    });
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error removing product:", error);
    res.status(500).json({ error: "Failed to remove product" });
  }
});

router.post("/products/:id/restore", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.update({
      where: { id },
      data: { status: "active" },
    });
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error restoring product:", error);
    res.status(500).json({ error: "Failed to restore product" });
  }
});

router.post("/products/:id/feature", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "feature" or "unfeature"
    
    let featured = true;
    if (action === "unfeature") {
      featured = false;
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: { featured },
    });
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error featuring/unfeaturing product:", error);
    res.status(500).json({ error: "Failed to update product feature status" });
  }
});

// Report management actions
router.post("/moderation/reports/:id/action", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const report = await prisma.moderationReport.update({
      where: { id },
      data: { status },
    });
    
    res.json({ success: true, report });
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({ error: "Failed to update report" });
  }
});

// Analytics endpoints
router.get("/analytics", authenticateJWT, async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      activeUsers,
      suspendedUsers,
      activeProducts,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: "paid" },
        _sum: { total: true },
      }),
      prisma.user.count({ where: { suspended: false } }),
      prisma.user.count({ where: { suspended: true } }),
      prisma.product.count({ where: { status: "active" } }),
      prisma.moderationReport.count({ where: { status: "pending" } }),
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      activeUsers,
      suspendedUsers,
      activeProducts,
      pendingReports,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;