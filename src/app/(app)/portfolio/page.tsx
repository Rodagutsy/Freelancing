import { createClient } from "@/lib/supabase/server";
import { listPortfolioProjects } from "@/lib/services/portfolio";
import { IMPLEMENTATION_STATUS_LABEL, STRENGTH_LABEL } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkillTag } from "@/components/common/SkillTag";
import { PortfolioAddButton } from "@/components/portfolio/PortfolioAddButton";
import { PortfolioEditButton } from "@/components/portfolio/PortfolioEditButton";
import { DeleteProjectButton } from "@/components/portfolio/DeleteProjectButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const projects = await listPortfolioProjects(supabase);

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Verified evidence the AI may cite in proposals."
        action={<PortfolioAddButton />}
      />

      {projects.length > 0 ? (
        <div className={styles.list}>
          {projects.map((project) => (
            <article key={project.id} className={styles.card}>
              <header className={styles.cardHeader}>
                <div>
                  <h2 className={styles.title}>{project.title}</h2>
                  <div className={styles.badges}>
                    <span className={styles.strength}>
                      {STRENGTH_LABEL[project.strength]}
                    </span>
                    <span className={styles.status}>
                      {IMPLEMENTATION_STATUS_LABEL[project.implementation_status]}
                    </span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <PortfolioEditButton project={project} />
                  <DeleteProjectButton
                    projectId={project.id}
                    title={project.title}
                  />
                </div>
              </header>

              {project.description && (
                <p className={styles.description}>{project.description}</p>
              )}

              {project.image_urls.length > 0 && (
                <div className={styles.thumbGrid}>
                  {project.image_urls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={`${project.title} screenshot`}
                      className={styles.thumbImg}
                    />
                  ))}
                </div>
              )}

              {project.skills.length > 0 && (
                <div className={styles.skills}>
                  {project.skills.map((skill) => (
                    <SkillTag key={skill}>{skill}</SkillTag>
                  ))}
                </div>
              )}

              <div className={styles.claim}>
                <p className={styles.claimLabel}>Can claim</p>
                <p className={styles.claimText}>{project.can_claim_text}</p>
              </div>

              {project.cannot_claim_text && (
                <div className={styles.cannotClaim}>
                  <p className={styles.claimLabel}>Cannot claim</p>
                  <p>{project.cannot_claim_text}</p>
                </div>
              )}

              {project.evidence_links.length > 0 && (
                <ul className={styles.links}>
                  {project.evidence_links.map((link) => (
                    <li key={link}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No portfolio evidence added"
          description="Add verified portfolio evidence before generating proposals. Proposals can only reference what you mark as claimable here."
          action={<PortfolioAddButton />}
        />
      )}
    </div>
  );
}