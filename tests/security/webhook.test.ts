import { afterEach, describe, expect, it, vi } from "vitest";
import { requireWebhookConfig, postWebhook } from "@/lib/security/webhook";

const ORIGINAL_ENV = { ...process.env };

function setEnv(values: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("requireWebhookConfig", () => {
  it("applies no-op defaults when nothing is configured", () => {
    setEnv({ N8N_AUDIT_WEBHOOK_URL: undefined, N8N_WEBHOOK_SECRET: undefined });
    expect(requireWebhookConfig("AUDIT")).toEqual({ url: undefined, secret: undefined });
  });

  it("throws when a URL is set but the shared secret is missing", () => {
    setEnv({ N8N_AUDIT_WEBHOOK_URL: "http://localhost:5678/webhook/dsqYdZQ4JcNyxPhl/webhook/audit", N8N_WEBHOOK_SECRET: undefined });
    expect(() => requireWebhookConfig("AUDIT")).toThrow(/N8N_AUDIT_WEBHOOK_URL.*N8N_WEBHOOK_SECRET/);
  });

  it("returns both URL and secret when fully configured", () => {
    setEnv({
      N8N_AUDIT_WEBHOOK_URL: "http://localhost:5678/webhook/dsqYdZQ4JcNyxPhl/webhook/audit",
      N8N_WEBHOOK_SECRET: "s3cret",
    });
    expect(requireWebhookConfig("AUDIT")).toEqual({
      url: "http://localhost:5678/webhook/dsqYdZQ4JcNyxPhl/webhook/audit",
      secret: "s3cret",
    });
  });

  it("reads per-name variables", () => {
    setEnv({ N8N_OUTBOUND_WEBHOOK_URL: "http://localhost:5678/webhook/1FFAA5j24PirsgCt/webhook/outbound-send", N8N_WEBHOOK_SECRET: "x" });
    expect(requireWebhookConfig("OUTBOUND")?.url).toBe("http://localhost:5678/webhook/1FFAA5j24PirsgCt/webhook/outbound-send");
  });
});

describe("postWebhook", () => {
  it("resolves false without calling fetch when no URL is configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const ok = await postWebhook({ url: undefined, secret: undefined }, { a: 1 });
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs the payload as JSON with bearer auth when a secret is set", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const ok = await postWebhook({ url: "http://localhost:5678/webhook/x", secret: "tok" }, { id: "abc" });

    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:5678/webhook/x");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ id: "abc" }));
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer tok",
    });
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("omits the Authorization header when no secret is configured", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    await postWebhook({ url: "http://localhost:5678/webhook/x", secret: undefined }, {});

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("rejects on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(postWebhook({ url: "http://x/w", secret: "t" }, {})).rejects.toThrow(
      "Webhook responded 500",
    );
  });

  it("propagates network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(postWebhook({ url: "http://x/w", secret: "t" }, {})).rejects.toThrow(
      "ECONNREFUSED",
    );
  });
});