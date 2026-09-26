import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Freelance-Moncha",
};

const features = [
  {
    title: "Job alert ingest",
    body: "Reads your Upwork saved-search alerts from Gmail and turns each one into a structured job record in seconds.",
  },
  {
    title: "AI scoring",
    body: "Each job is scored against your saved preferences and priorities, so strong matches surface first.",
  },
  {
    title: "Website audits",
    body: "When a client site matters, run an automated audit of page structure, SEO, accessibility, and performance.",
  },
  {
    title: "Guided outreach",
    body: "Draft, schedule, and track personalized outreach emails, with replies auto-classified so nothing falls through.",
  },
];

export default function LandingPage() {
  return (
    <main>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-5) var(--content-pad-desktop)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--gold-500)",
            }}
          />
          <strong>Freelance-Moncha</strong>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
          <Link href="/privacy" style={{ color: "var(--text-secondary)" }}>
            Privacy
          </Link>
          <Link href="/terms" style={{ color: "var(--text-secondary)" }}>
            Terms
          </Link>
          <Link
            href="/login"
            style={{
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-sm)",
              background: "var(--gold-500)",
              color: "#0b0b0b",
              fontWeight: 700,
            }}
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "var(--space-16) var(--content-pad-desktop)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "var(--text-display)",
            lineHeight: "var(--text-display-lh)",
            fontWeight: 900,
            marginBottom: "var(--space-5)",
          }}
        >
          Freelance-Moncha
        </h1>
        <p
          style={{
            fontSize: "var(--text-h3)",
            color: "var(--text-secondary)",
            maxWidth: 640,
            margin: "0 auto var(--space-10)",
          }}
        >
          Freelance-Moncha is a personal job-search intelligence dashboard for Upwork
          freelancers. It aggregates job alerts, scores every posting against your saved
          preferences, runs website audits on promising opportunities, and helps you
          draft and track personalized outreach.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-4)" }}>
          <Link
            href="/login"
            style={{
              padding: "var(--space-3) var(--space-8)",
              borderRadius: "var(--radius-sm)",
              background: "var(--gold-500)",
              color: "#0b0b0b",
              fontWeight: 700,
            }}
          >
            Open your dashboard
          </Link>
        </div>
      </section>

      <section
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "0 var(--content-pad-desktop) var(--space-16)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "var(--space-5)",
        }}
      >
        {features.map((feature) => (
          <article
            key={feature.title}
            style={{
              padding: "var(--space-6)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h2 style={{ marginBottom: "var(--space-2)" }}>{feature.title}</h2>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              {feature.body}
            </p>
          </article>
        ))}
      </section>

      <footer
        style={{
          padding: "var(--space-6) var(--content-pad-desktop)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          color: "var(--text-muted)",
          fontSize: "var(--text-body-sm)",
        }}
      >
        <span>&copy; Freelance-Moncha</span>
        <span style={{ display: "flex", gap: "var(--space-5)" }}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </span>
      </footer>
    </main>
  );
}