import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { createClient, requireUser } from "@/lib/supabase/server";
import { aiRateRules, checkRateLimit } from "@/lib/security/rateLimit";
import {
  RESUME_MAX_FILE_BYTES,
  RESUME_MAX_TEXT_CHARS,
  resumeFieldsPresent,
} from "@/lib/schemas/resume";
import { parseResume } from "@/lib/services/resumeParser";
import { savePersonaCv } from "@/lib/services/personaCv";

export const runtime = "nodejs";
/** PDF extraction plus an AI round-trip needs more than the default budget. */
export const maxDuration = 60;

/** Three extractions an hour per user — enough to try a few resume versions. */
const RESUME_RATE_RULE = aiRateRules.resume;

const TEXT_EXTENSIONS = [".txt", ".md", ".text"];

const personaIdSchema = z.string().uuid();

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isText(file: File): boolean {
  if (file.type === "text/plain" || file.type === "text/markdown") return true;
  const lower = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Extracts plain text from an uploaded PDF. Server-side only. */
async function extractPdfText(file: File): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return errorResponse(new Error("You must be signed in."), 401);

  const limit = await checkRateLimit(`ai:resume:${user.id}`, RESUME_RATE_RULE);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Resume limit reached. Try again in an hour." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(new Error("Upload failed. Try the file again."));
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse(new Error("Choose a resume file first."));
  }

  if (file.size === 0) {
    return errorResponse(new Error("That file is empty."));
  }
  if (file.size > RESUME_MAX_FILE_BYTES) {
    return errorResponse(
      new Error(`Keep the file under ${RESUME_MAX_FILE_BYTES / 1024 / 1024} MB.`),
    );
  }
  if (!isPdf(file) && !isText(file)) {
    return errorResponse(
      new Error("Upload a PDF or a .txt file. Scanned images aren't supported."),
    );
  }

  try {
    const text = isPdf(file)
      ? await extractPdfText(file)
      : await file.text();

    const extract = await parseResume(text);

    // Persist the master CV on the chosen persona (best-effort: extraction is
    // still returned even if storage fails, e.g. a pre-19 database).
    const personaId = form.get("personaId");
    let saved = false;
    if (typeof personaId === "string" && personaIdSchema.safeParse(personaId).success) {
      try {
        const supabase = await createClient();
        await savePersonaCv(supabase, personaId, {
          text: text.slice(0, RESUME_MAX_TEXT_CHARS),
          filename: file.name,
        });
        saved = true;
      } catch {
        saved = false;
      }
    }

    return NextResponse.json({
      extract,
      fields: resumeFieldsPresent(extract),
      saved,
    });
  } catch (error) {
    return errorResponse(error);
  }
}