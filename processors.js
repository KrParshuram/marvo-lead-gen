import ProspectDetailed from "./models/prospectDetailedSchema.js";
import Campaign from "./models/Campaign.js";
import { getQueues } from "./queues.js";
import { sendMessageByPlatform } from "./service/messageService.js";

export function initializeProcessors() {
  const { baitQueue, mainQueue, followUpQueue } = getQueues();

  // ==========================
  // Bait Queue → trigger Main if replied
  // ==========================
  baitQueue.process(async (job) => {
    console.log("🎯 [Bait Queue] Processing job:", job.id, job.data);

    try {
      const { prospectDetailId } = job.data;
      const pd = await ProspectDetailed.findById(prospectDetailId);
      if (!pd) return console.warn(`❌ ProspectDetailed not found: ${prospectDetailId}`);

      const campaign = await Campaign.findById(pd.campaign);
      if (!campaign) return console.warn(`❌ Campaign not found for prospect: ${pd._id}`);

      if (pd.baitSent) return console.log(`⏩ Bait already sent for ${pd._id}`);

      const sent = await sendMessageByPlatform(pd, campaign.baitMessage.content);
      if (sent) {
        pd.baitSent = true;
        pd.lastMessageSentAt = new Date();
        await pd.save();

        console.log(`📤 Bait sent for ${pd._id}`);
      }
    } catch (err) {
      console.error("❌ Error in baitQueue:", err);
    }
  });

  // ==========================
  // Main Queue → only if repliedAfterBait = true
  // ==========================
  mainQueue.process(async (job) => {
    console.log("📩 [Main Queue] Processing job:", job.id, job.data);

    try {
      const { prospectDetailId } = job.data;
      const pd = await ProspectDetailed.findById(prospectDetailId);
      if (!pd) return console.warn(`❌ Prospect not found: ${prospectDetailId}`);

      const campaign = await Campaign.findById(pd.campaign);
      if (!campaign) return console.warn(`❌ Campaign not found for ${pd._id}`);

      // Only send Main if user replied to Bait
      if (!pd.repliedAfterBait) return console.log(`⏩ Skipping Main — no reply after Bait for ${pd._id}`);
      if (pd.mainSent) return console.log(`⏩ Main already sent for ${pd._id}`);

      const sent = await sendMessageByPlatform(pd, campaign.mainMessage.content);
      if (sent) {
        pd.mainSent = true;
        pd.lastMessageSentAt = new Date();
        await pd.save();

        console.log(`📤 Main sent for ${pd._id}`);

        // Queue first follow-up if exists
        if (campaign.followUps.length > 0) {
          const firstFollowUp = campaign.followUps[0];
          console.log(`⏳ Queuing follow-up(0) for ${pd._id} after ${firstFollowUp.delayAfterPrevious} min`);
          await followUpQueue.add(
            { prospectDetailId: pd._id, followUpIndex: 0 },
            { delay: firstFollowUp.delayAfterPrevious * 60 * 1000 }
          );
        }
      }
    } catch (err) {
      console.error("❌ Error in mainQueue:", err);
    }
  });

  // ==========================
  // FollowUps → only if Main sent & no reply after Main
  // ==========================
  followUpQueue.process(async (job) => {
    console.log("⏰ [FollowUp Queue] Processing job:", job.id, job.data);

    try {
      const { prospectDetailId, followUpIndex } = job.data;
      const pd = await ProspectDetailed.findById(prospectDetailId);
      if (!pd) return console.warn(`❌ Prospect not found: ${prospectDetailId}`);

      if (!pd.mainSent || pd.repliedAfterMain) {
        return console.log(`⏩ Skipping follow-up — Main not sent or replied. ${pd._id}`);
      }

      const campaign = await Campaign.findById(pd.campaign);
      if (!campaign) return console.warn(`❌ Campaign not found for ${pd._id}`);

      if (followUpIndex >= campaign.followUps.length) return console.log(`✅ All follow-ups completed for ${pd._id}`);

      const followUp = campaign.followUps[followUpIndex];
      const sent = await sendMessageByPlatform(pd, followUp.content);

      if (sent) {
        pd.followUpSent = followUpIndex + 1;
        pd.lastMessageSentAt = new Date();
        await pd.save();

        console.log(`📤 Follow-up(${followUpIndex}) sent for ${pd._id}`);

        // Queue next follow-up if exists
        if (pd.followUpSent < campaign.followUps.length) {
          const nextFollowUp = campaign.followUps[pd.followUpSent];
          console.log(`⏳ Queuing follow-up(${pd.followUpSent}) after ${nextFollowUp.delayAfterPrevious} min`);
          await followUpQueue.add(
            { prospectDetailId: pd._id, followUpIndex: pd.followUpSent },
            { delay: nextFollowUp.delayAfterPrevious * 60 * 1000 }
          );
        }
      }
    } catch (err) {
      console.error("❌ Error in followUpQueue:", err);
    }
  });

  console.log("✅ Processors initialized");

  // ==========================
  // Optional: periodic check for any replies missed
  // ==========================
setInterval(async () => {
  try {
    const pendingMain = await ProspectDetailed.find({
      repliedAfterBait: true,
      mainSent: false
    });

    for (const pd of pendingMain) {
      console.log(`⏳ Queuing Main for ${pd._id} (reply detected)`);
      await mainQueue.add({ prospectDetailId: pd._id });
    }
  } catch (err) {
    console.error("❌ Error in periodic main check:", err);
  }
}, 30 * 1000);
}
