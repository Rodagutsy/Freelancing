"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { AuditFormSheet } from "@/components/audits/AuditFormSheet";
import styles from "./AuditButtons.module.css";

export function AuditCreateButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className={styles.icon} aria-hidden />
        Start an audit
      </Button>
      <AuditFormSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}