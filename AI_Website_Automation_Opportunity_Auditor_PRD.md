# AI Website & Automation Opportunity Auditor — PRD

## 1. Product Overview

### Product name
**AI Website & Automation Opportunity Auditor**

### Purpose

A platform module for a freelancer/agency operating system that analyzes a business website and turns the analysis into actionable opportunities for:

- Website UX/UI improvements
- Conversion-rate improvements
- Technical fixes
- SEO improvements
- Accessibility improvements
- Business-process automation
- AI-agent opportunities
- Lead-generation opportunities
- Integration opportunities
- Freelance implementation opportunities

The module is designed primarily for **internal use by the freelancer first**, with the option to expose selected audit functionality to prospects/clients later.

The primary outcome is not simply a website report.

The primary outcome is:

> **"Give me enough evidence about this business to identify a credible problem I can pitch, explain the business impact, and recommend a solution I can implement."**

---

# 2. Strategic Context

This module is part of a larger freelancing platform intended to help the freelancer:

1. Discover prospects.
2. Research prospects.
3. Analyze their websites and business workflows.
4. Identify problems.
5. Identify automation opportunities.
6. Generate personalized outreach.
7. Prepare proposals.
8. Track opportunities.
9. Build/implement solutions.
10. Follow up and manage the sales pipeline.

The auditor therefore should be designed as a reusable intelligence layer rather than an isolated SaaS product.

---

# 3. Core Problem

Freelancers commonly waste time manually researching businesses before outreach.

Typical workflow:

```text
Find business
    ↓
Open website
    ↓
Browse pages manually
    ↓
Inspect forms/tools
    ↓
Guess operational problems
    ↓
Research their tech stack
    ↓
Think of automation ideas
    ↓
Write personalized pitch
```

This is slow and inconsistent.

The platform should reduce this to:

```text
Business / Website
       ↓
Automated Analysis
       ↓
Evidence
       ↓
Problems
       ↓
Automation Opportunities
       ↓
Recommended Solutions
       ↓
Personalized Pitch
```

---

# 4. Product Goals

## Primary goals

- Analyze a website automatically.
- Identify real, observable website issues.
- Detect technologies, forms, booking systems and integrations.
- Identify potential business automation opportunities.
- Separate facts from inferences.
- Rank opportunities by business value and implementation feasibility.
- Generate implementation-ready automation concepts.
- Generate outreach-ready findings.
- Store the audit inside the freelancer's prospect record.
- Reduce prospect research time from tens of minutes to a few minutes.

## Secondary goals

- Generate client-facing audit reports.
- Compare websites over time.
- Monitor existing client websites.
- Generate proposal material.
- Feed findings into an n8n implementation workflow.
- Eventually allow prospects to run self-service audits.

---

# 5. Non-Goals for V1

The first version should NOT attempt to:

- Replace enterprise SEO tools such as Ahrefs or Semrush.
- Guarantee conversion-rate improvements.
- Claim knowledge of private/internal business processes.
- Automatically make production changes to websites.
- Automatically send cold outreach without user review.
- Crawl unlimited websites.
- Build every possible automation automatically.
- Become a full CRM.
- Become a full project-management platform.

The system should identify **credible opportunities**, not fabricate certainty.

---

# 6. Core Product Principle

Every finding must be classified into one of three states:

### Observed

Directly detected from the website or technical analysis.

Example:

> A Jotform registration form was detected.

### Inferred

A reasonable business opportunity inferred from observed evidence.

Example:

> The registration form could potentially be connected to downstream record creation and notifications.

### Confirmed

Information supplied or confirmed by the business/user.

Example:

> The business confirms that staff manually copy Jotform submissions into their practice-management system.

This distinction is critical for trustworthy outreach.

---

# 7. Target User

## Primary user

Freelancer/automation consultant who:

- Finds businesses online.
- Wants to pitch automation.
- Builds n8n workflows.
- Builds websites/internal tools/MVPs.
- Needs faster prospect research.
- Wants personalized outreach.
- Needs evidence before contacting prospects.

## Secondary users

- Small agencies
- Automation consultants
- Web developers
- UX consultants
- Freelance sales teams
- Digital transformation consultants

---

# 8. Main User Journey

```text
Prospect
   ↓
Website URL
   ↓
Start Audit
   ↓
Crawl Website
   ↓
Capture Screenshots
   ↓
Detect Technologies
   ↓
Run Technical Tests
   ↓
Analyze UI/UX
   ↓
Analyze Conversion
   ↓
Analyze Business Workflow Signals
   ↓
Identify Automation Opportunities
   ↓
Score Opportunities
   ↓
Generate Recommended Solutions
   ↓
Generate Outreach Angles
   ↓
Save to Prospect
```

---

# 9. Main Dashboard

The platform should provide a central audit workspace.

Example:

```text
Website Audit

examplebusiness.com

Overall Website Score
74 / 100

Automation Opportunity Score
82 / 100

------------------------------------------------

UI / Design       78
UX                69
Performance       71
Accessibility     82
SEO               76
Conversion        63
Automation        82

------------------------------------------------

Top Opportunities

1. Lead capture automation       HIGH
2. Appointment workflow          HIGH
3. CRM integration               HIGH
4. Follow-up automation          MEDIUM

------------------------------------------------

[View Website Issues]
[View Automation Opportunities]
[Generate Pitch]
[Generate Report]
```

---

# 10. Website Discovery Engine

## Input

- Website URL
- Optional business name
- Optional industry
- Optional location
- Optional prospect record

## Responsibilities

- Validate URL.
- Resolve redirects.
- Identify canonical domain.
- Crawl selected pages.
- Detect sitemap.
- Detect robots.txt.
- Identify important page types.

## Page selection

V1 should intelligently prioritize:

- Homepage
- About
- Services
- Products
- Pricing
- Contact
- Booking
- Quote/request pages
- Registration pages
- Important landing pages

Default:

**5–10 pages per audit.**

Future tiers:

- Quick: 5 pages
- Standard: 10–25 pages
- Full: 50–100+ pages

---

# 11. Browser Automation

Use **Playwright**.

Responsibilities:

- Render JavaScript applications.
- Capture DOM.
- Capture screenshots.
- Inspect links.
- Inspect forms.
- Inspect buttons.
- Inspect navigation.
- Inspect images.
- Capture console errors.
- Capture network/performance data.
- Test responsive layouts.

Viewport presets:

```text
Desktop: 1440 × 900
Tablet: 1024 × 1366
Mobile: 390 × 844
```

---

# 12. Screenshot Engine

For important pages capture:

- Desktop screenshot
- Mobile screenshot

Store screenshots in object storage.

Recommended:

**Cloudflare R2 or S3-compatible storage**

Example:

```text
/audits/{audit_id}/
    homepage/
        desktop.png
        mobile.png
    services/
        desktop.png
        mobile.png
```

---

# 13. UI / Visual Design Analyzer

Use a vision-capable AI model combined with deterministic DOM information.

## Analyze

### Layout

- Alignment
- Spacing
- Grid consistency
- Whitespace
- Section proportions
- Visual density

### Typography

- Heading hierarchy
- Readability
- Font consistency
- Size contrast
- Line length

### Color

- Contrast
- Consistency
- CTA visibility
- Brand consistency

### Components

- Buttons
- Cards
- Forms
- Navigation
- Hero sections
- Footer
- Modals

### Visual hierarchy

The AI should determine:

- What users notice first.
- Whether that is desirable.
- Whether primary actions are visually prominent.
- Whether competing elements dilute attention.

---

# 14. UX Analyzer

Combine deterministic rules and AI reasoning.

Analyze:

## Navigation

- Number of navigation items
- Navigation depth
- Dropdown complexity
- Broken links
- Duplicate links
- Unclear labels

## Forms

- Number of fields
- Required fields
- Input types
- Labels
- Error handling
- CTA clarity
- Form complexity

## User journey

Evaluate:

```text
Landing
   ↓
Understanding
   ↓
Trust
   ↓
Action
```

Determine whether the intended journey is clear.

---

# 15. Conversion / CRO Analyzer

Analyze:

## Hero section

- Clear value proposition
- Target audience
- Outcome
- Primary CTA
- Supporting evidence

## Trust

- Testimonials
- Reviews
- Client logos
- Case studies
- Certifications
- Guarantees
- Results

## CTA

- Clarity
- Visibility
- Frequency
- Placement
- Competing actions

## Objection handling

Check whether the website answers:

- Why this business?
- Why this solution?
- How does it work?
- What does it cost?
- What happens next?
- Why should I trust them?

---

# 16. Technical Analyzer

Use deterministic tools wherever possible.

Recommended:

- Lighthouse
- axe-core
- Playwright
- HTML parser
- custom rules

Detect:

- Broken links
- HTTP errors
- Missing H1
- Heading hierarchy problems
- Missing title
- Missing meta description
- Missing canonical
- Missing viewport
- Missing alt text
- Large images
- Console errors
- JavaScript errors
- Slow resources
- Redirect chains

---

# 17. Performance Analyzer

Collect measurable data.

Example:

```text
Performance Score: 71

LCP: 3.1s
CLS: 0.08
INP: 210ms
TTFB: 0.9s
```

The system should distinguish:

### Measurement

What the tool actually detected.

### Interpretation

What the AI believes the issue means.

### Recommendation

What should be changed.

---

# 18. Accessibility Analyzer

Use axe-core.

Analyze:

- Contrast
- Form labels
- Alt text
- Keyboard accessibility
- ARIA
- Semantic HTML
- Interactive controls
- Focus states

AI should explain why detected issues matter, but the underlying violation should come from a deterministic accessibility engine.

---

# 19. SEO Structure Analyzer

V1 should focus on structural SEO.

Analyze:

- Title
- Meta description
- H1
- H2 structure
- URLs
- Canonicals
- Sitemap
- robots.txt
- Indexability
- Internal links
- Image alt text
- Duplicate pages
- Status codes

AI can additionally analyze:

- Content clarity
- Search intent alignment
- Thin content
- Content structure
- Keyword stuffing
- Topical gaps

---

# 20. Technology Detection

Detect technologies used by the website.

Examples:

- WordPress
- Webflow
- Shopify
- Wix
- Squarespace
- Next.js
- React
- HubSpot
- Salesforce
- Zoho
- Pipedrive
- GoHighLevel
- Calendly
- Jotform
- Typeform
- Mailchimp
- Klaviyo
- Google Analytics
- Meta Pixel
- Stripe
- PayPal
- Intercom
- Zendesk
- WhatsApp

Technology detection should use:

- HTML signatures
- Script URLs
- Headers
- DNS where appropriate
- DOM attributes
- Known technology fingerprints

Never claim a technology with low confidence.

---

# 21. Automation Opportunity Engine

This is a core feature.

The system should identify **potential business-process automation opportunities from observable website signals**.

Important:

The system must never state an internal workflow as fact unless the business confirms it.

---

# 22. Automation Signals

Look for:

### Forms

- Contact forms
- Quote forms
- Registration forms
- Application forms
- Lead forms
- Survey forms
- Patient/client intake forms

Potential opportunities:

- CRM creation
- Lead routing
- Notifications
- Qualification
- Email/SMS follow-up
- Record creation
- Internal task creation

---

### Booking

Detect:

- Calendly
- Acuity
- Google Calendar
- booking systems
- appointment forms

Potential opportunities:

```text
Booking
 ↓
Confirmation
 ↓
Reminder
 ↓
Internal notification
 ↓
Follow-up
```

---

### E-commerce

Detect:

- Shopify
- WooCommerce
- Checkout
- Product catalog
- Customer accounts

Potential opportunities:

- Order notifications
- CRM sync
- Inventory workflows
- Abandoned cart
- Customer segmentation
- Post-purchase follow-up
- Review requests

---

### Email

Detect:

- sales@
- info@
- support@
- contact forms

Potential opportunities:

- Email classification
- Lead routing
- AI response assistance
- CRM synchronization
- Internal notifications

---

### WhatsApp

Detect:

- WhatsApp links
- WhatsApp buttons
- WhatsApp contact CTAs

Potential opportunities:

- Lead capture
- Qualification
- FAQ automation
- Follow-up
- CRM synchronization
- Human handoff

---

### Quote / Estimate workflows

Potential workflow:

```text
Quote request
      ↓
Lead creation
      ↓
Qualification
      ↓
Sales notification
      ↓
Quote
      ↓
Follow-up
```

---

### Customer support

Detect:

- FAQ
- live chat
- support portal
- ticket systems

Potential opportunities:

- AI FAQ agent
- ticket routing
- escalation
- customer notifications
- support analytics

---

# 23. Automation Opportunity Schema

Every opportunity should contain:

```text
Opportunity
├── title
├── category
├── observed_signal
├── evidence
├── inference
├── confidence
├── business_impact
├── automation_potential
├── estimated_complexity
├── recommended_tools
├── recommended_workflow
├── implementation_notes
└── outreach_angle
```

Example:

```text
Title:
Lead Capture Automation

Observed Signal:
Website contains a contact form.

Evidence:
Homepage contact form detected.

Inference:
There may be an opportunity to automatically route submissions
to a CRM and notify the appropriate team.

Confidence:
82%

Impact:
High

Recommended Stack:
n8n + CRM + Gmail/Slack

Workflow:
Form → Validate → CRM → AI Qualification → Notification → Follow-up
```

---

# 24. Automation Opportunity Scoring

Each opportunity should be scored using:

- Business impact
- Frequency potential
- Customer-facing importance
- Implementation feasibility
- Integration availability
- Evidence confidence
- Potential time savings
- Potential revenue impact

Example:

```text
Automation Opportunity Score

Impact          9/10
Frequency       8/10
Feasibility     9/10
Confidence      8/10

Overall         85/100
```

---

# 25. Business Confirmation Layer

Website analysis alone cannot establish private business processes.

Add an optional questionnaire:

### Example questions

1. How do you currently handle new leads?
2. Where are leads stored?
3. How are appointments confirmed?
4. How are reminders sent?
5. How do staff follow up with customers?
6. How do you generate reports?
7. What tools do you use daily?
8. Which tasks are repetitive?
9. Which tasks require copying data between systems?
10. What process causes the most delays?

The user/business answers can upgrade:

```text
Inferred
```

to:

```text
Confirmed
```

---

# 26. Automation Recommendation Engine

For every high-value opportunity, generate:

```text
Problem
↓
Observed evidence
↓
Potential process
↓
Automation opportunity
↓
Recommended workflow
↓
Required tools
↓
Implementation complexity
↓
Expected business outcome
```

Example:

```text
Website Form
     ↓
n8n Webhook
     ↓
Validate Data
     ↓
CRM
     ↓
AI Lead Qualification
     ↓
High Intent?
  /       Yes       No
 ↓         ↓
Sales     Nurture
Alert     Sequence
```

---

# 27. n8n Integration

n8n should be an **orchestration and integration layer**, not the core audit engine.

## Core application handles

- Crawling
- Browser automation
- Analysis
- Database
- Scoring
- Dashboard
- Authentication
- Audit state

## n8n handles

- Webhooks
- Notifications
- Email delivery
- CRM synchronization
- Prospect enrichment
- Report delivery
- Scheduled audits
- External integrations
- Follow-up workflows
- Lead-generation workflows

---

# 28. Example n8n Audit Workflow

```text
Webhook
   ↓
Create Audit
   ↓
Start Audit Worker
   ↓
Wait for Completion
   ↓
Retrieve Results
   ↓
Generate Report
   ↓
Store Report
   ↓
Update Prospect
   ↓
Send Notification
```

---

# 29. Freelancing Platform Integration

This auditor should integrate with the larger platform.

## Prospect record

```text
Prospect
├── Company
├── Website
├── Industry
├── Location
├── Contact
├── Source
├── Website Score
├── Automation Score
├── Technology Stack
├── Issues
├── Opportunities
├── Recommended Services
├── Outreach
├── Proposal
└── Pipeline Status
```

---

# 30. Recommended Services Mapping

The system should map findings to services the freelancer can provide.

Example:

| Finding | Recommended service |
|---|---|
| Slow website | Website optimization |
| Poor UX | UX/UI redesign |
| Broken mobile layout | Responsive redesign |
| Lead form opportunity | n8n automation |
| CRM opportunity | CRM integration |
| Appointment workflow | Scheduling automation |
| Email routing | AI email automation |
| WhatsApp opportunity | WhatsApp automation |
| Manual data movement | n8n workflow |
| AI support opportunity | AI agent |
| Internal workflow problem | Internal tool/MVP |

This is crucial because the audit should ultimately answer:

> **"What can I sell this business?"**

---

# 31. Pitch Generator

Once opportunities are identified, generate outreach angles.

Example:

```text
Prospect:
ABC Dental

Detected:
Online appointment booking

Opportunity:
Appointment confirmation and reminder automation

Recommended implementation:
Booking → n8n → CRM → SMS/email reminders

Pitch angle:
"We noticed your site already supports online booking.
There may be an opportunity to automate the confirmation,
reminder and post-appointment follow-up process."
```

The pitch generator must never invent facts.

---

# 32. Evidence-Based Outreach

Each generated pitch should link to an audit finding.

```text
Pitch
 ↓
Finding #18
 ↓
Evidence
 ↓
Recommended solution
```

This allows the freelancer to review the claim before sending.

---

# 33. Report Generator

Generate:

### Internal report

Detailed technical information.

### Client report

Clean, non-technical report.

Client report structure:

```text
Executive Summary

Website Score

Top Issues

UX Opportunities

Conversion Opportunities

Automation Opportunities

Recommended Next Steps
```

Potential formats:

- Web report
- PDF
- Email summary

---

# 34. Audit History

Store previous audits.

Example:

```text
August 2026
Score: 64

September 2026
Score: 78
```

Show:

- Score improvement
- Resolved issues
- New issues
- Performance changes
- Accessibility changes
- New technologies
- New automation opportunities

---

# 35. Continuous Monitoring

Future feature:

```text
Schedule:
Weekly
Monthly
Quarterly
```

Workflow:

```text
Scheduled Trigger
      ↓
Audit Website
      ↓
Compare Previous Audit
      ↓
Detect Changes
      ↓
Generate Alert
```

n8n is well suited for this scheduling/orchestration layer.

---

# 36. Suggested Technical Architecture

```text
                        NEXT.JS PLATFORM
                              │
                ┌─────────────┴─────────────┐
                │                           │
             Dashboard                    API
                                            │
                                            ▼
                                      Audit Manager
                                            │
                                  ┌─────────┴─────────┐
                                  ▼                   ▼
                             Job Queue             Database
                                  │                PostgreSQL
                                  ▼
                           Audit Workers
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
          Playwright           Lighthouse          axe-core
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  ▼
                            Evidence Layer
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                    Vision AI          LLM Reasoning
                         │                 │
                         └────────┬────────┘
                                  ▼
                           Scoring Engine
                                  │
                                  ▼
                       Opportunity Engine
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
                Website Issues          Automation Ideas
                     │                         │
                     └────────────┬────────────┘
                                  ▼
                            Pitch Generator
                                  │
                                  ▼
                              n8n Layer
                                  │
                   ┌──────────────┼──────────────┐
                   ▼              ▼              ▼
                  CRM           Email         Reports
```

---

# 37. Recommended Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- Next.js API routes/server actions initially
- TypeScript

A separate Python service can be introduced later if specialized crawling/ML workloads justify it.

## Database

- PostgreSQL
- Prisma

## Queue

- Redis
- BullMQ

## Browser

- Playwright

## Performance

- Lighthouse

## Accessibility

- axe-core

## AI

- GPT-5.6 for reasoning
- Vision-capable model for screenshots

Keep AI provider access behind an internal `AIProvider` abstraction so models can be changed later.

## Storage

- Cloudflare R2 or S3

## Automation

- n8n

## Authentication

- Clerk or Auth.js

## Monitoring

- Sentry

## Product analytics

- PostHog

## Deployment

Initial:

- Vercel for frontend/application
- Railway/Render/AWS for workers
- Managed PostgreSQL
- Managed Redis
- Cloudflare R2

---

# 38. Environment Variables

Example:

```env
DATABASE_URL=
REDIS_URL=

OPENAI_API_KEY=

S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=

N8N_BASE_URL=
N8N_API_KEY=

SENTRY_DSN=

NEXT_PUBLIC_APP_URL=
```

Never commit secrets.

---

# 39. Security Requirements

The crawler is an important attack surface.

Implement:

- URL validation
- SSRF protection
- private IP blocking
- localhost blocking
- DNS rebinding protection
- request timeouts
- page limits
- crawl limits
- file-size limits
- screenshot-size limits
- sandboxed browser execution
- rate limiting
- authentication
- authorization
- encrypted secrets
- audit logging

Do not allow users to use the crawler as an arbitrary internal-network scanner.

---

# 40. AI Reliability Requirements

The AI must:

- distinguish observation from inference
- provide confidence
- avoid unsupported claims
- reference evidence
- avoid hallucinating technologies
- avoid inventing business processes
- avoid claiming guaranteed revenue impact
- explain recommendations
- produce structured JSON internally

Example internal output:

```json
{
  "type": "automation_opportunity",
  "title": "Lead Capture Automation",
  "observed_signal": "Contact form detected",
  "inference": "Potential CRM routing opportunity",
  "confidence": 0.82,
  "impact": "high",
  "recommended_tools": ["n8n", "CRM", "email"]
}
```

---

# 41. Audit Pipeline State Machine

Use explicit states:

```text
CREATED
   ↓
QUEUED
   ↓
CRAWLING
   ↓
CAPTURING
   ↓
TECHNICAL_ANALYSIS
   ↓
AI_ANALYSIS
   ↓
SCORING
   ↓
OPPORTUNITY_ANALYSIS
   ↓
REPORT_GENERATION
   ↓
COMPLETED
```

Failure states:

```text
FAILED
CANCELLED
TIMEOUT
```

Each stage should be retryable.

---

# 42. Error Handling

A failure in one page should not destroy the entire audit.

Example:

```text
Homepage       ✓
Services       ✓
About          ✓
Pricing        ✗
Contact        ✓
```

The report should say:

> Pricing page could not be analyzed.

rather than failing the entire audit.

---

# 43. MVP Scope

## Phase 1 — Core Audit

Build:

- URL input
- Website crawler
- Page discovery
- Playwright screenshots
- DOM extraction
- Lighthouse
- axe-core
- Basic SEO analyzer
- Technology detection
- AI visual analysis
- AI UX analysis
- Scoring
- Issues dashboard

---

# 44. Phase 2 — Automation Intelligence

Build:

- Form detection
- Booking detection
- CRM detection
- WhatsApp detection
- Email detection
- E-commerce detection
- Integration detection
- Automation opportunity engine
- Opportunity scoring
- Recommended workflow generation
- n8n integration

This phase is especially important for the freelancer's automation business.

---

# 45. Phase 3 — Freelancing Intelligence

Build:

- Prospect records
- Audit-to-prospect linking
- Service recommendation
- Pitch generation
- Proposal generation
- Outreach tracking
- Audit history
- Saved templates
- Lead pipeline integration

---

# 46. Phase 4 — Client-Facing Product

Build:

- Public audit link
- Client report
- PDF export
- White-label reports
- Client portal
- Scheduled audits
- Website monitoring
- Before/after comparisons

---

# 47. Phase 5 — Automation Implementation Assistant

Future feature:

```text
Opportunity
     ↓
Generate Workflow Specification
     ↓
Generate n8n Workflow Blueprint
     ↓
Required Credentials
     ↓
Required Integrations
     ↓
Implementation Steps
```

Eventually allow:

```text
Generate n8n workflow
        ↓
Review
        ↓
Approve
        ↓
Deploy
```

Do not make automatic production deployment the first implementation.

---

# 48. Example Full Audit

Input:

```text
https://examplebusiness.com
```

System discovers:

```text
WordPress
Jotform
Google Analytics
WhatsApp
Calendly
```

Website findings:

```text
UI Score: 76
UX Score: 68
Performance: 71
Accessibility: 79
SEO: 74
Conversion: 62
```

Automation findings:

```text
1. Lead capture automation
Confidence: 91%

2. Appointment reminder automation
Confidence: 87%

3. WhatsApp lead qualification
Confidence: 76%

4. CRM synchronization
Confidence: 69%
```

Recommended services:

```text
1. n8n lead automation
2. Appointment automation
3. WhatsApp AI agent
4. CRM integration
```

Then the freelancer can immediately choose:

```text
[Generate Pitch]
[Generate Proposal]
[Save Opportunity]
[Create Project]
```

---

# 49. Success Metrics

## Internal productivity

Target:

- Reduce website research from 20–30 minutes to <5 minutes.
- Produce a usable prospect brief in <5 minutes.
- Identify 3–5 credible automation opportunities per suitable prospect.
- Generate outreach-ready evidence automatically.

## Audit quality

Track:

- Finding accuracy
- False-positive rate
- AI confidence
- User-confirmed opportunities
- Opportunities converted into proposals
- Opportunities converted into paid projects

## Business outcome

The most important metric is:

> **How many audit findings become real freelance opportunities?**

---

# 50. The Most Important Product Decision

This should **not** be positioned internally as:

> "AI website analyzer."

It should be treated as:

> **Prospect Intelligence Engine**

The website is the starting evidence source.

The final output is:

```text
BUSINESS
   ↓
WHAT IS WRONG?
   ↓
WHAT COULD BE IMPROVED?
   ↓
WHAT COULD BE AUTOMATED?
   ↓
WHAT SHOULD I BUILD?
   ↓
WHAT SHOULD I PITCH?
```

That makes this module directly useful to your larger freelancing platform.

---

# 51. Recommended V1 Navigation

Inside the larger freelancing platform:

```text
Dashboard
Prospects
Jobs
Proposals
Outreach
Projects
Automations
Website Auditor   ← NEW
Reports
Templates
Settings
```

Within Website Auditor:

```text
Audits
Opportunities
Reports
Saved Findings
Monitoring
```

---

# 52. Final MVP Definition

The first usable version is complete when a freelancer can:

1. Enter a business website.
2. Crawl 5–10 relevant pages.
3. Capture desktop/mobile screenshots.
4. Detect the technology stack.
5. Run technical/performance/accessibility checks.
6. Analyze UI/UX.
7. Analyze conversion structure.
8. Detect forms, booking systems, CRM signals and communication channels.
9. Identify potential automation opportunities.
10. Score those opportunities.
11. Generate recommended n8n workflows.
12. Map opportunities to the freelancer's services.
13. Generate a personalized pitch based only on supported evidence.
14. Save the complete analysis against a prospect.
15. Generate a client-ready report.

---

# 53. Guiding Principle

The system should always move from:

**Evidence → Insight → Opportunity → Solution → Pitch**

Never:

**Guess → Claim → Pitch**

That principle should govern the entire implementation.

The end product is not merely an AI critic.

It is a **freelancer prospect-research and opportunity-discovery engine** that helps turn a business website into a concrete, evidence-backed reason to start a conversation.
