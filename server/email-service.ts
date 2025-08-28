import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pulse.app';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // redirect URL
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    try {
      const accessToken = await oauth2Client.getAccessToken();

      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: FROM_EMAIL,
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
          refreshToken: REFRESH_TOKEN,
          accessToken: accessToken.token,
        },
      } as nodemailer.TransporterOptions);

      return this.transporter;
    } catch (error) {
      console.error('Failed to create email transporter:', error);
      throw new Error('Email service not properly configured');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
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