"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Pause, Play, Plus, Trash2 } from "lucide-react";
import {
  addWatchedCompanyAction,
  deleteWatchedCompanyAction,
  toggleWatchedCompanyAction,
} from "@/app/actions";
import type { WatchedCompanyRow } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/components/common/Toast";
import styles from "./WatchedCompanies.module.css";

interface WatchedCompaniesProps {
  companies: WatchedCompanyRow[];
}

const PLATFORM_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
  personio: "Personio",
  recruitee: "Recruitee",
  unknown: "Unknown",
};

export function WatchedCompanies({ companies }: WatchedCompaniesProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newRegion, setNewRegion] = useState<"us" | "eu">("us");
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleAdd() {
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name || !url || adding) return;
    setAdding(true);
    const result = await addWatchedCompanyAction({ name, url, region: newRegion });
    setAdding(false);
    if (result.ok) {
      toast("Company added to watch list.", "success");
      setNewName("");
      setNewUrl("");
      setAddOpen(false);
      router.refresh();
    } else {
      toast(result.error ?? "Could not add company.", "error");
    }
  }

  async function handleToggle(id: string, active: boolean) {
    setPendingId(id);
    const result = await toggleWatchedCompanyAction(id, !active);
    setPendingId(null);
    if (result.ok) {
      toast(active ? "Company paused." : "Company activated.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not update.", "error");
    }
  }

  async function handleDelete(id: string) {
    setPendingId(id);
    const result = await deleteWatchedCompanyAction(id);
    setPendingId(null);
    if (result.ok) {
      toast("Company removed.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not delete.", "error");
    }
  }

  return (
    <div className={styles.wrap}>
      {companies.length > 0 ? (
        <div className={styles.list}>
          {companies.map((c) => (
            <div key={c.id} className={styles.row}>
              <div className={styles.rowMain}>
                <Globe className={styles.globeIcon} aria-hidden />
                <div className={styles.rowText}>
                  <span className={styles.companyName}>{c.name}</span>
                  <span className={styles.meta}>
                    {PLATFORM_LABELS[c.platform] ?? c.platform}
                    {" · "}
                    {c.region.toUpperCase()}
                  </span>
                </div>
                <StatusBadge
                  label={c.active ? "Active" : "Paused"}
                  tone={c.active ? "success" : "muted"}
                />
              </div>
              <div className={styles.rowActions}>
                <button
                  className={styles.iconBtn}
                  disabled={pendingId === c.id}
                  onClick={() => void handleToggle(c.id, c.active)}
                  title={c.active ? "Pause" : "Activate"}
                >
                  {c.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  className={styles.iconBtnDestructive}
                  disabled={pendingId === c.id}
                  onClick={() => void handleDelete(c.id)}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>
          No companies being watched. Add a company careers URL to start
          tracking their job boards.
        </p>
      )}

      {addOpen ? (
        <div className={styles.addForm}>
          <div className={styles.addFields}>
            <label className={styles.label}>
              Company name
              <input
                className={styles.input}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Anthropic"
                maxLength={100}
              />
            </label>
            <label className={styles.label}>
              Careers URL
              <input
                className={styles.input}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://boards.greenhouse.io/anthropic"
                type="url"
              />
            </label>
            <label className={styles.label}>
              Region
              <select
                className={styles.input}
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value as "us" | "eu")}
              >
                <option value="us">US</option>
                <option value="eu">EU</option>
              </select>
            </label>
          </div>
          <div className={styles.addActions}>
            <button className={styles.cancelBtn} onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button
              className={styles.addBtn}
              disabled={adding || !newName.trim() || !newUrl.trim()}
              onClick={() => void handleAdd()}
            >
              <Plus size={14} />
              Add company
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addToggle} onClick={() => setAddOpen(true)}>
          <Plus size={14} />
          Add company
        </button>
      )}
    </div>
  );
}
