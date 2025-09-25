import mongoose from "mongoose";

const prospectDetailedSchema = new mongoose.Schema({
  prospect: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prospect",
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true
  },
  platform: {
    type: String,
    enum: ["sms", "facebook", "whatsapp", "email", "insta"],
    required: true
  },
  platformId: { // number, fb psid, email etc
    type: String,
    required: true
  },

  baitSent: { type: Boolean, default: false },
  repliedAfterBait: { type: Boolean, default: false },

  mainSent: { type: Boolean, default: false },
  repliedAfterMain: { type: Boolean, default: false },

  followUpSent: { type: Number, default: 0 },
  totalFollowUp: { type: Number, default: 0 },

  nextFollowUpAt: { type: Date },

  status: {
    type: String,
    enum: ["interested", "not_interested", "pending"],
    default: "pending"
  },

  lastMessageSentAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("ProspectDetailed", prospectDetailedSchema);
