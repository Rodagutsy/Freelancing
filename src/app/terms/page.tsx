import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "3rem 1.5rem", lineHeight: 1.7 }}>
      <h1>Terms of Service</h1>
      <p><strong>Last updated:</strong> September 24, 2026</p>

      <h2>Acceptance</h2>
      <p>
        By using Upwork Radar, you agree to these terms. This is a private tool operated
        for research and personal use.
      </p>

      <h2>Use of the service</h2>
      <p>
        You may use the service to aggregate, score, and act on job opportunities you
        are eligible to pursue. You are responsible for complying with the terms of any
        third-party platform (including Upwork) when posting, responding to, or messaging
        through it.
      </p>

      <h2>Account and access</h2>
      <p>
        The dashboard is restricted to authorized users. You agree to keep your
        credentials secure and to not share access.
      </p>

      <h2>No warranties / limitation of liability</h2>
      <p>
        Score and audit outputs are automated estimates and are provided without warranty
        of accuracy or fitness for a particular purpose. The operator is not liable for
        decisions made based on this data or for interruptions to the service.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated from time to time; continued use after an update
        constitutes acceptance of the revised terms.
      </p>

      <h2>Contact</h2>
      <p>Questions can be sent to the account owner of this dashboard.</p>
    </main>
  );
}