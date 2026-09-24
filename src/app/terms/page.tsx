import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "var(--space-12) var(--content-pad-desktop)",
        color: "var(--text-secondary)",
      }}
    >
      <h1 style={{ color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
        Terms of Service
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>
        Effective date: September 24, 2026
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        1. Acceptance
      </h2>
      <p>
        By creating an account or using Upwork Radar, you agree to these Terms. If you do
        not agree, do not use the service.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        2. The service
      </h2>
      <p>
        Upwork Radar is a dashboard that collects and analyzes job opportunities, runs
        website audits, and assists with outreach. It is provided for professional use by
        individuals who are eligible to pursue freelance work.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        3. Your responsibilities
      </h2>
      <p>You agree to:</p>
      <ul style={{ listStyle: "disc", paddingLeft: "var(--space-6)", margin: "var(--space-3) 0" }}>
        <li>keep your credentials secure and not share access;</li>
        <li>comply with the terms of any third-party platform (including Upwork) when
          proposing, responding to, or messaging through it;</li>
        <li>provide accurate information when configuring preferences; and</li>
        <li>not use the service to spam, harass, or otherwise send unsolicited commercial
          messages outside of legitimate outreach.</li>
      </ul>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        4. Accuracy of automated outputs
      </h2>
      <p>
        Scores, audits, and analysis are automated estimates supplied for convenience.
        They are provided &ldquo;as is&rdquo; without warranty of accuracy, completeness,
        or fitness for any particular purpose. You are responsible for reviewing outputs
        before acting on them.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        5. No warranty; limitation of liability
      </h2>
      <p>
        The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        basis without warranties of any kind, whether express or implied. To the maximum
        extent permitted by law, the operator is not liable for any indirect, incidental,
        or consequential damages arising from use of the service, including decisions
        made in reliance on its output or interruptions to availability.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        6. Intellectual property
      </h2>
      <p>
        The software, design, and content of the service are owned by the operator.
        Anything you generate through the service remains yours to use in your business.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        7. Changes
      </h2>
      <p>
        We may update these Terms from time to time. The effective date above reflects the
        latest revision, and continued use of the service after a change constitutes
        acceptance of the updated Terms.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        8. Contact
      </h2>
      <p>Questions about these Terms can be directed to the account owner of this dashboard.</p>
    </main>
  );
}