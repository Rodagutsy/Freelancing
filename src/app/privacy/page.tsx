import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Freelance-Moncha collects, uses, retains, and protects your personal data, and the rights you have over it.",
};

const CONTACT_EMAIL = "rodagutsy@gmail.com";
const APP_URL = "https://freelancing-mocha.vercel.app";
const REVOCATION_URL = "https://myaccount.google.com/permissions";

const h2 = {
  color: "var(--text-primary)",
  margin: "var(--space-8) 0 var(--space-3)",
} as const;

const list = {
  listStyle: "disc",
  paddingLeft: "var(--space-6)",
  margin: "var(--space-3) 0",
} as const;

const cell = {
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  padding: "var(--space-3)",
  textAlign: "left" as const,
  verticalAlign: "top" as const,
  fontSize: "var(--text-body-sm)",
};

const dataUseTable = [
  {
    data: "Email address and account identity",
    purpose: "Authenticate you, maintain your session, and associate records with your account",
    shared: "Supabase (authentication)",
  },
  {
    data: "Upwork job-alert emails from Gmail",
    purpose: "Parse the alert into a structured job record you asked us to monitor",
    shared: "Google (Gmail API), DeepSeek (scoring)",
  },
  {
    data: "Structured job records and fit scores",
    purpose: "Rank and search opportunities against your saved preferences",
    shared: "Stored in our database; not sold or shared for advertising",
  },
  {
    data: "Website audit results",
    purpose: "Score the sites attached to opportunities you request an audit for",
    shared: "Stored in our database",
  },
  {
    data: "Outreach drafts and send metadata",
    purpose: "Send and track outreach email that you initiate",
    shared: "Google (Gmail API) when you send",
  },
  {
    data: "Server logs (IP address, timestamp, request path)",
    purpose: "Operate, secure, and troubleshoot the service",
    shared: "Vercel (hosting)",
  },
];

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
        Effective date: September 26, 2026 &middot; Last updated: September 26, 2026
      </p>

      <p>
        <strong>Freelance-Moncha</strong> (the &ldquo;Service&rdquo;) is a personal
        job-search intelligence tool that helps freelancers collect, score, audit, and act
        on job opportunities published on Upwork. This Privacy Policy explains what
        information the Service collects, why it is collected, how long it is kept, who it
        is shared with, and the choices and rights you have.
      </p>
      <p>
        The Service is operated by a single individual. The quickest way to reach us about
        any privacy question is email:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--gold-500)" }}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2 style={h2}>1. Information we collect</h2>
      <p>
        <strong>Account information.</strong> When you sign in, we use your email address
        and password-based authentication managed by our authentication provider. We store
        only the identity metadata needed to keep your session secure, such as your user
        identifier and the timestamps of sign-in and sign-out events.
      </p>
      <p>
        <strong>Job alert emails.</strong> With your explicit permission, the Service
        connects to Gmail and reads the alert emails that Upwork sends you for your saved
        searches (for example &ldquo;View Job Posting&rdquo; alerts). We extract the job
        title, link, description, and pay information and store that structured data so it
        can be scored and searched. Raw email bodies are used only to parse the job during
        processing and are not permanently stored.
      </p>
      <p>
        <strong>Upwork job data.</strong> Structured job records (title, description,
        client, budget, category, posted time) and the scores generated for them.
      </p>
      <p>
        <strong>Website audit data.</strong> When you request an audit of a website, we
        fetch that publicly available page and record its content characteristics,
        discovered issues, and the scores and recommendations generated from them. We do
        not attempt to audit pages behind a login or paywall.
      </p>
      <p>
        <strong>Outreach correspondence.</strong> Drafts, sent-message metadata, and reply
        classifications for outreach you create through the dashboard.
      </p>
      <p>
        <strong>Usage and technical data.</strong> Server logs may record IP addresses,
        timestamps, user agent, and request path to operate, secure, and troubleshoot the
        Service.
      </p>

      <h2 style={h2}>2. How we use your information, and who receives it</h2>
      <p>
        We use the information collected only to provide the features you ask for and to
        keep the Service secure. We do <strong>not</strong> sell your personal information,
        we do not use it for advertising, and we do not use it for any purpose other than
        the ones described here.
      </p>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          margin: "var(--space-5) 0",
          display: "block",
          overflowX: "auto",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...cell, color: "var(--text-primary)" }}>Data</th>
            <th style={{ ...cell, color: "var(--text-primary)" }}>Why we use it</th>
            <th style={{ ...cell, color: "var(--text-primary)" }}>Shared with</th>
          </tr>
        </thead>
        <tbody>
          {dataUseTable.map((row) => (
            <tr key={row.data}>
              <td style={cell}>{row.data}</td>
              <td style={cell}>{row.purpose}</td>
              <td style={cell}>{row.shared}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={h2}>3. Google and Gmail usage disclosure</h2>
      <p>
        The Service uses the Google Gmail API through your own Google account consent.
        Specifically, it may (a) read incoming job-alert emails from Upwork, and (b) send
        outreach or digest messages on your behalf when you create them. Access is scoped
        to what each feature requires and is used exclusively to provide these features.
      </p>
      <p>
        Our use of information received from Google APIs complies with the{" "}
        <strong>Google API Services User Data Policy</strong>, including its Limited Use
        requirements. In particular, we do not transfer, sell, or use Gmail data for
        advertising or for training models, we do not use it for purposes unrelated to the
        user-facing features described above, and we only pass data to subprocessors as
        needed to provide the feature you requested. We do not use Gmail data to build
        profiles or to make automated decisions about you.
      </p>
      <p>
        <strong>Revoking access.</strong> You can withdraw Gmail access at any time without
        leaving the Service. Visit your Google account permissions page at{" "}
        <a
          href={REVOCATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--gold-500)" }}
        >
          myaccount.google.com/permissions
        </a>
        , find Freelance-Moncha under &ldquo;Third-party apps &amp; services&rdquo;,
        and select <em>Remove access</em>. Once revoked, the Service can no longer read or
        send Gmail messages on your behalf, and new alerts will stop being imported. Your
        previously imported job records remain in your account until you delete them.
      </p>

      <h2 style={h2}>4. Service providers</h2>
      <p>
        We rely on a limited number of third parties to operate the Service. Each processes
        data only under our instruction and only as required to provide its function:
      </p>
      <ul style={list}>
        <li>
          <strong>Google (Gmail, Google APIs)</strong> &mdash; email access and sending;
        </li>
        <li>
          <strong>Supabase</strong> &mdash; database hosting and authentication;
        </li>
        <li>
          <strong>Vercel</strong> &mdash; web hosting and content delivery;
        </li>
        <li>
          <strong>DeepSeek</strong> &mdash; AI-assisted scoring and analysis;
        </li>
        <li>
          <strong>n8n</strong> &mdash; self-hosted workflow automation.
        </li>
      </ul>
      <p>
        Each of these providers has its own privacy policy and may process data in its own
        jurisdictions. We do not sell your data to any of them, and we do not permit them
        to use your data for their own independent purposes.
      </p>

      <h2 style={h2}>5. How long we keep your data</h2>
      <p>We apply the following concrete retention periods:</p>
      <ul style={list}>
        <li>
          <strong>Server logs (IP address, timestamp, user agent, request path)</strong>{" "}
          &mdash; retained for no more than <strong>30 days</strong>, then deleted.
        </li>
        <li>
          <strong>Session cookies</strong> &mdash; retained for the duration of your
          session only. They are deleted when you sign out, and browser storage is cleared
          when you delete your account.
        </li>
        <li>
          <strong>Raw email content used for parsing</strong> &mdash; held only in memory
          during processing and <strong>not stored</strong> beyond that.
        </li>
        <li>
          <strong>Job records, audit results, and outreach records</strong> &mdash;
          retained <strong>until you delete them</strong>, so your history stays available
          in the dashboard. Deletion is immediate and permanent.
        </li>
        <li>
          <strong>Account data and identity records</strong> &mdash; retained until you
          request deletion of your account, then removed from the active database within{" "}
          <strong>30 days</strong>.
        </li>
        <li>
          <strong>Encrypted backups</strong> &mdash; deleted on a rolling cycle within{" "}
          <strong>90 days</strong>, so residual copies age out rather than persisting
          indefinitely.
        </li>
      </ul>
      <p>
        We retain data only as long as needed for the purposes described in this policy or
        as required by law. We do not retain data for indefinite periods.
      </p>

      <h2 style={h2}>6. Cookies and local storage</h2>
      <p>
        The Service uses a small number of cookies and browser storage entries, all of which
        are strictly necessary to operate it. We do not use advertising, analytics, or
        cross-site tracking cookies, and we do not sell or share data through cookies.
      </p>
      <ul style={list}>
        <li>
          <strong>Session cookie</strong> &mdash; set when you sign in. It authenticates
          your session so you are not asked to sign in on every page visit. It is required
          for the Service to function and cannot be disabled without breaking sign-in.
        </li>
        <li>
          <strong>Local storage</strong> &mdash; used to remember non-sensitive interface
          preferences such as the last dashboard view you opened, so the app can restore
          your context on return visits.
        </li>
      </ul>
      <p>
        Because these are required for the Service to work, they are exempt from consent
        requirements in jurisdictions that distinguish strictly necessary cookies. If you
        clear your browser storage or cookies, you will simply be asked to sign in again.
      </p>

      <h2 style={h2}>7. Security</h2>
      <p>
        Data is transmitted over encrypted connections using TLS, access to your records is
        protected by authenticated sessions, and external integrations use least-privilege
        credentials with OAuth authorization wherever the provider supports it. You are
        responsible for keeping your password and any logged-in sessions private, and for
        signing out on shared or public devices.
      </p>
      <p>
        No system is perfectly secure. If a breach affects your personal data, we will take
        reasonable steps to contain it and will notify you and any applicable regulator as
        required by law.
      </p>

      <h2 style={h2}>8. Your rights and choices</h2>
      <p>
        Depending on where you live, you may have rights under data protection law. We
        extend the same rights to every user. Specifically, you may:
      </p>
      <ul style={list}>
        <li>
          <strong>Access.</strong> View the data we hold about you directly in the
          dashboard, or request a copy of everything associated with your account.
        </li>
        <li>
          <strong>Export / portability.</strong> Request a machine-readable copy of your
          data (for example as JSON or CSV). We will provide it within 30 days of your
          request, at no charge.
        </li>
        <li>
          <strong>Correction.</strong> Correct or update inaccurate information, either in
          the dashboard or by contacting us.
        </li>
        <li>
          <strong>Deletion.</strong> Delete individual job, audit, or outreach records
          yourself at any time, or request deletion of your entire account. Account
          deletion is permanent and cannot be undone.
        </li>
        <li>
          <strong>Withdraw consent.</strong> Revoke the Google/Gmail connection at any time
          using the link in Section 3. Revoking consent stops the corresponding processing
          immediately.
        </li>
        <li>
          <strong>Object or restrict processing.</strong> Ask us to stop processing your
          data, or to restrict certain uses of it.
        </li>
        <li>
          <strong>Complain.</strong> File a complaint with your local data protection
          supervisory authority.
        </li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--gold-500)" }}>
          {CONTACT_EMAIL}
        </a>{" "}
        from the address on your account. We respond to verified requests within 30 days.
        There is no charge for reasonable requests, and we will not penalise you for
        exercising a right.
      </p>

      <h2 style={h2}>9. International data transfers</h2>
      <p>
        The Service is operated from outside your country of residence, and some of our
        providers (including Google, Vercel, and Supabase) process data in data centers
        located in other countries. As a result, your personal data may be transferred
        across borders.
      </p>
      <p>
        Where a transfer is required, we rely on an appropriate legal mechanism, such as
        Standard Contractual Clauses or an adequacy decision where one applies, and we limit
        transfers to what is necessary to provide the Service. You may contact us for more
        information about the safeguards applied to a transfer from your country.
      </p>

      <h2 style={h2}>10. Children</h2>
      <p>
        The Service is intended for adults working as freelance professionals and is not
        directed at children under 13. We do not knowingly collect personal data from
        children under 13. If you believe a child has provided us personal data, contact us
        and we will delete it.
      </p>

      <h2 style={h2}>11. Changes to this policy</h2>
      <p>
        We may update this policy as the Service evolves. The last-updated date at the top of
        this page reflects the latest revision. If a change materially affects how we use
        your data, we will provide additional notice, such as a notice in the dashboard or by
        email, before the change takes effect. Continued use of the Service after a change
        constitutes acceptance of the updated policy.
      </p>

      <h2 style={h2}>12. Contact us</h2>
      <p>
        If you have any questions about this Privacy Policy, want to exercise a right, or
        need to request a copy or deletion of your data, contact the operator of
        Freelance-Moncha:
      </p>
      <ul style={list}>
        <li>
          <strong>Email:</strong>{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--gold-500)" }}>
            {CONTACT_EMAIL}
          </a>
        </li>
        <li>
          <strong>Service address:</strong>{" "}
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gold-500)" }}
          >
            {APP_URL}
          </a>
        </li>
      </ul>
    </main>
  );
}
