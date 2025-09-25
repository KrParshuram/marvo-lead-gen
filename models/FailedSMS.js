// models/FailedSMS.js
import mongoose from "mongoose";

const failedSMSSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  content: { type: String, required: true },
  error: { type: String, required: true },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("FailedSMS", failedSMSSchema);
