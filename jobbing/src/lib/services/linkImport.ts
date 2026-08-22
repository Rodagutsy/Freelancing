/**
 * Best-effort import of a portfolio link (Behance, Pinterest, LinkedIn,
 * Upwork profile, or any page with Open Graph tags). These sites change their
 * markup often and some (LinkedIn especially) block automated reads, so every
 * extraction is defensive and optional — the UI falls back to manual entry.
 */

import type { DatabaseClient } from "@/lib/types";

export type LinkImportKind = "project" | "profile";

export interface ProjectLinkPreview {
  kind: "project";
  title?: string;
  description?: string;
  imageUrl?: string;
  skills?: string[];
}

export interface ProfileLinkPreview {
  kind: "profile";
  headline?: string;
  bio?: string;
  skills?: string[];
}

export type LinkPreview = ProjectLinkPreview | ProfileLinkPreview;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html",
};

/** Decide whether a URL points at a person's profile or a single work item. */
export function detectLinkKind(url: string): LinkImportKind {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "project";
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (host.endsWith("linkedin.com") && path.startsWith("/in/")) {
    return "profile";
  }
  if (host.endsWith("upwork.com")) {
    if (/^\/(freelancers|freelancer)\//.test(path) || path.includes("~")) {
      return "profile";
    }
    return "project";
  }
  if (host.endsWith("behance.net")) {
    // /gallery/<id>/<slug> is a single work item; anything else is a profile.
    return path.startsWith("/gallery/") ? "project" : "profile";
  }
  if (host.endsWith("pinterest.com") || host === "pin.it") {
    return "project";
  }
  return "project";
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanText(value: string): string {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

async function fetchPage(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      redirect: "follow",
    });
  } catch {
    throw new Error("Could not reach that site.");
  }
  if (!response.ok) {
    throw new Error(
      `That site returned ${response.status}. Many sites block automated reads — fill in the details manually.`,
    );
  }
  const html = await response.text();
  if (!html || html.length < 300) {
    throw new Error("That page came back empty.");
  }
  return html;
}

function extractMeta(html: string, names: string[]): string | undefined {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match =
      html.match(
        new RegExp(
          `<meta[^>]+(?:property=["']${escaped}["']|name=["']${escaped}["'])[^>]*content=["']([^"']*)["']`,
          "i",
        ),
      ) ??
      html.match(
        new RegExp(
          `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property=["']${escaped}["']|name=["']${escaped}["'])`,
          "i",
        ),
      );
    const value = match ? cleanText(match[1]) : "";
    if (value) return value;
  }
  return undefined;
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : undefined;
}

/** Strip site branding from titles, e.g. "Jane Doe - Upwork Freelancer". */
function cleanTitle(value: string): string {
  return value
    .replace(
      /\s*[|–—-]\s*(Upwork Freelancer|Freelancer Profile|Upwork|Behance|LinkedIn)\s*$/i,
      "",
    )
    .replace(/\s*\|\s*Behance\s*$/i, "")
    .replace(/\s*on Behance\s*$/i, "")
    .trim();
}

/** Walk an embedded JSON tree collecting objects that carry text content. */
function collectCandidates(
  node: unknown,
  out: Array<Record<string, unknown>>,
  depth = 0,
): void {
  if (depth > 7 || node === null || node === undefined) return;

  if (Array.isArray(node)) {
    for (const item of node) collectCandidates(item, out, depth + 1);
    return;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const hasText =
      typeof obj.title === "string" ||
      typeof obj.name === "string" ||
      typeof obj.description === "string" ||
      typeof obj.headline === "string" ||
      typeof obj.display_name === "string";
    if (hasText) out.push(obj);
    for (const value of Object.values(obj)) {
      collectCandidates(value, out, depth + 1);
    }
  }
}

function extractEmbeddedJson(html: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const scriptMatches = html.matchAll(
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scriptMatches) {
    try {
      collectCandidates(JSON.parse(match[1]), out);
    } catch {
      // Malformed or non-JSON script payload — skip.
    }
  }
  return out;
}

function toSkill(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (value && typeof value === "object") {
    const box = value as Record<string, unknown>;
    const name =
      typeof box.name === "string"
        ? box.name
        : typeof box.skill === "string"
          ? box.skill
          : undefined;
    return name ? name.trim() : undefined;
  }
  return undefined;
}

function pickSkills(candidates: Array<Record<string, unknown>>): string[] {
  const keys = [
    "skills",
    "skillsRequested",
    "top_skills",
    "topSkills",
    "specialties",
    "tags",
    "categories",
  ];
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = candidate[key];
      if (!Array.isArray(value)) continue;
      const parsed = value
        .map(toSkill)
        .filter((skill): skill is string => Boolean(skill))
        .slice(0, 20);
      if (parsed.length) return parsed;
    }
  }
  return [];
}

function importProjectPreview(html: string): ProjectLinkPreview {
  const preview: ProjectLinkPreview = { kind: "project" };

  const ogTitle = extractMeta(html, ["og:title", "twitter:title"]);
  const title = cleanTitle(ogTitle ?? extractTitleTag(html) ?? "");
  if (title.length >= 3 && title.length <= 300) preview.title = title;

  const description = extractMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  if (description && description.length >= 20) {
    preview.description = description;
  }

  const imageUrl = extractMeta(html, ["og:image", "og:image:secure_url", "twitter:image"]);
  if (imageUrl && /^https:\/\//i.test(imageUrl)) {
    preview.imageUrl = imageUrl;
  }

  preview.skills = pickSkills(extractEmbeddedJson(html));

  if (!preview.title && !preview.description && !preview.imageUrl) {
    throw new Error(
      "Couldn't read that page automatically. Fill in the details manually.",
    );
  }
  return preview;
}

function importProfilePreview(html: string): ProfileLinkPreview {
  const preview: ProfileLinkPreview = { kind: "profile" };

  const ogTitle = cleanTitle(
    extractMeta(html, ["og:title", "twitter:title"]) ?? extractTitleTag(html) ?? "",
  );
  if (ogTitle.length >= 3 && ogTitle.length <= 200) {
    preview.headline = ogTitle;
  }

  const description = extractMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  if (description && description.length >= 20) {
    preview.bio = description;
  }

  preview.skills = pickSkills(extractEmbeddedJson(html));

  if (!preview.headline && !preview.bio) {
    throw new Error(
      "That site blocked the read (LinkedIn often does). Copy your headline and bio over manually.",
    );
  }
  return preview;
}

export async function importLinkPreview(url: string): Promise<LinkPreview> {
  const kind = detectLinkKind(url);
  const html = await fetchPage(url);
  return kind === "profile" ? importProfilePreview(html) : importProjectPreview(html);
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Downloads a remote image found on an imported page and stores it in the
 * user's own Storage folder so the entry doesn't depend on hotlinks that
 * break. Throws on failure — callers treat this as best-effort.
 */
export async function downloadAndStoreImage(
  client: DatabaseClient,
  userId: string,
  imageUrl: string,
): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Image host returned ${response.status}.`);
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) {
    throw new Error("Unsupported image type.");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error("Empty image.");
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image is larger than 5 MB.");
  }

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage
    .from("portfolio-images")
    .upload(path, buffer, { contentType });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = client.storage.from("portfolio-images").getPublicUrl(path);
  return data.publicUrl;
}