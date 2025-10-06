// routes/facebook/webhook/webhookHandler.js
import { Router } from 'express';
import ProspectDetailed from '../../models/prospectDetailedSchema.js';
import Config from '../../models/Config.js';
import { getQueues } from '../../queues.js'; // adjust path


const router = Router();

/**
 * GET /webhook
 * Meta webhook verification
 */
router.get('/webhook', async (req, res) => {
  try {
    const config = await Config.findOne();
    const VERIFY_TOKEN = config?.FB_VERIFY_TOKEN || "fallback_secret";

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      console.error('Webhook verification failed.');
      return res.sendStatus(403);
    }
  } catch (err) {
    console.error('Error fetching config for webhook verification:', err);
    return res.sendStatus(500);
  }
});

/**
 * POST /webhook
 * Handles incoming Messenger events
 */
router.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('Incoming Messenger Webhook:', JSON.stringify(body, null, 2));

  if (body.object !== 'page') {
    console.warn('Received non-page object:', body.object);
    return res.sendStatus(404);
  }

  try {
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event?.sender?.id;
        if (!senderId) continue;

        // --- Ignore non-user events ---
        if (event.delivery) {
          console.log(`Ignoring DELIVERY event from ${senderId}`);
          continue;
        }
        if (event.read) {
          console.log(`Ignoring READ event from ${senderId}`);
          continue;
        }
        if (event.message?.is_echo) {
          console.log(`Ignoring ECHO event from ${senderId}`);
          continue;
        }

        // --- Extract a meaningful user reply (only these types will be treated as replies) ---
        let messageText = '';

        // Plain text message
        if (event.message && typeof event.message.text === 'string') {
          messageText = event.message.text.trim();
        }

        // Quick reply payload (user pressed a quick-reply)
        else if (event.message && event.message.quick_reply && event.message.quick_reply.payload) {
          messageText = String(event.message.quick_reply.payload).trim();
        }

        // Optional: treat postback payloads as replies (uncomment if you want)
        // else if (event.postback && (event.postback.payload || event.postback.title)) {
        //   messageText = (event.postback.payload || event.postback.title).toString().trim();
        // }

        // If no usable text, ignore the event (this covers attachments, delivery receipts, stickers, etc.)
        if (!messageText) {
          console.log(`Ignoring non-text or empty event from ${senderId}`);
          continue;
        }

        console.log(`Processing USER reply from sender: ${senderId} — "${messageText}"`);

        try {
          // Find prospect record
          const prospectDetail = await ProspectDetailed.findOne({
            platform: 'facebook',
            platformId: senderId,
          });

          if (!prospectDetail) {
            console.warn(`⚠️ No ProspectDetailed found for senderId: ${senderId}`);
            continue;
          }

          // Decide which repliedAfter flag to set based on whether main was already sent
          // (safer than relying on whichever flag is currently false)
          if (prospectDetail.mainSent) {
            if (!prospectDetail.repliedAfterMain) {
              prospectDetail.repliedAfterMain = true;
              console.log(`✅ Prospect ${prospectDetail._id} replied AFTER main`);
              prospectDetail.status = 'interested';
            } else {
              console.log(`Note: Prospect ${prospectDetail._id} already had repliedAfterMain=true`);
            }
          } else {
            if (!prospectDetail.repliedAfterBait) {
              prospectDetail.repliedAfterBait = true;
              console.log(`✅ Prospect ${prospectDetail._id} replied AFTER bait`);
            } else {
              console.log(`Note: Prospect ${prospectDetail._id} already had repliedAfterBait=true`);
            }
          }

          // Update status/lastReply
          
          // prospectDetail.lastReply = {
          //   platform: 'facebook',
          //   message: messageText,
          //   timestamp: new Date(),
          // };

          // Save before doing any queueing to avoid race conditions
          await prospectDetail.save();
          console.log(`Updated ProspectDetailed ${prospectDetail._id} with reply: "${messageText}"`);

          // If you want to queue main only when repliedAfterBait && !mainSent, do it here
          if (prospectDetail.repliedAfterBait && !prospectDetail.mainSent) {
            const { mainQueue } = getQueues();
            // await mainQueue.add({ prospectDetailId: prospectDetail._id });
            console.log(`(Would queue MAIN for ${prospectDetail._id})`);
          }

          // Optionally queue follow-ups only if mainSent === true and repliedAfterMain === false
          // (Implement follow-up queueing in your follow-up worker with the same safe checks)
        } catch (dbErr) {
          console.error('Failed to update ProspectDetailed record:', dbErr);
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('Webhook handler crashed:', err);
    res.sendStatus(500);
  }
});

export default router;
