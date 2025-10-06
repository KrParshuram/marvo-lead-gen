import express from "express";
import Campaign from "../models/Campaign.js";
import Prospect from "../models/Prospect.js";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import { getQueues } from "../queues.js";
import { safeAdd } from "../queueHelpers.js"; 

const router = express.Router();

router.post("/run-campaign/:campaignId", async (req, res) => {
  const { campaignId } = req.params;

  try {
    // 1️⃣ Fetch the campaign
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return res.status(404).send("Campaign not found");

    const campaignPlatform = campaign.platform;
    if (!campaignPlatform) return res.status(400).send("Campaign platform not defined");

    // 2️⃣ Fetch all prospects for campaign lists
    const allProspects = await Prospect.find({ listId: { $in: campaign.prospectLists } });

    // 3️⃣ Filter prospects based on platform
    const filteredProspects = allProspects.filter(p => {
      switch (campaignPlatform) {
        case "facebook": return p.fb;
        case "sms": return p.sms;
        case "whatsapp": return p.wtsp;
        case "email": return p.mail;
        case "instagram": return p.insta;
        default: return false;
      }
    });

    // Remove duplicates
    const uniqueProspects = Array.from(new Set(filteredProspects.map(p => p._id.toString())))
      .map(id => filteredProspects.find(p => p._id.toString() === id));

    // 4️⃣ Check existing ProspectDetailed
    const existingRecords = await ProspectDetailed.find({
      campaign: campaign._id,
      platform: campaignPlatform,
      prospect: { $in: uniqueProspects.map(p => p._id) },
    });

    const existingProspects = new Set(existingRecords.map(r => r.prospect.toString()));

    const newProspectDetails = [];

    uniqueProspects.forEach(p => {
      if (!existingProspects.has(p._id.toString())) {
        const platformMap = { facebook: "fb", sms: "sms", whatsapp: "wtsp", email: "mail", instagram: "insta" };
        const platformId = p[platformMap[campaignPlatform]];
        if (platformId) {
          newProspectDetails.push({
            prospect: p._id,
            campaign: campaign._id,
            platform: campaignPlatform,
            platformId,
            totalFollowUp: campaign.followUps.length,
          });
        }
      }
    });

    // 5️⃣ Insert new ProspectDetailed first
    let insertedRecords = [];
    if (newProspectDetails.length > 0) {
      insertedRecords = await ProspectDetailed.insertMany(newProspectDetails);
      console.log(`Inserted ${insertedRecords.length} new ProspectDetailed records.`);
    }

    // 6️⃣ Enqueue jobs with real IDs
    // const { baitQueue } = getQueues();
    // insertedRecords.forEach(pd => {
    //   baitQueue.add({ prospectDetailId: pd._id.toString() });
    //   console.log(`Queued bait message for prospect ${pd.prospect} on ${pd.platform}`);
    // });

    const { baitQueue } = getQueues();
    for (const pd of insertedRecords) {
      // create an explicit sanitized payload (only primitives/strings)
      const payload = {
        prospectDetailId: pd._id.toString(),
        // prospectId: pd.prospect?.toString?.() ?? null,
        // campaignId: pd.campaign?.toString?.() ?? null,
        // platform: String(pd.platform || ""),
        // platformId: String(pd.platformId || ""),
      };

      // safeAdd will sanitize again and enforce numeric opts
      await safeAdd(baitQueue, payload);
      console.log(`Queued bait message for prospect ${pd.prospect} on ${pd.platform}`);
    }


    res.send({ success: true, message: "Campaign started and bait messages queued." });
  } catch (err) {
    console.error("Server error during campaign run:", err);
    res.status(500).send("Server error");
  }
});

export default router;
