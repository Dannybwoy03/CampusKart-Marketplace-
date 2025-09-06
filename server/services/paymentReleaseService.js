import prisma from "../prisma.js";
import https from 'https';

// Automatic payment release service
export class PaymentReleaseService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  // Start the automatic payment release checker
  start() {
    if (this.isRunning) {
      console.log('Payment release service is already running');
      return;
    }

    console.log('Starting automatic payment release service...');
    this.isRunning = true;

    // Check every hour for orders eligible for automatic release
    this.intervalId = setInterval(async () => {
      await this.processAutoReleaseOrders();
    }, 60 * 60 * 1000); // 1 hour

    // Run immediately on start
    this.processAutoReleaseOrders();
  }

  // Stop the service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Payment release service stopped');
  }

  // Process orders eligible for automatic payment release
  async processAutoReleaseOrders() {
    try {
      console.log('Checking for orders eligible for automatic payment release...');

      // Find orders that meet auto-release criteria:
      // 1. Payment status is 'paid'
      // 2. Order status is 'delivered' 
      // 3. Auto-release date has passed
      // 4. Payment hasn't been released yet (paymentStatus is still 'paid')
      const eligibleOrders = await prisma.order.findMany({
        where: {
          paymentStatus: 'paid',
          status: 'delivered',
          autoReleaseDate: {
            lte: new Date() // Auto-release date is in the past
          }
        },
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

      console.log(`Found ${eligibleOrders.length} orders eligible for automatic payment release`);

      for (const order of eligibleOrders) {
        await this.releasePaymentForOrder(order);
      }

    } catch (error) {
      console.error('Error in automatic payment release process:', error);
    }
  }

  // Release payment for a specific order
  async releasePaymentForOrder(order) {
    try {
      console.log(`Auto-releasing payment for order ${order.id.slice(-8)}`);

      // Update order payment status to released
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'released'
        }
      });

      // Create commission record if not exists
      try {
        await prisma.commission.upsert({
          where: { orderId: order.id },
          update: {
            status: 'collected'
          },
          create: {
            orderId: order.id,
            amount: order.commissionAmount || (order.amount * 0.05),
            rate: order.commissionRate || 0.05,
            status: 'collected'
          }
        });
      } catch (commissionError) {
        console.log('Commission creation failed:', commissionError.message);
        // Continue without commission record for now
      }

      // Transfer funds to seller's account using multi-payment method logic
      await this.transferFundsToSeller(order);

      // Create notifications for buyer and seller
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: order.buyerId,
            type: 'payment_auto_released',
            title: 'Payment Automatically Released',
            message: `Payment for order #${order.id.slice(-8)} has been automatically released to the seller after 7 days.`,
            data: JSON.stringify({ orderId: order.id })
          }
        }),
        prisma.notification.create({
          data: {
            userId: order.sellerId,
            type: 'payment_received',
            title: 'Payment Received',
            message: `Payment for order #${order.id.slice(-8)} has been automatically released to you. Amount: ₦${order.sellerAmount || (order.amount * 0.95)}`,
            data: JSON.stringify({ orderId: order.id, amount: order.sellerAmount || (order.amount * 0.95) })
          }
        })
      ]);

      console.log(`Successfully auto-released payment for order ${order.id.slice(-8)}`);

    } catch (error) {
      console.error(`Failed to auto-release payment for order ${order.id}:`, error);
    }
  }

  // Transfer funds to seller using multi-payment method logic
  async transferFundsToSeller(order) {
    try {
      const seller = order.seller;
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

      console.log(`🔄 Auto-transfer: ${paymentMethod} method for order ${order.id.slice(-8)}`);

      if (paymentMethod && seller) {
        const transferAmount = order.sellerAmount || (order.amount * 0.95);
        let transferSuccess = false;
        let transferReference = null;

        if (paymentMethod === 'bank') {
          // Bank transfer via Paystack
          console.log(`🏦 Auto bank transfer: ₦${transferAmount} to ${seller.email}`);
          try {
            // Create or get recipient code
            let recipientCode = seller.paystackRecipientCode;
            if (!recipientCode) {
              recipientCode = await this.createPaystackRecipient(
                paymentDetails.accountNumber,
                paymentDetails.bankCode,
                paymentDetails.accountName
              );
              
              // Save recipient code to seller
              await prisma.user.update({
                where: { id: seller.id },
                data: { paystackRecipientCode: recipientCode }
              });
            }

            // Initiate transfer
            transferReference = await this.initiatePaystackTransfer(
              transferAmount,
              recipientCode,
              `Payment for order #${order.id.slice(-8)}`
            );
            
            transferSuccess = true;
            console.log(`🏦 Paystack transfer initiated: ${transferReference}`);
          } catch (error) {
            console.error(`🏦 Paystack transfer failed:`, error.message);
            transferSuccess = false;
          }
        } else if (paymentMethod === 'mtn_momo') {
          console.log(`📱 Auto MTN MoMo transfer: ₦${transferAmount} to ${paymentDetails.phoneNumber}`);
          try {
            transferReference = await this.initiateMTNMoMoTransfer(
              transferAmount,
              paymentDetails.phoneNumber,
              `Payment for order #${order.id.slice(-8)}`
            );
            transferSuccess = true;
            console.log(`📱 MTN MoMo transfer initiated: ${transferReference}`);
          } catch (error) {
            console.error(`📱 MTN MoMo transfer failed:`, error.message);
            transferSuccess = false;
          }
        } else if (paymentMethod === 'telecel_cash') {
          console.log(`📱 Auto Telecel Cash transfer: ₦${transferAmount} to ${paymentDetails.phoneNumber}`);
          try {
            transferReference = await this.initiateTelecelCashTransfer(
              transferAmount,
              paymentDetails.phoneNumber,
              `Payment for order #${order.id.slice(-8)}`
            );
            transferSuccess = true;
            console.log(`📱 Telecel Cash transfer initiated: ${transferReference}`);
          } catch (error) {
            console.error(`📱 Telecel Cash transfer failed:`, error.message);
            transferSuccess = false;
          }
        } else if (paymentMethod === 'other') {
          console.log(`📋 Auto manual payment flagged: ₦${transferAmount} via ${paymentDetails.details}`);
          transferSuccess = true;
          transferReference = `AUTO_MANUAL_${Date.now()}`;
        }

        if (transferSuccess && transferReference) {
          // Update order with transfer details
          await prisma.order.update({
            where: { id: order.id },
            data: {
              transferReference: transferReference,
              transferredAt: new Date(),
              paymentMethod: paymentMethod
            }
          });

          console.log(`✅ Auto-transfer successful: ${transferReference}`);
        }
      } else {
        console.error(`❌ No payment method found for auto-transfer: Order ${order.id.slice(-8)}`);
      }
    } catch (error) {
      console.error(`❌ Auto-transfer failed for order ${order.id}:`, error);
    }
  }

  // Create Paystack transfer recipient
  async createPaystackRecipient(accountNumber, bankCode, accountName) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN'
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transferrecipient',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              resolve(response.data.recipient_code);
            } else {
              reject(new Error(response.message || 'Failed to create recipient'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  // Initiate MTN MoMo transfer (placeholder implementation)
  async initiateMTNMoMoTransfer(amount, phoneNumber, reason) {
    // TODO: Implement actual MTN MoMo API integration
    // This is a placeholder that simulates the API call
    console.log(`📱 MTN MoMo API: Transferring ₦${amount} to ${phoneNumber}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, return a simulated transfer reference
    // In production, this should make actual API calls to MTN MoMo
    return `MOMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initiate Telecel Cash transfer (placeholder implementation)
  async initiateTelecelCashTransfer(amount, phoneNumber, reason) {
    // TODO: Implement actual Telecel Cash API integration
    // This is a placeholder that simulates the API call
    console.log(`📱 Telecel Cash API: Transferring ₦${amount} to ${phoneNumber}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, return a simulated transfer reference
    // In production, this should make actual API calls to Telecel Cash
    return `TELECEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initiate Paystack transfer
  async initiatePaystackTransfer(amount, recipientCode, reason) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100), // Convert to kobo
        recipient: recipientCode,
        reason: reason || 'Payment for order'
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transfer',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              resolve(response.data.transfer_code);
            } else {
              reject(new Error(response.message || 'Transfer failed'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('Manually triggering payment release check...');
    await this.processAutoReleaseOrders();
  }
}

// Create singleton instance
export const paymentReleaseService = new PaymentReleaseService();
