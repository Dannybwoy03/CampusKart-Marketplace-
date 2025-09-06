import { prisma } from "../index.js";
import { io } from "../index.js";

// Release payment to seller (admin action)
export const releasePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order with all relations
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
        paymentStatus: 'released',
        releasedAt: new Date()
      }
    });

    // Create commission record if not exists
    await prisma.commission.upsert({
      where: { orderId: orderId },
      update: {},
      create: {
        orderId: orderId,
        amount: order.commissionAmount || (order.amount * 0.05),
        rate: order.commissionRate || 0.05,
        status: 'collected'
      }
    });

    // Send notifications to buyer and seller
    if (io) {
      io.to(`user_${order.buyerId}`).emit('notification', {
        type: 'payment_released',
        message: `Payment for order #${order.id.slice(-8)} has been released to seller`,
        orderId: order.id
      });

      io.to(`user_${order.sellerId}`).emit('notification', {
        type: 'payment_received',
        message: `Payment for order #${order.id.slice(-8)} has been released to you`,
        orderId: order.id
      });
    }

    res.json({
      message: 'Payment released successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error releasing payment:', error);
    res.status(500).json({ error: 'Failed to release payment' });
  }
};

// Get comprehensive order data for admin dashboard
export const getOrdersWithDetails = async (req, res) => {
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
        },
        commission: true,
        refund: true
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
};