import { prisma } from "../index.js";
    const { storeName, contact, email, address, mtnMomoNumber, telecelCashNumber, bankAccountNumber, bankName, bankAccountName, otherPaymentDetails } = req.body;
    // Create seller profile with payment details
        mtnMomoNumber,
        telecelCashNumber,
        bankAccountNumber,
        bankName,
        bankAccountName,
        otherPaymentDetails,

// New: Update seller payment details
export const updateSellerPaymentDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mtnMomoNumber, telecelCashNumber, bankAccountNumber, bankName, bankAccountName, otherPaymentDetails } = req.body;
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!sellerProfile) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }
    await prisma.sellerProfile.update({
      where: { userId },
      data: {
        mtnMomoNumber,
        telecelCashNumber,
        bankAccountNumber,
        bankName,
        bankAccountName,
        otherPaymentDetails,
      },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Update seller payment details error:', err);
    res.status(500).json({ error: 'Failed to update payment details.' });
  }
};

// Fetch notifications for current user
export async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

// Mark notification as read
export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
} 