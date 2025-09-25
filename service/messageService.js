// services/messageService.js

// Facebook
// import { sendBaitMessage } from "../facebook/facebookBait/sendBaitMessage.js";
import { sendMainMessage } from "../facebook/facebookMain/sendMainMessage.js";

// SMS
import { sendSMSMessage } from "../sms/sendSMSMessage.js";

// WhatsApp
import { sendWhatsAppMessage } from "../whatsapp/sendWtspMessage.js";

// Email
import { sendEmailMessage } from "../email/sendEmailMessage.js";

// Instagram
import { sendInstaMessage } from "../insta/sendInstaMessage.js";

/**
 * Centralized function to send a message based on the platform.
 * @param {object} pd The prospectDetailed object.
 * @param {string} content The message content.
 * @param {string} messageType 'bait' | 'main' | 'followup'.
 * @returns {Promise<boolean>}
 */
export async function sendMessageByPlatform(pd, content) {
  switch (pd.platform) {
    case "facebook":
      console.log(`🚀 Sending Facebook message to ${pd.platformId}: "${content}"`);
      return await sendMainMessage(pd.platformId, content);

    case "sms":
      console.log(`🚀 Sending SMS to ${pd.platformId}: "${content}"`);
      return await sendSMSMessage(pd.platformId, content);

    case "whatsapp":
      console.log(`🚀 Sending WhatsApp message to ${pd.platformId}: "${content}"`);
      return await sendWhatsAppMessage(pd.platformId, content);

    case "email":
      console.log(`🚀 Sending Email to ${pd.platformId}: "${content}"`);
      return await sendEmailMessage(pd.platformId, content);

    case "instagram":
      console.log(`🚀 Sending Instagram message to ${pd.platformId}: "${content}"`);
      return await sendInstaMessage(pd.platformId, content);

    default:
      throw new Error(`Unsupported platform: ${pd.platform}`);
  }
}