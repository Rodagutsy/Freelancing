import "server-only";

/**
 * Hardened n8n webhook client for server actions.
 *
 * - Requires N8N_WEBHOOK_SECRET whenever a webhook URL is configured
 *   (kills the "webhook on localhost with no auth" failure mode).
 * - Enforces a 10s timeout instead of fire-and-forget.
 * - Returns status so callers can decide how to surface failures.
 */

export interface WebhookConfig {
  url?: string;
  secret?: string;
}

const WEBHOOK_TIMEOUT_MS = 10_000;

/**
 * Reads N8N_<NAME>_WEBHOOK_URL and the shared N8N_WEBHOOK_SECRET.
 * Throws a descriptive error if a URL is set without a secret.
 */
export function requireWebhookConfig(name: string): WebhookConfig {
  const url = process.env[`N8N_${name}_WEBHOOK_URL`];
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (url && !secret) {
    throw new Error(
      `N8N_${name}_WEBHOOK_URL is configured but N8N_WEBHOOK_SECRET is missing. ` +
        "Set N8N_WEBHOOK_SECRET or remove the URL.",
    );
  }
  return { url, secret };
}

/**
 * POSTs `payload` to the configured webhook. Resolves false when no URL is
 * configured (the owning flow simply has no external side-effects).
 * Rejects on network failure / timeout / non-2xx.
 */
export async function postWebhook(
  config: WebhookConfig,
  payload: unknown,
): Promise<boolean> {
  if (!config.url) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.secret ? { Authorization: `Bearer ${config.secret}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Webhook responded ${res.status}.`);
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}