import { SKILL_ALIASES, MAX_MATCHED_SKILLS_IN_PROMPT } from "@/lib/constants";

/**
 * Normalizes a skill string for comparison: lower-cased, punctuation such as
 * `.`/`_`/`-` collapsed to a single space, surrounding whitespace trimmed.
 * "Node.js", "node js" and "NODE_JS" all normalize to "node js".
 */
export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/[._\-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasTerms(skill: string): Set<string> {
  const key = normalizeSkill(skill);
  return new Set<string>([key, ...(SKILL_ALIASES[key] ?? []).map(normalizeSkill)]);
}

/**
 * True when two skill names mean the same thing — either literally, or because
 * one is a declared synonym of the other in SKILL_ALIASES ("n8n" ≈
 * "workflow automation"). Comparison is on whole normalized terms, never
 * substrings, so "ai" does not match "email".
 */
export function skillsMatch(a: string, b: string): boolean {
  return aliasTerms(a).has(normalizeSkill(b));
}

export interface SkillMatch {
  /** Requested skill from the job. */
  requested: string;
  /** Portfolio skill that satisfied it — may be a synonym, not literal. */
  matched: string;
  /** True when the names differ, i.e. only a synonym connected them. */
  viaAlias: boolean;
}

/**
 * Every requested skill covered by at least one of the project's skills.
 * Requested skills keep their original order and are not double-counted, so a
 * project claiming both "n8n" and "workflow automation" matches a single
 * "n8n" request once.
 */
export function matchSkills(
  requestedSkills: string[],
  projectSkills: string[],
): SkillMatch[] {
  const matches: SkillMatch[] = [];
  const consumed = new Set<number>();

  for (const requested of requestedSkills) {
    const terms = aliasTerms(requested);
    let hit = -1;

    // Literal term first, so the display keeps the exact string both sides used.
    for (let i = 0; i < projectSkills.length; i++) {
      if (consumed.has(i)) continue;
      if (terms.has(normalizeSkill(projectSkills[i]))) {
        hit = i;
        break;
      }
    }

    if (hit === -1) {
      // Synonym match: the project skill declares the requested one as an alias.
      for (let i = 0; i < projectSkills.length; i++) {
        if (consumed.has(i)) continue;
        const projectTerms = aliasTerms(projectSkills[i]);
        if ([...terms].some((term) => projectTerms.has(term))) {
          hit = i;
          break;
        }
      }
    }

    if (hit === -1) continue;

    consumed.add(hit);
    const matched = projectSkills[hit];
    matches.push({
      requested,
      matched,
      viaAlias: normalizeSkill(matched) !== normalizeSkill(requested),
    });
  }

  return matches;
}

/** Human-readable overlap line for the scoring AI, e.g. "n8n ≈ workflow automation". */
export function describeSkillMatches(matches: SkillMatch[]): string[] {
  return matches
    .slice(0, MAX_MATCHED_SKILLS_IN_PROMPT)
    .map((m) => (m.viaAlias ? `${m.requested} ≈ ${m.matched}` : m.requested));
}

/**
 * Comma-separated synonym expansion of the job's skills, for prompts. Only
 * skills present in SKILL_ALIASES expand, so noise stays low.
 */
export function expandSkillAliases(skills: string[]): string {
  const terms: string[] = [];
  for (const skill of skills) {
    const key = normalizeSkill(skill);
    for (const alias of SKILL_ALIASES[key] ?? []) {
      if (!terms.includes(alias)) terms.push(alias);
    }
  }
  return terms.join(", ");
}