import { prisma } from "../index.js";

// Create purchase request
export async function createRequest(req, res) {
  try {
    const { productId, buyerName, buyerPhone, buyerAddress, note } = req.body;
    const buyerId = req.user.userId || req.user.id;
    
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    
    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, sellerId: true, price: true }
    });
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Create request
    const request = await prisma.purchaseRequest.create({
          data: {
        productId,
        buyerId,
        sellerId: product.sellerId,
        status: 'pending'
      }
    });
    
    // Create notifications
    try {
      // Notify buyer
      await prisma.notification.create({
        data: {
          userId: buyerId,
          type: "request_sent",
          content: `Your request for ${product.title} has been sent to the seller.`,
          data: { requestId: request.id, productId, productTitle: product.title }
        }
      });
      
      // Notify seller
      await prisma.notification.create({
        data: {
          userId: product.sellerId,
          type: "new_request",
          content: `You have a new request for your product: ${product.title}`,
          data: { requestId: request.id, productId, productTitle: product.title }
        }
      });
    } catch (notifError) {
      console.warn("Failed to create notifications:", notifError);
    }
    
    res.status(201).json(request);
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({ error: "Failed to create request" });
  }
}

// Get my requests (as buyer)
export async function getMyRequests(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    
    const requests = await prisma.purchaseRequest.findMany({
      where: { buyerId: userId },
      include: {
        product: {
          include: {
            images: true,
            seller: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(requests);
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({ error: "Failed to fetch your requests" });
  }
}

// Get received requests (as seller)
export async function getReceivedRequests(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    
    const requests = await prisma.purchaseRequest.findMany({
      where: { sellerId: userId },
      include: {
        product: {
          include: {
            images: true
          }
        },
        buyer: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(requests);
  } catch (error) {
    console.error("Get received requests error:", error);
    res.status(500).json({ error: "Failed to fetch received requests" });
  }
}

// Accept request
export async function acceptRequest(req, res) {
  try {
    const { id } = req.params;
    const sellerId = req.user.userId || req.user.id;
    
    const request = await prisma.purchaseRequest.findFirst({
      where: { id, sellerId }
    });
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    
    const updatedRequest = await prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'accepted' }
    });
    
    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        type: "request_accepted",
        content: `Your request has been accepted by the seller.`,
        data: { requestId: request.id, status: 'accepted' }
      }
    });
    
    res.json(updatedRequest);
  } catch (error) {
    console.error("Accept request error:", error);
    res.status(500).json({ error: "Failed to accept request" });
  }
}

// Decline request
export async function declineRequest(req, res) {
  try {
    const { id } = req.params;
    const sellerId = req.user.userId || req.user.id;
    
    const request = await prisma.purchaseRequest.findFirst({
      where: { id, sellerId }
    });
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    
    const updatedRequest = await prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'declined' }
    });
    
    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        type: "request_declined",
        content: `Your request has been declined by the seller.`,
        data: { requestId: request.id, status: 'declined' }
      }
    });
    
    res.json(updatedRequest);
  } catch (error) {
    console.error("Decline request error:", error);
    res.status(500).json({ error: "Failed to decline request" });
  }
}

// Cancel request (buyer only)
export async function cancelRequest(req, res) {
  try {
    const { id } = req.params;
    const buyerId = req.user.userId || req.user.id;
    
    const request = await prisma.purchaseRequest.findFirst({
      where: { id, buyerId }
    });
    
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    
    const updatedRequest = await prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'cancelled' }
    });
    
    // Create notification for seller
      await prisma.notification.create({
        data: {
        userId: request.sellerId,
          type: "request_cancelled",
          content: `A request for your product was cancelled.`,
        data: { requestId: request.id, status: 'cancelled' }
      }
    });
    
    res.json(updatedRequest);
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ error: "Failed to cancel request" });
  }
}