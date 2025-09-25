import express from "express";
import Campaign from "../models/Campaign.js";
import Prospect from "../models/Prospect.js";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import ProspectList from "../models/prospectList.js";

const router = express.Router();

router.get("/overview", async (req, res) => {
  try {
    // Total Contacts = count of all Prospects
    const totalContacts = await Prospect.countDocuments();

    // New Leads Today = Prospects created today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newLeadsToday = await Prospect.countDocuments({
      createdAt: { $gte: startOfDay }
    });

    // Active Campaigns
    const activeCampaigns = await Campaign.countDocuments({ status: "active" });

    // Replies Received = total Prospects who replied (bait or main)
    const repliesReceived = await ProspectDetailed.countDocuments({
      $or: [{ repliedAfterBait: true }, { repliedAfterMain: true }]
    });

    // Conversion Rate = interested / total prospectsDetailed
    const totalProspectsDetailed = await ProspectDetailed.countDocuments();
    const interestedProspects = await ProspectDetailed.countDocuments({
      status: "interested"
    });
    const conversionRate =
      totalProspectsDetailed > 0
        ? ((interestedProspects / totalProspectsDetailed) * 100).toFixed(1)
        : 0;

    // Replies Timeline (last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const repliesTimeline = await ProspectDetailed.aggregate([
      { $match: { updatedAt: { $gte: last30Days }, repliedAfterMain: true } },
      {
        $group: {
          _id: { $dayOfMonth: "$updatedAt" },
          replies: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Campaign Engagement by type
    const campaignEngagement = await Campaign.aggregate([
      {
        $group: {
          _id: "$name",
          engagement: { $sum: 1 }
        }
      },
      { $limit: 5 }
    ]);

    // Leads by Country (dummy until you store geolocation)
    const leadsByCountry = [
      { country: "United States", stats: "38.7%, 4.9K" },
      { country: "United Kingdom", stats: "21.3%, 2.7K" },
      { country: "Australia", stats: "13.4%, 1.7K" },
      { country: "India", stats: "9.1%, 1.2K" },
      { country: "Canada", stats: "6.8%, 875" },
      { country: "Others", stats: "10.7%, 1.4K" }
    ];

    // Usage by Location (dummy too)
    const usageData = [
      { city: "Jaipur", coords: [26.9124, 75.7873], users: 950 },
      { city: "Delhi", coords: [28.6139, 77.209], users: 600 },
      { city: "Mumbai", coords: [19.076, 72.8777], users: 420 },
      { city: "Bengaluru", coords: [12.9716, 77.5946], users: 320 },
      { city: "Hyderabad", coords: [17.385, 78.4867], users: 270 }
    ];

    res.json({
      stats: [
        { label: "Total Contacts", value: totalContacts, change: 3.2 },
        { label: "New Leads Today", value: newLeadsToday, change: 5.4 },
        { label: "Active Campaigns", value: activeCampaigns, change: 8.1 },
        { label: "Replies Received", value: repliesReceived, change: -1.5 },
        { label: "Conversion Rate", value: `${conversionRate}%`, change: 6.3 }
      ],
      repliesTimeline,
      campaignEngagement,
      leadsByCountry,
      usageData
    });
  } catch (err) {
    console.error("Error fetching dashboard overview:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export default router;
