import { getQueues } from "./queues.js";

async function clearAllQueues() {
  const { baitQueue, mainQueue, followUpQueue } = getQueues();

  await baitQueue.drain();       // Remove all waiting jobs
  await baitQueue.clean(0, 'delayed'); // Remove delayed jobs
  await baitQueue.clean(0, 'active');  // Remove active jobs
  await baitQueue.clean(0, 'completed');
  await baitQueue.clean(0, 'failed');

  await mainQueue.drain();
  await mainQueue.clean(0, 'delayed');
  await mainQueue.clean(0, 'active');
  await mainQueue.clean(0, 'completed');
  await mainQueue.clean(0, 'failed');

  await followUpQueue.drain();
  await followUpQueue.clean(0, 'delayed');
  await followUpQueue.clean(0, 'active');
  await followUpQueue.clean(0, 'completed');
  await followUpQueue.clean(0, 'failed');

  console.log("✅ All queues cleared!");
}

clearAllQueues();
