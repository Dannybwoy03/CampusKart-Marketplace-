import express from "express";
import { authenticateJWT } from "../middleware/auth.js";
import { prisma } from "../index.js";

const router = express.Router();

// Get user's conversations
router.get("/conversations", authenticateJWT, async (req, res) => {
  try {
    const authUserId = req.user.userId;
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: authUserId },
          { sellerId: authUserId }
        ]
      },
      include: {
        buyer: {
          select: { id: true, name: true }
        },
        seller: {
          select: { id: true, name: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Create new conversation
router.post("/conversations", authenticateJWT, async (req, res) => {
  try {
    // Back-compat body: { user1Id, user2Id } OR explicit { buyerId, sellerId }
    const authUserId = req.user.userId;
    let { buyerId, sellerId, user1Id, user2Id } = req.body || {};

    if (!buyerId || !sellerId) {
      if (!user1Id || !user2Id) {
        return res.status(400).json({ error: "buyerId & sellerId (or user1Id & user2Id) are required" });
      }
      // Infer roles: current user is buyer by default if matches user1Id; otherwise swap
      if (authUserId === user1Id) {
        buyerId = user1Id;
        sellerId = user2Id;
      } else if (authUserId === user2Id) {
        buyerId = user2Id;
        sellerId = user1Id;
      } else {
        // If auth user is neither, default the smaller id as buyer to keep deterministic
        buyerId = user1Id;
        sellerId = user2Id;
      }
    }

    if (buyerId === sellerId) {
      return res.status(400).json({ error: "buyerId and sellerId must differ" });
    }

    // Check if conversation already exists between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { buyerId, sellerId },
          { buyerId: sellerId, sellerId: buyerId }
        ]
      }
    });

    if (existing) {
      return res.json(existing);
    }

    const conversation = await prisma.conversation.create({
      data: {
        buyerId,
        sellerId
      },
      include: {
        buyer: {
          select: { id: true, name: true }
        },
        seller: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get messages for a conversation
router.get("/conversations/:conversationId/messages", authenticateJWT, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const authUserId = req.user.userId;
    
    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { buyerId: authUserId },
          { sellerId: authUserId }
        ]
      }
    });

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message
router.post("/conversations/:conversationId/messages", authenticateJWT, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const authUserId = req.user.userId;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { buyerId: authUserId },
          { sellerId: authUserId }
        ]
      }
    });

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: authUserId,
        content: content.trim()
      },
      include: {
        sender: {
          select: { id: true, name: true }
        }
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;