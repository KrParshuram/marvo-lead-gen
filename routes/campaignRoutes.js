// routes/campaignRoutes.js
import express from "express";
import Campaign from "../models/Campaign.js";

const router = express.Router();

//  Create and save draft campaign
router.post("/save-draft", async (req, res) => {
  try {
    const campaign = new Campaign({
      ...req.body,
      status: "draft",
    });

    await campaign.save();
    res.status(201).json({ message: "Draft saved", campaign });
  } catch (error) {
    console.error("Error saving draft:", error);
    res.status(500).json({ error: "Error saving draft" });
  }
});

//  Create a new campaign (active by default)
router.post("/", async (req, res) => {
  try {
    const {
      name,
      baitMessage,
      mainMessage,
      followUps,
      prospectLists,
      platform,
      savedSegment,
      dateRange,
      dailyLimit,
      tags,
    } = req.body;

    // Required validation
    if (!name || !baitMessage?.content || !mainMessage?.content || !platform) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const campaign = new Campaign({
      name,
      baitMessage,
      mainMessage,
      followUps: followUps || [],
      prospectLists: prospectLists || [],
      platform,
      savedSegment,
      dateRange,
      dailyLimit,
      tags: tags || [],
      status: "active", // default for created campaigns
    });

    await campaign.save();
    res.status(201).json({ message: "Campaign created successfully", campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get all campaigns
router.get("/", async (req, res) => {
  try {
    const { channel, status, prospectList, startDate, endDate } = req.query;

    let filter = {};

    if (channel) filter.channel = channel;
    if (status) filter.status = status;
    if (prospectList) filter.prospectLists = prospectList;
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const campaigns = await Campaign.find(filter)
      .populate("prospectLists", "name")
      .lean();

    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ✅ Get single campaign by ID
router.get("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate("prospectLists", "name")
      .lean();

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Update campaign
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      baitMessage,
      mainMessage,
      followUps,
      prospectLists,
      platform,
      savedSegment,
      dateRange,
      dailyLimit,
      tags,
      status,
    } = req.body;

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      {
        name,
        baitMessage,
        mainMessage,
        followUps,
        prospectLists,
        platform,
        savedSegment,
        dateRange,
        dailyLimit,
        tags,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ message: "Campaign updated successfully", updatedCampaign });
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Delete campaign
router.delete("/:id", async (req, res) => {
  try {
    const deletedCampaign = await Campaign.findByIdAndDelete(req.params.id);

     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid campaign ID provided.' });
  }


    if (!deletedCampaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
