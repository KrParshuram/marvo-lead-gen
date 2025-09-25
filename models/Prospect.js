import mongoose from "mongoose";

const ProspectSchema = new mongoose.Schema({
  listId: { type: mongoose.Schema.Types.ObjectId, ref: "ProspectList" },
  name: String,
  fb: String,
  insta: String,
  mail: String,
  sms: String,
  wtsp: String
});

const Prospect = mongoose.model("Prospect", ProspectSchema);
export default Prospect;

