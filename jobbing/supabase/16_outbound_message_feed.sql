-- 16_outbound_message_feed.sql
-- Read-model view for the sending pipeline: queued/sent outbound messages
-- joined to their outbound campaign and prospect (recipient info for n8n).

CREATE OR REPLACE VIEW outbound_message_feed AS
SELECT
  m.id                          AS id,
  m.outbound_id,
  m.step_no,
  m.subject,
  m.body,
  m.status                      AS message_status,
  m.message_id                  AS provider_message_id,
  m.provider,
  m.error,
  m.sent_at,
  m.opened_at,
  m.created_at                  AS message_created_at,

  o.status                      AS outbound_status,
  o.current_step,
  o.steps,
  o.sent_at                     AS outbound_sent_at,

  p.id                          AS prospect_id,
  p.company_name,
  p.contact_name,
  p.contact_email,
  p.industry,
  p.location

FROM outbound_messages m
JOIN outbounds o    ON o.id = m.outbound_id
JOIN prospects p    ON p.id = o.prospect_id;

ALTER VIEW outbound_message_feed SET (security_invoker = on);
GRANT SELECT ON outbound_message_feed TO authenticated;

CREATE INDEX IF NOT EXISTS idx_outbound_messages_status
  ON outbound_messages(status);