import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, authRateRules } from "@/lib/security/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

interface RateLimitState {
  row: {
    bucket_key: string;
    hits: number;
    window_start: string;
  } | null;
  insertError: Error | null;
  updateError: Error | null;
  insertCalls: unknown[];
  updateCalls: unknown[];
}

function makeClient(state: RateLimitState) {
  const from = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: state.row, error: null }),
      }),
    }),
    insert: (payload: unknown) => {
      state.insertCalls.push(payload);
      return { error: state.insertError };
    },
    update: (payload: unknown) => ({
      eq: () => {
        state.updateCalls.push(payload);
        return { error: state.updateError };
      },
    }),
  });
  return { from };
}

function initialState(): RateLimitState {
  return {
    row: null,
    insertError: null,
    updateError: null,
    insertCalls: [],
    updateCalls: [],
  };
}

const rule = authRateRules.signIn; // limit 5 / 15 min
const now = new Date("2026-09-23T12:00:00.000Z");

beforeEach(() => {
  vi.mocked(createAdminClient).mockReturnValue(makeClient(initialState()) as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("checkRateLimit", () => {
  it("creates the bucket on first hit and allows it", async () => {
    const state = initialState();
    vi.mocked(createAdminClient).mockReturnValue(makeClient(state) as never);

    const result = await checkRateLimit("auth:signin:user@example.com", rule, now);

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(rule.limit - 1);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0]).toMatchObject({ bucket_key: "auth:signin:user@example.com", hits: 1 });
  });

  it("increments hits while under the limit", async () => {
    const state = initialState();
    state.row = { bucket_key: "k", hits: 2, window_start: now.toISOString() };
    vi.mocked(createAdminClient).mockReturnValue(makeClient(state) as never);

    const result = await checkRateLimit("k", rule, now);

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(rule.limit - 3);
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]).toMatchObject({ hits: 3 });
  });

  it("blocks once the limit is reached within the window", async () => {
    const state = initialState();
    state.row = { bucket_key: "k", hits: rule.limit, window_start: now.toISOString() };
    vi.mocked(createAdminClient).mockReturnValue(makeClient(state) as never);

    const result = await checkRateLimit("k", rule, now);

    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBe(rule.windowMs);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("resets the window when it has expired", async () => {
    const state = initialState();
    const started = new Date(now.getTime() - rule.windowMs - 1_000);
    state.row = { bucket_key: "k", hits: rule.limit, window_start: started.toISOString() };
    vi.mocked(createAdminClient).mockReturnValue(makeClient(state) as never);

    const result = await checkRateLimit("k", rule, now);

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(rule.limit - 1);
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]).toMatchObject({ hits: 1 });
  });

  it("never blocks when the insert fails (fail-open degrade)", async () => {
    const state = initialState();
    state.insertError = new Error("db down");
    vi.mocked(createAdminClient).mockReturnValue(makeClient(state) as never);

    const result = await checkRateLimit("k", rule, now);

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(rule.limit - 1);
  });

  it("never blocks when the increment update fails", async () => {
    const state = initialState();
    state.row = { bucket_key: "k", hits: 0, window_start: now.toISOString() };
    state.updateError = new Error("db down");
    vi.mocked(createAdminClient).mockReturnValue(makeClient(state) as never);

    const result = await checkRateLimit("k", rule, now);

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(rule.limit - 1);
  });
});