import { chatJson } from "@/lib/ai/deepseek";
import {
  RESUME_MAX_TEXT_CHARS,
  resumeExtractSchema,
  type ResumeExtract,
} from "@/lib/schemas/resume";

const RESUME_SYSTEM = `You extract structured freelancer profile data from a resume so it can pre-fill an application form.

Rules:
- Return ONLY fields the resume states or clearly implies. Omit anything uncertain rather than guessing.
- name: the person's full name as written on the resume. Omit if absent.
- headline: one line, max 120 chars, in the style "Discipline | Specialization | Strength" (e.g. "Business Automation Developer | n8n & AI workflows | API integrations"). Derive from their title and top skills only.
- bio: 2–4 sentences, first person, no contact details and no placeholders. Draw only on the resume.
- services: 3–8 short service phrases the person demonstrably offers (e.g. "Workflow automation", "n8n implementation"). Verbs and nouns, not adjectives.
- niches: 2–6 industry or problem areas they have shipped in (e.g. "Lead generation", "E-commerce operations").
- skills: 5–25 named tools and technologies, spelled as commonly written (e.g. "n8n", "Supabase", "GoHighLevel").
- target_rate_min / target_rate_max: hourly USD numbers ONLY if the resume states a rate or salary. Convert a stated annual salary to an hourly equivalent (annual / 2080) and round to the nearest whole dollar. Omit both if no rate or salary is present — never invent one.
- Strip contact details (email, phone, addresses, URLs, social handles) from every field.

Return STRICT JSON only, with exactly these keys (omit any you are not confident about):
{"name": string, "headline": string, "bio": string, "services": [string], "niches": [string], "skills": [string], "target_rate_min": number, "target_rate_max": number}`;

/**
 * Parses plain resume text into structured profile data with DeepSeek.
 * AI output is untrusted and validated with a Zod schema before returning.
 */
export async function parseResume(
  resumeText: string,
): Promise<ResumeExtract> {
  const text = resumeText.slice(0, RESUME_MAX_TEXT_CHARS).trim();
  if (!text) {
    throw new Error(
      "That file has no readable text. Scanned or image-only resumes can't be parsed — paste the text instead.",
    );
  }

  const raw = await chatJson<unknown>(RESUME_SYSTEM, `RESUME:\n${text}`, {
    temperature: 0.2,
    maxTokens: 1500,
  });

  const parsed = resumeExtractSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "Couldn't read that resume cleanly. Try pasting the text instead of uploading a file.",
    );
  }
  return parsed.data;
}