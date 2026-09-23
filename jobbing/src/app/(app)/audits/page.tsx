import { createClient } from "@/lib/supabase/server";
import { listAudits } from "@/lib/services/audits";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuditCard } from "@/components/audits/AuditCard";
import { EmptyState } from "@/components/common/EmptyState";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const supabase = await createClient();
  const { items: audits } = await listAudits(supabase, { limit: 20 });

  return (
    <div>
      <PageHeader
        title="Website Audits"
        description="Analyze business websites for UX, performance, accessibility, SEO, and automation opportunities."
      />

      {audits.length > 0 ? (
        <div className={styles.auditList}>
          {audits.map((audit) => (
            <AuditCard key={audit.id} audit={audit} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No audits yet"
          description="Start your first website audit by entering a business URL."
        />
      )}
    </div>
  );
}
