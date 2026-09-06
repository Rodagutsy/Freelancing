-- 15_seed_email_sequences.sql — Default outreach sequence template
-- Run AFTER: 14_outreach.sql
--
-- Seeds the default Email 1-5 sequence:
--   Email 1 - Observation      (day 0)
--   Email 2 - Problem expansion (day 3)
--   Email 3 - Proof / demo      (day 6)
--   Email 4 - Simple CTA        (day 10)
--   Email 5 - Breakup           (day 14)
--
-- Steps use placeholder tokens that the pipeline substitutes per campaign:
--   [Contact] — decision-maker first name
--   [Company] — company name
--   [Area]    — the observed process (e.g. "quote request process")
--   [Observation] — evidence-backed angle from the audit
--   [Problem] — why it matters
--   [Outcome] — e.g. "the difference between winning and losing a job"
--   [Link]    — demo / calendar link
--
-- Idempotent: skipped if a sequence named "Default (Observation → Breakup)" exists.

INSERT INTO email_sequences (name, description, steps)
VALUES (
  'Default (Observation → Breakup)',
  'Evidence-first 5-step sequence: curiosity gap, problem expansion, proof, CTA, breakup.',
  $seq$[
    {
      "order": 1,
      "day_offset": 0,
      "subject": "A quick observation about [Company]",
      "body": "Hi [Contact],\n\nI was looking through [Company]'s [Area] and noticed something I thought you'd find interesting.\n\n[Observation].\n\nJust thought it was worth sharing. I recorded a short example if you'd like to see it."
    },
    {
      "order": 2,
      "day_offset": 3,
      "subject": "Re: A quick observation about [Company]",
      "body": "Hi [Contact],\n\nFollowing up on my last note. When a few of these come through at once, [Problem] can be [Outcome].\n\nI'd be curious to hear how you currently handle it — or maybe you've already got it covered."
    },
    {
      "order": 3,
      "day_offset": 6,
      "subject": "Re: A quick observation about [Company]",
      "body": "Hi [Contact],\n\nI built a small system around exactly this a little while back — it automatically [handles the step in question].\n\nI put together a 45-second example using a similar setup. Want me to send it over?"
    },
    {
      "order": 4,
      "day_offset": 10,
      "subject": "Re: A quick observation about [Company]",
      "body": "Hi [Contact],\n\nI don't want to add to your inbox. If you'd be open to a quick 15-minute call, I can walk you through how this would work for [Company] specifically — no commitment.\n\nWorth a chat? [Link]"
    },
    {
      "order": 5,
      "day_offset": 14,
      "subject": "Re: A quick observation about [Company]",
      "body": "Hi [Contact],\n\nI'll close the loop here so I'm not leaving the door open forever. If [Company] ever wants to pick this up, my inbox is open — just reply.\n\nEither way, hope the observation was useful."
    }
  ]$seq$
)
ON CONFLICT (name) DO NOTHING;