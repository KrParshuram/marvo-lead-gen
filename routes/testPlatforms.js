import express from "express";
import { sendEmailMessage } from "../email/sendEmailMessage.js";
import { sendSMSMessage } from "../sms/sendSMSMessage.js";
import { sendWhatsAppMessage } from "../whatsapp/sendWtspMessage.js";
import { sendMainMessage } from "../facebook/facebookMain/sendMainMessage.js";
import { sendInstaMessage } from "../insta/sendInstaMessage.js";
import Config from "../models/Config.js"; // to get test numbers/emails
import Prospect from "../models/Prospect.js";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import prospectList from "../models/prospectList.js";
import Campaign from "../models/Campaign.js";

const router = express.Router();

// -----------------------
// Test all platforms
// -----------------------
router.post("/test-all", async (req, res) => {
  try {
    const config = await Config.findOne({}); // load all credentials
    const results = {};

    // 1. Test Email
    try {
      if (config?.SENDGRID_VERIFIED_SENDER) {
        await sendEmailMessage(config.SENDGRID_VERIFIED_SENDER, "<p>Test Email from Marvo</p>", "Test Email");
        results.email = "✅ Email sent";
      } else results.email = "⚠️ Email config missing";
    } catch (err) { results.email = "❌ " + err.message; }

    // 2. Test SMS
    try {
      if (config?.TEST_PHONE_NUMBER) {
        await sendSMSMessage(config.TEST_PHONE_NUMBER, "🚀 Test SMS from Marvo");
        results.sms = "✅ SMS sent";
      } else results.sms = "⚠️ SMS config missing";
    } catch (err) { results.sms = "❌ " + err.message; }

    // 3. Test WhatsApp
    try {
      if (config?.TEST_PHONE_NUMBER) {
        await sendWhatsAppMessage(config.TEST_PHONE_NUMBER, "🚀 Test WhatsApp message from Marvo");
        results.whatsapp = "✅ WhatsApp sent";
      } else results.whatsapp = "⚠️ WhatsApp config missing";
    } catch (err) { results.whatsapp = "❌ " + err.message; }

    // 4. Test Facebook Messenger
    try {
      if (config?.FB_TEST_USER_ID) {
        await sendMainMessage(config.FB_TEST_USER_ID, "🚀 Test FB message from Marvo");
        results.facebook = "✅ FB message sent";
      } else results.facebook = "⚠️ FB config missing";
    } catch (err) { results.facebook = "❌ " + err.message; }

    // 5. Test Instagram DM
    try {
      if (config?.INSTA_TEST_USER_ID) {
        await sendInstaMessage(config.INSTA_TEST_USER_ID, "🚀 Test IG DM from Marvo");
        results.instagram = "✅ IG DM sent";
      } else results.instagram = "⚠️ IG config missing";
    } catch (err) { results.instagram = "❌ " + err.message; }

    res.json({ success: true, results });
  } catch (err) {
    console.error("❌ Test all platforms failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------
// Reset database (no resetDb.js)
// -----------------------
router.post("/reset-db", async (req, res) => {
  try {
    const detailedResult = await ProspectDetailed.deleteMany({});
    const prospectResult = await Prospect.deleteMany({});
    const listResult = await prospectList.deleteMany({});
    const campaignResult = await Campaign.deleteMany({});

    console.log(`🗑️ Deleted ${detailedResult.deletedCount} ProspectDetailed records`);
    console.log(`🗑️ Deleted ${prospectResult.deletedCount} Prospect records`);
    console.log(`🗑️ Deleted ${listResult.deletedCount} ProspectList records`);
    console.log(`🗑️ Deleted ${campaignResult.deletedCount} Campaign records`);

    res.json({
      success: true,
      message: "Database reset completed",
      deleted: {
        detailed: detailedResult.deletedCount,
        prospects: prospectResult.deletedCount,
        lists: listResult.deletedCount,
        campaigns: campaignResult.deletedCount,
      },
    });
  } catch (err) {
    console.error("❌ Reset DB failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
