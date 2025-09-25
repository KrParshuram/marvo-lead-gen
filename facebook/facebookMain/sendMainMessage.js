import axios from "axios";
import logger from "./logger.js";
import Config from "../../models/Config.js"; // your DB config model

/**
 * Sends a main campaign message to a Facebook user via the Messenger API.
 * @param {string} fbUserId The Facebook user ID of the prospect.
 * @param {string} content The message content to be sent.
 * @returns {Promise<any>} The API response.
 */
export async function sendMainMessage(fbUserId, content) {
  try {
    // Fetch FB token dynamically from DB
    const config = await Config.findOne();
    if (!config?.FB_TOKEN) {
      throw new Error("FB_TOKEN not found in database!");
    }

    const payload = {
      recipient: { id: fbUserId },
      messaging_type: "RESPONSE",
      message: { text: content },
    };

    logger.info(`📤 Sending message to user ${fbUserId}`);

    if (!content) {
      logger.error(`❌ No message content provided for user ${fbUserId}.`);
      throw new Error("Message content is missing");
    }

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${config.FB_TOKEN}`,
      payload
    );

    logger.info(`✅ Main message successfully sent to user ${fbUserId}`);
    return response.data;
  } catch (err) {
    const errorData = err.response?.data || err.message;
    const status = err.response?.status || "unknown";

    logger.error(`❌ Facebook API Error (Status: ${status}):`, errorData);
    logger.debug("Failed Payload:", JSON.stringify({ fbUserId, content }, null, 2));

    throw new Error(
      `Facebook API call failed with status ${status}: ${JSON.stringify(errorData)}`
    );
  }
}
