import { ExternalLink } from "lucide-react";
import type { PortfolioProjectRow } from "@/lib/types";
import { IMPLEMENTATION_STATUS_LABEL, STRENGTH_LABEL } from "@/lib/constants";
import { SkillTag } from "@/components/common/SkillTag";
import styles from "./EvidenceCard.module.css";

interface EvidenceCardProps {
  project: PortfolioProjectRow;
}

export function EvidenceCard({ project }: EvidenceCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h4 className={styles.title}>{project.title}</h4>
        <div className={styles.badges}>
          <span className={styles.strength}>{STRENGTH_LABEL[project.strength]}</span>
          <span className={styles.status}>{IMPLEMENTATION_STATUS_LABEL[project.implementation_status]}</span>
        </div>
      </header>

      {project.skills.length > 0 && (
        <div className={styles.skills}>
          {project.skills.map((skill) => (
            <SkillTag key={skill}>{skill}</SkillTag>
          ))}
        </div>
      )}

      <div className={styles.claim}>
        <p className={styles.claimLabel}>Claim used in proposal</p>
        <p className={styles.claimText}>{project.can_claim_text}</p>
      </div>

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
                <ExternalLink className={styles.linkIcon} aria-hidden />
                {link.length > 48 ? `${link.slice(0, 48)}…` : link}
              </a>
            </li>
          ))}
        </ul>
      )}

      {project.cannot_claim_text && (
        <p className={styles.cannotClaim}>{project.cannot_claim_text}</p>
      )}
    </article>
  );
}