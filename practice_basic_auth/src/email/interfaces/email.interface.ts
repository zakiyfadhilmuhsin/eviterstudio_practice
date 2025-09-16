export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface EmailService {
  /**
   * Send an email
   * @param options Email options
   * @returns Promise<boolean> - true if successful
   */
  sendEmail(options: EmailOptions): Promise<boolean>;

  /**
   * Send verification email
   * @param to Recipient email address
   * @param token Verification token
   * @param userName User's name (optional)
   * @returns Promise<boolean>
   */
  sendVerificationEmail(to: string, token: string, userName?: string): Promise<boolean>;

  /**
   * Send password reset email
   * @param to Recipient email address
   * @param token Reset token
   * @param userName User's name (optional)
   * @returns Promise<boolean>
   */
  sendPasswordResetEmail(to: string, token: string, userName?: string): Promise<boolean>;

  /**
   * Send account reactivation email
   * @param to Recipient email address
   * @param token Reactivation token
   * @param userName User's name (optional)
   * @returns Promise<boolean>
   */
  sendAccountReactivationEmail(to: string, token: string, userName?: string): Promise<boolean>;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailConfig {
  fromName: string;
  fromAddress: string;
  smtp: SMTPConfig;
}