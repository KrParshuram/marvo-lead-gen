// email/sendEmailMessage.js
import sgMail from "@sendgrid/mail";
import Config from "../models/Config.js"; // your DB model

export const sendEmailMessage = async (to, content, subject = "Hello!") => {
  try {
    // Fetch credentials from DB
    const config = await Config.findOne();
    if (!config?.SENDGRID_API_KEY || !config?.SENDGRID_VERIFIED_SENDER) {
      throw new Error("SendGrid credentials not found in DB!");
    }

    sgMail.setApiKey(config.SENDGRID_API_KEY);

    const msg = {
      to,
      from: { email: config.SENDGRID_VERIFIED_SENDER, name: "Marvo Automation Bot" },
      subject,
      html: content
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to: ${to}`);
    return true;
  } catch (err) {
    console.error("❌ Email send error:", err.response?.body || err.message);
    return false;
  }
};
