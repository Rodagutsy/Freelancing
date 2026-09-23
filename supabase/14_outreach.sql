-- 14_outreach.sql — AI Outbound Prospecting: outreach execution data model
-- Run AFTER: 08_auditor.sql (prospects + prospect_audits already exist)
--
-- Tables: email_sequences, outbounds, outbound_messages, suppressed_contacts
-- View:   outbound_feed (read-model: outbounds + prospects)
--
-- Adds to prospects: contact_type, reason_for_contact (compliance fields)
--
-- NOTE: this file only creates the data model. Sending/follow-up/classification
-- behaviour is layered on later (n8n workflows + Next.js services).

-- 0. Prospect compliance fields ----------------------------------------------------

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'unknown'
  CHECK (contact_type IN ('corporate', 'sole_trader', 'individual', 'unknown'));
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS reason_for_contact TEXT;

-- 1. email_sequences — reusable template of outreach steps --------------------------
-- steps format: [{ "order": int, "day_offset": int, "subject": str, "body": str }]
-- The all-copy-default template used to seed a campaign. Concrete per-campaign
-- steps are copied into outbounds.steps so editing one campaign never mutates
-- the shared template.

CREATE TABLE IF NOT EXISTS email_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  steps       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sequences_name ON email_sequences(name);

-- 2. outbounds — one campaign per prospect (the state machine) ----------------------

CREATE TABLE IF NOT EXISTS outbounds (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id            UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  email_sequence_id      UUID REFERENCES email_sequences(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'researching'
    CHECK (status IN (
      'researching', 'pitch_drafted', 'need_approval', 'approved',
      'rejected', 'sending', 'sent', 'replied', 'follow_up_1',
      'follow_up_2', 'done', 'do_not_contact', 'failed'
    )),
  current_step           INT NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  steps                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  personalization_angle  TEXT,
  confidence             FLOAT CHECK (confidence BETWEEN 0 AND 1),
  subscribed             BOOLEAN NOT NULL DEFAULT true,
  approval_note          TEXT,
  version                INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  replies                JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_classification   TEXT CHECK (reply_classification IN (
    'interested', 'question', 'not_interested', 'wrong_person', 'unsubscribe'
  )),
  sent_at                TIMESTAMPTZ,
  replied_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active campaign per prospect at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_outbounds_active_prospect
  ON outbounds (prospect_id)
  WHERE status NOT IN ('done', 'rejected', 'do_not_contact');

CREATE INDEX IF NOT EXISTS idx_outbounds_status ON outbounds(status);
CREATE INDEX IF NOT EXISTS idx_outbounds_prospect ON outbounds(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outbounds_created ON outbounds(created_at DESC);

-- 3. outbound_messages — every drafted/sent step (audit trail + tracking) -----------

CREATE TABLE IF NOT EXISTS outbound_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_id  UUID NOT NULL REFERENCES outbounds(id) ON DELETE CASCADE,
  step_no      INT NOT NULL CHECK (step_no >= 1),
  subject      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'opened', 'failed')),
  message_id   TEXT,           -- provider message id for reply threading
  provider     TEXT,           -- e.g. 'gmail_smtp'
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_outbound
  ON outbound_messages(outbound_id);

-- 4. suppressed_contacts — Do-Not-Contact / compliance ------------------------------

CREATE TABLE IF NOT EXISTS suppressed_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL,
  reason              TEXT NOT NULL
    CHECK (reason IN ('unsubscribed', 'replied_stop', 'bounced', 'manual', 'legal')),
  source_outbound_id  UUID REFERENCES outbounds(id) ON DELETE SET NULL,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email is stored lowercase/trimmed by the app.
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppressed_contacts_email
  ON suppressed_contacts (email);
CREATE INDEX IF NOT EXISTS idx_suppressed_contacts_created
  ON suppressed_contacts(created_at DESC);

-- 5. outbound_feed — read-model view (dashboard + n8n) ------------------------------

CREATE OR REPLACE VIEW outbound_feed AS
SELECT
  o.id,
  o.prospect_id,
  o.status,
  o.current_step,
  o.steps,
  o.personalization_angle,
  o.confidence,
  o.subscribed,
  o.version,
  o.reply_classification,
  o.sent_at,
  o.replied_at,
  o.created_at,
  o.updated_at,

  p.company_name,
  p.contact_email,
  p.contact_name,
  p.contact_type,
  p.industry,
  p.location,
  p.website_score,
  p.automation_score,
  p.pipeline_status,
  p.reason_for_contact

FROM outbounds o
JOIN prospects p ON p.id = o.prospect_id;

ALTER VIEW outbound_feed SET (security_invoker = on);
GRANT SELECT ON outbound_feed TO authenticated;

-- 6. RLS policies (single-user V1: authenticated full access, anon denied) ----------

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressed_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access on email_sequences" ON email_sequences;
CREATE POLICY "Authenticated full access on email_sequences"
  ON email_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on outbounds" ON outbounds;
CREATE POLICY "Authenticated full access on outbounds"
  ON outbounds FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on outbound_messages" ON outbound_messages;
CREATE POLICY "Authenticated full access on outbound_messages"
  ON outbound_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access on suppressed_contacts" ON suppressed_contacts;
CREATE POLICY "Authenticated full access on suppressed_contacts"
  ON suppressed_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);