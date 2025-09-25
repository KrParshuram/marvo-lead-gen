import { Router } from "express";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

/**
 * Handles incoming Twilio SMS replies
 */
router.post("/reply", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { From, Body } = req.body;

    console.log("📩 Incoming SMS reply:", { from: From, body: Body });

    let prospectDetail = await ProspectDetailed.findOne({ phone: From }).sort({ createdAt: -1 });

    if (!prospectDetail) {
      console.warn(`❌ No ProspectDetailed record found for phone: ${From}`);
      return res.status(404).send("Prospect not found");
    }

    if (!prospectDetail.repliedAfterBait) {
      prospectDetail.repliedAfterBait = true;
      prospectDetail.status = "replied";
      await prospectDetail.save();

      console.log(`✅ Prospect ${prospectDetail._id} replied after bait.`);
    } else if (!prospectDetail.repliedAfterMain) {
      prospectDetail.repliedAfterMain = true;
      prospectDetail.status = "interested";
      await prospectDetail.save();

      console.log(`✅ Prospect ${prospectDetail._id} replied after main. Marked as interested.`);
    } else {
      prospectDetail.replies = [
        ...(prospectDetail.replies || []),
        { body: Body, date: new Date() },
      ];
      await prospectDetail.save();

      console.log(`ℹ️ Stored extra reply for ${prospectDetail._id}`);
    }

    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
  } catch (err) {
    console.error("❌ Error handling SMS reply:", err);
    res.status(500).send("Server error");
  }
});

export default router;
