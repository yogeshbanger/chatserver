import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: Number(process.env.EMAIL_PORT || 465) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ fullName, otp, email }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"VibesChat" <bangerjaat111@gmail.com>',
      to: email,
      subject: "Verify your VibesChat account",
      text: `Your VibesChat verification OTP is: ${otp}`,
      html: `
      <div style="
        margin:0;
        padding:40px 20px;
        background:#f5f7ff;
        font-family:Arial,Helvetica,sans-serif;
      ">
        <div style="
          max-width:520px;
          margin:auto;
          background:#ffffff;
          border-radius:20px;
          overflow:hidden;
          box-shadow:0 10px 30px rgba(0,0,0,0.08);
        ">

          <!-- Header -->
          <div style="
            background:linear-gradient(135deg,#4F46E5,#7C3AED);
            padding:30px;
            text-align:center;
          ">
            <h1 style="
              margin:0;
              color:#ffffff;
              font-size:30px;
              letter-spacing:1px;
            ">
              VibesChat
            </h1>

            <p style="
              margin:8px 0 0;
              color:#ddd6fe;
              font-size:14px;
            ">
              Connect. Chat. Enjoy.
            </p>
          </div>

          <!-- Content -->
          <div style="padding:35px 30px;">

            <h2 style="
              margin:0 0 15px;
              color:#111827;
              font-size:24px;
            ">
              Verify your email 👋
            </h2>

            <p style="
              color:#4b5563;
              font-size:15px;
              line-height:1.7;
              margin-bottom:25px;
            ">
              Hello <strong>${fullName}</strong>,
              <br><br>
              Thanks for joining VibesChat! Use the verification code below
              to verify your email address.
            </p>

            <!-- OTP Box -->
            <div style="
              background:#f3f4ff;
              border:2px dashed #6366f1;
              border-radius:14px;
              padding:22px;
              text-align:center;
              margin:25px 0;
            ">
              <p style="
                margin:0 0 10px;
                color:#6b7280;
                font-size:13px;
                text-transform:uppercase;
                letter-spacing:2px;
              ">
                Your verification code
              </p>

              <h1 style="
                margin:0;
                color:#4F46E5;
                font-size:38px;
                letter-spacing:10px;
              ">
                ${otp}
              </h1>
            </div>

            <p style="
              color:#6b7280;
              font-size:14px;
              text-align:center;
            ">
              This OTP will expire in
              <strong style="color:#4F46E5;">
                ${process.env.OTP_EXPIRES_IN || 5} minutes
              </strong>.
            </p>

            <p style="
              color:#9ca3af;
              font-size:13px;
              line-height:1.6;
              margin-top:25px;
            ">
              If you didn't create a VibesChat account, you can safely ignore
              this email.
            </p>

          </div>

          <!-- Footer -->
          <div style="
            background:#f9fafb;
            padding:20px;
            text-align:center;
            border-top:1px solid #e5e7eb;
          ">
            <p style="
              margin:0;
              color:#9ca3af;
              font-size:12px;
            ">
              © ${new Date().getFullYear()} VibesChat. All rights reserved.
            </p>

            <p style="
              margin:7px 0 0;
              color:#9ca3af;
              font-size:12px;
            ">
              This is an automated email. Please do not reply.
            </p>
          </div>

        </div>
      </div>
    `,
    });

    console.log("Message sent: %s", info.messageId);

  

  } 
  
   catch (error) {
    console.error("❌ Email error:", error.message);
    throw error;
  }
};



export const resendemail = async ({ fullName, otp, email }) => {
  try {
    const info = await transporter.sendMail({
      from: '"VibesChat" <bangerjaat111@gmail.com>',
      to: email,
      subject: "Your new VibesChat verification code",
      text: `Hi ${fullName}, your new VibesChat verification OTP is: ${otp}. This OTP is valid for ${process.env.OTP_EXPIRES_IN || 5} minutes.`,
      html: `
        <div style="
          margin:0;
          padding:40px 20px;
          background:#f5f7ff;
          font-family:Arial,Helvetica,sans-serif;
        ">
          <div style="
            max-width:520px;
            margin:auto;
            background:#ffffff;
            border-radius:20px;
            overflow:hidden;
            box-shadow:0 10px 30px rgba(0,0,0,0.08);
          ">

            <!-- Header -->
            <div style="
              background:linear-gradient(135deg,#4F46E5,#7C3AED);
              padding:30px;
              text-align:center;
            ">
              <h1 style="
                margin:0;
                color:#ffffff;
                font-size:30px;
                letter-spacing:1px;
              ">
                ChatApp
              </h1>

              <p style="
                margin:8px 0 0;
                color:#ddd6fe;
                font-size:14px;
              ">
                Connect. Chat. Enjoy.
              </p>
            </div>

            <!-- Content -->
            <div style="padding:35px 30px;">

              <h2 style="
                margin:0 0 15px;
                color:#111827;
                font-size:24px;
              ">
                Your new OTP 🔐
              </h2>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                Hi <strong>${fullName}</strong>,
              </p>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
              ">
                We received a request to resend the verification code
                for your VibesChat account.
              </p>

              <!-- Resend Notice -->
              <div style="
                background:#eef2ff;
                border-left:4px solid #4F46E5;
                padding:12px 15px;
                margin:20px 0;
                border-radius:6px;
              ">
                <p style="
                  margin:0;
                  color:#4338CA;
                  font-size:13px;
                  line-height:1.5;
                ">
                  Your previous OTP is no longer valid.
                  Please use the new OTP below.
                </p>
              </div>

              <!-- OTP Box -->
              <div style="
                background:#f3f4ff;
                border:2px dashed #6366f1;
                border-radius:14px;
                padding:22px;
                text-align:center;
                margin:25px 0;
              ">
                <p style="
                  margin:0 0 10px;
                  color:#6b7280;
                  font-size:13px;
                  text-transform:uppercase;
                  letter-spacing:2px;
                ">
                  New verification code
                </p>

                <h1 style="
                  margin:0;
                  color:#4F46E5;
                  font-size:38px;
                  letter-spacing:10px;
                ">
                  ${otp}
                </h1>
              </div>

              <!-- Expiry -->
              <p style="
                color:#6b7280;
                font-size:14px;
                text-align:center;
              ">
                This OTP will expire in
                <strong style="color:#4F46E5;">
                  ${process.env.OTP_EXPIRES_IN || 5} minutes
                </strong>.
              </p>

              <p style="
                color:#9ca3af;
                font-size:13px;
                line-height:1.6;
                margin-top:25px;
              ">
                For your security, never share this OTP with anyone.
                ChatApp will never ask you for your verification code.
              </p>

            </div>

            <!-- Footer -->
            <div style="
              background:#f9fafb;
              padding:20px;
              text-align:center;
              border-top:1px solid #e5e7eb;
            ">
              <p style="
                margin:0;
                color:#9ca3af;
                font-size:12px;
              ">
                © ${new Date().getFullYear()} VibesChat. All rights reserved.
              </p>

              <p style="
                margin:7px 0 0;
                color:#9ca3af;
                font-size:12px;
              ">
                This is an automated email. Please do not reply.
              </p>
            </div>

          </div>
        </div>
      `,
    });

    console.log("Resend OTP email sent: %s", info.messageId);

  } catch (error) {
    console.error("❌ Resend OTP email error:", error.message);
    throw error;
  }
};

export const sendResetPasswordEmail = async ({ fullName, resetUrl, email }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"VibesChat" <bangerjaat111@gmail.com>',
      to: email,
      subject: "Reset your VibesChat password",
      text: `Hi ${fullName}, click the link to reset your password: ${resetUrl}`,
      html: `
        <div style="
          margin:0;
          padding:40px 20px;
          background:#f5f7ff;
          font-family:Arial,Helvetica,sans-serif;
        ">
          <div style="
            max-width:520px;
            margin:auto;
            background:#ffffff;
            border-radius:20px;
            overflow:hidden;
            box-shadow:0 10px 30px rgba(0,0,0,0.08);
          ">
            <div style="
              background:linear-gradient(135deg,#4F46E5,#7C3AED);
              padding:30px;
              text-align:center;
            ">
              <h1 style="margin:0; color:#ffffff; font-size:30px; letter-spacing:1px;">ChatApp</h1>
              <p style="margin:8px 0 0; color:#ddd6fe; font-size:14px;">Connect. Chat. Enjoy.</p>
            </div>
            <div style="padding:35px 30px;">
              <h2 style="margin:0 0 15px; color:#111827; font-size:24px;">Reset your password 🔐</h2>
              <p style="color:#4b5563; font-size:15px; line-height:1.7;">
                Hi <strong>${fullName}</strong>,<br><br>
                We received a request to reset your password for your ChatApp account. Click the button below to set a new password:
              </p>
              <div style="text-align:center; margin:30px 0;">
                <a href="${resetUrl}" target="_blank" style="
                  background:linear-gradient(135deg,#4F46E5,#7C3AED);
                  color:#ffffff;
                  padding:14px 28px;
                  border-radius:10px;
                  text-decoration:none;
                  font-weight:bold;
                  display:inline-block;
                  font-size:16px;
                ">Reset Password</a>
              </div>
              <p style="color:#6b7280; font-size:14px; text-align:center;">
                Or copy and paste this link in your browser:<br>
                <a href="${resetUrl}" style="color:#4F46E5; word-break:break-all;">${resetUrl}</a>
              </p>
              <p style="color:#9ca3af; font-size:13px; line-height:1.6; margin-top:25px;">
                This link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>
            <div style="background:#f9fafb; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="margin:0; color:#9ca3af; font-size:12px;">© ${new Date().getFullYear()} ChatApp. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Reset password email sent: %s", info.messageId);
  } catch (error) {
    console.error("❌ Reset password email error:", error.message);
    throw error;
  }
};
  
export default transporter;