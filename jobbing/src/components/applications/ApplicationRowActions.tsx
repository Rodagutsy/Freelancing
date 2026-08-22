"use client";

import { useRouter } from "next/navigation";
import { updateApplicationForJob } from "@/app/actions";
import type { ApplicationOutcome } from "@/lib/types";
import { ApplicationStatusSelect } from "@/components/applications/ApplicationStatusSelect";
import { useToast } from "@/components/common/Toast";

interface ApplicationRowActionsProps {
  jobId: string;
  outcome: ApplicationOutcome;
}

export function ApplicationRowActions({
  jobId,
  outcome,
}: ApplicationRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  async function changeOutcome(next: ApplicationOutcome) {
    const result = await updateApplicationForJob(jobId, { outcome: next });
    if (result.ok) {
      toast("Application status updated.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not update status.", "error");
    }
  }

  return (
    <ApplicationStatusSelect
      value={outcome}
      onChange={(next) => void changeOutcome(next)}
    />
  );
}