import { paymentReleaseService } from './services/paymentReleaseService.js';
import prisma from './prisma.js';

// Test script for payment release functionality
async function testPaymentRelease() {
  console.log('🧪 Starting Payment Release Test...\n');

  try {
    // 1. Check if service is running
    console.log('1. Testing service status...');
    console.log(`Service running: ${paymentReleaseService.isRunning}`);

    // 2. Create test data - Find or create a test order
    console.log('\n2. Finding test orders...');
    const testOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'paid',
        status: 'delivered'
      },
      include: {
        buyer: true,
        seller: {
          include: {
            sellerProfile: true
          }
        },
        product: true
      },
      take: 3
    });

    console.log(`Found ${testOrders.length} test orders`);

    if (testOrders.length === 0) {
      console.log('⚠️  No test orders found. Creating mock scenario...');
      
      // Find any order to simulate
      const anyOrder = await prisma.order.findFirst({
        include: {
          seller: {
            include: {
              sellerProfile: true
            }
          }
        }
      });

      if (anyOrder) {
        console.log(`Using order ${anyOrder.id.slice(-8)} for simulation`);
        
        // Simulate payment method detection
        const seller = anyOrder.seller;
        const sellerProfile = seller?.sellerProfile;
        
        console.log('\n3. Testing payment method detection...');
        console.log(`Seller: ${seller.email}`);
        console.log(`Bank Account: ${seller.accountNumber || sellerProfile?.bankAccountNumber || 'Not set'}`);
        console.log(`MTN MoMo: ${sellerProfile?.mtnMomoNumber || 'Not set'}`);
        console.log(`Telecel Cash: ${sellerProfile?.telecelCashNumber || 'Not set'}`);
        console.log(`Other Payment: ${sellerProfile?.otherPaymentDetails || 'Not set'}`);
        
        // Test transfer logic simulation
        console.log('\n4. Testing transfer logic...');
        const service = paymentReleaseService;
        await service.transferFundsToSeller(anyOrder);
      }
    } else {
      // 3. Test automatic release logic
      console.log('\n3. Testing automatic release logic...');
      for (const order of testOrders.slice(0, 2)) {
        console.log(`\nTesting order ${order.id.slice(-8)}:`);
        console.log(`- Buyer: ${order.buyer.email}`);
        console.log(`- Seller: ${order.seller.email}`);
        console.log(`- Amount: ₦${order.amount}`);
        console.log(`- Status: ${order.status}`);
        console.log(`- Payment Status: ${order.paymentStatus}`);
        console.log(`- Auto Release Date: ${order.autoReleaseDate}`);
        
        // Test transfer functionality
        await paymentReleaseService.transferFundsToSeller(order);
      }
    }

    // 4. Test manual trigger
    console.log('\n5. Testing manual trigger...');
    await paymentReleaseService.triggerManualCheck();

    // 5. Check recent notifications
    console.log('\n6. Checking recent notifications...');
    const recentNotifications = await prisma.notification.findMany({
      where: {
        type: {
          in: ['payment_received', 'payment_auto_released']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`Found ${recentNotifications.length} recent payment notifications:`);
    recentNotifications.forEach(notif => {
      console.log(`- ${notif.type}: ${notif.title} (${notif.createdAt.toISOString()})`);
    });

    // 6. Check commission records
    console.log('\n7. Checking commission records...');
    const commissions = await prisma.commission.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`Found ${commissions.length} commission records:`);
    commissions.forEach(comm => {
      console.log(`- Order ${comm.orderId.slice(-8)}: ₦${comm.amount} (${comm.status})`);
    });

    console.log('\n✅ Payment Release Test Completed Successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaymentRelease().catch(console.error);
