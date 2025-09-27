import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL);

// Define queues
const baitQueue = new Queue("bait", { connection });
const mainQueue = new Queue("main", { connection });
const followUpQueue = new Queue("followUp", { connection });

// Attach queue event listeners (for debugging & monitoring)
;[
  new QueueEvents("bait", { connection }),
  new QueueEvents("main", { connection }),
  new QueueEvents("followUp", { connection })
].forEach(events => {
  events.on("failed", (job, err) => {
    console.error(`❌ [${events.name}] Job ${job.jobId} failed:`, err);
  });
  events.on("completed", job => {
    console.log(`✅ [${events.name}] Job ${job.jobId} completed`);
  });
});

export function getQueues() {
  return { baitQueue, mainQueue, followUpQueue };
}
