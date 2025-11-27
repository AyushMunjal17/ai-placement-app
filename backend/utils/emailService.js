const nodemailer = require('nodemailer');

// Create transporter - using Gmail as default (can be configured via env)
const createTransporter = () => {
  // For production, use environment variables
  // For development, you can use Gmail with app password or other SMTP services
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use app password for Gmail
    }
  });

  // Alternative: Use SMTP directly
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: process.env.SMTP_PORT || 587,
  //   secure: false,
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASSWORD
  //   }
  // });

  return transporter;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, firstName) => {
  try {
    const transporter = createTransporter();

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

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset OTP email
const sendPasswordResetOTP = async (email, otp, firstName) => {
  try {
    const transporter = createTransporter();

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

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetOTP,
  generateOTP,
  createTransporter
};

