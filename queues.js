import * as bullmq from "bullmq";
import IORedis from "ioredis";

const { Queue, QueueScheduler, QueueEvents } = bullmq;

const connection = new IORedis(process.env.REDIS_URL);

const baitQueue = new Queue("bait", { connection });
new QueueScheduler("bait", { connection });

const mainQueue = new Queue("main", { connection });
new QueueScheduler("main", { connection });

const followUpQueue = new Queue("followUp", { connection });
new QueueScheduler("followUp", { connection });

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
