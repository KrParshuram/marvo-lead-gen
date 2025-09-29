// routes/prospectReplies.js
import express from "express";
import ProspectDetailed from "../models/prospectDetailedSchema.js";
import { mainQueue } from "../queues.js";

const router = express.Router();

// Update replied after bait
router.post("/reply-bait", async (req, res) => {
  const { prospectDetailId } = req.body;
  const pd = await ProspectDetailed.findById(prospectDetailId);
  if (!pd) return res.status(404).send("Prospect not found");

  pd.repliedAfterBait = true;
  await pd.save();

  // Enqueue main message
  // await mainQueue.add({ prospectDetail: pd });

  res.send({ success: true });
});

// Update replied after main
router.post("/reply-main", async (req, res) => {
  const { prospectDetailId } = req.body;
  const pd = await ProspectDetailed.findById(prospectDetailId);
  if (!pd) return res.status(404).send("Prospect not found");

  pd.repliedAfterMain = true;
  pd.status = "interested";
  await pd.save();

  res.send({ success: true });
});

export default router;
