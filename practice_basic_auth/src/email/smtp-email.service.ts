import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService, EmailOptions, EmailConfig, SMTPConfig } from './interfaces/email.interface';

@Injectable()
export class SMTPEmailService implements EmailService {
  private readonly logger = new Logger(SMTPEmailService.name);
  private transporter: nodemailer.Transporter;
  private emailConfig: EmailConfig;

  constructor(private configService: ConfigService) {
    this.initializeEmailConfig();
    this.createTransporter();
  }

  private initializeEmailConfig(): void {
    this.emailConfig = {
      fromName: this.configService.get<string>('EMAIL_FROM_NAME', 'Your App'),
      fromAddress: this.configService.get<string>('EMAIL_FROM_ADDRESS', 'noreply@yourapp.com'),
      smtp: {
        host: this.configService.get<string>('SMTP_HOST', 'smtp.ethereal.email'),
        port: parseInt(this.configService.get<string>('SMTP_PORT', '587'), 10),
        secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      },
    };
  }

  private createTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.emailConfig.smtp.host,
      port: this.emailConfig.smtp.port,
      secure: this.emailConfig.smtp.secure,
      auth: {
        user: this.emailConfig.smtp.auth.user,
        pass: this.emailConfig.smtp.auth.pass,
      },
    });

    // Log configuration for development (without sensitive data)
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'development') {
      this.logger.log(`📧 Email service initialized`);
      this.logger.log(`📧 SMTP Host: ${this.emailConfig.smtp.host}`);
      this.logger.log(`📧 SMTP Port: ${this.emailConfig.smtp.port}`);
      this.logger.log(`📧 SMTP Secure: ${this.emailConfig.smtp.secure}`);
      this.logger.log(`📧 From: ${this.emailConfig.fromName} <${this.emailConfig.fromAddress}>`);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `${this.emailConfig.fromName} <${this.emailConfig.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log success for development
      const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
      if (nodeEnv === 'development') {
        this.logger.log(`✅ Email sent successfully to ${options.to}`);
        this.logger.log(`📧 Message ID: ${result.messageId}`);

        // For Ethereal.email, log preview URL
        if (this.emailConfig.smtp.host === 'smtp.ethereal.email') {
          const previewUrl = nodemailer.getTestMessageUrl(result);
          if (previewUrl) {
            this.logger.log(`🔗 Preview URL: ${previewUrl}`);
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(to: string, token: string, userName?: string): Promise<boolean> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    const subject = 'Verify Your Email Address';
    const displayName = userName || 'User';

    const html = this.generateVerificationEmailHtml(displayName, verificationUrl, token);
    const text = this.generateVerificationEmailText(displayName, verificationUrl);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(to: string, token: string, userName?: string): Promise<boolean> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const subject = 'Reset Your Password';
    const displayName = userName || 'User';

    const html = this.generatePasswordResetEmailHtml(displayName, resetUrl, token);
    const text = this.generatePasswordResetEmailText(displayName, resetUrl);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  async sendAccountReactivationEmail(to: string, token: string, userName?: string): Promise<boolean> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const reactivationUrl = `${baseUrl}/reactivate-account?token=${token}`;

    const subject = 'Reactivate Your Account';
    const displayName = userName || 'User';

    const html = this.generateAccountReactivationEmailHtml(displayName, reactivationUrl, token);
    const text = this.generateAccountReactivationEmailText(displayName, reactivationUrl);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  private generateVerificationEmailHtml(userName: string, verificationUrl: string, token: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Email Verification</h1>
            <p style="color: #6b7280; font-size: 16px;">Please verify your email address to complete your registration</p>
          </div>

          <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin-bottom: 20px;">Hello ${userName},</p>
            <p style="margin-bottom: 20px;">Thank you for registering! Please click the button below to verify your email address and activate your account.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Email Address</a>
            </div>

            <p style="margin-bottom: 20px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">${verificationUrl}</p>

            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              <strong>Security Note:</strong> This verification link will expire in 24 hours for your security.
            </p>
          </div>

          <div style="text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p style="margin-top: 20px;">Best regards,<br>The ${this.emailConfig.fromName} Team</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateVerificationEmailText(userName: string, verificationUrl: string): string {
    return `
Hello ${userName},

Thank you for registering! Please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours for your security.

If you didn't create an account, you can safely ignore this email.

Best regards,
The ${this.emailConfig.fromName} Team
    `;
  }

  private generatePasswordResetEmailHtml(userName: string, resetUrl: string, token: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin-bottom: 10px;">Password Reset Request</h1>
            <p style="color: #6b7280; font-size: 16px;">You requested to reset your password</p>
          </div>

          <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin-bottom: 20px;">Hello ${userName},</p>
            <p style="margin-bottom: 20px;">We received a request to reset your password. Click the button below to create a new password.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>

            <p style="margin-bottom: 20px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">${resetUrl}</p>

            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              <strong>Security Note:</strong> This password reset link will expire in 1 hour for your security.
            </p>
          </div>

          <div style="text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p><strong>If you didn't request a password reset, please ignore this email.</strong></p>
            <p style="margin-top: 20px;">Best regards,<br>The ${this.emailConfig.fromName} Team</p>
          </div>
        </body>
      </html>
    `;
  }

  private generatePasswordResetEmailText(userName: string, resetUrl: string): string {
    return `
Hello ${userName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This password reset link will expire in 1 hour for your security.

If you didn't request a password reset, please ignore this email.

Best regards,
The ${this.emailConfig.fromName} Team
    `;
  }

  private generateAccountReactivationEmailHtml(userName: string, reactivationUrl: string, token: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reactivate Your Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin-bottom: 10px;">Account Reactivation</h1>
            <p style="color: #6b7280; font-size: 16px;">Welcome back! Let's reactivate your account</p>
          </div>

          <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10b981;">
            <p style="margin-bottom: 20px;">Hello ${userName},</p>
            <p style="margin-bottom: 20px;">We received a request to reactivate your deactivated account. Click the button below to restore your account and regain access.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${reactivationUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reactivate Account</a>
            </div>

            <p style="margin-bottom: 20px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">${reactivationUrl}</p>

            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              <strong>Security Note:</strong> This reactivation link will expire in 24 hours for your security.
            </p>
          </div>

          <div style="text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p><strong>If you didn't request account reactivation, please ignore this email.</strong></p>
            <p>Your account will remain deactivated and secure.</p>
            <p style="margin-top: 20px;">Best regards,<br>The ${this.emailConfig.fromName} Team</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateAccountReactivationEmailText(userName: string, reactivationUrl: string): string {
    return `
Hello ${userName},

We received a request to reactivate your deactivated account. Click the link below to restore your account:

${reactivationUrl}

This reactivation link will expire in 24 hours for your security.

If you didn't request account reactivation, please ignore this email. Your account will remain deactivated and secure.

Best regards,
The ${this.emailConfig.fromName} Team
    `;
  }
}