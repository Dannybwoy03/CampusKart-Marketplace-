import prisma from './prisma.js';

async function debugOrders() {
  console.log('🔍 Debugging Orders and Payment Status...\n');

  try {
    // 1. Check all orders
    const allOrders = await prisma.order.findMany({
      select: {
        id: true,
        amount: true,
        paymentStatus: true,
        sellerAmount: true,
        transferredAt: true,
        status: true,
        seller: {
          select: {
            email: true
          }
        },
        buyer: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total Orders: ${allOrders.length}`);
    
    if (allOrders.length === 0) {
      console.log('❌ No orders found in database');
      return;
    }

    // 2. Group by payment status
    const byPaymentStatus = allOrders.reduce((acc, order) => {
      const status = order.paymentStatus || 'undefined';
      if (!acc[status]) acc[status] = [];
      acc[status].push(order);
      return acc;
    }, {});

    console.log('\n📋 Orders by Payment Status:');
    Object.entries(byPaymentStatus).forEach(([status, orders]) => {
      console.log(`  ${status}: ${orders.length} orders`);
    });

    // 3. Show released orders details
    const releasedOrders = allOrders.filter(o => o.paymentStatus === 'released');
    console.log(`\n💰 Released Orders (${releasedOrders.length}):`);
    
    if (releasedOrders.length === 0) {
      console.log('❌ No orders with "released" payment status found');
      
      // Check if there are any orders that should be released
      const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
      console.log(`\n📦 Delivered Orders (${deliveredOrders.length}):`);
      deliveredOrders.forEach(order => {
        console.log(`  - Order ${order.id.slice(-8)}: ${order.paymentStatus} (₦${order.amount})`);
      });
    } else {
      let totalRevenue = 0;
      releasedOrders.forEach(order => {
        const revenue = order.sellerAmount || (order.amount * 0.95);
        totalRevenue += revenue;
        console.log(`  - Order ${order.id.slice(-8)}: ₦${revenue} (from ₦${order.amount})`);
        console.log(`    Seller: ${order.seller.email}`);
        console.log(`    Transferred: ${order.transferredAt || 'Not transferred'}`);
      });
      console.log(`\n💵 Total Revenue from Released Orders: ₦${totalRevenue}`);
    }

    // 4. Check for orders that might need manual release
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid' && o.status === 'delivered');
    if (paidOrders.length > 0) {
      console.log(`\n⏳ Orders Ready for Release (${paidOrders.length}):`);
      paidOrders.forEach(order => {
        console.log(`  - Order ${order.id.slice(-8)}: ₦${order.amount} (${order.seller.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugOrders().catch(console.error);
