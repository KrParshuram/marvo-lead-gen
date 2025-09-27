import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

// Routes
import uploadRoute from "./routes/prospects.js";
import campaignRunnerRoutes from "./routes/campaignRunner.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import webhookRoutes from './facebook/webhook/webhookHandler.js';
import dashboardRoutes from "./routes/dashboard.js";
import listRoute from "./routes/listRoute.js";
import reportRoute from "./routes/reportRoute.js";
import dashoverview from "./routes/dashOverview.js";
import configRoutes from "./routes/configRoutes.js";
import testPlatforms from "./routes/testPlatforms.js";

// Webhooks
import smsWebhook from "./sms/webhookHandler.js";
import emailWebhook from "./email/webhookHandler.js";
import whatsappWebhook from "./whatsapp/webhookHandler.js";
import instaWebhook from "./insta/webhookHandler.js";

// Queues & processors
// import { initializeQueues } from "./queues.js";
import { initializeProcessors } from "./processors.js";

dotenv.config();
const app = express();

// Recreate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Timestamped log helper
function logTime(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Enable Mongoose debug to track all queries
mongoose.set("debug", (collectionName, method, query, doc) => {
  console.log(`[MONGOOSE DEBUG] ${collectionName}.${method}`, JSON.stringify(query), doc || "");
});

// Mongoose connection events
mongoose.connection.on("connected", () => logTime("🔗 Mongoose connection open"));
mongoose.connection.on("error", err => logTime(`❌ Mongoose connection error: ${err.message}`));
mongoose.connection.on("disconnected", () => logTime("⚠️ Mongoose disconnected"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  // credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/config", configRoutes);
app.use("/api/testPlatforms", testPlatforms);
app.use("/upload-csv", uploadRoute);
app.use("/api/campaigns", campaignRoutes);
app.use("/api", campaignRunnerRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/prospect-lists", listRoute);
app.use("/api/reports", reportRoute);
app.use("/api", dashoverview);

// Webhooks
app.use("/facebook", webhookRoutes);
app.use("/sms", smsWebhook);
app.use("/email", emailWebhook);
app.use("/whatsapp", whatsappWebhook);
app.use("/insta", instaWebhook);

// ✅ Async server start
async function startServer() {
  try {
    logTime("Starting MongoDB connection...");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    logTime("✅ MongoDB Connected");

    // Initialize queues and processors AFTER DB connection
    // logTime("Initializing queues...");
    // initializeQueues();
    logTime("Initializing processors...");
    initializeProcessors();

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
  logTime(`🚀 Server running on port ${PORT}`);
});
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ MongoDB connection error:`, err.message);
  }
}

startServer();
