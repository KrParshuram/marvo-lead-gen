// services/sms/sendSMSMessage.js
import twilio from "twilio";
import Config from "../models/Config.js"; // DB collection for platform configs

/**
 * Sends an SMS message using Twilio.
 * @param {string} phoneNumber - Recipient’s phone number (E.164 format).
 * @param {string} content - The message body.
 * @returns {Promise<boolean>}
 */
export async function sendSMSMessage(phoneNumber, content) {
  try {
    // Fetch Twilio credentials from DB
    const config = await Config.findOne({});
    const accountSid = config?.TWILIO_ACCOUNT_SID;
    const authToken = config?.TWILIO_AUTH_TOKEN;
    const fromNumber = config?.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("❌ Twilio credentials missing in config DB");
      return false;
    }

    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: content,
      from: fromNumber,
      to: phoneNumber
    });

    console.log(`✅ SMS sent to ${phoneNumber}, SID: ${message.sid}`);
    return true;

  } catch (error) {
    console.error("❌ Failed to send SMS:", error.message);

    // Optionally, save failure in DB for retry
    // await FailedSMS.create({ phoneNumber, content, error: error.message });

    return false;
  }
}
