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

        const messageText = event?.message?.text || '';
        console.log(`Processing message from sender: ${senderId} — "${messageText}"`);

        try {
          const prospectDetail = await ProspectDetailed.findOne({
            platform: 'facebook',
            platformId: senderId,
          });

          if (prospectDetail) {
            if (!prospectDetail.repliedAfterBait) {
              prospectDetail.repliedAfterBait = true;
              console.log(`✅ Prospect ${prospectDetail._id} replied after Bait`);
            } else if (!prospectDetail.repliedAfterMain) {
              prospectDetail.repliedAfterMain = true;
              console.log(`✅ Prospect ${prospectDetail._id} replied after Main`);
            }

            prospectDetail.status = 'interested';
            prospectDetail.lastReply = {
              platform: 'facebook',
              message: messageText,
              timestamp: new Date(),
            };

            await prospectDetail.save();
            console.log(`Updated ProspectDetailed ${prospectDetail._id} with reply: "${messageText}"`);

            // Queue main message if needed
            if (prospectDetail.repliedAfterBait && !prospectDetail.mainSent) {
              const { mainQueue } = getQueues();
              console.log(`⏳ Queuing Main message for ${prospectDetail._id}`);
              await mainQueue.add({ prospectDetailId: prospectDetail._id });
            }
          } else {
            console.warn(`⚠️ No ProspectDetailed found for senderId: ${senderId}`);
          }
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
