import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
  content: { type: String, required: true },
  delayAfterPrevious: { type: Number, required: true }, // minutes
});

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    platform: {
      type: String,
      enum: ["facebook", "whatsapp", "email", "sms", "instagram"],
      required: true,
    },

    baitMessage: {
      content: { type: String, required: true },
    },

    mainMessage: {
      content: { type: String, required: true },
    },

    followUps: [followUpSchema],

    prospectLists: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ProspectList" },
    ],

    savedSegment: { type: String }, // Step 2 audience segment

    dateRange: {
      startDate: { type: Date },
      endDate: { type: Date },
    },

    dailyLimit: { type: Number }, // Step 4 setting

    status: {
      type: String,
      enum: ["draft", "active"],
      default: "draft",
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);
