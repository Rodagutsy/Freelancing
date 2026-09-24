import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "3rem 1.5rem", lineHeight: 1.7 }}>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> September 24, 2026</p>

      <p>
        Upwork Radar is a personal tool for researching and qualifying Upwork job
        opportunities. This policy explains what data it collects and how it is used.
      </p>

      <h2>Information collected</h2>
      <p>
        The service processes job alerts forwarded by email (Gmail), saves the parsed
        job listing in its database for scoring, and stores generated scores, audit
        results, outreach drafts, and correspondence metadata you create while using it.
      </p>

      <h2>How data is used</h2>
      <p>
        Data is used solely to (a) match job listings against your saved preferences,
        (b) generate scoring and audit results, and (c) draft and track outreach email
        sequences. Data is never sold or shared for advertising.
      </p>

      <h2>Storage and retention</h2>
      <p>
        Data is stored in hosted infrastructure (including Google Cloud services and
        email providers) under the account you control. You may delete records from the
        dashboard at any time; deletion is permanent.
      </p>

      <h2>Security</h2>
      <p>
        Access is protected by authenticated sessions, and external integrations use
        per-service credentials with least-privilege scopes.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy can be sent to the account owner of this dashboard.</p>
    </main>
  );
}