// instagram/sendInstaMessage.js
import axios from "axios";
import Config from "../models/Config.js"; // adjust path

/**
 * Send Instagram Direct Message
 * @param {string} recipientId - Instagram user ID (IGSID)
 * @param {string} text - Message content
 * @returns {Promise<object>}
 */
export async function sendInstaMessage(recipientId, text) {
  try {
    const config = await Config.findOne();
    const PAGE_ACCESS_TOKEN = config?.PAGE_ACCESS_TOKEN;
    const PAGE_ID = config?.PAGE_ID;

    if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
      console.error("Missing PAGE_ACCESS_TOKEN or PAGE_ID in DB");
      return null;
    }

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${PAGE_ID}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE", // required for IG DM
      },
      {
        headers: {
          Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ IG DM sent to ${recipientId}: ${text.substring(0, 50)}...`);
    return response.data;
  } catch (err) {
    console.error("❌ IG DM send error:", err.response?.data || err.message);
    return null;
  }
}
