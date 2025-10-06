import express from "express";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import Config from "../models/Config.js"; // Your DB collection for storing platform configs
import { getQueues } from "../queues.js";

const router = express.Router();

// Webhook verification (GET)
router.get("/webhook", async (req, res) => {
  try {
    // Fetch Instagram verify token from DB
    const config = await Config.findOne({});
    const verifyToken = config?.INSTAGRAM_VERIFY_TOKEN;

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token && mode === "subscribe" && token === verifyToken) {
      console.log("Instagram webhook verified!");
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch (err) {
    console.error("Error fetching Instagram config:", err);
    return res.sendStatus(500);
  }
});

// Webhook receiving (POST)
router.post("/webhook", async (req, res) => {
  console.log("📩 Incoming IG Webhook:", JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry || [];
    for (const e of entry) {
  const events = e.messaging || [];
  for (const event of events) {
    // Only process real text messages
    // if (!event.message || !event.message.text) continue;

    const senderId = event.sender?.id;
    const messageText = event.message.text;

    // if (!senderId) continue;

        try {
          // Find ProspectDetailed by platform + platformId
          const prospectDetail = await ProspectDetailed.findOne({ platform: 'instagram' });

          if (prospectDetail) {
            // Determine reply type
            if (!prospectDetail.repliedAfterBait) {
              prospectDetail.repliedAfterBait = true;
              console.log(`✅ Prospect ${prospectDetail._id} replied after Bait`);
            } 
            
            if (!messageText) continue;
            // if (!prospectDetail.repliedAfterMain) {
            //   prospectDetail.repliedAfterMain = true;
            //   prospectDetail.status = 'interested';
            //   console.log(`✅ Prospect ${prospectDetail._id} replied after Main`);
            // }

            
            // prospectDetail.lastReply = {
            //   platform: 'instagram',
            //   message: messageText,
            //   timestamp: new Date()
            // };

            await prospectDetail.save();
            console.log(`Updated ProspectDetailed ${prospectDetail._id} with IG reply: "${messageText}"`);

            // Queue Main if replied after bait
            // if (prospectDetail.repliedAfterBait && !prospectDetail.mainSent) {
            //   const { mainQueue } = getQueues();
            //   if (mainQueue) {
            //     console.log(`⏳ Queuing Main message for ${prospectDetail._id}`);
            //     await mainQueue.add({ prospectDetailId: prospectDetail._id });
            //   }
            // }

          } else {
            console.warn(`⚠️ No ProspectDetailed found for IG senderId: ${senderId}`);
          }

        } catch (err) {
          console.error("Failed to update ProspectDetailed for IG reply:", err);
        }
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("IG Webhook handler crashed:", err);
    res.sendStatus(500);
  }
});

export default router;
