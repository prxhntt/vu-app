const nodemailer = require('nodemailer');

// Email transporter - Simple version
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send OTP email
const sendOTPEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🔐 Vikrant University - OTP for Admin Login',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb;">Vikrant University</h1>
                        <h2 style="color: #1e293b;">Admin Login OTP</h2>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                        <p style="font-size: 16px; color: #475569;">Your One-Time Password is:</p>
                        <h1 style="font-size: 36px; color: #2563eb; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
                        <p style="color: #64748b; font-size: 14px;">This OTP is valid for <strong>5 minutes</strong></p>
                    </div>
                    
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #94a3b8; font-size: 12px;">
                        <p>If you didn't request this OTP, please ignore this email.</p>
                        <p>&copy; 2024 Vikrant University. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ OTP send to email:');
        return true;
    } catch (error) {
        console.error('❌ Email send error:', error);
        return false;
    }
};

module.exports = { sendOTPEmail };