"use client";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/common/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      message={`${error.message} Data shown elsewhere is unaffected.`}
      action={
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}