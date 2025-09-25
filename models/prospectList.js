import mongoose from "mongoose";

const prospectListSchema = new mongoose.Schema({
  name: String,
  createdAt: { type: Date, default: Date.now },
  uploadedBy: String,
});

export default mongoose.model("ProspectList", prospectListSchema);
