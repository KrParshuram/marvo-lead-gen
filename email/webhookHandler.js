import express from "express";
import dotenv from "dotenv";
import ProspectDetailed from "../models/prospectDetailedSchema.js"; // same schema as WhatsApp
// import { sendEmailMessage } from "../services/emailSender.js";

dotenv.config();
const router = express.Router();

// SendGrid Webhook for inbound replies
router.post("/webhook", express.json(), async (req, res) => {
  try {
    const events = req.body; // array of SendGrid events

    for (const event of events) {
      const recipient = event.email;
      const replyText = event.text || "";

      if (!recipient) continue;

      // 🔹 Find matching prospect by platform "email" and platformId = recipient email
      const pd = await ProspectDetailed.findOne({ platform: "email", platformId: recipient });
      if (!pd) {
        console.log(`⚠️ No ProspectDetailed found for email: ${recipient}`);
        continue;
      }

      // Determine which reply flag to update
      if (pd.baitSent && !pd.mainSent) {
        pd.repliedAfterBait = true;
        console.log(`✅ Prospect ${recipient} replied after Bait email`);
      } else if (pd.mainSent) {
        pd.repliedAfterMain = true;
        console.log(`✅ Prospect ${recipient} replied after Main email`);
      } else {
        console.log(`ℹ️ Prospect ${recipient} replied but no email sent yet`);
      }

      // pd.status = "interested"; // optional
      // pd.lastReply = {
      //   platform: "email",
      //   message: replyText,
      //   timestamp: new Date()
      // };

      await pd.save();
      console.log(`✅ Updated Prospect ${recipient} with reply: ${replyText}`);

      // Optional: send auto-reply
      // if (!pd.replyAutoSent) {
      //   await sendEmailMessage(
      //     recipient,
      //     `Hi ${pd.name || "there"},\n\nThanks for your reply! Our team will get back to you soon.`,
      //     "Thank you for your reply!"
      //   );
      //   pd.replyAutoSent = true;
      //   await pd.save();
      //   console.log(`✅ Auto-reply sent to: ${recipient}`);
      // }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Email webhook error:", err);
    res.sendStatus(500);
  }
});

export default router;
