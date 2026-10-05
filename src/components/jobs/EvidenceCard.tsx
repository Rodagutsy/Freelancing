import { ExternalLink } from "lucide-react";
import type { PortfolioProjectRow } from "@/lib/types";
import { describeSkillMatches, matchSkills, type SkillMatch } from "@/lib/skillMatch";
import { IMPLEMENTATION_STATUS_LABEL, STRENGTH_LABEL } from "@/lib/constants";
import { SkillTag } from "@/components/common/SkillTag";
import styles from "./EvidenceCard.module.css";

interface EvidenceCardProps {
  project: PortfolioProjectRow;
  /** Skills the job asked for. When set, the card shows how they matched. */
  skillsRequested?: string[];
}

export function EvidenceCard({ project, skillsRequested }: EvidenceCardProps) {
  const matches: SkillMatch[] = skillsRequested
    ? matchSkills(skillsRequested, project.skills)
    : [];

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h4 className={styles.title}>{project.title}</h4>
        <div className={styles.badges}>
          {matches.length > 0 && (
            <span className={styles.match}>
              {matches.length} of {skillsRequested?.length} skill
              {skillsRequested?.length === 1 ? "" : "s"} matched
            </span>
          )}
          <span className={styles.strength}>{STRENGTH_LABEL[project.strength]}</span>
          <span className={styles.status}>{IMPLEMENTATION_STATUS_LABEL[project.implementation_status]}</span>
        </div>
      </header>

      {matches.length > 0 && (
        <ul className={styles.matchList} aria-label="Matched skills">
          {describeSkillMatches(matches).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

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