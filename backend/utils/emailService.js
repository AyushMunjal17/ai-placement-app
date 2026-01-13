const nodemailer = require('nodemailer');

// Create transporter - using Gmail as default (can be configured via env)
const createTransporter = () => {
  const hasServiceConfig = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
  const hasSMTPConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD;

  if (!hasServiceConfig && !hasSMTPConfig) {
    console.error('❌ Email configuration missing! Provide either EMAIL_USER/EMAIL_PASSWORD or SMTP_HOST/SMTP_USER/SMTP_PASSWORD in the backend .env file.');
    return null;
  }

  try {
    let transporter;
    
    // Check if SMTP configuration is provided (alternative method)
    if (hasSMTPConfig) {
      // Use SMTP directly (more reliable for Gmail)
      console.log('📧 Using SMTP configuration');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // Use service configuration (Gmail, etc.)
      console.log('📧 Using service configuration:', process.env.EMAIL_SERVICE || 'gmail');
      if (!hasServiceConfig) {
        console.error('❌ EMAIL_USER/EMAIL_PASSWORD must be set when SMTP override is not provided.');
        return null;
      }

      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD // Use app password for Gmail
        }
      });
    }

    return transporter;
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error);
    console.error('Error details:', error.message);
    return null;
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, firstName) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('❌ Cannot send email: Email transporter not configured');
      return { 
        success: false, 
        error: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in backend .env file.' 
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - AI Placement System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">AI Placement System</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${firstName}!</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Thank you for registering with AI Placement System. To complete your registration, please verify your email address using the OTP below:
            </p>
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
              This OTP will expire in 10 minutes. If you didn't create an account with us, please ignore this email.
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `
    };

    // Verify connection before sending
    await transporter.verify();
    console.log('✅ Email server connection verified');

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    console.log('📧 Email sent to:', email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error response:', error.response);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your EMAIL_USER and EMAIL_PASSWORD in .env file. For Gmail, make sure you\'re using an App Password, not your regular password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check your internet connection and email service configuration.';
    } else if (error.response) {
      errorMessage = `Email service error: ${error.response}`;
    }
    
    return { success: false, error: errorMessage, details: error.code };
  }
};

// Send password reset OTP email
const sendPasswordResetOTP = async (email, otp, firstName) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('❌ Cannot send email: Email transporter not configured');
      return { 
        success: false, 
        error: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in backend .env file.' 
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Password - AI Placement System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">AI Placement System</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${firstName}!</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. Use the OTP below to verify your identity and set a new password:
            </p>
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
              This OTP will expire in 10 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
            <p style="color: #dc2626; font-size: 14px; font-weight: bold; margin-top: 20px;">
              ⚠️ Never share this OTP with anyone. Our team will never ask for it.
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `
    };

    // Verify connection before sending
    await transporter.verify();
    console.log('✅ Email server connection verified');

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    console.log('📧 Email sent to:', email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error response:', error.response);
    
    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your EMAIL_USER and EMAIL_PASSWORD in .env file. For Gmail, make sure you\'re using an App Password, not your regular password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check your internet connection and email service configuration.';
    } else if (error.response) {
      errorMessage = `Email service error: ${error.response}`;
    }
    
    return { success: false, error: errorMessage, details: error.code };
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetOTP,
  generateOTP,
  createTransporter
};

