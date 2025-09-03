import { prisma } from "../index.js";
import nodemailer from "nodemailer";

// Place order
export async function placeOrder(req, res) {
  try {
    const { items, shippingAddress, orderNotes, paymentMethod } = req.body;
    const userId = req.user.userId || req.user.id;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items are required" });
    }
    
    if (!shippingAddress) {
      return res.status(400).json({ error: "Shipping address is required" });
    }
    
    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { price: true }
      });
      if (product) {
        totalAmount += product.price * item.quantity;
      }
    }
    
    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        shippingAddress,
        orderNotes,
        paymentMethod: paymentMethod || 'pending',
        paymentStatus: 'pending',
        status: 'pending'
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });
    
    // Create order items
    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price || 0,
          variantId: item.variantId
        }
      });
    }
    
    // Create purchase requests for each item
    for (const item of order.items) {
      await prisma.purchaseRequest.create({
        data: {
          productId: item.productId,
          buyerId: userId,
          sellerId: item.product.seller.id,
          status: 'pending'
        }
      });
    }
    
    // Send notifications
    try {
        await prisma.notification.create({
          data: {
          userId,
          type: "order_placed",
          content: `Your order #${order.id} has been placed successfully.`,
          data: { orderId: order.id, status: order.status }
        }
      });
      
      // Notify sellers
      for (const item of order.items) {
        await prisma.notification.create({
          data: {
            userId: item.product.seller.id,
            type: "new_order",
            content: `You have a new order for your product: ${item.product.title}`,
            data: { orderId: order.id, productId: item.productId }
          }
        });
      }
    } catch (notifError) {
      console.warn("Failed to create notifications:", notifError);
    }
    
    res.status(201).json(order);
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
}

// Get user's orders
export async function getOrders(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                seller: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
}

// Get order by ID
export async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                seller: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
}

// Create refund request
export async function createRefundRequest(req, res) {
  try {
    const { orderId, reason, description } = req.body;
    const userId = req.user.userId || req.user.id;
    
    if (!orderId || !reason) {
      return res.status(400).json({ error: "Order ID and reason are required" });
    }
    
    // Verify order ownership
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId }
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Create refund request (you might want to create a separate RefundRequest model)
    const refundRequest = await prisma.notification.create({
      data: {
        userId,
        type: "refund_request",
        content: `Refund request for order #${orderId}: ${reason}`,
        data: { orderId, reason, description }
      }
    });
    
    res.status(201).json(refundRequest);
  } catch (error) {
    console.error("Create refund request error:", error);
    res.status(500).json({ error: "Failed to create refund request" });
  }
}

// Process refund request (admin only)
export async function processRefundRequest(req, res) {
  try {
    const { orderId, action, notes } = req.body;
    
    if (!orderId || !action) {
      return res.status(400).json({ error: "Order ID and action are required" });
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Update order status based on action
    const newStatus = action === 'approve' ? 'refunded' : 'cancelled';
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        paymentStatus: action === 'approve' ? 'refunded' : 'cancelled'
      }
    });
    
    // Notify user
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "refund_processed",
        content: `Your refund request for order #${orderId} has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
        data: { orderId, action, notes }
      }
    });
    
    res.json(updatedOrder);
  } catch (error) {
    console.error("Process refund request error:", error);
    res.status(500).json({ error: "Failed to process refund request" });
  }
}

// Get refund request by order
export async function getRefundRequestByOrder(req, res) {
  try {
    const { id: orderId } = req.params;
    const userId = req.user.userId || req.user.id;
    
    const refundNotifications = await prisma.notification.findMany({
      where: {
        userId,
        type: "refund_request",
        data: { path: ['orderId'], equals: orderId }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(refundNotifications);
  } catch (error) {
    console.error("Get refund request error:", error);
    res.status(500).json({ error: "Failed to fetch refund request" });
  }
}