const nodemailer = require('nodemailer');

// For development/testing: use Mailtrap or Gmail
// For Gmail: use an App Password (not your regular password)
// Generate at: https://myaccount.google.com/apppasswords

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
});

// Function to send OTP email
const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@bvriteventhub.com',
      to: email,
      subject: 'Your OTP for BVRIT Event Hub Login',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #030235; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2>BVRIT Event Hub</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <h3 style="color: #030235;">Login Verification</h3>
            <p>Your OTP for login is:</p>
            <div style="background-color: #030235; color: #ff5722; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you did not request this OTP, please ignore this email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };
