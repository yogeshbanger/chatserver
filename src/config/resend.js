import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Helper to send email via Resend with smart error logging and testing-tier guidance
 */
const sendResendEmail = async ({ to, subject, text, html }) => {
  let fromAddress = process.env.EMAIL_FROM || "VibesChat <onboarding@resend.dev>";

  // Resend API blocks using @gmail.com / @yahoo.com directly in 'from' field without domain verification.
  // Enforce onboarding@resend.dev unless a custom domain is configured.
  if (fromAddress.toLowerCase().includes("@gmail.com") || fromAddress.toLowerCase().includes("@yahoo.com")) {
    fromAddress = "VibesChat <onboarding@resend.dev>";
  }

  try {
    let { data, error } = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    });

    if (error) {
      if (error.message?.includes("You can only send testing emails to your own email address")) {
        console.warn("\n==================================================================");
        console.warn("⚠️ [RESEND FREE TIER LIMITATION NOTICE]");
        console.warn(`Recipient: ${Array.isArray(to) ? to.join(", ") : to}`);
        console.warn(`Resend Message: ${error.message}`);
        console.warn("👉 Note: On Resend's free tier (onboarding@resend.dev), emails only deliver to your registered account email.");
        console.warn("👉 For testing with other emails, use OTP 123456 or check server logs.");
        console.warn("==================================================================\n");
      } else {
        console.error("❌ Resend API Error:", error);
      }
      return { success: false, messageId: null, error: error.message };
    }

    console.log(`✅ Resend email delivered to ${Array.isArray(to) ? to.join(", ") : to}! Message ID: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error("❌ Resend Exception:", err);
    return { success: false, messageId: null, error: err.message };
  }
};

// ======================================================
// SEND VERIFICATION OTP EMAIL
// ======================================================
export const sendEmail = async ({ fullName, otp, email }) => {
  console.log("\n==================================================");
  console.log(`🔑 [VERIFICATION OTP GENERATED] User: ${fullName} (${email}) | OTP: ${otp}`);
  console.log("==================================================\n");

  const subject = `${otp} is your VibesChat verification code`;
  const expiresMinutes = process.env.OTP_EXPIRES_IN || 5;

  const text = `Hello ${fullName},\n\nYour VibesChat verification code is: ${otp}\n\nThis code will expire in ${expiresMinutes} minutes.\n\nIf you did not request this verification, you can ignore this email.`;

  const html = `
    <div style="margin:0;padding:40px 20px;background:#f5f7ff;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:30px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:30px;letter-spacing:1px;">VibesChat</h1>
          <p style="margin:8px 0 0;color:#ddd6fe;font-size:14px;">Connect. Chat. Enjoy.</p>
        </div>
        <div style="padding:35px 30px;">
          <h2 style="margin:0 0 15px;color:#111827;font-size:24px;">Verify your email 👋</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin-bottom:25px;">
            Hello <strong>${fullName}</strong>,<br><br>
            Thanks for joining VibesChat! Use the verification code below to verify your email address.
          </p>
          <div style="background:#f3f4ff;border:2px dashed #6366f1;border-radius:14px;padding:22px;text-align:center;margin:25px 0;">
            <p style="margin:0 0 10px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Your verification code</p>
            <h1 style="margin:0;color:#4F46E5;font-size:38px;letter-spacing:10px;">${otp}</h1>
          </div>
          <p style="color:#6b7280;font-size:14px;text-align:center;">
            This OTP will expire in <strong style="color:#4F46E5;">${expiresMinutes} minutes</strong>.
          </p>
        </div>
        <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} VibesChat. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendResendEmail({ to: email, subject, text, html });
};

// ======================================================
// RESEND OTP EMAIL
// ======================================================
export const resendemail = async ({ fullName, otp, email }) => {
  console.log("\n==================================================");
  console.log(`🔑 [RESEND OTP GENERATED] User: ${fullName} (${email}) | OTP: ${otp}`);
  console.log("==================================================\n");

  const subject = `${otp} is your new VibesChat verification code`;
  const expiresMinutes = process.env.OTP_EXPIRES_IN || 5;

  const text = `Hi ${fullName},\n\nYour new VibesChat verification OTP is: ${otp}\n\nThis code will expire in ${expiresMinutes} minutes.`;

  const html = `
    <div style="margin:0;padding:40px 20px;background:#f5f7ff;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:30px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:30px;letter-spacing:1px;">VibesChat</h1>
        </div>
        <div style="padding:35px 30px;">
          <h2 style="margin:0 0 15px;color:#111827;font-size:24px;">Your new OTP 🔐</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;">Hi <strong>${fullName}</strong>,</p>
          <div style="background:#f3f4ff;border:2px dashed #6366f1;border-radius:14px;padding:22px;text-align:center;margin:25px 0;">
            <p style="margin:0 0 10px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Your new verification code</p>
            <h1 style="margin:0;color:#4F46E5;font-size:38px;letter-spacing:10px;">${otp}</h1>
          </div>
          <p style="color:#6b7280;font-size:14px;text-align:center;">
            This OTP will expire in <strong style="color:#4F46E5;">${expiresMinutes} minutes</strong>.
          </p>
        </div>
        <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} VibesChat. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return sendResendEmail({ to: email, subject, text, html });
};

// ======================================================
// RESET PASSWORD EMAIL
// ======================================================
export const sendResetPasswordEmail = async ({ fullName, resetUrl, email }) => {
  console.log("\n==================================================");
  console.log(`🔑 [RESET PASSWORD LINK GENERATED] User: ${fullName} (${email})`);
  console.log("==================================================\n");

  const subject = "Reset your VibesChat password";
  const text = `Hi ${fullName},\n\nWe received a request to reset your VibesChat password.\n\nReset your password using this link:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;

  const html = `
    <div style="margin:0;padding:40px 20px;background:#f5f7ff;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:30px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:30px;">VibesChat</h1>
        </div>
        <div style="padding:35px 30px;">
          <h2 style="margin:0 0 15px;color:#111827;font-size:24px;">Reset your password 🔐</h2>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;">
            Hi <strong>${fullName}</strong>,<br><br>
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${resetUrl}" target="_blank" style="background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px;">
              Reset Password
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendResendEmail({ to: email, subject, text, html });
};
