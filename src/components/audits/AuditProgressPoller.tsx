"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const IN_PROGRESS = new Set([
  "created",
  "queued",
  "crawling",
  "analyzing",
  "scoring",
  "opportunities",
]);

const POLL_INTERVAL_MS = 6_000;

/**
 * While the audit is still running, auto-refreshes the page so the status and
 * results appear without a manual reload. Renders nothing.
 */
export function AuditProgressPoller({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!IN_PROGRESS.has(status)) return;
    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status, router]);

  return null;
}