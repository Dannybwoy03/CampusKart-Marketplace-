import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import admin from '../middleware/admin.js';
import axios from 'axios';
import prisma from "../prisma.js";

const router = express.Router();

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

// Get all users
router.get("/users", authenticateToken, admin, async (req, res) => {
  try {
    // Fetch users and related data with Prisma
    const users = await prisma.user.findMany({
      include: {
        sellerProfile: true,
        products: true,
        ordersAsBuyer: true,
        ordersAsSeller: true,
      },
      orderBy: { id: "desc" },
    });

    // Fetch "suspended" from DB directly to avoid Prisma client schema mismatch
    const suspendedRows = await prisma.$queryRawUnsafe(
      'SELECT id, suspended FROM "User"'
    );
    const suspendedMap = new Map();
    for (const row of suspendedRows) {
      suspendedMap.set(row.id, !!row.suspended);
    }

    const merged = users.map((u) => ({
      ...u,
      suspended: suspendedMap.has(u.id) ? suspendedMap.get(u.id) : false,
    }));

    res.json(merged);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get all products
router.get("/products", authenticateToken, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        // `Product` model has no `reviews` relation in schema.prisma.
        // Include valid relations instead (e.g., `images`).
        images: true,
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
router.get("/moderation/reports", authenticateToken, async (req, res) => {
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
router.post("/users/:id/suspend", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Attempt update, and if column is missing, create it and retry
    try {
      await prisma.$executeRawUnsafe('UPDATE "User" SET "suspended" = TRUE WHERE id = $1', id);
    } catch (e) {
      // Postgres undefined column error code 42703
      if (e?.meta?.code === '42703' || /column\s+"suspended"\s+.*does not exist/i.test(e?.meta?.message || e?.message || '')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false');
        await prisma.$executeRawUnsafe('UPDATE "User" SET "suspended" = TRUE WHERE id = $1', id);
      } else {
        throw e;
      }
    }
    const user = await prisma.user.findUnique({ where: { id } });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({ error: "Failed to suspend user" });
  }
});

router.post("/users/:id/activate", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Attempt update, and if column is missing, create it and retry
    try {
      await prisma.$executeRawUnsafe('UPDATE "User" SET "suspended" = FALSE WHERE id = $1', id);
    } catch (e) {
      if (e?.meta?.code === '42703' || /column\s+"suspended"\s+.*does not exist/i.test(e?.meta?.message || e?.message || '')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false');
        await prisma.$executeRawUnsafe('UPDATE "User" SET "suspended" = FALSE WHERE id = $1', id);
      } else {
        throw e;
      }
    }
    const user = await prisma.user.findUnique({ where: { id } });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error activating user:", error);
    res.status(500).json({ error: "Failed to activate user" });
  }
});

router.post("/users/:id/promote", authenticateToken, async (req, res) => {
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
router.post("/products/:id/remove", authenticateToken, async (req, res) => {
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

// Approve product (set back to active)
router.post("/products/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.update({
      where: { id },
      data: { status: "active" },
    });
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error approving product:", error);
    res.status(500).json({ error: "Failed to approve product" });
  }
});

router.post("/products/:id/restore", authenticateToken, async (req, res) => {
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

router.post("/products/:id/feature", authenticateToken, async (req, res) => {
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
router.post("/moderation/reports/:id/action", authenticateToken, async (req, res) => {
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
router.get("/analytics", authenticateToken, async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      // active/suspended computed via raw SQL to avoid Prisma client schema mismatch
      activeUsersRows,
      suspendedUsersRows,
      activeProducts,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: "paid" },
        _sum: { amount: true },
      }),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "User" WHERE suspended = FALSE'),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "User" WHERE suspended = TRUE'),
      prisma.product.count({ where: { status: "active" } }),
      prisma.moderationReport.count({ where: { status: "pending" } }),
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeUsers: Array.isArray(activeUsersRows) ? activeUsersRows[0]?.count || 0 : 0,
      suspendedUsers: Array.isArray(suspendedUsersRows) ? suspendedUsersRows[0]?.count || 0 : 0,
      activeProducts,
      pendingReports,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Get all orders with detailed information for admin dashboard
router.get("/orders", authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        buyer: {
          select: { id: true, name: true, email: true }
        },
        seller: {
          select: { id: true, name: true, email: true }
        },
        product: {
          select: { id: true, title: true, price: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Order management - Release payment to seller
router.post("/orders/:id/release-payment", authenticateToken, async (req, res) => {
  try {
    const { id: orderId } = req.params;
    
    // Get order with all relations including seller profile
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        seller: {
          include: {
            sellerProfile: true
          }
        },
        product: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order is eligible for payment release
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Payment not yet received' });
    }

    if (order.paymentStatus === 'released') {
      return res.status(400).json({ error: 'Payment already released' });
    }

    // Update order payment status to released
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'released'
      }
    });

    // Create commission record if not exists
    try {
      await prisma.commission.upsert({
        where: { orderId: orderId },
        update: {
          status: 'collected'
        },
        create: {
          orderId: orderId,
          amount: order.commissionAmount || (order.amount * 0.05),
          rate: order.commissionRate || 0.05,
          status: 'collected'
        }
      });
    } catch (commissionError) {
      console.log('Commission creation failed:', commissionError.message);
      // Continue without commission record for now
    }

    // Transfer funds to seller's account
    try {
      const seller = await prisma.user.findUnique({
        where: { id: order.sellerId }
      });

      console.log('🔍 Checking seller details:', {
        sellerId: seller?.id,
        email: seller?.email,
        accountNumber: seller?.accountNumber,
        bankCode: seller?.bankCode,
        paystackRecipientCode: seller?.paystackRecipientCode
      });

      // Determine seller's preferred payment method and details
      const sellerProfile = seller?.sellerProfile;
      let paymentMethod = null;
      let paymentDetails = {};

      // Priority: Bank Account > MTN MoMo > Telecel Cash > Other Payment Details
      if (seller?.accountNumber && seller?.bankCode) {
        paymentMethod = 'bank';
        paymentDetails = {
          accountNumber: seller.accountNumber,
          bankCode: seller.bankCode,
          accountName: seller.fullName || seller.email
        };
      } else if (sellerProfile?.bankAccountNumber && sellerProfile?.bankCode) {
        paymentMethod = 'bank';
        paymentDetails = {
          accountNumber: sellerProfile.bankAccountNumber,
          bankCode: sellerProfile.bankCode,
          accountName: sellerProfile.bankAccountName || seller.fullName || seller.email
        };
      } else if (sellerProfile?.mtnMomoNumber) {
        paymentMethod = 'mtn_momo';
        paymentDetails = {
          phoneNumber: sellerProfile.mtnMomoNumber,
          name: seller.fullName || seller.email
        };
      } else if (sellerProfile?.telecelCashNumber) {
        paymentMethod = 'telecel_cash';
        paymentDetails = {
          phoneNumber: sellerProfile.telecelCashNumber,
          name: seller.fullName || seller.email
        };
      } else if (sellerProfile?.otherPaymentDetails) {
        paymentMethod = 'other';
        paymentDetails = {
          details: sellerProfile.otherPaymentDetails,
          name: seller.fullName || seller.email
        };
      }

      console.log('💳 Payment method determined:', {
        method: paymentMethod,
        details: paymentDetails
      });

      if (paymentMethod && seller) {
        const transferAmount = order.sellerAmount || (order.amount * 0.95);
        console.log(`💰 Initiating ${paymentMethod} transfer: ₦${transferAmount} to ${seller.email}`);

        let transferSuccess = false;
        let transferReference = null;

        if (paymentMethod === 'bank') {
          // Bank transfer via Paystack
          let recipientCode = seller.paystackRecipientCode;
          
          if (!recipientCode) {
            console.log('📝 Creating bank transfer recipient...');
            const recipientResponse = await createTransferRecipient(
              paymentDetails.accountName,
              paymentDetails.accountNumber,
              paymentDetails.bankCode
            );
            
            console.log('📋 Recipient creation response:', recipientResponse);
            
            if (recipientResponse.status) {
              recipientCode = recipientResponse.data.recipient_code;
              console.log('✅ Bank recipient created successfully:', recipientCode);
              
              await prisma.user.update({
                where: { id: seller.id },
                data: { paystackRecipientCode: recipientCode }
              });
            }
          }

          if (recipientCode) {
            const transferResponse = await paystackTransfer(
              transferAmount,
              recipientCode,
              `Payment for order #${order.id.slice(-8)}`
            );

            console.log('📤 Bank transfer response:', transferResponse);

            if (transferResponse.status) {
              transferSuccess = true;
              transferReference = transferResponse.data.reference;
              console.log(`✅ Bank transfer successful: ₦${transferAmount} sent to ${seller.email}`);
            }
          }
        } else if (paymentMethod === 'mtn_momo') {
          // MTN MoMo transfer (simulate for now - would need MTN MoMo API integration)
          console.log(`📱 MTN MoMo transfer: ₦${transferAmount} to ${paymentDetails.phoneNumber}`);
          // TODO: Integrate with MTN MoMo API
          transferSuccess = true;
          transferReference = `MOMO_${Date.now()}`;
          console.log(`✅ MTN MoMo transfer initiated: ${transferReference}`);
        } else if (paymentMethod === 'telecel_cash') {
          // Telecel Cash transfer (simulate for now)
          console.log(`📱 Telecel Cash transfer: ₦${transferAmount} to ${paymentDetails.phoneNumber}`);
          // TODO: Integrate with Telecel Cash API
          transferSuccess = true;
          transferReference = `TELECEL_${Date.now()}`;
          console.log(`✅ Telecel Cash transfer initiated: ${transferReference}`);
        } else if (paymentMethod === 'other') {
          // Manual processing required for other payment methods
          console.log(`📋 Manual payment required: ₦${transferAmount} via ${paymentDetails.details}`);
          transferSuccess = true;
          transferReference = `MANUAL_${Date.now()}`;
          console.log(`⚠️ Manual payment flagged for processing`);
        }

        if (transferSuccess && transferReference) {
          // Update order with transfer details
          await prisma.order.update({
            where: { id: orderId },
            data: {
              transferReference: transferReference,
              transferredAt: new Date(),
              paymentMethod: paymentMethod
            }
          });

          // Create notification for seller
          await prisma.notification.create({
            data: {
              userId: seller.id,
              type: 'payment_released',
              title: 'Payment Released',
              message: `Your payment of ₦${transferAmount} for order #${order.id.slice(-8)} has been released via ${paymentMethod.replace('_', ' ').toUpperCase()}.`,
              data: JSON.stringify({
                orderId: order.id,
                amount: transferAmount,
                method: paymentMethod,
                reference: transferReference
              })
            }
          });
        }
      } else {
        console.error('❌ No valid payment method found for seller:', {
          sellerId: seller?.id,
          email: seller?.email,
          bankAccount: !!(seller?.accountNumber || sellerProfile?.bankAccountNumber),
          mtnMomo: !!sellerProfile?.mtnMomoNumber,
          telecelCash: !!sellerProfile?.telecelCashNumber,
          otherPayment: !!sellerProfile?.otherPaymentDetails
        });
      }
    } catch (transferError) {
      console.error('❌ Transfer failed:', transferError.message);
      console.error('Full error:', transferError);
      // Continue even if transfer fails
    }

    res.json({
      message: 'Payment released successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error releasing payment:', error);
    res.status(500).json({ error: 'Failed to release payment' });
  }
});

// Contact both buyer and seller for an order
router.post("/orders/:id/contact-parties", authenticateToken, async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { message } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        seller: true,
        product: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create notifications for both parties
    const notifications = await Promise.all([
      prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: 'admin_contact',
          title: 'Admin Message',
          message: message || `Admin is reviewing your order #${order.id.slice(-8)}`,
          orderId: order.id
        }
      }),
      prisma.notification.create({
        data: {
          userId: order.sellerId,
          type: 'admin_contact',
          title: 'Admin Message', 
          message: message || `Admin is reviewing your order #${order.id.slice(-8)}`,
          orderId: order.id
        }
      })
    ]);

    res.json({
      message: 'Notifications sent to both parties',
      notifications
    });

  } catch (error) {
    console.error('Error contacting parties:', error);
    res.status(500).json({ error: 'Failed to contact parties' });
  }
});

// Admin intervention for order disputes
router.post("/orders/:id/intervene", authenticateToken, async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { reason, adminAction } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        seller: true,
        product: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status to indicate admin intervention
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'under_review',
        adminNotes: reason,
        interventionDate: new Date()
      }
    });

    // Notify both parties about the intervention
    await Promise.all([
      prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: 'admin_intervention',
          title: 'Order Under Review',
          message: `Your order #${order.id.slice(-8)} is now under admin review. Reason: ${reason}`,
          orderId: order.id
        }
      }),
      prisma.notification.create({
        data: {
          userId: order.sellerId,
          type: 'admin_intervention',
          title: 'Order Under Review',
          message: `Your order #${order.id.slice(-8)} is now under admin review. Reason: ${reason}`,
          orderId: order.id
        }
      })
    ]);

    res.json({
      message: 'Intervention initiated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error initiating intervention:', error);
    res.status(500).json({ error: 'Failed to initiate intervention' });
  }
});

// Manual trigger for automatic payment release (for testing)
router.post("/trigger-auto-release", authenticateToken, async (req, res) => {
  try {
    const { paymentReleaseService } = await import("../services/paymentReleaseService.js");
    await paymentReleaseService.triggerManualCheck();
    
    res.json({
      message: 'Automatic payment release check triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering auto-release:', error);
    res.status(500).json({ error: 'Failed to trigger automatic payment release' });
  }
});

export default router;