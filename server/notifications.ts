import { storage as dbStorage } from './storage';
import { User } from '@shared/schema';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid API key is configured');
} else {
  console.warn('SendGrid API key is not configured. Email notifications will be disabled.');
}

// Type definition for notifications
export interface Notification {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: Date;
  relatedEntityType?: string;
  relatedEntityId?: number;
  link?: string;
}

// In-memory notifications store until we add them to the database
const notifications: Notification[] = [
  // Add a test notification for demo purposes
  {
    id: 1,
    userId: 3, // Admin user ID
    message: "Welcome to the notification system! This is a test notification.",
    read: false,
    type: 'info',
    createdAt: new Date(),
    relatedEntityType: 'system',
    link: '/admin/dashboard'
  },
  // Add a file upload test notification
  {
    id: 2,
    userId: 3, // Admin user ID
    message: "User test1 has uploaded a file: example-document.pdf",
    read: false,
    type: 'info',
    createdAt: new Date(),
    relatedEntityType: 'file',
    link: '/admin/files'
  },
  // Add a critical warning notification
  {
    id: 3,
    userId: 3, // Admin user ID
    message: "System warning: Low disk space detected on server",
    read: false,
    type: 'warning',
    createdAt: new Date(),
    relatedEntityType: 'system',
    link: '/admin/dashboard'
  }
];
let notificationIdCounter = 4; // Start at 4 since we have 3 notifications already

export const notificationService = {
  /**
   * Create a notification for a specific user
   */
  createForUser: async (
    userId: number, 
    message: string, 
    type: 'info' | 'warning' | 'success' | 'error' = 'info',
    metadata: {
      relatedEntityType?: string,
      relatedEntityId?: number,
      link?: string
    } = {}
  ): Promise<Notification> => {
    const notification: Notification = {
      id: notificationIdCounter++,
      userId,
      message,
      read: false,
      type,
      createdAt: new Date(),
      ...metadata
    };
    
    notifications.push(notification);
    
    // TODO: When we add notifications to the database, save it here
    
    return notification;
  },
  
  /**
   * Notify all admin users about an event
   */
  notifyAdmins: async (
    message: string, 
    type: 'info' | 'warning' | 'success' | 'error' = 'info',
    metadata: {
      relatedEntityType?: string,
      relatedEntityId?: number,
      link?: string
    } = {}
  ): Promise<void> => {
    try {
      // Get all admin users (roles: BUSINESS_ADMIN, CLIENT_ADMIN)
      const allUsers = await dbStorage.getAllUsers();
      const adminUsers = allUsers.filter(user => 
        ['BUSINESS_ADMIN', 'CLIENT_ADMIN'].includes(user.role)
      );
      
      // Create notification for each admin
      for (const admin of adminUsers) {
        await notificationService.createForUser(
          admin.id,
          message,
          type,
          metadata
        );
        
        // Send email notification if email is available and SendGrid API key is configured
        if (admin.email && process.env.SENDGRID_API_KEY) {
          await notificationService.sendEmailNotification(
            admin.email,
            `API Manager Notification: ${type.toUpperCase()}`,
            message,
            type,
            metadata
          );
        }
      }
      
      console.log(`Sent notification to ${adminUsers.length} admin users: ${message}`);
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  },
  
  /**
   * Send a credit purchase confirmation email to user and admins
   */
  sendCreditPurchaseConfirmation: async (
    user: User,
    creditsAdded: number,
    totalCredits: number,
    transactionAmount: number,
    bundleName: string,
    paymentMethod: string
  ): Promise<void> => {
    try {
      // Format the amount nicely
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(transactionAmount);
      
      // Send email to the user
      if (user.email) {
        const subject = 'Credit Purchase Confirmation';
        const message = `Your credit purchase of ${creditsAdded} credits has been completed successfully.`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #2c3e50;">Credit Purchase Confirmation</h2>
            <div style="padding: 15px; border-left: 4px solid #2ecc71; background-color: #f8f9fa; margin: 20px 0;">
              <h3 style="margin-top: 0;">Purchase Successful</h3>
              <p><strong>Bundle:</strong> ${bundleName}</p>
              <p><strong>Credits Added:</strong> ${creditsAdded}</p>
              <p><strong>Amount:</strong> ${formattedAmount}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              <p><strong>Current Balance:</strong> ${totalCredits} credits</p>
            </div>
            <p>Thank you for your purchase!</p>
            <p style="color: #7f8c8d; font-size: 12px;">
              This is an automated confirmation from your API Manager.
            </p>
          </div>
        `;
        
        // Send to user
        const msg = {
          to: user.email,
          from: process.env.EMAIL_FROM || 'noreply@apimanager.com',
          subject,
          text: message,
          html
        };
        
        await sgMail.send(msg);
        console.log(`Credit purchase confirmation email sent to user ${user.id} (${user.email})`);
      }
      
      // Also notify admins about the purchase
      // Get all client admins for this user and business admins
      const parentUserId = user.parentUserId;
      const allUsers = await dbStorage.getAllUsers();
      
      // Filter to get relevant admins:
      // 1. Business admins (who oversee all)
      // 2. Client admins who are directly responsible for this user
      const relevantAdmins = allUsers.filter(admin => 
        (admin.role === 'BUSINESS_ADMIN') || 
        (admin.role === 'CLIENT_ADMIN' && user.parentUserId === admin.id)
      );
      
      for (const admin of relevantAdmins) {
        if (admin.email) {
          const subject = `Credit Purchase Alert: ${user.username}`;
          const message = `User ${user.username} has purchased ${creditsAdded} credits.`;
          
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #2c3e50;">Credit Purchase Alert</h2>
              <div style="padding: 15px; border-left: 4px solid #3498db; background-color: #f8f9fa; margin: 20px 0;">
                <h3 style="margin-top: 0;">Purchase Details</h3>
                <p><strong>User:</strong> ${user.username} (${user.email || 'No email'})</p>
                <p><strong>Bundle:</strong> ${bundleName}</p>
                <p><strong>Credits Added:</strong> ${creditsAdded}</p>
                <p><strong>Amount:</strong> ${formattedAmount}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                <p><strong>New Balance:</strong> ${totalCredits} credits</p>
              </div>
              <p style="color: #7f8c8d; font-size: 12px;">
                This is an automated notification from your API Manager.
              </p>
            </div>
          `;
          
          // Send to admin
          const msgAdmin = {
            to: admin.email,
            from: process.env.EMAIL_FROM || 'noreply@apimanager.com',
            subject,
            text: message,
            html
          };
          
          await sgMail.send(msgAdmin);
          console.log(`Credit purchase alert email sent to admin ${admin.id} (${admin.email})`);
        }
      }
    } catch (error) {
      console.error('Failed to send credit purchase confirmation:', error);
    }
  },
  
  /**
   * Send a low credit balance warning to the user and relevant admins
   */
  sendLowCreditAlert: async (
    user: User,
    currentCredits: number,
    threshold: number,
    thresholdPercentage: number
  ): Promise<void> => {
    try {
      // Send email to the user
      if (user.email) {
        const subject = 'Low Credit Balance Warning';
        const message = `Your API credit balance is running low. You currently have ${currentCredits} credits remaining.`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #2c3e50;">Low Credit Balance Warning</h2>
            <div style="padding: 15px; border-left: 4px solid #f39c12; background-color: #f8f9fa; margin: 20px 0;">
              <h3 style="margin-top: 0;">Your API Credit Balance is Low</h3>
              <p>Your account currently has <strong>${currentCredits} credits</strong> remaining, which is below the ${thresholdPercentage}% threshold.</p>
              <p>To ensure uninterrupted API access, please purchase additional credits soon.</p>
            </div>
            <p><a href="${process.env.BASE_URL || 'http://localhost:5000'}/credits" style="background-color: #3498db; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Purchase Credits</a></p>
            <p style="color: #7f8c8d; font-size: 12px;">
              This is an automated notification from your API Manager.
            </p>
          </div>
        `;
        
        // Send to user
        const msg = {
          to: user.email,
          from: process.env.EMAIL_FROM || 'noreply@apimanager.com',
          subject,
          text: message,
          html
        };
        
        await sgMail.send(msg);
        console.log(`Low credit alert email sent to user ${user.id} (${user.email})`);
      }
      
      // Also notify admins about the low balance
      const allUsers = await dbStorage.getAllUsers();
      
      // Filter to get relevant admins:
      // 1. Business admins (who oversee all)
      // 2. Client admins who are directly responsible for this user
      const relevantAdmins = allUsers.filter(admin => 
        (admin.role === 'BUSINESS_ADMIN') || 
        (admin.role === 'CLIENT_ADMIN' && user.parentUserId === admin.id)
      );
      
      for (const admin of relevantAdmins) {
        if (admin.email) {
          const subject = `Low Credit Alert: ${user.username}`;
          const message = `User ${user.username} has a low credit balance (${currentCredits} credits remaining).`;
          
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #2c3e50;">Low Credit Balance Alert</h2>
              <div style="padding: 15px; border-left: 4px solid #f39c12; background-color: #f8f9fa; margin: 20px 0;">
                <h3 style="margin-top: 0;">User Credits Running Low</h3>
                <p><strong>User:</strong> ${user.username} (${user.email || 'No email'})</p>
                <p><strong>Current Balance:</strong> ${currentCredits} credits</p>
                <p><strong>Threshold:</strong> ${threshold} credits (${thresholdPercentage}%)</p>
              </div>
              <p>You may want to contact the user or assign additional credits.</p>
              <p style="color: #7f8c8d; font-size: 12px;">
                This is an automated notification from your API Manager.
              </p>
            </div>
          `;
          
          // Send to admin
          const msgAdmin = {
            to: admin.email,
            from: process.env.EMAIL_FROM || 'noreply@apimanager.com',
            subject,
            text: message,
            html
          };
          
          await sgMail.send(msgAdmin);
          console.log(`Low credit alert email sent to admin ${admin.id} (${admin.email})`);
        }
      }
    } catch (error) {
      console.error('Failed to send low credit alert:', error);
    }
  },
  
  /**
   * Send a payment failure notification
   */
  sendPaymentFailureNotification: async (
    user: User,
    errorMessage: string,
    amount: number,
    paymentMethod: string
  ): Promise<void> => {
    try {
      // Format the amount nicely
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
      
      // Send email to the user
      if (user.email) {
        const subject = 'Payment Processing Issue';
        const message = `We encountered an issue processing your payment of ${formattedAmount}.`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #2c3e50;">Payment Processing Issue</h2>
            <div style="padding: 15px; border-left: 4px solid #e74c3c; background-color: #f8f9fa; margin: 20px 0;">
              <h3 style="margin-top: 0;">Payment Failed</h3>
              <p><strong>Amount:</strong> ${formattedAmount}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              <p><strong>Error:</strong> ${errorMessage}</p>
            </div>
            <p>Please try again with a different payment method or contact support if the issue persists.</p>
            <p style="color: #7f8c8d; font-size: 12px;">
              This is an automated notification from your API Manager.
            </p>
          </div>
        `;
        
        // Send to user
        const msg = {
          to: user.email,
          from: process.env.EMAIL_FROM || 'noreply@apimanager.com',
          subject,
          text: message,
          html
        };
        
        await sgMail.send(msg);
        console.log(`Payment failure email sent to user ${user.id} (${user.email})`);
      }
      
      // Notify admins about the payment failure
      const allUsers = await dbStorage.getAllUsers();
      
      // Filter to get relevant admins:
      // 1. Business admins (who oversee all)
      // 2. Client admins who are directly responsible for this user
      const relevantAdmins = allUsers.filter(admin => 
        (admin.role === 'BUSINESS_ADMIN') || 
        (admin.role === 'CLIENT_ADMIN' && user.parentUserId === admin.id)
      );
      
      for (const admin of relevantAdmins) {
        if (admin.email) {
          const subject = `Payment Failure Alert: ${user.username}`;
          const message = `Payment failed for user ${user.username} (${formattedAmount}).`;
          
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #2c3e50;">Payment Failure Alert</h2>
              <div style="padding: 15px; border-left: 4px solid #e74c3c; background-color: #f8f9fa; margin: 20px 0;">
                <h3 style="margin-top: 0;">User Payment Failed</h3>
                <p><strong>User:</strong> ${user.username} (${user.email || 'No email'})</p>
                <p><strong>Amount:</strong> ${formattedAmount}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                <p><strong>Error:</strong> ${errorMessage}</p>
              </div>
              <p>You may want to contact the user or consider granting a grace period.</p>
              <p style="color: #7f8c8d; font-size: 12px;">
                This is an automated notification from your API Manager.
              </p>
            </div>
          `;
          
          // Send to admin
          const msgAdmin = {
            to: admin.email,
            from: process.env.EMAIL_FROM || 'noreply@apimanager.com',
            subject,
            text: message,
            html
          };
          
          await sgMail.send(msgAdmin);
          console.log(`Payment failure alert email sent to admin ${admin.id} (${admin.email})`);
        }
      }
    } catch (error) {
      console.error('Failed to send payment failure notification:', error);
    }
  },
  
  /**
   * Send an email notification
   */
  sendEmailNotification: async (
    email: string,
    subject: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'error',
    metadata?: {
      relatedEntityType?: string,
      relatedEntityId?: number,
      link?: string
    }
  ): Promise<boolean> => {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('Cannot send email notification: SendGrid API key is not configured');
      return false;
    }
    
    try {
      // Create email content with HTML formatting
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      let linkHtml = '';
      
      if (metadata?.link) {
        const fullLink = `${baseUrl}${metadata.link}`;
        linkHtml = `<p>View details: <a href="${fullLink}">${fullLink}</a></p>`;
      }
      
      // Color based on notification type
      const typeColors = {
        info: '#3498db',
        warning: '#f39c12',
        success: '#2ecc71',
        error: '#e74c3c'
      };
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #2c3e50;">API Manager Notification</h2>
          <div style="padding: 15px; border-left: 4px solid ${typeColors[type]}; background-color: #f8f9fa; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">${message}</p>
          </div>
          ${linkHtml}
          <p style="color: #7f8c8d; font-size: 12px;">
            This is an automated notification from your API Manager.
          </p>
        </div>
      `;
      
      // Send the email
      const msg = {
        to: email,
        from: process.env.EMAIL_FROM || 'noreply@apimanager.com', // Configure a default from address
        subject,
        text: message, // Plain text fallback
        html // HTML content
      };
      
      await sgMail.send(msg);
      console.log(`Email notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  },
  
  /**
   * Get notifications for a user
   */
  getForUser: (userId: number, limit: number = 10, includeRead = false): Notification[] => {
    let userNotifications = notifications
      .filter(n => n.userId === userId);
      
    if (!includeRead) {
      userNotifications = userNotifications.filter(n => !n.read);
    }
    
    return userNotifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },
  
  /**
   * Mark a notification as read
   */
  markAsRead: (id: number): boolean => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  },
  
  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: (userId: number): number => {
    let count = 0;
    notifications.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }
};