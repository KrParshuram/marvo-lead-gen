// models/Config.js
import mongoose from "mongoose";

const Config = new mongoose.Schema({
  // Facebook
  FB_VERIFY_TOKEN: String,
  FB_TOKEN: String,
  FB_TEST_USER_ID: String, // for testing messages

  // Twilio / SMS
  TWILIO_ACCOUNT_SID: String,
  TWILIO_AUTH_TOKEN: String,
  TWILIO_PHONE_NUMBER: String,
  TEST_PHONE_NUMBER: String, // for SMS & WhatsApp testing

  // SendGrid / Email
  SENDGRID_API_KEY: String,
  SENDGRID_VERIFIED_SENDER: String, // test email

  // WhatsApp
  WHATSAPP_TOKEN: String,
  WHATSAPP_VERIFY_TOKEN: String,
  PHONE_NUMBER_ID: String, // for WhatsApp API

  // Instagram
  PAGE_ACCESS_TOKEN: String,
  PAGE_ID: String,
  INSTAGRAM_VERIFY_TOKEN: String,
  INSTA_TEST_USER_ID: String, // test IG DM
  insta_app_secret: String,

  // NGROK (optional for local testing)
  NGROK_AUTHTOKEN: String,

  // Redis (optional if using queues)
  REDIS_URL: String
});

export default mongoose.model("Config", Config);
