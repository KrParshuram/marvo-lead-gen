import Queue from "bull";
import dotenv from "dotenv";
dotenv.config();
let queues;

export function initializeQueues() {
  if (!queues) {
    if (!process.env.REDIS_URL) {
      throw new Error("❌ REDIS_URL not set in environment variables");
    }

    const redisConfig = {
      redis: {
        url: process.env.REDIS_URL,
        db: 0, // 👈 explicitly set to avoid NaN
        tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
      },
    };

    queues = {
      baitQueue: new Queue("bait_queue", redisConfig),
      mainQueue: new Queue("main_queue", redisConfig),
      followUpQueue: new Queue("followup_queue", redisConfig),
    };

    console.log("✅ Queues initialized with Redis Cloud");
  }
  return queues;
}

export function getQueues() {
  if (!queues) throw new Error("Queues not initialized yet!");
  return queues;
}
