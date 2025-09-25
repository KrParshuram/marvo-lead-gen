// routes/whatsappWebhook.js
import express from "express";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import Config from "../models/Config.js"; // DB model for config

const router = express.Router();

// Webhook verification (GET)
router.get("/webhook", async (req, res) => {
  try {
    const config = await Config.findOne({});
    const verifyToken = config?.WHATSAPP_VERIFY_TOKEN;

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token && mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified!");
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch (err) {
    console.error("Error fetching WhatsApp verify token:", err);
    res.sendStatus(500);
  }
});

// Webhook receiving (POST)
router.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (messages) {
      for (const msg of messages) {
        const from = msg.from; // sender phone in international format
        const text = msg.text?.body || "";

        // 🔹 Find matching prospect by phone & platform
        const pd = await ProspectDetailed.findOne({ 
          platform: "whatsapp", 
          platformId: from 
        });

        if (!pd) {
          console.log(`⚠️ No ProspectDetailed found for phone: ${from}`);
          continue;
        }

        // Determine which reply flag to update
        if (pd.baitSent && !pd.mainSent) {
          pd.repliedAfterBait = true;
          console.log(`✅ Prospect ${from} replied after Bait`);
        } else if (pd.mainSent) {
          pd.repliedAfterMain = true;
          console.log(`✅ Prospect ${from} replied after Main`);
        } else {
          console.log(`ℹ️ Prospect ${from} replied but no message sent yet`);
        }

        pd.status = "interested"; // optional
        pd.lastReply = {
          platform: "whatsapp",
          message: text,
          timestamp: new Date()
        };

        await pd.save();
        console.log(`✅ Updated Prospect ${from} with reply: ${text}`);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

export default router;
