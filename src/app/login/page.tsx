"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/app/actions";
import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import fieldStyles from "@/components/common/fields.module.css";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const result =
        mode === "signin"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password);

      if (result.ok) {
        if (mode === "signup") {
          setSuccess("Account created! Check your email to confirm, then sign in.");
          setMode("signin");
          setPassword("");
        } else {
          router.replace("/");
          return;
        }
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <span>Upwork Radar</span>
        </div>

        <h1 className={styles.heading}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className={styles.bodyText}>
          {mode === "signin"
            ? "Enter your email and password to sign in."
            : "Enter your email and choose a password to get started."}
        </p>

        {success && <p className={styles.success}>{success}</p>}

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

          <FormField
            label="Password"
            htmlFor="password"
            required
          >
            <div className={styles.passwordWrap}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className={`${fieldStyles.input} ${styles.passwordInput} ${error ? fieldStyles.hasError : ""}`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                required
                minLength={6}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className={styles.toggleIcon} aria-hidden />
                ) : (
                  <Eye className={styles.toggleIcon} aria-hidden />
                )}
              </button>
            </div>
          </FormField>

          <Button type="submit" loading={pending} className={styles.submit}>
            {pending
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className={styles.toggle}>
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className={styles.toggleButton}
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccess(null);
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className={styles.toggleButton}
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setSuccess(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
