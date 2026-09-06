import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Globe, Clock, AlertTriangle, MessageSquare, Reply } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOutbound, listOutboundMessages } from "@/lib/services/outreach";
import { getProspect } from "@/lib/services/prospects";
import { getNextFollowUpDue } from "@/lib/services/outboundSend";
import { formatRelative } from "@/lib/utils";
import type { StoredReply } from "@/lib/types";
import { OUTBOUND_STATUS_META, OUTBOUND_MESSAGE_STATUS_META, REPLY_CLASSIFICATION_META } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { OutboundActions } from "@/components/outbounds/OutboundActions";
import { StepsEditor } from "@/components/outbounds/StepsEditor";
import { SendControl } from "@/components/outbounds/SendControl";
import { FollowUpControl } from "@/components/outbounds/FollowUpControl";
import { ReplyLogControl } from "@/components/outbounds/ReplyLogControl";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function followUpDueLabel(due: string | null): string | null {
  if (!due) return null;
  const diffMs = new Date(due).getTime() - Date.now();
  if (diffMs <= 0) return "due now";
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (days === 1) return "due tomorrow";
  if (days < 30) return `due in ${days} days`;
  return "due later";
}

interface OutboundDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: OutboundDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const outbound = await getOutbound(supabase, id);
  if (!outbound) return { title: "Outreach" };
  const prospect = await getProspect(supabase, outbound.prospect_id);
  return { title: prospect?.company_name ?? "Outreach" };
}

export default async function OutboundDetailPage({
  params,
}: OutboundDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const outbound = await getOutbound(supabase, id);
  if (!outbound) notFound();

  const prospect = await getProspect(supabase, outbound.prospect_id);
  const messages = await listOutboundMessages(supabase, outbound.id);

  const meta = OUTBOUND_STATUS_META[outbound.status];
  const editable = outbound.status === "pitch_drafted" || outbound.status === "rejected";
  const actionable =
    outbound.status === "pitch_drafted" ||
    outbound.status === "need_approval" ||
    outbound.status === "approved" ||
    outbound.status === "rejected";

  const sortedSteps = [...outbound.steps].sort((a, b) => a.order - b.order);
  const sendControlVisible =
    outbound.status === "approved" || outbound.status === "sending";
  const followUpVisible = ["sent", "replied", "follow_up_1", "follow_up_2"].includes(
    outbound.status,
  );
  const queuedMessage = messages.find((m) => m.status === "queued") ?? null;
  const nextStep = sortedSteps[Math.min(outbound.current_step, sortedSteps.length - 1)];
  const nextStepLabel = nextStep ? `Email ${nextStep.order}` : `Last email`;
  const replies = Array.isArray(outbound.replies) ? (outbound.replies as StoredReply[]) : [];
  const replyClassificationMeta = outbound.reply_classification
    ? REPLY_CLASSIFICATION_META[outbound.reply_classification]
    : null;
  const replyLogVisible =
    outbound.status === "sending" ||
    outbound.status === "sent" ||
    outbound.status === "replied" ||
    outbound.status === "follow_up_1" ||
    outbound.status === "follow_up_2" ||
    outbound.status === "done" ||
    outbound.status === "failed";
  const lastSentMessage = [...messages].reverse().find((m) => m.status === "sent" || m.status === "opened") ?? null;
  const followUpDue = getNextFollowUpDue(outbound, lastSentMessage?.sent_at ?? null);
  const followUpDueText = followUpDueLabel(followUpDue);

  return (
    <div>
      <PageHeader
        title={prospect?.company_name ?? "Outreach"}
        description={prospect?.industry ?? undefined}
        action={<StatusBadge label={meta.label} tone={meta.tone} />}
      >
        <div className={styles.headerMeta}>
          {prospect && (
            <span className={styles.headerMetaItem}>
              <Link href={`/prospects/${prospect.id}`} className={styles.prospectLink}>
                View prospect
              </Link>
            </span>
          )}
          <span className={styles.headerMetaItem}>
            <Clock size={14} aria-hidden />
            {formatRelative(outbound.created_at)}
          </span>
          <span className={styles.headerMetaItem}>
            v{outbound.version}
          </span>
          {replyClassificationMeta && (
            <StatusBadge label={replyClassificationMeta.label} tone={replyClassificationMeta.tone} />
          )}
        </div>
      </PageHeader>

      {prospect?.contact_email && (
        <section className={styles.section} aria-labelledby="overview-heading">
          <h2 id="overview-heading" className={styles.sectionTitle}>
            Recipient
          </h2>
          <div className={styles.metaGrid}>
            {prospect.contact_email && (
              <div className={styles.metaItem}>
                <Mail size={16} aria-hidden />
                <a href={`mailto:${prospect.contact_email}`} className={styles.link}>
                  {prospect.contact_email}
                </a>
              </div>
            )}
            {prospect.website_url && (
              <div className={styles.metaItem}>
                <Globe size={16} aria-hidden />
                <a
                  href={prospect.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {prospect.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {outbound.approval_note && (
        <div className={styles.notice}>
          <AlertTriangle size={16} aria-hidden />
          <span>Rejection note: {outbound.approval_note}</span>
        </div>
      )}

      {actionable && (
        <section className={styles.section} aria-labelledby="manage-heading">
          <h2 id="manage-heading" className={styles.sectionTitle}>
            Manage
          </h2>
          <OutboundActions outboundId={outbound.id} status={outbound.status} />
        </section>
      )}

      {sendControlVisible && (
        <section className={styles.section} aria-labelledby="send-heading">
          <h2 id="send-heading" className={styles.sectionTitle}>
            Sending
          </h2>
          <SendControl
            outboundId={outbound.id}
            status={outbound.status}
            queuedMessageId={queuedMessage?.id ?? null}
            nextStepLabel={nextStepLabel}
          />
        </section>
      )}

      {followUpVisible && (
        <section className={styles.section} aria-labelledby="follow-up-heading">
          <h2 id="follow-up-heading" className={styles.sectionTitle}>
            Follow-ups
          </h2>
          <FollowUpControl
            outboundId={outbound.id}
            sentCount={Math.min(outbound.current_step, sortedSteps.length)}
            totalSteps={sortedSteps.length}
            dueLabel={followUpDueText}
          />
        </section>
      )}

      <section className={styles.section} aria-labelledby="sequence-heading">
        <h2 id="sequence-heading" className={styles.sectionTitle}>
          Sequence
        </h2>
        <StepsEditor
          outboundId={outbound.id}
          steps={outbound.steps}
          personalizationAngle={outbound.personalization_angle}
          editable={editable}
        />
      </section>

      {messages.length > 0 && (
        <section className={styles.section} aria-labelledby="messages-heading">
          <h2 id="messages-heading" className={styles.sectionTitle}>
            Messages
          </h2>
          <div className={styles.messageList}>
            {messages.map((message) => {
              const m = OUTBOUND_MESSAGE_STATUS_META[message.status];
              return (
                <div key={message.id} className={styles.message}>
                  <div className={styles.messageHead}>
                    <span className={styles.messageStep}>
                      <MessageSquare size={14} aria-hidden />
                      Step {message.step_no}
                    </span>
                    <StatusBadge label={m.label} tone={m.tone} />
                  </div>
                  <p className={styles.messageSubject}>{message.subject}</p>
                  <p className={styles.messageMeta}>
                    {message.sent_at
                      ? `Sent ${formatRelative(message.sent_at)}`
                      : "Not sent yet"}
                    {message.opened_at
                      ? ` · Opened ${formatRelative(message.opened_at)}`
                      : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {replyLogVisible && (
        <section className={styles.section} aria-labelledby="reply-log-heading">
          <h2 id="reply-log-heading" className={styles.sectionTitle}>
            Log a reply
          </h2>
          <p className={styles.replyHint}>
            Paste the inbound email (manual entry for testing, or connect the
            n8n tracking workflow to fill this automatically).
          </p>
          <ReplyLogControl
            outboundId={outbound.id}
            messageId={lastSentMessage?.id ?? null}
          />
        </section>
      )}

      {replies.length > 0 && (
        <section className={styles.section} aria-labelledby="replies-heading">
          <h2 id="replies-heading" className={styles.sectionTitle}>
            Replies ({replies.length})
          </h2>
          <div className={styles.replyList}>
            {[...replies]
              .sort((a, b) => b.received_at.localeCompare(a.received_at))
              .map((reply) => {
                const c = reply.classification
                  ? REPLY_CLASSIFICATION_META[reply.classification]
                  : null;
                return (
                  <article key={reply.id} className={styles.reply}>
                    <div className={styles.replyHead}>
                      <span className={styles.messageStep}>
                        <Reply size={14} aria-hidden />
                        {reply.from}
                      </span>
                      {c ? (
                        <StatusBadge label={c.label} tone={c.tone} />
                      ) : (
                        <StatusBadge label="Unclassified" tone="muted" />
                      )}
                    </div>
                    <p className={styles.replySubject}>
                      {reply.subject ?? "(no subject)"} · {formatRelative(reply.received_at)}
                    </p>
                    <p className={styles.replyBody}>{reply.body}</p>
                    {reply.classification_reason && (
                      <p className={styles.replyReason}>
                        Why: {reply.classification_reason}
                      </p>
                    )}
                    {reply.suggested_reply && (
                      <div className={styles.suggestWrap}>
                        <p className={styles.suggestLabel}>Suggested reply</p>
                        <p className={styles.suggestBody}>{reply.suggested_reply}</p>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}