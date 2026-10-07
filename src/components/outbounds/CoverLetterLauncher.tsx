"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";
import { CoverLetterModal } from "@/components/outbounds/CoverLetterModal";
import styles from "./CoverLetterLauncher.module.css";

interface PersonaOption {
  id: string;
  label: string;
}

interface CoverLetterLauncherProps {
  profiles?: PersonaOption[];
  defaultPersonaId?: string | null;
}

export function CoverLetterLauncher({
  profiles = [],
  defaultPersonaId = null,
}: CoverLetterLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Sparkles className={styles.icon} aria-hidden />
        Write cover letter
      </Button>

      <CoverLetterModal
        open={open}
        onClose={() => setOpen(false)}
        profiles={profiles}
        defaultPersonaId={defaultPersonaId}
      />
    </>
  );
}
