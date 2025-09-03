import { prisma } from "../index.js";

// Upload manual payment receipt
export async function uploadManualPaymentReceipt(req, res) {
  try {
    const { orderId, amount, paymentMethod, notes } = req.body;
    const userId = req.user.userId || req.user.id;
    
    if (!orderId || !amount) {
      return res.status(400).json({ error: "Order ID and amount are required" });
    }
    
    // Verify order ownership
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId }
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Create payment record
    const payment = await prisma.notification.create({
      data: {
        userId,
        type: "manual_payment_uploaded",
        content: `Manual payment receipt uploaded for order #${orderId}`,
        data: { orderId, amount, paymentMethod, notes }
      }
    });
    
    // Update order payment status
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'pending_verification',
        paymentMethod: paymentMethod || 'manual'
      }
    });
    
    res.status(201).json(payment);
  } catch (error) {
    console.error("Upload payment receipt error:", error);
    res.status(500).json({ error: "Failed to upload payment receipt" });
  }
}

// Verify manual payment (admin/seller only)
export async function verifyManualPayment(req, res) {
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
    
    // Update order based on action
    const newPaymentStatus = action === 'approve' ? 'paid' : 'failed';
    const newOrderStatus = action === 'approve' ? 'confirmed' : 'cancelled';
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: newPaymentStatus,
        status: newOrderStatus
      }
    });
    
    // Notify buyer
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "payment_verified",
        content: `Your payment for order #${orderId} has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
        data: { orderId, action, notes }
      }
    });
    
    res.json(updatedOrder);
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
}

// Process payment with Paystack
export async function processPaystackPayment(req, res) {
  try {
    const { orderId, paymentReference, amount } = req.body;
    const userId = req.user.userId || req.user.id;
    
    if (!orderId || !paymentReference || !amount) {
      return res.status(400).json({ error: "Order ID, payment reference, and amount are required" });
    }
    
    // Verify order ownership
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId }
    });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Update order payment status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'paid',
        status: 'confirmed'
      }
    });
    
    // Create payment notification
    await prisma.notification.create({
      data: {
        userId,
        type: "payment_successful",
        content: `Payment successful for order #${orderId}`,
        data: { orderId, paymentReference, amount }
      }
    });
    
    res.json(updatedOrder);
  } catch (error) {
    console.error("Process Paystack payment error:", error);
    res.status(500).json({ error: "Failed to process payment" });
  }
}

// Get payment history for user
export async function getPaymentHistory(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    
    const payments = await prisma.notification.findMany({
      where: {
        userId,
        type: { in: ['manual_payment_uploaded', 'payment_verified', 'payment_successful'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(payments);
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
}