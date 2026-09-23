import { Mail, Database, Workflow, Cpu } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/services/settings";
import { listWatchedCompanies } from "@/lib/services/watchedCompanies";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PersonaManager } from "@/components/settings/PersonaManager";
import { WatchedCompanies } from "@/components/settings/WatchedCompanies";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [profiles, watchedCompanies] = await Promise.all([
    getProfiles(supabase),
    listWatchedCompanies(supabase),
  ]);

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY);

  const integrations = [
    {
      icon: Database,
      name: "Supabase",
      description: "Database, auth and realtime layer.",
      status: supabaseConfigured ? "connected" : "missing",
      label: supabaseConfigured ? "Connected" : "Missing keys",
      tone: supabaseConfigured ? ("success" as const) : ("danger" as const),
    },
    {
      icon: Cpu,
      name: "DeepSeek",
      description: "Scoring and proposal generation.",
      status: deepseekConfigured ? "connected" : "missing",
      label: deepseekConfigured ? "Configured" : "Missing key",
      tone: deepseekConfigured ? ("success" as const) : ("danger" as const),
    },
    {
      icon: Mail,
      name: "Gmail (n8n)",
      description: "Upwork saved-search email intake.",
      status: "manual",
      label: "Setup in n8n",
      tone: "info" as const,
    },
    {
      icon: Workflow,
      name: "n8n",
      description: "Intake → scoring → proposal workflows.",
      status: "manual",
      label: "Setup in n8n",
      tone: "info" as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your profile, intake setup, and integration status."
      />

      <section className={styles.section} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className={styles.sectionTitle}>
          Personas
        </h2>
        <p className={styles.sectionHint}>
          Each persona is a separate positioning (label, headline, bio, services,
          rates, links). New jobs are scored automatically against the{" "}
          <strong>default</strong> persona; on any job you can re-score or draft
          with another one. Portfolio projects are shared across all personas.
        </p>
        <PersonaManager profiles={profiles} />
      </section>

      <section className={styles.section} aria-labelledby="watched-heading">
        <h2 id="watched-heading" className={styles.sectionTitle}>
          Watched Companies
        </h2>
        <p className={styles.sectionHint}>
          Companies whose public career boards are polled every 6 hours by the
          n8n ATS intake workflow. New jobs matching your 4-pillar keywords are
          auto-imported and scored. Paste any careers URL — the system detects
          the ATS platform automatically.
        </p>
        <WatchedCompanies companies={watchedCompanies} />
      </section>

      <section className={styles.section} aria-labelledby="intake-heading">
        <h2 id="intake-heading" className={styles.sectionTitle}>
          Job intake
        </h2>
        <div className={styles.card}>
          <ol className={styles.steps}>
            <li>
              You must be on your <strong>freelancer</strong> profile in Upwork
              (not the client profile) — job alerts only exist there. Switch
              profiles from the account menu in the top-right of Upwork.
            </li>
            <li>
              On the freelancer side: <strong>Find Work → Saved Searches</strong>{" "}
              and create searches for your niches (e.g. “n8n”, “GoHighLevel”,
              “business automation”).
            </li>
            <li>
              <strong>Speed is set on Upwork, not here:</strong> for each saved
              search, turn email alerts <strong>on</strong> and set frequency to{" "}
              <strong>Immediately</strong>. Upwork otherwise batches alerts
              hours later, by which time jobs already have many proposals.
            </li>
            <li>
              In your n8n Gmail node, add a trigger for emails from
              <strong> upwork.com</strong> with <strong>“Upwork”</strong> in the
              subject. The provided trigger polls every minute.
            </li>
            <li>
              Import the intake → scoring workflows from{" "}
              <code>n8n/workflows</code> and point them at your Supabase
              project.
            </li>
            <li>
              No email yet? Use <strong>“Add job”</strong> on the Jobs page —
              paste an Upwork job link and it is imported and scored on demand.
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="integrations-heading">
        <h2 id="integrations-heading" className={styles.sectionTitle}>
          Integrations
        </h2>
        <div className={styles.integrationList}>
          {integrations.map(({ icon: Icon, name, description, label, tone }) => (
            <div key={name} className={styles.integration}>
              <Icon className={styles.integrationIcon} aria-hidden />
              <div className={styles.integrationText}>
                <p className={styles.integrationName}>{name}</p>
                <p className={styles.integrationDescription}>{description}</p>
              </div>
              <StatusBadge label={label} tone={tone} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}