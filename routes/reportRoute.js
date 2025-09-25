import express from "express";
import Campaign from "../models/Campaign.js";
import ProspectDetailed from "../models/prospectDetailedSchema.js";

const router = express.Router();

router.get("/campaigns", async (req, res) => {
  try {
    const { platform, prospectList, status, tags, startDate, endDate } = req.query;

    let campaignFilter = {};

    if (platform) campaignFilter.platform = platform;
    if (status) campaignFilter.status = status;
    if (prospectList) campaignFilter.prospectLists = prospectList;
    if (tags) campaignFilter.tags = { $in: tags.split(",") };
    if (startDate && endDate) {
      campaignFilter["dateRange.startDate"] = { $gte: new Date(startDate) };
      campaignFilter["dateRange.endDate"] = { $lte: new Date(endDate) };
    }

    // 1️⃣ Get campaigns
    const campaigns = await Campaign.find(campaignFilter)
      .populate("prospectLists", "name")
      .lean();

    const campaignIds = campaigns.map(c => c._id);

    // 2️⃣ Get ProspectDetailed data for metrics
    const prospectDetails = await ProspectDetailed.find({
      campaign: { $in: campaignIds }
    }).lean();

    // 3️⃣ Calculate summary metrics
    const totalReplies = prospectDetails.filter(p => p.repliedAfterBait || p.repliedAfterMain).length;
    const leadsDropped = prospectDetails.filter(p => p.status === "not_interested").length;
    const leadsInterested = prospectDetails.filter(p => p.status === "interested").length;
    const totalProspects = prospectDetails.length;
    const conversionRate = totalProspects ? ((leadsInterested / totalProspects) * 100).toFixed(2) : 0;

    // Average response time in minutes
    const responseTimes = prospectDetails
      .filter(p => p.lastMessageSentAt)
      .map(p => {
        const sentAt = p.mainSent ? p.mainSent : p.baitSent;
        return (new Date(p.lastMessageSentAt) - new Date(p.createdAt || sentAt)) / (1000 * 60);
      });
    const avgResponseTime = responseTimes.length
      ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
      : 0;

    // 4️⃣ Funnel data
    const funnel = {
      interested: prospectDetails.filter(p => p.status === "interested").length,
      not_interested: prospectDetails.filter(p => p.status === "not_interested").length,
      pending: prospectDetails.filter(p => p.status === "pending").length,
    };

    // 5️⃣ Platform-wise engagement
    const platformEngagement = {};
    prospectDetails.forEach(p => {
      if (!platformEngagement[p.platform]) platformEngagement[p.platform] = 0;
      if (p.repliedAfterMain || p.repliedAfterBait) platformEngagement[p.platform]++;
    });
    const platformEngagementArray = Object.entries(platformEngagement).map(([platform, value]) => ({ platform, value }));

    // 6️⃣ Monthly campaign performance
    const monthlyPerformance = {};
    campaigns.forEach(c => {
      const month = new Date(c.createdAt).toLocaleString("default", { month: "short" });
      if (!monthlyPerformance[month]) monthlyPerformance[month] = 0;
      monthlyPerformance[month]++;
    });
    const monthlyPerformanceArray = Object.entries(monthlyPerformance).map(([month, value]) => ({ month, value }));

    res.json({
      campaigns,
      summary: {
        totalCampaigns: campaigns.length,
        totalReplies,
        leadsDropped,
        conversionRate,
        avgResponseTime,
      },
      funnel,
      platformEngagement: platformEngagementArray,
      monthlyPerformance: monthlyPerformanceArray,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
