import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>
        Effective date: September 24, 2026
      </p>

      <p>
        Upwork Radar is a personal job-search intelligence tool that helps freelancers
        collect, score, audit, and act on Upwork job opportunities. This Privacy Policy
        explains what information the application collects, why it is collected, how it
        is used, and the choices you have.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        1. Information we collect
      </h2>
      <p>
        <strong>Account information.</strong> When you sign in, we use your email
        address and password-based authentication managed by our authentication provider.
        We store only the identity metadata needed to keep your session secure.
      </p>
      <p>
        <strong>Job alert emails.</strong> With your explicit permission, the
        application connects to Gmail and reads the emails that Upwork sends you for your
        saved searches (for example &ldquo;View Job Posting&rdquo; alerts). We extract the
        job title, link, description, and pay information and store that structured data
        so it can be scored and searched. The raw email bodies are used only to parse the
        job and are not permanently stored.
      </p>
      <p>
        <strong>Upwork job data.</strong> Structured job records (title, description,
        client, budget, category, posted time) and the scores that are generated for them.
      </p>
      <p>
        <strong>Website audit data.</strong> When you request an audit of a website, we
        fetch that publicly available page and record its content characteristics,
        discovered issues, and generated scores and recommendations.
      </p>
      <p>
        <strong>Outreach correspondence.</strong> Drafts, sent-message metadata, and
        reply classifications for outreach you create through the dashboard.
      </p>
      <p>
        <strong>Usage and technical data.</strong> Server logs may record IP addresses,
        timestamps, and request information to operate, secure, and troubleshoot the
        service.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        2. How we use your information
      </h2>
      <p>We use the information collected only to:</p>
      <ul style={{ listStyle: "disc", paddingLeft: "var(--space-6)", margin: "var(--space-3) 0" }}>
        <li>ingest and structure the job alerts you asked us to monitor;</li>
        <li>score and rank jobs against your saved preferences;</li>
        <li>run website audits and analyze their results;</li>
        <li>draft, send, and track outreach email you initiate; and</li>
        <li>keep the service secure and operational.</li>
      </ul>
      <p>
        We do not sell your personal information, we do not use it for advertising, and
        we do not use it for purposes other than the ones described here.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        3. Google / Gmail usage disclosure
      </h2>
      <p>
        The application uses the Google Gmail API through your own Google account consent.
        Specifically it may (a) read incoming job-alert emails from Upwork, and (b) send
        outreach or digest messages on your behalf when you create them. Access is scoped
        to what the feature requires and is used exclusively to provide these features.
      </p>
      <p>
        Our use of information received from Google APIs complies with the{" "}
        <strong>Google API Services User Data Policy</strong>, including the Limited Use
        requirements. In particular, we do not transfer, sell, or use Gmail data for
        advertising or for non-user-facing model training, and we only pass data to
        subprocessors as needed to provide the feature you requested. You can review and
        revoke access at any time from your Google account&apos;s{" "}
        <em>Third-party apps &amp; services</em> page.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        4. Service providers
      </h2>
      <p>
        We rely on limited third parties to operate the service. Each processes data
        only under our instruction and only as required to provide their respective
        function:
      </p>
      <ul style={{ listStyle: "disc", paddingLeft: "var(--space-6)", margin: "var(--space-3) 0" }}>
        <li><strong>Google (Gmail, Google APIs)</strong> — email access and sending;</li>
        <li><strong>Supabase</strong> — database and authentication;</li>
        <li><strong>Vercel</strong> — web hosting and delivery;</li>
        <li><strong>DeepSeek</strong> — AI-powered scoring and analysis;</li>
        <li><strong>n8n</strong> — self-hosted workflow automation.</li>
      </ul>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        5. How long we keep data
      </h2>
      <p>
        Structured job, audit, and outreach records remain stored for as long as you keep
        them, so your history is available in the dashboard. Raw email content used for
        parsing is not stored beyond processing. You can delete individual records or
        your account at any time; deletion is permanent.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        6. Security
      </h2>
      <p>
        Data is transmitted over encrypted connections, access is protected by
        authenticated sessions, and external integrations use least-privilege credentials
        (OAuth where available). You are responsible for keeping your password and
        logged-in sessions private.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        7. Your rights and choices
      </h2>
      <p>You can, at any time:</p>
      <ul style={{ listStyle: "disc", paddingLeft: "var(--space-6)", margin: "var(--space-3) 0" }}>
        <li>view and update the data shown in the dashboard;</li>
        <li>delete job, audit, or outreach records;</li>
        <li>revoke the Google/Gmail connection from your Google account; and</li>
        <li>contact us to request account deletion or ask questions about this policy.</li>
      </ul>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        8. Children
      </h2>
      <p>
        The service is intended for adults working as freelance professionals and is not
        directed at children under 13.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        9. Changes to this policy
      </h2>
      <p>
        We may update this policy as the service evolves. The effective date at the top of
        this page reflects the latest revision, and continued use of the service after a
        change constitutes acceptance.
      </p>

      <h2 style={{ color: "var(--text-primary)", margin: "var(--space-8) 0 var(--space-3)" }}>
        10. Contact
      </h2>
      <p>
        Questions about this policy can be directed to the account owner of this
        dashboard.
      </p>
    </main>
  );
}