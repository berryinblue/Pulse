import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pulse.app';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For now, just log the email that would be sent
      console.log(`📧 EMAIL TO: ${options.to}`);
      console.log(`📧 SUBJECT: ${options.subject}`);
      console.log(`📧 CONTENT: ${options.html || options.text}`);
      console.log('---');
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const subject = 'Welcome to Pulse - Your Corporate Event Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb; text-align: center;">Welcome to Pulse!</h1>
        <p>Hi ${userName},</p>
        <p>Welcome to Pulse, your company's event management platform! You can now:</p>
        <ul>
          <li>🎉 Discover upcoming company events</li>
          <li>📅 Create your own events</li>
          <li>👥 Connect with colleagues</li>
          <li>📱 RSVP and manage your attendance</li>
        </ul>
        <p>Get started by exploring events happening at your company.</p>
        <p>Happy networking!</p>
        <p>The Pulse Team</p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  // RSVP confirmation email
  async sendRsvpConfirmationEmail(
    userEmail: string,
    userName: string,
    eventTitle: string,
    eventDate: string,
    eventLocation: string,
    status: 'confirmed' | 'waitlist'
  ): Promise<boolean> {
    const subject = status === 'confirmed' 
      ? `RSVP Confirmed: ${eventTitle}` 
      : `Added to Waitlist: ${eventTitle}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb; text-align: center;">
          ${status === 'confirmed' ? '✅ RSVP Confirmed!' : '⏳ You\'re on the Waitlist'}
        </h1>
        <p>Hi ${userName},</p>
        ${status === 'confirmed' 
          ? `<p>Your RSVP has been confirmed for:</p>`
          : `<p>You've been added to the waitlist for:</p>`
        }
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1e293b;">${eventTitle}</h2>
          <p><strong>📅 Date:</strong> ${eventDate}</p>
          <p><strong>📍 Location:</strong> ${eventLocation}</p>
        </div>
        
        ${status === 'confirmed' 
          ? `<p>We look forward to seeing you there!</p>`
          : `<p>We'll notify you if a spot becomes available.</p>`
        }
        
        <p>Best regards,<br>The Pulse Team</p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  // RSVP cancellation email
  async sendRsvpCancellationEmail(
    userEmail: string,
    userName: string,
    eventTitle: string
  ): Promise<boolean> {
    const subject = `RSVP Cancelled: ${eventTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626; text-align: center;">❌ RSVP Cancelled</h1>
        <p>Hi ${userName},</p>
        <p>Your RSVP has been cancelled for:</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1e293b;">${eventTitle}</h2>
        </div>
        
        <p>If this was a mistake, you can RSVP again anytime through the Pulse platform.</p>
        
        <p>Best regards,<br>The Pulse Team</p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }
}

export const emailService = EmailService.getInstance();