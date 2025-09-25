import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import ProspectList from "../models/prospectList.js";
import Prospect from "../models/Prospect.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { originalname } = req.file;

    // 1. Create new Prospect List entry
    const list = await ProspectList.create({
      name: originalname.replace(".csv", ""),
      uploadedBy: "user123", // replace with actual user ID
    });

    const listId = list._id;
    const prospects = [];

    // 2. Parse CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        prospects.push({
          listId,
          name: row.name || "",
          fb: row.fb || "",
          insta: row.insta || "",
          mail: row.mail || "",
          sms: row.sms || "",
          wtsp: row.wtsp || "",
        });
      })
      .on("end", async () => {
        if (prospects.length > 0) {
          for (const p of prospects) {
            await Prospect.findOneAndUpdate(
              { listId, name: p.name, fb: p.fb, insta: p.insta, mail: p.mail, sms: p.sms, wtsp: p.wtsp },
              p,
              { upsert: true, new: true }
            );
          }
        }

        fs.unlinkSync(req.file.path);

        res.json({
          message: "CSV uploaded successfully (duplicates skipped)",
          listId,
          totalProspects: prospects.length,
        });
      });
  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
