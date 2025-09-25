// services/whatsapp/sendWtspMessage.js
import axios from "axios";
import Config from "../models/Config.js"; // DB model for config

/**
 * Sends a WhatsApp message using Meta Graph API
 * @param {string} to - Recipient phone number (international format)
 * @param {string} text - Message body
 * @returns {Promise<object|null>}
 */
export const sendWhatsAppMessage = async (to, text) => {
  try {
    // Fetch WhatsApp credentials from DB
    const config = await Config.findOne({});
    const token = config?.WHATSAPP_TOKEN;
    const phoneNumberId = config?.PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      console.error("❌ WhatsApp credentials missing in config DB");
      return null;
    }

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ WhatsApp message sent to ${to}`, response.data);
    return response.data;
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.response?.data || err.message);
    return null;
  }
};
