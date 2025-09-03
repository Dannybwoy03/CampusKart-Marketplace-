import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'campuskart03@gmail.com',
    pass: process.env.EMAIL_PASS || 'ktqhgaavycnsxjpg'
  }
});

// Send email function
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"CampusKart" <${process.env.EMAIL_USER || 'campuskart03@gmail.com'}>`,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  orderConfirmation: (order) => ({
    subject: 'Order Confirmation - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #059669;">Order Confirmed! 🎉</h2>
          <p>Hello ${order.buyer.name},</p>
          <p>Your order has been confirmed and is being processed.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Product:</strong> ${order.product.title}</p>
            <p><strong>Amount:</strong> ₵${order.amount}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <p>We'll notify you when the seller processes your order.</p>
          <p>Thank you for using CampusKart!</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/dashboard/orders/${order.id}" 
               style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Order
            </a>
          </div>
        </div>
      </div>
    `
  }),

  newOrderNotification: (order) => ({
    subject: 'New Order Received - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #059669;">New Order Received! 📦</h2>
          <p>Hello ${order.seller.name},</p>
          <p>Congratulations! You have received a new order.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Product:</strong> ${order.product.title}</p>
            <p><strong>Buyer:</strong> ${order.buyer.name}</p>
            <p><strong>Amount:</strong> ₵${order.amount}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <p>Please process this order as soon as possible to maintain good customer satisfaction.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/dashboard/orders/${order.id}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Order
            </a>
          </div>
        </div>
      </div>
    `
  }),

  orderStatusUpdate: (order, newStatus) => ({
    subject: `Order Status Updated - CampusKart`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #1e40af;">Order Status Updated 📊</h2>
          <p>Hello ${order.buyer.name},</p>
          <p>Your order status has been updated.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Product:</strong> ${order.product.title}</p>
            <p><strong>New Status:</strong> <span style="color: #059669; font-weight: bold;">${newStatus}</span></p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Thank you for using CampusKart!</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/dashboard/orders/${order.id}" 
               style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Order
            </a>
          </div>
        </div>
      </div>
    `
  }),

  orderCancelled: (order) => ({
    subject: 'Order Cancelled - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #dc2626;">Order Cancelled ❌</h2>
          <p>Hello ${order.buyer.name},</p>
          <p>Your order has been cancelled.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Product:</strong> ${order.product.title}</p>
            <p><strong>Amount:</strong> ₵${order.amount}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <p>Your payment will be refunded within 3-5 business days.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    `
  }),

  sellerOrderCancelled: (order) => ({
    subject: 'Order Cancelled - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #dc2626;">Order Cancelled ❌</h2>
          <p>Hello ${order.seller.name},</p>
          <p>An order has been cancelled by the buyer.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Product:</strong> ${order.product.title}</p>
            <p><strong>Buyer:</strong> ${order.buyer.name}</p>
            <p><strong>Amount:</strong> ₵${order.amount}</p>
          </div>
          
          <p>The product is now available for sale again.</p>
        </div>
      </div>
    `
  }),

  emailVerification: (name, verificationToken) => ({
    subject: 'Verify Your Email - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #1e40af;">Welcome to CampusKart! 🎉</h2>
          <p>Hello ${name},</p>
          <p>Thank you for signing up for CampusKart! To complete your registration and start buying and selling on our platform, please verify your email address.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; text-align: center;">
              <strong>Click the button below to verify your email:</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}" 
               style="background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, you can also copy and paste this link into your browser:<br>
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}" 
               style="color: #1e40af; word-break: break-all;">
              ${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}
            </a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account with CampusKart, you can safely ignore this email.
          </p>
          
          <p>Welcome to the CampusKart community!</p>
        </div>
      </div>
    `
  }),

  newRequest: (buyerName, productTitle, message) => ({
    subject: 'New Product Request - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #059669;">New Product Request! 📦</h2>
          <p>Hello,</p>
          <p>You have received a new request for your product.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Request Details</h3>
            <p><strong>Buyer:</strong> ${buyerName}</p>
            <p><strong>Product:</strong> ${productTitle}</p>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Please log in to your dashboard to accept or reject this request.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/dashboard" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  }),

  requestStatusUpdate: (recipientName, productTitle, status, message) => ({
    subject: `Request ${status.charAt(0).toUpperCase() + status.slice(1)} - CampusKart`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #1e40af;">Request ${status.charAt(0).toUpperCase() + status.slice(1)} 📊</h2>
          <p>Hello ${recipientName},</p>
          <p>Your request status has been updated.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Request Details</h3>
            <p><strong>Product:</strong> ${productTitle}</p>
            <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Thank you for using CampusKart!</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/dashboard" 
               style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  }),

  requestConfirmation: (buyerName, productTitle, message) => ({
    subject: 'Request Sent Successfully - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #059669;">Request Sent Successfully! ✅</h2>
          <p>Hello ${buyerName},</p>
          <p>Your request has been successfully sent to the seller.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Request Details</h3>
            <p><strong>Product:</strong> ${productTitle}</p>
            <p><strong>Your Message:</strong> ${message}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>The seller will be notified and will respond to your request soon. You can check the status of your request in your dashboard.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/dashboard/requests" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View My Requests
            </a>
          </div>
        </div>
      </div>
    `
  }),

  requestCancelled: (recipientName, productTitle, cancelledBy, message) => ({
    subject: 'Request Cancelled - CampusKart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1>CampusKart</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #dc2626;">Request Cancelled ❌</h2>
          <p>Hello ${recipientName},</p>
          <p>The request for the following product has been cancelled by ${cancelledBy}.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Request Details</h3>
            <p><strong>Product:</strong> ${productTitle}</p>
            <p><strong>Cancelled by:</strong> ${cancelledBy}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>This request is no longer active. You can browse other products or create new requests.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'}/dashboard" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  })
};

// Send verification email
const sendVerificationEmail = async (email, name, verificationToken) => {
  const template = emailTemplates.emailVerification(name, verificationToken);
  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

export { sendEmail, emailTemplates, sendVerificationEmail };
