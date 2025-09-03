import express from 'express';
import { PrismaClient } from '../../node_modules/@prisma/client/index.js';
import { authenticateJWT } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const prisma = new PrismaClient();

// Create new order
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { productId, buyerId, sellerId, amount, paymentReference, shippingAddress, notes, status } = req.body;
    
    // Validate required fields
    if (!productId || !buyerId || !sellerId || !amount || !paymentReference || !shippingAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        productId,
        buyerId,
        sellerId,
        amount,
        paymentReference,
        shippingAddress: JSON.stringify(shippingAddress),
        notes,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        product: true,
        buyer: true,
        seller: true
      }
    });

    // Update product status if needed
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'pending' }
    });

    // Send email notifications
    try {
      // Send to buyer
      await sendEmail({
        to: order.buyer.email,
        subject: 'Order Confirmation - CampusKart',
        html: `
          <h2>Order Confirmed!</h2>
          <p>Your order for <strong>${order.product.title}</strong> has been confirmed.</p>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Amount:</strong> ₵${order.amount}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p>We'll notify you when the seller processes your order.</p>
        `
      });

      // Send to seller
      await sendEmail({
        to: order.seller.email,
        subject: 'New Order Received - CampusKart',
        html: `
          <h2>New Order Received!</h2>
          <p>You have received a new order for <strong>${order.product.title}</strong>.</p>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Buyer:</strong> ${order.buyer.name}</p>
          <p><strong>Amount:</strong> ₵${order.amount}</p>
          <p>Please process this order as soon as possible.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send emails:', emailError);
      // Don't fail the order creation if emails fail
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user's orders (buyer or seller)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { role } = req.query;

    let orders;
    if (role === 'seller') {
      orders = await prisma.order.findMany({
        where: { sellerId: userId },
        include: {
          product: true,
          buyer: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { buyerId: userId },
        include: {
          product: true,
          seller: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get specific order
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: {
        product: true,
        buyer: true,
        seller: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (seller only)
router.patch('/:id/status', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId || req.user.id;

    // Verify user is the seller
    const order = await prisma.order.findFirst({
      where: {
        id,
        sellerId: userId
      },
      include: {
        product: true,
        buyer: true,
        seller: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        product: true,
        buyer: true,
        seller: true
      }
    });

    // Send email notification to buyer
    try {
      await sendEmail({
        to: order.buyer.email,
        subject: `Order Status Updated - CampusKart`,
        html: `
          <h2>Order Status Updated</h2>
          <p>Your order for <strong>${order.product.title}</strong> has been updated.</p>
          <p><strong>New Status:</strong> ${status}</p>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p>Thank you for using CampusKart!</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order (buyer only, within time limit)
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        id,
        buyerId: userId,
        status: 'pending'
      },
      include: {
        product: true,
        seller: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }

    // Check if order is within cancellation time (e.g., 1 hour)
    const orderAge = Date.now() - new Date(order.createdAt).getTime();
    const oneHour = 60 * 60 * 1000;
    
    if (orderAge > oneHour) {
      return res.status(400).json({ error: 'Order cannot be cancelled after 1 hour' });
    }

    // Cancel order
    await prisma.order.update({
      where: { id },
      data: { 
        status: 'cancelled',
        updatedAt: new Date()
      }
    });

    // Reset product status
    await prisma.product.update({
      where: { id: order.productId },
      data: { status: 'active' }
    });

    // Send cancellation emails
    try {
      // Send to buyer
      await sendEmail({
        to: order.buyer.email,
        subject: 'Order Cancelled - CampusKart',
        html: `
          <h2>Order Cancelled</h2>
          <p>Your order for <strong>${order.product.title}</strong> has been cancelled.</p>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p>Your payment will be refunded within 3-5 business days.</p>
        `
      });

      // Send to seller
      await sendEmail({
        to: order.seller.email,
        subject: 'Order Cancelled - CampusKart',
        html: `
          <h2>Order Cancelled</h2>
          <p>Order <strong>${order.id}</strong> for <strong>${order.product.title}</strong> has been cancelled by the buyer.</p>
          <p>The product is now available for sale again.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send cancellation emails:', emailError);
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
