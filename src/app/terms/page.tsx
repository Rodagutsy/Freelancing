import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of Freelance-Moncha, a personal job-search intelligence dashboard for freelance professionals.",
};

const CONTACT_EMAIL = "rodagutsy@gmail.com";
const APP_URL = "https://freelancing-mocha.vercel.app";

const GOVERNING_LAW = "Ukraine";

const h2 = {
  color: "var(--text-primary)",
  margin: "var(--space-8) 0 var(--space-3)",
} as const;

const list = {
  listStyle: "disc",
  paddingLeft: "var(--space-6)",
  margin: "var(--space-3) 0",
} as const;

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
        Effective date: September 26, 2026 &middot; Last updated: September 26, 2026
      </p>

      <p>
        These Terms of Service (the &ldquo;Terms&rdquo;) govern your access to and use of{" "}
        <strong>Freelance-Moncha</strong> (the &ldquo;Service&rdquo;). By creating an
        account or by using the Service, you agree to these Terms. If you do not agree, do
        not use the Service.
      </p>

      <h2 style={h2}>1. About the Service</h2>
      <p>
        Freelance-Moncha is a personal job-search intelligence dashboard for freelance
        professionals. It imports job alerts from your own Gmail account, converts them into
        structured job records, scores opportunities against your saved preferences, runs
        website audits on client sites, and assists with drafting and tracking outreach that
        you initiate.
      </p>
      <p>
        The Service is operated by a single individual as a private productivity tool. It
        is not a staffing agency, recruitment service, or employment platform.
      </p>

      <h2 style={h2}>2. No affiliation with third-party job platforms</h2>
      <p>
        <strong>
          Freelance-Moncha is an independent tool. It is not affiliated with, endorsed by,
          sponsored by, or operated by Upwork Global Inc., or with any other job board,
          marketplace, or freelancing platform.
        </strong>
      </p>
      <p>
        Upwork, Google, and every other third-party platform referenced in the Service
        remain the property of their respective owners. Their trademarks, trade names, and
        logos are used only to identify the platforms whose public data the Service works
        with, or to describe the integration you have chosen to enable. Use of a third-party
        name or mark does not imply any endorsement, sponsorship, or association.
      </p>
      <p>
        The Service reads publicly available job listings and alert emails addressed to
        your own account. It does not represent itself as an official product of any third
        party, and it does not control, moderate, or have any authority over any third-party
        platform or its content.
      </p>

      <h2 style={h2}>3. Third-party platforms and their terms</h2>
      <p>
        The Service interacts with third-party platforms, including Upwork and Google
        Gmail. Your use of those platforms is governed solely by their own terms of service
        and privacy policies, which you must read and accept independently. We are not
        responsible for the content, accuracy, availability, or policies of any third-party
        platform.
      </p>
      <p>You agree to:</p>
      <ul style={list}>
        <li>
          comply with the terms of service of every third-party platform you use with the
          Service, including Upwork, when applying to, responding to, messaging, or
          otherwise interacting through it;
        </li>
        <li>
          ensure that any website you submit for an audit is one you are authorised to
          analyse;
        </li>
        <li>
          use the Gmail connection only for the purposes described in the Service, and
          revoke it as described in the Privacy Policy if you no longer wish to share data;
        </li>
        <li>
          avoid actions that would violate a third party&apos;s terms, including automated
          scraping at a rate the platform prohibits, bypassing rate limits, or using the
          platform to send unsolicited commercial messages; and
        </li>
        <li>
          recognise that a third-party platform may change, restrict, or discontinue its
          APIs and feeds at any time, which can degrade or interrupt Service features
          without notice.
        </li>
      </ul>

      <h2 style={h2}>4. Your account</h2>
      <p>You agree to:</p>
      <ul style={list}>
        <li>provide accurate registration information and keep it current;</li>
        <li>
          keep your credentials confidential and not share, resell, or sublicense access to
          your account;
        </li>
        <li>notify us promptly if you suspect unauthorised access to your account; and</li>
        <li>be at least 18 years old, or the age of majority where you live.</li>
      </ul>

      <h2 style={h2}>5. Account suspension and termination</h2>
      <p>
        You may stop using the Service and request deletion of your account at any time by
        emailing{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--gold-500)" }}>
          {CONTACT_EMAIL}
        </a>
        . We will confirm receipt and complete the deletion within 30 days.
      </p>
      <p>We may suspend or terminate your access, with or without notice, if you:</p>
      <ul style={list}>
        <li>breach these Terms or the Privacy Policy;</li>
        <li>
          use the Service to send spam or unsolicited commercial messages, or to harass or
          harm anyone;
        </li>
        <li>
          attempt to gain unauthorised access to the Service, its infrastructure, or the
          data of another user;
        </li>
        <li>
          interfere with, disrupt, or attempt to disrupt the Service or third-party
          integrations; or
        </li>
        <li>resell, sublicense, or provide the Service to third parties without permission.</li>
      </ul>
      <p>
        You may appeal a suspension or termination by contacting us at the address above.
        Where we terminate for cause, we will explain the reason. On termination, your
        access ends immediately, your imported records and drafts cease to be available, and
        we may delete your data in accordance with the retention schedule in the{" "}
        <a href="/privacy" style={{ color: "var(--gold-500)" }}>
          Privacy Policy
        </a>
        . Provisions that by their nature should survive termination &mdash; including
        intellectual property, disclaimers, and limitation of liability &mdash; survive.
      </p>

      <h2 style={h2}>6. Your responsibilities</h2>
      <p>You agree to:</p>
      <ul style={list}>
        <li>provide accurate information when configuring your preferences and scores;</li>
        <li>review outreach drafts before sending them;</li>
        <li>
          comply with the terms of any third-party platform when proposing, responding to, or
          messaging through it; and
        </li>
        <li>
          not use the Service to send unsolicited commercial messages outside of legitimate
          outreach.
        </li>
      </ul>

      <h2 style={h2}>7. Accuracy of automated outputs</h2>
      <p>
        Scores, audits, rankings, and analysis are automated estimates generated by
        machine-learning models and heuristic rules. They are provided &ldquo;as is&rdquo;
        without warranty of accuracy, completeness, or fitness for any particular purpose,
        and they may be wrong, out of date, or misleading. You are solely responsible for
        reviewing outputs and independently verifying any job, client, or claim before
        acting on them or communicating with anyone.
      </p>
      <p>
        Nothing in the Service constitutes legal, financial, or professional advice. Nothing
        in the Service creates a professional, agency, fiduciary, or client relationship
        between you and any third-party platform or its users.
      </p>

      <h2 style={h2}>8. Your data and content</h2>
      <p>
        You retain ownership of the data you import and the content you create. As described
        in the{" "}
        <a href="/privacy" style={{ color: "var(--gold-500)" }}>
          Privacy Policy
        </a>
        , you may view, export, correct, and delete your data at any time, and you may revoke
        the Gmail connection at any time.
      </p>
      <p>
        You grant us only the narrow, temporary permission needed to host, process, back up,
        and display your data for the purpose of operating the Service &mdash; for example,
        to parse an alert email you asked us to import, or to send a draft you approved.
      </p>

      <h2 style={h2}>9. Intellectual property</h2>
      <p>
        The software, design, and original content of the Service are owned by the operator.
        You may not copy, resell, sublicense, or create derivative works from the Service or
        its source code without permission. Anything you generate through the Service
        remains yours to use in your business, subject to the terms of any third-party
        platform whose content you process.
      </p>

      <h2 style={h2}>10. Acceptable use and availability</h2>
      <p>
        We may modify, suspend, or discontinue any feature at any time. Because the Service
        depends on third-party APIs, feeds, and hosting, we do not guarantee that it will be
        uninterrupted or error-free. We may impose rate limits or other limits to protect
        the Service and its third-party dependencies.
      </p>

      <h2 style={h2}>11. Disclaimer of warranties</h2>
      <p>
        The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        basis, without warranties of any kind, whether express or implied, including any
        implied warranties of merchantability, fitness for a particular purpose, and
        non-infringement. We do not warrant that the Service will meet your specific
        requirements or that any opportunity surfaced through it will be genuine, available,
        or suitable.
      </p>

      <h2 style={h2}>12. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the operator is not liable for any indirect,
        incidental, special, consequential, or punitive damages, nor for any loss of profits,
        revenue, data, or goodwill, arising out of or related to your use of the Service
        &mdash; including decisions you make in reliance on its output, the availability or
        content of third-party platforms, or interruptions to availability. Even if the
        operator has been advised of the possibility of such damages, they remain excluded.
      </p>
      <p>
        Nothing in these Terms excludes or limits liability that cannot lawfully be excluded
        or limited, including liability for death or personal injury caused by negligence, or
        for fraud. Where the operator is a business, the operator&apos;s total aggregate
        liability to you for all claims arising out of the Service is limited to the greater
        of the amount you paid for the Service in the twelve months before the claim, or
        USD 100. Some jurisdictions do not allow certain exclusions, so parts of this
        section may not apply to you.
      </p>

      <h2 style={h2}>13. Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless the operator against any claim, demand,
        loss, or expense (including reasonable legal fees) arising from your use of the
        Service, your breach of these Terms, or your violation of a third-party
        platform&apos;s terms.
      </p>

      <h2 style={h2}>14. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. The last-updated date at the top of this
        page reflects the latest revision. If a change materially affects your rights, we
        will provide notice in the dashboard or by email before it takes effect. Continued
        use of the Service after a change constitutes acceptance of the updated Terms.
      </p>

      <h2 style={h2}>15. Governing law</h2>
      <p>
        These Terms are governed by and construed in accordance with the laws of{" "}
        {GOVERNING_LAW}, without regard to its conflict-of-law rules. Any dispute arising out
        of or relating to these Terms or the Service shall be subject to the exclusive
        jurisdiction of the competent courts of {GOVERNING_LAW}.
      </p>
      <p>
        Nothing in this section removes or limits any mandatory consumer protection or
        statutory rights that apply to you under the law of your country of residence. If a
        mandatory local rule conflicts with this section, the mandatory local rule prevails,
        and the remainder of this section applies only to the extent permitted.
      </p>
      <p>
        If you are a consumer, you may also bring claims in the courts of your country of
        residence. Nothing in these Terms waives your right to bring proceedings in
        accordance with applicable law.
      </p>

      <h2 style={h2}>16. Severability, waiver, and assignment</h2>
      <p>
        If any provision of these Terms is held unenforceable, the remaining provisions stay
        in full force. A failure to enforce a provision is not a waiver of it. These Terms
        are for your benefit alone and may not be assigned by you without consent; the
        operator may assign these Terms to a successor in connection with a transfer of the
        Service.
      </p>

      <h2 style={h2}>17. Entire agreement</h2>
      <p>
        These Terms, together with the{" "}
        <a href="/privacy" style={{ color: "var(--gold-500)" }}>
          Privacy Policy
        </a>
        , constitute the entire agreement between you and the operator regarding the Service
        and supersede any prior or contemporaneous understandings. If any conflict arises,
        these Terms control.
      </p>

      <h2 style={h2}>18. Contact us</h2>
      <p>
        Questions about these Terms, including requests to terminate an account, can be
        directed to the operator of Freelance-Moncha:
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
