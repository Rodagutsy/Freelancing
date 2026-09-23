"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { PortfolioProjectRow } from "@/lib/types";
import { Button } from "@/components/common/Button";
import { PortfolioFormSheet } from "@/components/portfolio/PortfolioFormSheet";
import styles from "./PortfolioButtons.module.css";

interface PortfolioEditButtonProps {
  project: PortfolioProjectRow;
}

export function PortfolioEditButton({ project }: PortfolioEditButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className={styles.icon} aria-hidden />
        Edit
      </Button>
      <PortfolioFormSheet
        open={open}
        onClose={() => setOpen(false)}
        project={project}
      />
    </>
  );
}