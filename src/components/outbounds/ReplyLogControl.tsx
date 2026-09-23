"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Loader2 } from "lucide-react";
import { recordReplyAction } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";
import styles from "./ReplyLogControl.module.css";

interface ReplyLogControlProps {
  outboundId: string;
  messageId?: string | null;
}

export function ReplyLogControl({ outboundId, messageId }: ReplyLogControlProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from.trim() || !body.trim()) {
      toast("From and reply body are required.", "info");
      return;
    }
    setSubmitting(true);
    try {
      const result = await recordReplyAction({
        outboundId,
        messageId: messageId ?? null,
        from: from.trim(),
        subject: subject.trim() || null,
        body: body.trim(),
      });
      if (result.ok) {
        toast("Reply logged and classified.", "success");
        setSubject("");
        setBody("");
        router.refresh();
      } else {
        toast(result.error ?? "Failed to log reply.", "error");
      }
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.label} htmlFor="reply-from">
          From
        </label>
        <input
          id="reply-from"
          className={styles.input}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="name@company.com or Name &lt;name@company.com&gt;"
          disabled={submitting}
          required
        />
      </div>

      <div className={styles.row}>
        <label className={styles.label} htmlFor="reply-subject">
          Subject
        </label>
        <input
          id="reply-subject"
          className={styles.input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Re: your message (optional)"
          disabled={submitting}
        />
      </div>

      <div className={styles.row}>
        <label className={styles.label} htmlFor="reply-body">
          Reply body
        </label>
        <textarea
          id="reply-body"
          className={styles.body}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Paste the inbound reply…"
          disabled={submitting}
          required
        />
      </div>

      <div>
        <Button type="submit" loading={submitting} disabled={submitting}>
          {submitting ? (
            <Loader2 size={16} className={styles.spin} aria-hidden />
          ) : (
            <Inbox size={16} aria-hidden />
          )}
          Log reply
        </Button>
      </div>
    </form>
  );
}