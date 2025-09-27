import * as bullmq from "bullmq";
import IORedis from "ioredis";

const { Queue, QueueEvents } = bullmq;

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,  // 👈 important for BullMQ v5+
});

const baitQueue = new Queue("bait", { connection });
const mainQueue = new Queue("main", { connection });
const followUpQueue = new Queue("followUp", { connection });

// optional logging for failures
;[new QueueEvents("bait", { connection }),
  new QueueEvents("main", { connection }),
  new QueueEvents("followUp", { connection })]
.forEach(events => {
  events.on("failed", (job, err) => {
    console.error(`❌ [${events.name}] Job ${job.jobId} failed:`, err);
  });
});

export function getQueues() {
  return { baitQueue, mainQueue, followUpQueue };
}
