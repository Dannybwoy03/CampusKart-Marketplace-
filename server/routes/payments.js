import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';
import { sendEmail } from "../utils/email.js";

const router = express.Router();
const prisma = new PrismaClient();

// Paystack Transfer API
const paystackTransfer = async (amount, recipientCode, reason) => {
  try {
    const response = await axios.post('https://api.paystack.co/transfer', {
      source: 'balance',
      amount: amount * 100, // Convert to kobo
      recipient: recipientCode,
      reason: reason
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Paystack transfer error:', error.response?.data || error.message);
    throw error;
  }
};

// Create transfer recipient
const createTransferRecipient = async (name, accountNumber, bankCode) => {
  try {
    const response = await axios.post('https://api.paystack.co/transferrecipient', {
      type: 'nuban',
      name: name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN'
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Create recipient error:', error.response?.data || error.message);
    throw error;
  }
};

// Initialize Paystack payment
router.post("/initialize", authenticateToken, async (req, res) => {
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

    // Calculate total amount and commission
    const totalAmount = product.price * quantity;
    const commissionRate = 0.05; // 5% commission
    const commissionAmount = totalAmount * commissionRate;
    const sellerAmount = totalAmount - commissionAmount;

    // Create order with commission calculations
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
        paymentStatus: "pending",
        commissionRate,
        commissionAmount,
        sellerAmount
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
router.post("/verify", authenticateToken, async (req, res) => {
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
router.post("/release/:orderId", authenticateToken, async (req, res) => {
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

    // Update order status and create commission record
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "completed",
        paymentStatus: "released"
      }
    });

    // Create commission record
    await prisma.commission.create({
      data: {
        orderId: order.id,
        amount: order.commissionAmount || (order.amount * 0.05),
        rate: order.commissionRate || 0.05,
        status: "collected"
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
router.get("/history", authenticateToken, async (req, res) => {
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

// Auto-release payments after 7 days of delivery
router.post("/auto-release", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.isAdmin && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Find orders delivered more than 7 days ago that haven't been released
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const ordersToRelease = await prisma.order.findMany({
      where: {
        status: "delivered",
        paymentStatus: "paid",
        deliveredAt: {
          lte: sevenDaysAgo
        }
      },
      include: {
        product: { select: { title: true } },
        seller: { select: { name: true, email: true } }
      }
    });

    let releasedCount = 0;

    for (const order of ordersToRelease) {
      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "completed",
          paymentStatus: "released"
        }
      });

      // Create commission record
      await prisma.commission.create({
        data: {
          orderId: order.id,
          amount: order.commissionAmount || (order.amount * 0.05),
          rate: order.commissionRate || 0.05,
          status: "collected"
        }
      });

      // Send notification to seller
      await prisma.notification.create({
        data: {
          userId: order.sellerId,
          type: "payment_auto_released",
          title: "Payment Auto-Released",
          message: `Payment of ₦${order.sellerAmount || (order.amount * 0.95)} for ${order.product.title} has been automatically released`,
          data: JSON.stringify({ orderId: order.id, amount: order.sellerAmount })
        }
      });

      releasedCount++;
    }

    res.json({
      success: true,
      message: `Auto-released ${releasedCount} payments`,
      releasedCount
    });
  } catch (error) {
    console.error("Auto-release error:", error);
    res.status(500).json({ error: "Failed to auto-release payments" });
  }
});

// Request refund (buyer)
router.post("/refund/request", authenticateToken, async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const buyerId = req.user.userId;

    if (!orderId || !reason) {
      return res.status(400).json({ error: "Order ID and reason are required" });
    }

    // Find order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: { select: { title: true } },
        buyer: { select: { name: true, email: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.buyerId !== buyerId) {
      return res.status(403).json({ error: "Not authorized to request refund for this order" });
    }

    if (order.paymentStatus === "refunded") {
      return res.status(400).json({ error: "Order already refunded" });
    }

    if (order.paymentStatus === "released") {
      return res.status(400).json({ error: "Cannot refund - payment already released to seller" });
    }

    // Create refund request
    const refund = await prisma.refund.create({
      data: {
        orderId,
        amount: order.amount,
        reason,
        requestedBy: buyerId,
        status: "pending"
      }
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "refund_requested" }
    });

    // Notify admins about refund request
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { role: "ADMIN" },
          { role: "SUPERADMIN" }
        ]
      }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "refund_request",
          title: "Refund Request",
          message: `${order.buyer.name} requested refund for ${order.product.title}: ${reason}`,
          data: JSON.stringify({ orderId, refundId: refund.id })
        }
      });
    }

    res.json({
      success: true,
      message: "Refund request submitted successfully",
      refund
    });
  } catch (error) {
    console.error("Request refund error:", error);
    res.status(500).json({ error: "Failed to request refund" });
  }
});

// Process refund (admin)
router.post("/refund/process/:refundId", authenticateToken, async (req, res) => {
  try {
    const { refundId } = req.params;
    const { action } = req.body; // "approve" or "reject"
    const adminId = req.user.userId;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!user.isAdmin && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Find refund request
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            product: { select: { title: true } },
            buyer: { select: { name: true, email: true } },
            seller: { select: { name: true, email: true } }
          }
        }
      }
    });

    if (!refund) {
      return res.status(404).json({ error: "Refund request not found" });
    }

    if (action === "approve") {
      // Update refund status
      await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: "approved",
          approvedBy: adminId,
          processedAt: new Date()
        }
      });

      // Update order status
      await prisma.order.update({
        where: { id: refund.orderId },
        data: {
          status: "refunded",
          paymentStatus: "refunded",
          refundReason: refund.reason,
          refundedAt: new Date()
        }
      });

      // Notify buyer
      await prisma.notification.create({
        data: {
          userId: refund.requestedBy,
          type: "refund_approved",
          title: "Refund Approved",
          message: `Your refund of ₦${refund.amount} for ${refund.order.product.title} has been approved`,
          data: JSON.stringify({ orderId: refund.orderId, amount: refund.amount })
        }
      });

      res.json({
        success: true,
        message: "Refund approved successfully"
      });
    } else if (action === "reject") {
      // Update refund status
      await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: "rejected",
          approvedBy: adminId,
          processedAt: new Date()
        }
      });

      // Update order status back to previous state
      await prisma.order.update({
        where: { id: refund.orderId },
        data: { status: "confirmed" }
      });

      // Notify buyer
      await prisma.notification.create({
        data: {
          userId: refund.requestedBy,
          type: "refund_rejected",
          title: "Refund Rejected",
          message: `Your refund request for ${refund.order.product.title} has been rejected`,
          data: JSON.stringify({ orderId: refund.orderId })
        }
      });

      res.json({
        success: true,
        message: "Refund rejected successfully"
      });
    } else {
      res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
    }
  } catch (error) {
    console.error("Process refund error:", error);
    res.status(500).json({ error: "Failed to process refund" });
  }
});

// Get commission summary (admin)
router.get("/commission/summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.isAdmin && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const commissions = await prisma.commission.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const totalCommission = await prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "collected" }
    });

    res.json({
      commissions,
      totalCollected: totalCommission._sum.amount || 0
    });
  } catch (error) {
    console.error("Get commission summary error:", error);
    res.status(500).json({ error: "Failed to get commission summary" });
  }
});

export default router; 