/**
 * Resolves ATS intake run options from environment variables so the cadence
 * and per-run cap can be tuned without a redeploy.
 *
 * Env knobs (all optional, all server-only):
 * - INTAKE_MAX_COMPANIES   default 40
 * - INTAKE_MIN_AGE_MINUTES default 25 (cron mode only; manual runs always use 0)
 * - INTAKE_CONCURRENCY     default 5
 */
export type IntakeMode = "cron" | "manual";

export interface IntakeRunOptions {
  maxCompanies: number;
  minAgeMinutes: number;
  concurrency: number;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getIntakeRunOptions(mode: IntakeMode = "cron"): IntakeRunOptions {
  return {
    maxCompanies: intFromEnv("INTAKE_MAX_COMPANIES", 40),
    minAgeMinutes:
      mode === "manual" ? 0 : intFromEnv("INTAKE_MIN_AGE_MINUTES", 25),
    concurrency: intFromEnv("INTAKE_CONCURRENCY", 5),
  };
}