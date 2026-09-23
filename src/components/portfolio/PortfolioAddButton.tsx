"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { PortfolioFormSheet } from "@/components/portfolio/PortfolioFormSheet";
import styles from "./PortfolioButtons.module.css";

export function PortfolioAddButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className={styles.icon} aria-hidden />
        Add portfolio project
      </Button>
      <PortfolioFormSheet
        open={open}
        onClose={() => setOpen(false)}
        project={null}
      />
    </>
  );
}