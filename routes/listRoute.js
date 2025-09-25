import express from "express";
import ProspectList from "../models/prospectList.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const lists = await ProspectList.find().sort({ createdAt: -1 });
    res.json(lists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prospect lists" });
  }
});

export default router;
