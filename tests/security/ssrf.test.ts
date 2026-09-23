import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SsrfError,
  isPrivateAddress,
  assertPublicUrl,
  safeFetchFromUntrustedUrl,
} from "@/lib/security/ssrf";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function mockLookup(addresses: string[]) {
  return lookupMock.mockResolvedValue(
    addresses.map((address) => ({ address, family: 4 })),
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("isPrivateAddress", () => {
  it("flags private/reserved IPv4", () => {
    for (const addr of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "100.127.255.254",
      "0.0.0.0",
      "224.0.0.1",
      "not-an-ip",
    ]) {
      expect(isPrivateAddress(addr), addr).toBe(true);
    }
  });

  it("allows public IPv4", () => {
    for (const addr of ["8.8.8.8", "1.1.1.1", "93.184.216.34"]) {
      expect(isPrivateAddress(addr), addr).toBe(false);
    }
  });

  it("flags private IPv6 and embedded-v4 cases", () => {
    for (const addr of [
      "::1",
      "::",
      "fe80::1",
      "fc00::1",
      "fd12::1",
      "ff02::1",
      "2001:db8::1",
      "::ffff:127.0.0.1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(addr), addr).toBe(true);
    }
  });

  it("allows public IPv6", () => {
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  it("resolves and passes public hosts", async () => {
    mockLookup(["93.184.216.34"]);
    await expect(assertPublicUrl(new URL("https://example.com/"))).resolves.toBeUndefined();
  });

  it("rejects hosts resolving to private addresses (metadata attack)", async () => {
    mockLookup(["169.254.169.254"]);
    await expect(assertPublicUrl(new URL("https://does-not-exist.invalid/"))).rejects.toThrow(
      SsrfError,
    );
  });

  it("rejects when ANY resolved address is private", async () => {
    mockLookup(["8.8.8.8", "10.0.0.5"]);
    await expect(assertPublicUrl(new URL("https://dual.example/"))).rejects.toThrow(
      "private/internal address",
    );
  });

  it("rejects unresolvable hosts", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertPublicUrl(new URL("https://nope.example/"))).rejects.toThrow(
      "Could not resolve host",
    );
  });
});

describe("safeFetchFromUntrustedUrl", () => {
  it("throws on malformed URLs", async () => {
    await expect(safeFetchFromUntrustedUrl("not a url")).rejects.toThrow("Invalid URL");
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(safeFetchFromUntrustedUrl("file:///etc/passwd")).rejects.toThrow(
      "Unsupported protocol",
    );
  });

  it("blocks internal hosts before any fetch happens", async () => {
    mockLookup(["127.0.0.1"]);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(safeFetchFromUntrustedUrl("https://127.0.0.1/x")).rejects.toThrow(
      "private/internal",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches public URLs and returns the body", async () => {
    mockLookup(["93.184.216.34"]);
    const fetchSpy = vi.fn().mockResolvedValue(new Response("hello world", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await safeFetchFromUntrustedUrl("https://example.com/", { maxBytes: 100 });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.body.toString("utf8")).toBe("hello world");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeDefined();
  });

  it("follows redirects one hop at a time and re-validates each", async () => {
    mockLookup(["93.184.216.34"]);
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "/next" } }),
      )
      .mockResolvedValueOnce(new Response("final", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await safeFetchFromUntrustedUrl("https://example.com/start", {
      maxBytes: 100,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.body.toString("utf8")).toBe("final");
  });

  it("rejects a redirect that targets an internal host", async () => {
    mockLookup(["93.184.216.34"]);
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: "https://metadata.invalid/" } }),
      );
    vi.stubGlobal("fetch", fetchSpy);
    lookupMock
      .mockReset()
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);

    await expect(
      safeFetchFromUntrustedUrl("https://example.com/", { maxBytes: 100 }),
    ).rejects.toThrow("private/internal");
  });

  it("caps the response body at maxBytes", async () => {
    mockLookup(["93.184.216.34"]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(streamOf([new TextEncoder().encode("abcdefghij"), new TextEncoder().encode("klmnopqrstuvwxyz")]), {
          status: 200,
        }),
      ),
    );

    const result = await safeFetchFromUntrustedUrl("https://example.com/", { maxBytes: 10 });
    expect(result.body.length).toBe(10);
  });

  it("limits total redirect hops", async () => {
    mockLookup(["93.184.216.34"]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 301, headers: { location: "/loop" } }),
      ),
    );

    await expect(
      safeFetchFromUntrustedUrl("https://example.com/start", { maxBytes: 100, maxRedirects: 1 }),
    ).rejects.toThrow("Too many redirects");
  });

  it("surfaces timeouts with a friendly message", async () => {
    mockLookup(["93.184.216.34"]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("aborted"), { name: "TimeoutError" }),
      ),
    );

    await expect(safeFetchFromUntrustedUrl("https://example.com/")).rejects.toThrow(
      "Request timed out",
    );
  });
});