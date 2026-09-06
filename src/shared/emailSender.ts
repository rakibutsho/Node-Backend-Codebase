import nodemailer from "nodemailer";
import config from "../config";
import ApiError from "../errors/ApiErrors";
import httpStatus from "http-status";

const emailSender = async (to: string, html: string, subject: string) => {
  try {
    const { email, app_pass } = config.emailSender;

    if (!email || !app_pass) {
      console.warn("Email sender is not configured (missing EMAIL or APP_PASS in environment variables).");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: email,
        pass: app_pass,
      },
    });

    const mailOptions = {
      from: `"Support" <${email}>`,
      to,
      html,
      subject,
    };

    const info = await transporter.sendMail(mailOptions);
    return info.messageId;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send email. Please check SMTP settings.", "EMAIL_SEND_FAILED");
  }
};

export default emailSender;