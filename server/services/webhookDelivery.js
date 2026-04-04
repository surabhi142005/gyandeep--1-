/**
 * server/services/webhookDelivery.js
 * Webhook delivery service with retries, signing, and event triggering
 */

import crypto from 'crypto';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { ObjectId } from 'mongodb';

/**
 * Create HMAC signature for webhook payload
 */
function createSignature(payload, secret) {
  if (!secret) return null;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Deliver webhook payload to URL with retry logic
 */
async function deliverWebhook(webhook, payload, attempt = 1) {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Gyandeep-Webhook/1.0',
    'X-Webhook-ID': webhook._id.toString(),
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': new Date().toISOString(),
  };

  // Add signature if secret is configured
  if (webhook.secret) {
    const signature = createSignature(payload, webhook.secret);
    headers['X-Webhook-Signature'] = signature;
  }

  const deliveryRecord = {
    webhookId: webhook._id.toString(),
    event: payload.event,
    payload,
    attempt,
    timestamp: new Date(),
  };

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeout: 30000, // 30 second timeout
    });

    const responseBody = await response.text();

    // Log successful delivery
    await logDelivery({
      ...deliveryRecord,
      status: 'success',
      httpStatus: response.status,
      responseBody: responseBody.slice(0, 1000), // Limit response size
    });

    return {
      success: response.ok,
      status: response.status,
      attempt,
    };
  } catch (error) {
    // Log failed delivery
    await logDelivery({
      ...deliveryRecord,
      status: 'failed',
      error: error.message,
    });

    // Retry if we haven't exceeded max retries
    if (attempt < maxRetries) {
      console.log(`[Webhook] Retrying ${webhook.name} (${webhook.url}) in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return deliverWebhook(webhook, payload, attempt + 1);
    }

    return {
      success: false,
      error: error.message,
      attempts: attempt,
    };
  }
}

/**
 * Log webhook delivery to database
 */
async function logDelivery(logData) {
  try {
    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.WEBHOOK_DELIVERIES || 'webhook_deliveries').insertOne(logData);
  } catch (error) {
    console.error('[Webhook] Failed to log delivery:', error);
  }
}

/**
 * Send webhook to all active subscribers for an event
 */
export async function triggerWebhook(event, data) {
  try {
    const db = await connectToDatabase();
    const webhooks = await db.collection(COLLECTIONS.WEBHOOKS)
      .find({
        active: true,
        events: { $in: [event, '*', 'all'] },
      })
      .toArray();

    if (webhooks.length === 0) {
      return { triggered: 0, results: [] };
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Deliver to all matching webhooks concurrently
    const results = await Promise.allSettled(
      webhooks.map(webhook => deliverWebhook(webhook, payload))
    );

    const summary = {
      triggered: webhooks.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value.success).length,
      results: results.map((r, i) => ({
        webhook: webhooks[i].name,
        url: webhooks[i].url,
        success: r.status === 'fulfilled' ? r.value.success : false,
        attempts: r.status === 'fulfilled' ? r.value.attempt : 0,
        error: r.status === 'rejected' ? r.reason?.message : r.value?.error,
      })),
    };

    console.log(`[Webhook] Event "${event}" delivered to ${summary.successful}/${summary.triggered} webhooks`);
    return summary;
  } catch (error) {
    console.error('[Webhook] Failed to trigger webhooks:', error);
    return { triggered: 0, error: error.message };
  }
}

/**
 * Test webhook delivery without triggering actual event
 */
export async function testWebhook(webhookId) {
  try {
    const db = await connectToDatabase();
    const webhook = await db.collection(COLLECTIONS.WEBHOOKS).findOne(
      { _id: new ObjectId(webhookId) }
    );

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (!webhook.active) {
      throw new Error('Webhook is inactive');
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery from Gyandeep',
        webhookId: webhook._id.toString(),
        webhookName: webhook.name,
      },
    };

    console.log(`[Webhook] Testing delivery to ${webhook.url}`);
    const result = await deliverWebhook(webhook, testPayload);

    return {
      success: result.success,
      webhook: webhook.name,
      url: webhook.url,
      attempts: result.attempt,
      httpStatus: result.status,
      error: result.error,
    };
  } catch (error) {
    console.error('[Webhook] Test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get delivery history for a webhook
 */
export async function getWebhookDeliveries(webhookId, limit = 50) {
  try {
    const db = await connectToDatabase();
    const deliveries = await db.collection(COLLECTIONS.WEBHOOK_DELIVERIES || 'webhook_deliveries')
      .find({ webhookId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return deliveries;
  } catch (error) {
    console.error('[Webhook] Failed to fetch deliveries:', error);
    return [];
  }
}

/**
 * Replay a failed webhook delivery
 */
export async function replayWebhookDelivery(deliveryId) {
  try {
    const db = await connectToDatabase();
    const delivery = await db.collection(COLLECTIONS.WEBHOOK_DELIVERIES || 'webhook_deliveries')
      .findOne({ _id: new ObjectId(deliveryId) });

    if (!delivery) {
      throw new Error('Delivery record not found');
    }

    const webhook = await db.collection(COLLECTIONS.WEBHOOKS).findOne(
      { _id: new ObjectId(delivery.webhookId) }
    );

    if (!webhook) {
      throw new Error('Webhook no longer exists');
    }

    const result = await deliverWebhook(webhook, delivery.payload);
    return result;
  } catch (error) {
    console.error('[Webhook] Replay failed:', error);
    return { success: false, error: error.message };
  }
}

export default {
  triggerWebhook,
  testWebhook,
  getWebhookDeliveries,
  replayWebhookDelivery,
};
