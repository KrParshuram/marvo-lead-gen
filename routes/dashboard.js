import express from "express";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import Campaign from "../models/Campaign.js";

const router = express.Router();

router.get("/dashboard/campaign/:campaignId", async (req, res) => {
  const { campaignId } = req.params;

  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).send("Campaign not found");

    const allProspects = await ProspectDetailed.find({ campaign: campaignId });

    const totalProspects = allProspects.length;
    const baitSent = allProspects.filter(p => p.baitSent).length;
    const repliedAfterBait = allProspects.filter(p => p.repliedAfterBait).length;
    const mainSent = allProspects.filter(p => p.mainSent).length;
    const repliedAfterMain = allProspects.filter(p => p.repliedAfterMain).length;
    const followUpsSent = allProspects.reduce((sum, p) => sum + p.followUpSent, 0);

    // Example: leads are prospects who replied after main
    const totalLeads = repliedAfterMain;

    res.json({
      campaignId,
      name: campaign.name,
      totalProspects,
      baitSent,
      repliedAfterBait,
      mainSent,
      repliedAfterMain,
      totalLeads,
      followUpsSent
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// GET /api/dashboard/prospects?campaignId=xxx&platform=sms
router.get("/dashboard/prospects", async (req, res) => {
  try {
    const { campaignId, platform } = req.query;

    // Build filter dynamically
    const filter = {};
    if (campaignId) filter.campaign = campaignId;
    if (platform) filter.platform = platform;

    const prospects = await ProspectDetailed.find(filter).populate("prospect");

    const result = prospects.map(pd => {
      let status = "cold";
      if (pd.repliedAfterMain) status = "hot";
      else if (pd.repliedAfterBait) status = "warm";

      return {
        prospectId: pd.prospect._id,
        name: pd.prospect.name,
        platform: pd.platform,
        status,
        baitSent: pd.baitSent,
        repliedAfterBait: pd.repliedAfterBait,
        mainSent: pd.mainSent,
        repliedAfterMain: pd.repliedAfterMain,
        followUpSent: pd.followUpSent,
        nextFollowUpAt: pd.nextFollowUpAt,
        campaignId: pd.campaign // optional, to show which campaign this prospect belongs to
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// GET /api/dashboard/prospect/:prospectId
router.get("/dashboard/prospect/:prospectId", async (req, res) => {
  const { prospectId } = req.params;
  const pd = await ProspectDetailed.findById(prospectId).populate("prospect");
  if (!pd) return res.status(404).send("Prospect not found");

  let status = "cold";
  if (pd.repliedAfterMain) status = "hot";
  else if (pd.repliedAfterBait) status = "warm";

  res.json({
    prospectId: pd.prospect._id,
    name: pd.prospect.name,
    platform: pd.platform,
    status,
    baitSent: pd.baitSent,
    repliedAfterBait: pd.repliedAfterBait,
    mainSent: pd.mainSent,
    repliedAfterMain: pd.repliedAfterMain,
    followUpSent: pd.followUpSent,
    nextFollowUpAt: pd.nextFollowUpAt,
    campaignId: pd.campaign
  });
});




export default router;



