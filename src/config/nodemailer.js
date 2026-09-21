import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "dns";
dotenv.config();

const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT) || 465;

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
};

const sendMailWithTimeout = (transporter, mailOptions, timeoutMs = 25000) => {
  return Promise.race([
    transporter.sendMail(mailOptions),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email sending timed out after 25s")), timeoutMs)
    ),
  ]);
};

const getFromAddress = () => {
  const user = process.env.EMAIL_USER;
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (user) return `"VibesChat Support" <${user}>`;
  return '"VibesChat Support" <bangerjaat111@gmail.com>';
};

export const sendEmail = async ({ fullName, otp, email }) => {
  console.log(`\n==================================================`);
  console.log(`🔑 [VERIFICATION OTP] User: ${fullName} (${email}) | OTP: ${otp}`);
  console.log(`==================================================\n`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS missing in environment. Check Render logs for OTP.");
    return { success: true, messageId: "console-fallback" };
  }

  try {
    const transporter = getTransporter();
    const fromAddress = getFromAddress();
    const info = await sendMailWithTimeout(transporter, {
      from: fromAddress,
      replyTo: process.env.EMAIL_USER || fromAddress,
      to: email,
      subject: `${otp} is your VibesChat verification code`,
      text: `Hello ${fullName}, your verification code for VibesChat is: ${otp}. This code expires in 10 minutes.`,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "High",
      },
      html: `
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
              This OTP will expire in <strong style="color:#4F46E5;">${process.env.OTP_EXPIRES_IN || 5} minutes</strong>.
            </p>
          </div>
          <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} VibesChat. All rights reserved.</p>
          </div>
        </div>
      </div>
      `,
    });

    console.log("✅ Email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email error (OTP logged in console):", error.message);
    return { success: false, messageId: "error-fallback", error: error.message };
  }
};

export const resendemail = async ({ fullName, otp, email }) => {
  console.log(`\n==================================================`);
  console.log(`🔑 [RESEND OTP] User: ${fullName} (${email}) | OTP: ${otp}`);
  console.log(`==================================================\n`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS missing in environment. Check Render logs for OTP.");
    return { success: true, messageId: "console-fallback" };
  }

  try {
    const transporter = getTransporter();
    const fromAddress = getFromAddress();
    const info = await sendMailWithTimeout(transporter, {
      from: fromAddress,
      replyTo: process.env.EMAIL_USER || fromAddress,
      to: email,
      subject: `${otp} is your new VibesChat verification code`,
      text: `Hi ${fullName}, your new VibesChat verification OTP is: ${otp}.`,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "High",
      },
      html: `
        <div style="margin:0;padding:40px 20px;background:#f5f7ff;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:30px;letter-spacing:1px;">VibesChat</h1>
            </div>
            <div style="padding:35px 30px;">
              <h2 style="margin:0 0 15px;color:#111827;font-size:24px;">Your new OTP 🔐</h2>
              <p style="color:#4b5563;font-size:15px;line-height:1.7;">Hi <strong>${fullName}</strong>,</p>
              <div style="background:#f3f4ff;border:2px dashed #6366f1;border-radius:14px;padding:22px;text-align:center;margin:25px 0;">
                <h1 style="margin:0;color:#4F46E5;font-size:38px;letter-spacing:10px;">${otp}</h1>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    console.log("✅ Resend OTP email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Resend OTP email error (OTP logged in console):", error.message);
    return { success: false, messageId: "error-fallback", error: error.message };
  }
};

export const sendResetPasswordEmail = async ({ fullName, resetUrl, email }) => {
  console.log(`\n==================================================`);
  console.log(`🔑 [RESET PASSWORD LINK] User: ${fullName} (${email}) | Link: ${resetUrl}`);
  console.log(`==================================================\n`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS missing in environment. Check Render logs for reset link.");
    return { success: true, messageId: "console-fallback" };
  }

  try {
    const transporter = getTransporter();
    const info = await sendMailWithTimeout(transporter, {
      from: getFromAddress(),
      to: email,
      subject: "Reset your VibesChat password",
      text: `Hi ${fullName}, click the link to reset your password: ${resetUrl}`,
      html: `
        <div style="margin:0;padding:40px 20px;background:#f5f7ff;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:30px;letter-spacing:1px;">VibesChat</h1>
            </div>
            <div style="padding:35px 30px;">
              <h2 style="margin:0 0 15px;color:#111827;font-size:24px;">Reset your password 🔐</h2>
              <p style="color:#4b5563;font-size:15px;line-height:1.7;">
                Hi <strong>${fullName}</strong>,<br><br>
                We received a request to reset your password. Click the button below:
              </p>
              <div style="text-align:center;margin:30px 0;">
                <a href="${resetUrl}" target="_blank" style="background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px;">Reset Password</a>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    console.log("✅ Reset password email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Reset password email error (Link logged in console):", error.message);
    return { success: false, messageId: "error-fallback", error: error.message };
  }
};

export default getTransporter;