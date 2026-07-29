require('dotenv').config();
const nodemailer = require('nodemailer');

async function getTransporter() {
    const isProduction = process.env.NODE_ENV === 'production';
    const host = process.env.SMTP_HOST;

    if (isProduction && !host) {
        throw new Error("[Mailer Fatal] Production environment detected but SMTP_HOST is not configured!");
    }

    if (host) {
        console.log(`[Mailer] Using SMTP Server: ${host}:${process.env.SMTP_PORT || 587} (${process.env.SMTP_USER})`);
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        // Development / Testing fallback via Ethereal Email
        const testAccount = await nodemailer.createTestAccount();
        console.log(`[Mailer Dev] Generated Ethereal SMTP test account: ${testAccount.user}`);
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }
}

async function sendResetPasswordEmail(toEmail, resetToken) {
    const transporter = await getTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const fromAddress = process.env.SMTP_FROM || `"Glaze" <${process.env.SMTP_USER || 'noreply@glaze.local'}>`;

    const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: 'Password Reset Request - Glaze',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #0f172a; color: #f8fafc;">
                <h2 style="color: #6366f1;">Reset Your Password</h2>
                <p>We received a request to reset your password for your Glaze account.</p>
                <p>Click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.</p>
                <div style="margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
                <p style="font-size: 11px; color: #64748b;">Direct link: <a href="${resetUrl}" style="color: #818cf8;">${resetUrl}</a></p>
            </div>
        `
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        console.log(`[Mailer Dev] Reset Password Email Sent! Preview URL: ${previewUrl}`);
    } else {
        console.log(`[Mailer] Reset Password Email successfully sent to Gmail (${toEmail})! MessageId: ${info.messageId}`);
    }
    return { info, previewUrl };
}

async function sendEmailVerificationEmail(toEmail, verifyToken) {
    const transporter = await getTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${verifyToken}`;
    const fromAddress = process.env.SMTP_FROM || `"Glaze" <${process.env.SMTP_USER || 'noreply@glaze.local'}>`;

    const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: 'Confirm Your Email Address - Glaze',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #0f172a; color: #f8fafc;">
                <h2 style="color: #6366f1;">Confirm Your Email</h2>
                <p>Please click the button below to confirm your recovery email address.</p>
                <div style="margin: 30px 0;">
                    <a href="${verifyUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
                </div>
                <p style="font-size: 12px; color: #94a3b8;">Link valid for 24 hours.</p>
            </div>
        `
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        console.log(`[Mailer Dev] Verification Email Sent! Preview URL: ${previewUrl}`);
    } else {
        console.log(`[Mailer] Verification Email successfully sent to Gmail (${toEmail})! MessageId: ${info.messageId}`);
    }
    return { info, previewUrl };
}

module.exports = {
    sendResetPasswordEmail,
    sendEmailVerificationEmail
};
