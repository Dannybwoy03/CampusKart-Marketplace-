import express from "express";
import { prisma } from "../index.js";
import { authenticateJWT } from "../middleware/auth.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

// Get user's requests (as buyer or seller)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const requests = await prisma.request.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
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
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(requests);
  } catch (error) {
    console.error("Get requests error:", error);
    res.status(500).json({ error: "Failed to get requests" });
  }
});

// Create a new request
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const { productId, message } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!product || product.status !== "active") {
      return res.status(400).json({ error: "Product not available" });
    }

    // Check if user is trying to request their own product
    if (product.sellerId === buyerId) {
      return res.status(400).json({ error: "Cannot request your own product" });
    }

    // Check if request already exists
    const existingRequest = await prisma.request.findFirst({
      where: {
        productId,
        buyerId
      }
    });

    if (existingRequest) {
      // If request exists and is pending/accepted, don't allow new request
      if (existingRequest.status === "pending" || existingRequest.status === "accepted") {
      return res.status(400).json({ error: "Request already exists for this product" });
    }

      // If request was rejected or cancelled, update it to pending
      const updatedRequest = await prisma.request.update({
        where: { id: existingRequest.id },
        data: {
          status: "pending",
          message: message || "I'm interested in this product",
          updatedAt: new Date()
        },
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

      // Send email notification to seller
      try {
        const { emailTemplates } = await import('../utils/email.js');
        const template = emailTemplates.newRequest(
          req.user.name,
          product.title,
          message || "I'm interested in this product"
        );
        await sendEmail({
          to: product.seller.email,
          subject: template.subject,
          html: template.html
        });
      } catch (emailError) {
        console.error("Failed to send email notification to seller:", emailError);
      }

      // Send email confirmation to buyer
      try {
        const { emailTemplates } = await import('../utils/email.js');
        const template = emailTemplates.requestConfirmation(
          req.user.name,
          product.title,
          message || "I'm interested in this product"
        );
        await sendEmail({
          to: req.user.email,
          subject: template.subject,
          html: template.html
        });
      } catch (emailError) {
        console.error("Failed to send email confirmation to buyer:", emailError);
      }

      // Create notification for seller
      await prisma.notification.create({
        data: {
          userId: product.seller.id,
          type: "request",
          title: "New Product Request",
          message: `${req.user.name} is interested in your product: ${product.title}`,
          data: JSON.stringify({ requestId: updatedRequest.id, productId })
        }
      });

      // Create notification for buyer
      await prisma.notification.create({
        data: {
          userId: buyerId,
          type: "request_sent",
          title: "Request Sent Successfully",
          message: `Your request for ${product.title} has been sent to the seller`,
          data: JSON.stringify({ requestId: updatedRequest.id, productId })
        }
      });

      res.json(updatedRequest);
      return;
    }

    // Create new request
    const request = await prisma.request.create({
      data: {
        productId,
        buyerId,
        sellerId: product.seller.id,
        message: message || "I'm interested in this product"
      },
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

    // Send email notification to seller
    try {
      const { emailTemplates } = await import('../utils/email.js');
      const template = emailTemplates.newRequest(
        req.user.name,
        product.title,
        message || "I'm interested in this product"
      );
      await sendEmail({
        to: product.seller.email,
        subject: template.subject,
        html: template.html
      });
    } catch (emailError) {
      console.error("Failed to send email notification to seller:", emailError);
    }

    // Send email confirmation to buyer
    try {
      const { emailTemplates } = await import('../utils/email.js');
      const template = emailTemplates.requestConfirmation(
        req.user.name,
        product.title,
        message || "I'm interested in this product"
      );
      await sendEmail({
        to: req.user.email,
        subject: template.subject,
        html: template.html
      });
    } catch (emailError) {
      console.error("Failed to send email confirmation to buyer:", emailError);
    }

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: product.seller.id,
        type: "request",
        title: "New Product Request",
        message: `${req.user.name} is interested in your product: ${product.title}`,
        data: JSON.stringify({ requestId: request.id, productId })
      }
    });

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: buyerId,
        type: "request_sent",
        title: "Request Sent Successfully",
        message: `Your request for ${product.title} has been sent to the seller`,
        data: JSON.stringify({ requestId: request.id, productId })
      }
    });

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true }
    });
    
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "admin_request",
          title: "New Product Request",
          message: `${req.user.name} requested ${product.title} from ${product.seller.name}`,
          data: JSON.stringify({ requestId: request.id, productId, buyerId, sellerId: product.seller.id })
        }
      });
    }

    res.status(201).json(request);
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({ error: "Failed to create request" });
  }
});

// Update request status (seller accepts/rejects)
router.patch("/:id/status", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { status, message } = req.body;

    if (!["accepted", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            title: true
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

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Only seller can accept/reject, buyer can cancel
    if (status === "accepted" || status === "rejected") {
      if (request.sellerId !== userId) {
        return res.status(403).json({ error: "Only seller can accept/reject requests" });
      }
    } else if (status === "cancelled") {
      if (request.buyerId !== userId) {
        return res.status(403).json({ error: "Only buyer can cancel requests" });
      }
    }

    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
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

    // Send email notification
    try {
      const { emailTemplates } = await import('../utils/email.js');
      
      if (status === "cancelled") {
        // Send cancellation email to both parties
        const cancelledBy = req.user.name;
        
        // Email to seller
        const sellerTemplate = emailTemplates.requestCancelled(
          request.seller.name,
          request.product.title,
          cancelledBy,
          request.message || "Request cancelled"
        );
        await sendEmail({
          to: request.seller.email,
          subject: sellerTemplate.subject,
          html: sellerTemplate.html
        });
        
        // Email to buyer
        const buyerTemplate = emailTemplates.requestCancelled(
          request.buyer.name,
          request.product.title,
          cancelledBy,
          request.message || "Request cancelled"
        );
        await sendEmail({
          to: request.buyer.email,
          subject: buyerTemplate.subject,
          html: buyerTemplate.html
        });
      } else {
        // Send regular status update email
        const recipientEmail = status === "cancelled" ? request.seller.email : request.buyer.email;
        const recipientName = status === "cancelled" ? request.seller.name : request.buyer.name;
        
        const template = emailTemplates.requestStatusUpdate(
          recipientName,
          request.product.title,
          status,
          message || `Your request has been ${status}`
        );
        await sendEmail({
          to: recipientEmail,
          subject: template.subject,
          html: template.html
        });
      }
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }

    // Create notification for the affected party
    const notificationUserId = status === "cancelled" ? request.sellerId : request.buyerId;
    await prisma.notification.create({
      data: {
        userId: notificationUserId,
        type: "request_update",
        title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your request for ${request.product.title} has been ${status}`,
        data: JSON.stringify({ requestId: request.id, status })
      }
    });

    // Create notification for the other party
    const otherPartyId = status === "cancelled" ? request.buyerId : request.sellerId;
    await prisma.notification.create({
      data: {
        userId: otherPartyId,
        type: "request_update",
        title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Request for ${request.product.title} has been ${status}`,
        data: JSON.stringify({ requestId: request.id, status })
      }
    });

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true }
    });
    
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "admin_request_update",
          title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Request for ${request.product.title} between ${request.buyer.name} and ${request.seller.name} has been ${status}`,
          data: JSON.stringify({ requestId: request.id, status, buyerId: request.buyerId, sellerId: request.sellerId })
        }
      });
    }

    res.json(updatedRequest);
  } catch (error) {
    console.error("Update request status error:", error);
    res.status(500).json({ error: "Failed to update request status" });
  }
});

// Delete request (only buyer can delete their own request)
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await prisma.request.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.buyerId !== userId) {
      return res.status(403).json({ error: "Can only delete your own requests" });
    }

    await prisma.request.delete({
      where: { id }
    });

    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({ error: "Failed to delete request" });
  }
});

export default router; 