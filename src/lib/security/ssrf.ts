import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard + safe fetch for URLs that come from untrusted input (job /
 * company / portfolio URLs pasted by the user or scraped from web data).
 *
 * Strategy:
 *  1. Parse the URL and require http/https.
 *  2. DNS-resolve the host and reject the request if ANY resolved address is
 *     private / link-local / loopback / reserved. This stops the classic
 *     "redirect to http://169.254.169.254" metadta attack and hosts that only
 *     resolve to internal IPs.
 *  3. Do NOT follow redirects automatically (redirect: "manual"). Each hop is
 *     re-validated before being fetched, with a hop limit.
 *  4. Enforce a timeout and a byte cap per response.
 *
 * Stdlib-only (node:dns, node:net) — no extra dependencies.
 */

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const PRIVATE_IPV4_PREFIXES: { base: number[]; mask: number }[] = [
  { base: [10, 0, 0, 0], mask: 8 },
  { base: [127, 0, 0, 0], mask: 8 },
  { base: [169, 254, 0, 0], mask: 16 },
  { base: [172, 16, 0, 0], mask: 12 },
  { base: [192, 168, 0, 0], mask: 16 },
  { base: [100, 64, 0, 0], mask: 10 },
];

function toIpv4Int(parts: number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) {
    return true;
  }
  if (octets[0] === 0) return true;
  if (octets[0] >= 224) return true; // multicast + reserved
  const ip = toIpv4Int(octets);
  return PRIVATE_IPV4_PREFIXES.some(({ base, mask }) => {
    const maskInt = ((0xffffffff << (32 - mask)) & 0xffffffff) >>> 0;
    return (ip & maskInt) === (toIpv4Int(base) & maskInt);
  });
}

function isPrivateIPv6(address: string): boolean {
  const low = address.toLowerCase();
  if (low === "::" || low === "::1") return true;
  if (low.startsWith("fe80:")) return true; // link-local
  if (low.startsWith("fc") || low.startsWith("fd")) return true; // fc00::/7 ULA
  if (low.startsWith("ff")) return true; // multicast
  if (low.startsWith("2001:db8:")) return true; // documentation
  const v4embedded = low.includes("::ffff:");
  if (v4embedded) {
    const tail = low.slice(low.lastIndexOf(":") + 1);
    if (isIP(tail) === 4) return isPrivateIPv4(tail);
  }
  return false;
}

export function isPrivateAddress(address: string): boolean {
  switch (isIP(address)) {
    case 4:
      return isPrivateIPv4(address);
    case 6:
      return isPrivateIPv6(address);
    default:
      return true;
  }
}

/** Throws SsrfError when the URL's host resolves to anything non-public. */
export async function assertPublicUrl(url: URL): Promise<void> {
  const hostname = url.hostname;
  let addresses: string[];
  try {
    const result = await lookup(hostname, { all: true, verbatim: true });
    addresses = result.map((entry) => entry.address);
  } catch {
    throw new SsrfError(`Could not resolve host: ${hostname}`);
  }
  if (addresses.length === 0 || addresses.some((addr) => isPrivateAddress(addr))) {
    throw new SsrfError(`Refusing to fetch private/internal address: ${hostname}`);
  }
}

export interface SafeFetchOptions {
  method?: string;
  headers?: HeadersInit;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  headers: Headers;
  body: Buffer;
}

async function readBodyToBuffer(res: Response, maxBytes: number): Promise<Buffer> {
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > maxBytes) {
        chunks.push(value.subarray(0, maxBytes - (total - value.length)));
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

/**
 * Fetches an untrusted URL safely: validates scheme and DNS, never follows
 * redirects blindly, re-validates every redirect hop, enforces timeout + byte
 * cap. Throws SsrfError for blocked hosts and plain FetchError otherwise.
 */
export async function safeFetchFromUntrustedUrl(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 2_000_000;
  const maxRedirects = options.maxRedirects ?? 3;

  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      throw new SsrfError("Invalid URL.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SsrfError(`Unsupported protocol: ${parsed.protocol}`);
    }
    await assertPublicUrl(parsed);

    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        method: options.method ?? "GET",
        headers: options.headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error("Request timed out.");
      }
      throw error;
    }

    if (
      res.status === 301 ||
      res.status === 302 ||
      res.status === 303 ||
      res.status === 307 ||
      res.status === 308
    ) {
      const location = res.headers.get("location");
      if (!location) return { ok: false, status: res.status, headers: res.headers, body: Buffer.alloc(0) };
      if (hop === maxRedirects) {
        throw new SsrfError("Too many redirects.");
      }
      try {
        current = new URL(location, parsed).toString();
      } catch {
        throw new SsrfError("Invalid redirect location.");
      }
      continue;
    }

    const body = await readBodyToBuffer(res, maxBytes);
    return { ok: res.ok, status: res.status, headers: res.headers, body };
  }

  throw new SsrfError("Too many redirects.");
}