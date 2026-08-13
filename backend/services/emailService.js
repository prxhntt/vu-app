// const nodemailer = require('nodemailer');

// // ✅ Permanent Fix - With all timeout settings
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     },
//     // ✅ Timeout settings - Kabhi timeout nahi hoga
//     connectionTimeout: 60000,      // 60 seconds
//     greetingTimeout: 60000,        // 60 seconds
//     socketTimeout: 60000,          // 60 seconds
//     // ✅ Keep connection alive
//     tls: {
//         rejectUnauthorized: false
//     },
//     // ✅ Pool connections
//     pool: true,
//     maxConnections: 1,
//     rateLimit: true
// });

// // ✅ Verify connection on startup
// transporter.verify(function(error, success) {
//     if (error) {
//         console.log('⚠️ Email transporter error:', error);
//         console.log('💡 OTP will still work (console fallback)');
//     } else {
//         console.log('✅ Email transporter ready');
//     }
// });

// const sendOTPEmail = async (email, otp) => {
   


//     try {
//         const mailOptions = {
//             from: `"Vikrant University" <${process.env.EMAIL_USER}>`,
//             to: email,
//             subject: '🔐 Vikrant University - OTP',
//             html: `
//                 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
//                     <h2 style="color: #2563eb;">🔐 Vikrant University</h2>
//                     <h3>Your OTP Code</h3>
//                     <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
//                         <h1 style="font-size: 36px; color: #2563eb; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
//                         <p style="color: #64748b;">This OTP is valid for <strong>5 minutes</strong></p>
//                     </div>
//                     <p style="color: #94a3b8; font-size: 12px; text-align: center;">Vikrant University</p>
//                 </div>
//             `
//         };

//         await transporter.sendMail(mailOptions);
//         console.log('✅ OTP send to email:');
//         return true;

//     } catch (error) {
//         console.log('❌ Email error:', error.message);
        
//         // ✅ Always return true - Login will work even if email fails
//         return true;
//     }
// };

// module.exports = { sendOTPEmail };


// ============================================
// ✅ RESEND EMAIL SERVICE - PRODUCTION READY
// ============================================

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, otp) => {
    try {
        // ✅ OTP CONSOLE LOG HATAO
        // console.log('📧 Sending OTP to:', email);
        // console.log('🔑 OTP:', otp);

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #0f172a; color: #f1f5f9;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #3b82f6;">🔐 Vu-Syllabus Portal</h1>
                    <h2 style="color: #cbd5e1;">Admin Login OTP</h2>
                </div>
                
                <div style="background: #1e293b; padding: 20px; border-radius: 8px; text-align: center;">
                    <h1 style="font-size: 36px; color: #3b82f6; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
                    <p style="color: #64748b;">This OTP is valid for <strong>5 minutes</strong></p>
                </div>
                
                <div style="margin-top: 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #334155; padding-top: 15px;">
                    <p>Vikrant University &bull; Syllabus Portal</p>
                    <p>This is an automated security notification.</p>
                </div>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: email,
            subject: '🔐 Vu-Syllabus Portal - Admin Login OTP',
            html: html
        });

        if (error) {
       
            return false;
        }

       
        return true;

    } catch (error) {
    
        return false;
    }
};

module.exports = { sendOTPEmail };