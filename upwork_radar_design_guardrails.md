# Upwork Radar — Design & UX Guardrails (V1)

## 1. Purpose
This document is the non-negotiable design system and UX standard for Upwork Radar. Every screen, component, interaction, responsive layout, and release must follow these rules.

**Design objective:** Build a calm, high-signal personal job-intelligence dashboard that helps the user decide: **Apply, Review, or Skip** with minimal cognitive load.

**Primary product flow:**
```
Job discovery → Qualification → Score → Proposal draft → Human review → Manual Upwork application
```

## 2. Product Design Principles
1. **Decision first:** The job score, recommendation, and reason must be visible before secondary details.
2. **One primary action:** Each screen has one obvious primary action. Avoid competing calls to action.
3. **High signal, low noise:** Show only information that improves an application decision. Hide raw metadata behind progressive disclosure.
4. **Explain AI:** Every AI score and proposal must display why it was generated and which portfolio evidence was used.
5. **Human control:** The system drafts and recommends; the user reviews and submits manually.
6. **No surprises:** Every action must have visible status, feedback, and a reversible path where possible.
7. **Consistency beats novelty:** Use the same visual hierarchy, spacing, labels, action placement, and states throughout the application.
8. **Accessibility is a release requirement:** All completed UI must pass WCAG 2.2 AA requirements before release.

## 3. Visual Direction
### 3.1 Style
- Use a clean, structured marketplace/workspace aesthetic inspired by Upwork’s clarity and density, but do not copy Upwork branding, UI assets, or layouts.
- The product must feel professional, focused, and calm—not decorative, playful, or overly futuristic.
- Use flat surfaces only. **Do not use shadows.**
- Use borders, spacing, surface contrast, and typography to establish hierarchy.
- Avoid gradients, glassmorphism, excessive rounded cards, animations that delay action, and visual decoration with no functional meaning.

### 3.2 Font
- Use **Lato** for all user-interface text.
- Load Lato through `next/font/google` to avoid layout shift and improve performance.
- Font weights:
  - 400: body text and descriptions
  - 600: labels, tabs, emphasized metadata
  - 700: headings, scores, primary button text
- Do not use more than these three weights.

```ts
import { Lato } from "next/font/google";

export const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
});
```

> Implementation note: If 600 is unavailable in the chosen Lato distribution, use 700 for emphasis and reserve 900 only for score numerals or rare display emphasis.

## 4. Design Tokens

### 4.1 Color System
The default product theme is dark. Do not provide a light-theme toggle in V1.

| Token | Hex | Use |
|---|---:|---|
| `--bg-canvas` | `#0B0B0B` | Application background |
| `--bg-surface` | `#121212` | Main cards, panels, top navigation |
| `--bg-surface-raised` | `#191919` | Hovered or selected contained surfaces |
| `--bg-input` | `#101010` | Inputs, selects, textareas |
| `--border-subtle` | `#2A2A2A` | Default card and component borders |
| `--border-strong` | `#454545` | Active, focused, or emphasized borders |
| `--text-primary` | `#FFFFFF` | Headings and primary content |
| `--text-secondary` | `#C9C9C9` | Supporting text |
| `--text-muted` | `#949494` | Metadata, placeholders, helper text |
| `--gold-500` | `#D4AF37` | Primary action, active state, key score emphasis |
| `--gold-400` | `#E6C85C` | Hover state and strong emphasis |
| `--gold-700` | `#9A7A16` | Pressed state and gold text on dark backgrounds |
| `--success` | `#36B37E` | Apply / positive status |
| `--warning` | `#E7A62B` | Review / caution |
| `--danger` | `#E0565B` | Skip / risk / destructive actions |
| `--info` | `#5AA9E6` | Informational system state |

### 4.2 Color Rules
- Gold is an accent, not a background decoration.
- Use gold only for: primary actions, active navigation, selected filters, keyboard focus treatment, score emphasis, and important badges.
- Do not use gold for long body text or dense information blocks.
- Do not use color as the only status signal; every status must include a text label and, where useful, an icon.
- Status labels:
  - `APPLY` uses success green
  - `REVIEW` uses warning amber
  - `SKIP` uses danger red
  - `PROCESSING` uses info blue

### 4.3 Typography Scale
| Token | Size / Line-height | Weight | Use |
|---|---|---:|---|
| `display` | 32px / 40px | 700 | Page title only |
| `h1` | 24px / 32px | 700 | Main page heading |
| `h2` | 20px / 28px | 700 | Major section heading |
| `h3` | 16px / 24px | 700 | Card/section title |
| `body` | 15px / 24px | 400 | Default text |
| `body-sm` | 14px / 20px | 400 | Supporting content |
| `label` | 13px / 18px | 700 | Labels, controls, badges |
| `meta` | 12px / 16px | 400 | Timestamps and minor metadata |
| `score` | 36px / 40px | 900 | Job score numeral |

- Do not use text below 12px.
- Do not use all caps except for short status badges such as `APPLY`, `REVIEW`, and `SKIP`.
- Sentence case is required for button labels, page titles, filters, empty states, and help text.

### 4.4 Spacing: Strict 4px Grid
Use only multiples of 4px. Do not introduce arbitrary spacing values.

| Token | Value | Use |
|---|---:|---|
| `space-1` | 4px | Icon-to-label gap, tight inline spacing |
| `space-2` | 8px | Small element gap |
| `space-3` | 12px | Input internals, compact groups |
| `space-4` | 16px | Default component gap |
| `space-5` | 20px | Compact card padding |
| `space-6` | 24px | Standard card padding, section gap |
| `space-8` | 32px | Major section spacing |
| `space-10` | 40px | Page-level spacing |
| `space-12` | 48px | Large layout separation |
| `space-16` | 64px | Large desktop separation |

### 4.5 Layout Rules
- Desktop content maximum width: `1440px`.
- Dashboard content padding: `32px` desktop, `24px` tablet, `16px` mobile.
- Standard desktop grid: 12 columns with `24px` gutters.
- Tablet grid: 8 columns with `16px` gutters.
- Mobile grid: 4 columns with `16px` gutters.
- Main application pages use a left sidebar on desktop and a compact top navigation on mobile.
- Job list + detail view uses a split layout on desktop and a drill-down route on mobile.

### 4.6 Radius and Borders
- Radius scale:
  - Inputs, buttons, tags: `6px`
  - Cards, panels, modals: `8px`
  - Pills: `9999px`
- All cards and inputs use a 1px border with `--border-subtle`.
- On hover, use `--border-strong` or `--bg-surface-raised`; never use a shadow.
- Focus rings use 2px `--gold-400` with 2px offset, visible against the component surface.

## 5. Information Architecture
### 5.1 Navigation
Desktop sidebar, in this exact order:
1. Dashboard
2. Jobs
3. Applications
4. Portfolio
5. Settings

Sidebar behavior:
- Width: 248px desktop.
- Product name at top: **Upwork Radar**.
- Active item uses gold left indicator, gold icon, white label, and `--bg-surface-raised` background.
- Bottom area contains only Settings and account/sign-out action.

Mobile navigation:
- Fixed top bar with product name, current page title, and menu button.
- Menu opens a full-height navigation drawer.
- Do not use a bottom tab bar in V1 because the product is work-oriented and has five destinations.

### 5.2 Core Pages
- `/dashboard` — Decision-first overview of new jobs and active application metrics.
- `/jobs` — Searchable/filterable job queue.
- `/jobs/[id]` — Job decision workspace.
- `/applications` — Outcome tracker and learning loop.
- `/portfolio` — Portfolio evidence management.
- `/settings` — Profile, rate targets, intake preferences, and integrations.

## 6. Dashboard UX
### 6.1 Purpose
The dashboard answers three questions within five seconds:
1. What should I apply to now?
2. Why is it a fit?
3. What needs my attention?

### 6.2 Dashboard Structure
1. Page header: `Good [morning/afternoon/evening], Dee` and date; one primary action: `View high-fit jobs`.
2. Priority strip: count of `Apply now`, `Review`, and `Skipped today`.
3. Main section: `Apply now` jobs, sorted by score descending then posting time ascending.
4. Secondary section: `Needs review` jobs.
5. Small metrics row: Jobs analyzed, High-fit jobs, Proposals drafted, Applications logged.

### 6.3 Job Card
Every job card must show, in this order:
1. Recommendation badge (`APPLY`, `REVIEW`, or `SKIP`)
2. Job title
3. Score (large, e.g., `9.2/10`) and confidence
4. One-sentence fit summary
5. Budget/rate, client rating, proposal count, posted time
6. Top matched skills (maximum three)
7. Primary action: `Review job`

Rules:
- Do not show the full description in the card.
- Do not show more than three skill tags.
- Do not place more than one primary action on a card.
- A `Skip reason` is visible immediately for skipped jobs; do not make users open the card to understand the decision.

## 7. Job Detail UX
### 7.1 Desktop Layout
Use a 12-column layout:
- Main content: 8 columns
- Decision panel: 4 columns, sticky within viewport on desktop

### 7.2 Required Sections
Order them exactly:
1. Job header: title, Upwork link, posted time, basic client/budget metadata.
2. Decision panel: score, recommendation, confidence, primary action.
3. Why this score: strengths, gaps, red flags, and scoring-factor bars.
4. Job requirements: cleaned description plus requested skills.
5. Matched evidence: selected portfolio projects and exact claims used.
6. Proposal draft: editable text area, character count, copy button, regenerate button.
7. Application status: `Not applied`, `Applied`, `Viewed`, `Interview`, `Hired`, `Rejected`.
8. Notes: private free-text notes.

### 7.3 Decision Panel
- Score numeral: `36px`, gold.
- Recommendation badge: visible directly beneath score.
- Confidence text: e.g., `91% confidence — client history and budget available`.
- Primary action: `Open job on Upwork`.
- Secondary action: `Copy proposal`.
- Tertiary text action: `Mark as skipped` or `Mark as applied` depending on state.
- The system must never display an `Apply automatically` control.

### 7.4 Proposal Editor
- Default proposal length: 150–250 words.
- Text area must be editable before copying.
- Show an inline note above the proposal: `Draft based on the matched evidence below. Review before sending.`
- Show cited portfolio projects below the editor, including the `can_claim_text` that was supplied to the AI.
- Regenerate requires choosing one intentional instruction chip: `Shorter`, `More technical`, `More direct`, or `Emphasize portfolio`. No free unlimited regeneration without a reason.

## 8. Jobs List UX
- Default filter: score 7–10, posted within 24 hours.
- Default sort: score descending, then newest.
- Persistent filter bar contains only: Score, Posted, Budget, Client rating, Skills, and Status.
- Filters open in a side sheet on mobile and inline popovers on desktop.
- Always display active filter count and `Clear all` control.
- Use server-side pagination or cursor pagination; never load an unlimited job list.
- Empty state must explain the condition and provide one action: `Clear filters` or `Update saved search`.

## 9. Forms, Inputs, and Buttons
### 9.1 Inputs
- Height: 44px minimum.
- Input padding: 12px horizontal.
- Label always visible above input; do not use placeholder-only labels.
- Supporting/helper text appears below the field when needed.
- Error text appears below field, with icon and clear correction instruction.
- Inputs have a 1px border; focused inputs use gold focus ring and strong border.

### 9.2 Button Hierarchy
| Type | Styling | Use |
|---|---|---|
| Primary | Gold background, black text, 44px min height | One main action per screen/section |
| Secondary | Transparent/dark surface, white text, 1px border | Supporting action |
| Tertiary | Text-only, gold text | Low-risk inline action |
| Destructive | Transparent/dark surface, danger text/border | Delete/irreversible actions |

Button rules:
- Use clear verbs: `Review job`, `Open job on Upwork`, `Copy proposal`, `Mark as applied`, `Save changes`.
- Never use vague labels: `Submit`, `Continue`, `Click here`, `Okay`.
- Icon-only buttons require an accessible label and tooltip.
- Disabled buttons use muted text and border, retain readable contrast, and provide a reason when focusable.
- Never place primary and destructive actions side by side without visual separation.

### 9.3 Confirmation Behavior
- Use inline confirmation for reversible state changes such as marking a job skipped.
- Use a modal confirmation only for destructive actions such as deleting a portfolio item or disconnecting Gmail.
- Confirmation copy must state the exact consequence and primary object: `Delete “Cleaning & Caregiving Workflow”? This removes its evidence from future proposal drafts.`

## 10. Component System
Build all UI from reusable components. Do not duplicate component markup or styling across pages.

### 10.1 Required Components
- `AppShell`
- `SidebarNav`
- `MobileNavDrawer`
- `PageHeader`
- `JobCard`
- `JobScore`
- `RecommendationBadge`
- `ConfidenceIndicator`
- `MetadataRow`
- `SkillTag`
- `FilterBar`
- `FilterSheet`
- `ScoreBreakdown`
- `EvidenceCard`
- `ProposalEditor`
- `ApplicationStatusSelect`
- `EmptyState`
- `ErrorState`
- `LoadingSkeleton`
- `Toast`
- `ConfirmDialog`
- `FormField`
- `Button`

### 10.2 Component States
Every interactive component must be designed and implemented for:
- Default
- Hover (desktop only where applicable)
- Focus-visible
- Active/pressed
- Disabled
- Loading
- Error (where applicable)
- Empty (where applicable)
- Success feedback (where applicable)

## 11. Responsive Rules
### 11.1 Breakpoints
- Mobile: `0–639px`
- Tablet: `640–1023px`
- Desktop: `1024px+`

### 11.2 Mandatory Responsive Behavior
- The interface is mobile-first.
- No horizontal scrolling at any viewport width from 320px upward.
- Minimum supported viewport: 320px wide.
- Touch targets: minimum 44px by 44px.
- Desktop sidebar collapses into mobile navigation below 1024px.
- Desktop split job view converts to a single-column page below 1024px.
- Tables must become stacked key-value rows on mobile; never force sideways scrolling for essential data.
- Filters must convert to a full-height sheet on mobile.
- Job cards remain scannable: title, score, recommendation, summary, and primary action must be visible without dense wrapping.
- Long URLs and IDs must truncate safely with copy controls where needed.

### 11.3 Responsive Test Sizes
Every completed page must be tested at:
- 320 × 568
- 375 × 812
- 390 × 844
- 768 × 1024
- 1024 × 768
- 1280 × 800
- 1440 × 900

## 12. Accessibility (WCAG 2.2 AA)
Accessibility is not optional. Every production build must pass WCAG 2.2 AA checks.

### 12.1 Required Standards
- Text contrast ratio: at least 4.5:1 for normal text, 3:1 for large text.
- Non-text UI components, focus indicators, and boundaries: at least 3:1 contrast.
- Full keyboard navigation for all controls, dialogs, menus, filters, and editors.
- Visible focus indicator at all times for keyboard users.
- Semantic HTML first: `button`, `nav`, `main`, `aside`, `label`, `input`, `textarea`, `dialog`, headings in correct order.
- Do not use clickable `div` or `span` elements.
- Every icon-only button has `aria-label`.
- Every form input has a programmatically associated visible label.
- Error messages are connected to inputs using `aria-describedby`.
- Toasts and async updates use appropriate `aria-live` regions.
- Dialogs trap focus, focus the heading or first meaningful element on open, and restore focus on close.
- Do not rely on hover for information or actions.
- Do not use color as the only means of communicating status.
- Respect `prefers-reduced-motion`; eliminate non-essential transitions for those users.

### 12.2 Content Requirements
- Use plain English.
- Explain AI uncertainty explicitly, e.g., `Confidence is lower because the email did not include client hiring history.`
- Avoid ambiguous status labels.
- Time should be displayed in both relative and exact format where useful, e.g., `Posted 18 minutes ago · 20 Aug, 1:03 PM`.

## 13. Motion & Feedback
- Use motion only to clarify a state transition; never for decoration.
- Maximum standard transition: 150ms ease-out.
- No parallax, bouncing, animated gradients, or loading spinners that block interaction.
- Use skeletons for page-level and card-level loading.
- Use inline progress state for AI actions: `Scoring job…`, `Drafting proposal…`.
- On completion, show a toast with a direct result: `Proposal draft saved.`
- On failure, show actionable error copy: `Proposal could not be generated. Retry now or review the job manually.`

## 14. Error, Empty, and Loading States
### 14.1 Loading
- Use skeleton layouts that match final content shape.
- Do not show a blank page or full-screen generic spinner for normal data loading.

### 14.2 Empty States
Each empty state includes: clear title, one sentence, one relevant action.

Examples:
- `No high-fit jobs yet` — `New jobs from your saved searches will appear here after they are scored.` — `View all jobs`
- `No portfolio evidence added` — `Add verified portfolio evidence before generating proposals.` — `Add portfolio project`
- `No applications logged` — `Mark a reviewed job as applied to start tracking outcomes.` — `View jobs`

### 14.3 Error States
- State what failed, what is unaffected, and what the user can do next.
- Example: `We could not parse this job alert. The original email is saved for review; no proposal was generated.` — `Open manual review`

## 15. Security & Privacy UX
### 15.1 Security Principles
- Security verification occurs after every build and before every production deployment.
- Never expose Supabase service-role keys, DeepSeek keys, Gmail tokens, raw OAuth tokens, or secrets in browser code, logs, screenshots, emails, or error messages.
- Use server-side Next.js routes/actions for privileged operations.
- Enforce Supabase Row Level Security (RLS) for all public-facing tables.
- Access to the application requires authenticated user access; V1 is single-user but must still use authentication.
- Confirm destructive actions and integration disconnects.

### 15.2 Release Security Checklist (Required After Every Build)
Run before merging or deploying any feature:
1. Run TypeScript type check: `npm run typecheck`.
2. Run linting: `npm run lint`.
3. Run unit/component tests: `npm test`.
4. Run production build: `npm run build`.
5. Run dependency vulnerability audit: `npm audit --omit=dev` and resolve high/critical findings.
6. Scan committed files and environment output for secrets; confirm `.env*` files are excluded from git.
7. Verify no secret value is present in client-side bundles, browser network responses, logs, or error messages.
8. Verify Supabase RLS is enabled and policies deny unauthenticated access by default.
9. Verify API routes authenticate and authorize every request.
10. Verify input validation exists on every server endpoint (use Zod schemas).
11. Verify AI output is treated as untrusted text: validate JSON, sanitize rendered content, and never execute AI-generated code.
12. Run accessibility audit with Lighthouse and axe; resolve all critical and serious issues.
13. Test all pages at required mobile/tablet/desktop viewport sizes.
14. Verify no automated Upwork submission, browser control, scraping, or prohibited page-monitoring behavior has been added. [web:1][web:2]

### 15.3 Security Acceptance Criteria
A feature is not complete until all checklist items pass and the feature has no high/critical dependency vulnerabilities, no exposed secrets, no unauthenticated privileged endpoint, and no critical/serious accessibility failure.

## 16. Implementation Rules (Next.js + TypeScript)
- Use Next.js App Router and TypeScript strict mode.
- Use server components for data display where possible.
- Use client components only for interactive UI.
- Use a shared design-token layer (CSS variables or Tailwind theme tokens); no hard-coded arbitrary values in individual components.
- Use Zod for client/server validation schemas.
- Use semantic, reusable components from the required component list.
- Do not use inline styles except for dynamic values that cannot be expressed through tokens.
- Keep every component’s visual states in the same file/module or documented Storybook-style examples.
- Ensure all copy is centralized enough to be edited consistently later.

## 17. Definition of Done (Design)
A screen or feature is complete only when:
- It follows all design tokens, component rules, and 4px spacing rules.
- It has desktop, tablet, and mobile layouts.
- It has loading, empty, error, success, disabled, hover, active, and keyboard-focus states as applicable.
- It passes WCAG 2.2 AA checks.
- It uses Lato and the dark black/white/gold color system.
- It contains no shadows.
- It has one clear primary action.
- It has been tested against the security checklist.
- It does not add prohibited Upwork automation behavior. [web:1][web:2]
