// routes/configRoutes.js
import express from "express";
import Config from "../models/Config.js";

const router = express.Router();

// Fetch config
router.get("/", async (req, res) => {
  const config = await Config.findOne();
  res.json(config || {});
});

// Save/update config
router.post("/", async (req, res) => {
  let config = await Config.findOne();
  if (config) {
    Object.assign(config, req.body);
    await config.save();
  } else {
    config = new Config(req.body);
    await config.save();
  }
  res.json({ success: true });
});

export default router;
