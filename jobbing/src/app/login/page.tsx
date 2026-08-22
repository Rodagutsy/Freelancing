"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { signInWithEmail } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./page.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signInWithEmail(email);
    setPending(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError(result.error ?? "Could not send the magic link.");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <span>Upwork Radar</span>
        </div>

        {sent ? (
          <div className={styles.sent}>
            <MailCheck className={styles.sentIcon} aria-hidden />
            <h1 className={styles.heading}>Check your email</h1>
            <p className={styles.bodyText}>
              We sent a magic link to <strong>{email}</strong>. Open it to sign
              in — it works once and expires quickly.
            </p>
          </div>
        ) : (
          <>
            <h1 className={styles.heading}>Sign in</h1>
            <p className={styles.bodyText}>
              Enter the email address linked to your workspace to receive a
              one-time sign-in link.
            </p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <FormField
                label="Email"
                htmlFor="email"
                error={error ?? undefined}
                required
              >
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  className={`${fieldStyles.input} ${error ? fieldStyles.hasError : ""}`}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </FormField>

              <Button type="submit" loading={pending} className={styles.submit}>
                {pending ? "Sending link…" : "Send magic link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}