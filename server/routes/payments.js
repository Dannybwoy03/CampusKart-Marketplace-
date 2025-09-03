import express from "express";
import { prisma } from "../index.js";
import { authenticateJWT } from "../middleware/auth.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

// Initialize Paystack payment
router.post("/initialize", authenticateJWT, async (req, res) => {
  try {
    const { productId, quantity = 1, shippingAddress, notes } = req.body;
    const buyerId = req.user.userId;

    if (!productId || !shippingAddress) {
      return res.status(400).json({ error: "Product ID and shipping address are required" });
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        images: true
      }
    });

    if (!product || product.status !== "active") {
      return res.status(400).json({ error: "Product not available" });
    }

    // Check if user is trying to buy their own product
    if (product.sellerId === buyerId) {
      return res.status(400).json({ error: "Cannot buy your own product" });
    }

    // Calculate total amount
    const totalAmount = product.price * quantity;

    // Create order
    const order = await prisma.order.create({
      data: {
        productId,
        buyerId,
        sellerId: product.seller.id,
        amount: totalAmount,
        paymentReference: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shippingAddress: JSON.stringify(shippingAddress),
        notes,
        status: "pending",
        paymentStatus: "pending"
      }
    });

    // Initialize Paystack payment
    const paystackData = {
      email: req.user.email,
      amount: Math.round(totalAmount * 100), // Convert to kobo (smallest currency unit)
      reference: order.paymentReference,
      callback_url: `${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/payment/verify`,
      metadata: {
        orderId: order.id,
        productId,
        buyerId,
        sellerId: product.seller.id
      }
    };

    // In a real implementation, you would make a request to Paystack API
    // For now, we'll simulate the response
    const paystackResponse = {
      status: true,
      message: "Payment initialized",
      data: {
        authorization_url: `https://checkout.paystack.com/${order.paymentReference}`,
        reference: order.paymentReference,
        access_code: `ACCESS_${Date.now()}`
      }
    };

    res.json({
      order,
      paystackData: paystackResponse
    });
  } catch (error) {
    console.error("Initialize payment error:", error);
    res.status(500).json({ error: "Failed to initialize payment" });
  }
});

// Verify Paystack payment
router.post("/verify", authenticateJWT, async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required" });
    }

    // Find order by payment reference
    const order = await prisma.order.findUnique({
      where: { paymentReference: reference },
      include: {
        product: {
          include: {
            images: true
          }
        },
        buyer: {
          select: {
            name: true,
            email: true
          }
        },
        seller: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // In a real implementation, you would verify with Paystack API
    // For now, we'll simulate successful verification
    const paymentVerified = true; // This would come from Paystack verification

    if (paymentVerified) {
      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "paid",
          status: "confirmed"
        }
      });

      // Send email notifications
      try {
        // Email to buyer
        await sendEmail(
          order.buyer.email,
          "Payment Confirmed",
          "payment-confirmed-buyer",
          {
            buyerName: order.buyer.name,
            productTitle: order.product.title,
            amount: order.amount,
            orderId: order.id
          }
        );

        // Email to seller
        await sendEmail(
          order.seller.email,
          "New Order Received",
          "new-order-seller",
          {
            sellerName: order.seller.name,
            productTitle: order.product.title,
            amount: order.amount,
            orderId: order.id,
            buyerName: order.buyer.name
          }
        );
      } catch (emailError) {
        console.error("Failed to send email notifications:", emailError);
      }

      // Create notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: order.buyerId,
            type: "payment_confirmed",
            title: "Payment Confirmed",
            message: `Your payment of ₵${order.amount} for ${order.product.title} has been confirmed`,
            data: JSON.stringify({ orderId: order.id, productId: order.productId })
          },
          {
            userId: order.sellerId,
            type: "new_order",
            title: "New Order Received",
            message: `You have a new order for ${order.product.title} from ${order.buyer.name}`,
            data: JSON.stringify({ orderId: order.id, productId: order.productId })
          }
        ]
      });

      res.json({
        success: true,
        message: "Payment verified successfully",
        order: updatedOrder
      });
    } else {
      res.status(400).json({ error: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// Release payment to seller (admin only)
router.post("/release/:orderId", authenticateJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.isAdmin && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Find order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            title: true
          }
        },
        seller: {
          select: {
            name: true,
            email: true,
            sellerProfile: true
          }
        },
        buyer: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ error: "Order must be delivered before releasing payment" });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "completed",
        paymentStatus: "released"
      }
    });

    // Send email to seller about payment release
    try {
      await sendEmail(
        order.seller.email,
        "Payment Released",
        "payment-released",
        {
          sellerName: order.seller.name,
          productTitle: order.product.title,
          amount: order.amount,
          orderId: order.id
        }
      );
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: order.sellerId,
        type: "payment_released",
        title: "Payment Released",
        message: `Payment of ₵${order.amount} for ${order.product.title} has been released to your account`,
        data: JSON.stringify({ orderId: order.id, amount: order.amount })
      }
    });

    res.json({
      success: true,
      message: "Payment released successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Release payment error:", error);
    res.status(500).json({ error: "Failed to release payment" });
  }
});

// Get payment history for user
router.get("/history", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const payments = await prisma.order.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: {
        product: {
          select: {
            title: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(payments);
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ error: "Failed to get payment history" });
  }
});

export default router; 