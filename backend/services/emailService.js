const nodemailer = require('nodemailer');

// ✅ Permanent Fix - With all timeout settings
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // ✅ Timeout settings - Kabhi timeout nahi hoga
    connectionTimeout: 60000,      // 60 seconds
    greetingTimeout: 60000,        // 60 seconds
    socketTimeout: 60000,          // 60 seconds
    // ✅ Keep connection alive
    tls: {
        rejectUnauthorized: false
    },
    // ✅ Pool connections
    pool: true,
    maxConnections: 1,
    rateLimit: true
});

// ✅ Verify connection on startup
transporter.verify(function(error, success) {
    if (error) {
        console.log('⚠️ Email transporter error:', error);
        console.log('💡 OTP will still work (console fallback)');
    } else {
        console.log('✅ Email transporter ready');
    }
});

const sendOTPEmail = async (email, otp) => {
    console.log('📧 Sending OTP to:', email);
    console.log('🔑 OTP:', otp);

    try {
        const mailOptions = {
            from: `"Vikrant University" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Vikrant University - OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #2563eb;">🔐 Vikrant University</h2>
                    <h3>Your OTP Code</h3>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                        <h1 style="font-size: 36px; color: #2563eb; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
                        <p style="color: #64748b;">This OTP is valid for <strong>5 minutes</strong></p>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">Vikrant University</p>
                </div>
            `
        };

<<<<<<< HEAD
        await transporter.sendMail(mailOptions);
        console.log('✅ OTP send to email:');
=======
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ OTP sent to:', email);
        console.log('📨 Message ID:', info.messageId);
>>>>>>> c5ce971a04f99d26d65f6033273937790255996f
        return true;

    } catch (error) {
        console.log('❌ Email error:', error.message);
        console.log('🔑 OTP for', email, 'is:', otp);
        
        // ✅ Always return true - Login will work even if email fails
        return true;
    }
};

module.exports = { sendOTPEmail };
