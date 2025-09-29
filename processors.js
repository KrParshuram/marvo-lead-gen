// processors.js
import { Worker } from "bullmq";
import ProspectDetailed from "./models/prospectDetailedSchema.js";
import Campaign from "./models/Campaign.js";
import { getQueues } from "./queues.js";
import { sendMessageByPlatform } from "./service/messageService.js";
import { safeAdd } from "./queueHelpers.js";

export function initializeProcessors() {
  const { baitQueue, mainQueue, followUpQueue } = getQueues();

  // ==========================
  // Bait Queue → trigger Main if replied
  // ==========================
  new Worker(
    "bait",
    async (job) => {
      console.log("🎯 [Bait Queue] Processing job:", job.id, job.data);

      try {
        const { prospectDetailId } = job.data;
        if (!prospectDetailId) throw new Error("Missing prospectDetailId");

        const pd = await ProspectDetailed.findById(prospectDetailId.toString());
        if (!pd) return console.warn(`❌ ProspectDetailed not found: ${prospectDetailId}`);

        const campaign = await Campaign.findById(pd.campaign.toString());
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
    },
    { connection: baitQueue.opts.connection }
  );

  // ==========================
  // Main Queue → only if repliedAfterBait = true
  // ==========================
  new Worker(
    "main",
    async (job) => {
      console.log("📩 [Main Queue] Processing job:", job.id, job.data);

      try {
        const { prospectDetailId } = job.data;
        if (!prospectDetailId) throw new Error("Missing prospectDetailId");

        const pd = await ProspectDetailed.findById(prospectDetailId.toString());
        if (!pd) return console.warn(`❌ Prospect not found: ${prospectDetailId}`);

        const campaign = await Campaign.findById(pd.campaign.toString());
        if (!campaign) return console.warn(`❌ Campaign not found for ${pd._id}`);

        if (!pd.repliedAfterBait) return console.log(`⏩ Skipping Main — no reply after Bait for ${pd._id}`);
        if (pd.mainSent) return console.log(`⏩ Main already sent for ${pd._id}`);

        const sent = await sendMessageByPlatform(pd, campaign.mainMessage.content);
        if (sent) {
          pd.mainSent = true;
          pd.lastMessageSentAt = new Date();
          await pd.save();
          console.log(`📤 Main sent for ${pd._id}`);

          // Queue first follow-up if exists
          if (Array.isArray(campaign.followUps) && campaign.followUps.length > 0) {
            const firstFollowUp = campaign.followUps[0];
            const delayMs = Number(firstFollowUp.delayAfterPrevious) * 60 * 1000 || 0;

            console.log(`⏳ Queuing follow-up(0) for ${pd._id} after ${delayMs / 60000} min`);
            // await followUpQueue.add(
            //   { prospectDetailId: pd._id.toString(), followUpIndex: 0 },
            //   { delay: delayMs }
            // );

              await safeAdd(followUpQueue, {
              prospectDetailId: pd._id.toString(),
              followUpIndex: 0,
              campaignId: pd.campaign?.toString?.() ?? null
            }, { delay: delayMs });
          }
        }
      } catch (err) {
        console.error("❌ Error in mainQueue:", err);
      }
    },
    { connection: mainQueue.opts.connection }
  );

  // ==========================
  // FollowUps → only if Main sent & no reply after Main
  // ==========================
  new Worker(
    "followUp",
    async (job) => {
      console.log("⏰ [FollowUp Queue] Processing job:", job.id, job.data);

      try {
        const { prospectDetailId, followUpIndex } = job.data;
        if (!prospectDetailId) throw new Error("Missing prospectDetailId");
        const index = Number(followUpIndex || 0);

        const pd = await ProspectDetailed.findById(prospectDetailId.toString());
        if (!pd) return console.warn(`❌ Prospect not found: ${prospectDetailId}`);

        if (!pd.mainSent || pd.repliedAfterMain) {
          return console.log(`⏩ Skipping follow-up — Main not sent or replied. ${pd._id}`);
        }

        const campaign = await Campaign.findById(pd.campaign.toString());
        if (!campaign) return console.warn(`❌ Campaign not found for ${pd._id}`);

        if (index >= campaign.followUps.length) return console.log(`✅ All follow-ups completed for ${pd._id}`);

        const followUp = campaign.followUps[index];
        const sent = await sendMessageByPlatform(pd, followUp.content);

        if (sent) {
          pd.followUpSent = index + 1;
          pd.lastMessageSentAt = new Date();
          await pd.save();
          console.log(`📤 Follow-up(${index}) sent for ${pd._id}`);

          // Queue next follow-up if exists
          if (pd.followUpSent < campaign.followUps.length) {
            const nextFollowUp = campaign.followUps[pd.followUpSent];
            const delayMs = Number(nextFollowUp.delayAfterPrevious) * 60 * 1000 || 0;

            console.log(`⏳ Queuing follow-up(${pd.followUpSent}) after ${delayMs / 60000} min`);
            // await followUpQueue.add(
            //   { prospectDetailId: pd._id.toString(), followUpIndex: pd.followUpSent },
            //   { delay: delayMs }
            // );
            await safeAdd(followUpQueue, {
                prospectDetailId: pd._id.toString(),
                followUpIndex: 0,
                campaignId: pd.campaign?.toString?.() ?? null
              }, { delay: delayMs });
          }
        }
      } catch (err) {
        console.error("❌ Error in followUpQueue:", err);
      }
    },
    { connection: followUpQueue.opts.connection }
  );

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
        // await mainQueue.add({ prospectDetailId: pd._id.toString() });
        await safeAdd(mainQueue, { prospectDetailId: pd._id.toString() });
      }
    } catch (err) {
      console.error("❌ Error in periodic main check:", err);
    }
  }, 30 * 1000);
}
