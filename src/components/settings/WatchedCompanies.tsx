"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Pause, Play, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  addWatchedCompanyAction,
  deleteWatchedCompanyAction,
  runAdminIntakeAction,
  runAtsIntakeAction,
  searchCompaniesAction,
  setCompaniesActiveAction,
  toggleWatchedCompanyAction,
} from "@/app/actions";
import type { WatchedCompanyRow } from "@/lib/types";
import { Button } from "@/components/common/Button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/components/common/Toast";
import styles from "./WatchedCompanies.module.css";

interface WatchedCompaniesProps {
  companies: WatchedCompanyRow[];
  catalogCount: number;
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

function lastPollLabel(company: WatchedCompanyRow): string {
  if (!company.last_polled_at) return "never polled";
  const when = new Date(company.last_polled_at).toLocaleString();
  const found = company.last_jobs_found ?? 0;
  return `last polled ${when} · ${found} match${found === 1 ? "" : "es"}`;
}

export function WatchedCompanies({ companies, catalogCount }: WatchedCompaniesProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newRegion, setNewRegion] = useState<"us" | "eu">("us");
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [adminRunning, setAdminRunning] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<WatchedCompanyRow[] | null>(null);

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

  async function handleRunIntake() {
    if (running) return;
    setRunning(true);
    const result = await runAtsIntakeAction();
    setRunning(false);
    if (result.ok && result.data) {
      const { jobsNew, jobsScored, companiesPolled, capped } = result.data;
      toast(
        `Polled ${companiesPolled} board${companiesPolled === 1 ? "" : "s"} · ${jobsNew} new job${jobsNew === 1 ? "" : "s"} · ${jobsScored} scored${capped ? " (run capped)" : ""}.`,
        "success",
      );
      router.refresh();
    } else {
      toast(result.error ?? "Intake run failed.", "error");
    }
  }

  async function handleRunAdminIntake() {
    if (adminRunning) return;
    setAdminRunning(true);
    const result = await runAdminIntakeAction();
    setAdminRunning(false);
    if (result.ok && result.data) {
      const { jobsNew, jobsScored, companiesPolled, capped } = result.data;
      toast(
        `Polled ${companiesPolled} board${companiesPolled === 1 ? "" : "s"} across all users · ${jobsNew} new job${jobsNew === 1 ? "" : "s"} · ${jobsScored} scored${capped ? " (run capped)" : ""}.`,
        "success",
      );
      router.refresh();
    } else {
      toast(result.error ?? "Cron-mode intake failed.", "error");
    }
  }

  async function handleSearch() {
    setSearching(true);
    const result = await searchCompaniesAction(query);
    setSearching(false);
    if (result.ok && result.data) {
      setResults(result.data);
      if (result.data.length === 0) toast("No matching companies.", "info");
    } else {
      toast(result.error ?? "Search failed.", "error");
    }
  }

  async function handleActivate(id: string, active: boolean) {
    setPendingId(id);
    const result = await setCompaniesActiveAction([id], active);
    setPendingId(null);
    if (result.ok) {
      toast(active ? "Company activated." : "Company paused.", "success");
      router.refresh();
    } else {
      toast(result.error ?? "Could not update.", "error");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <span className={styles.meta}>
          {companies.length} active · {catalogCount.toLocaleString()} in catalog
        </span>
        <Button
          variant="secondary"
          size="sm"
          loading={running}
          onClick={() => void handleRunIntake()}
        >
          <RefreshCw size={14} aria-hidden />
          {running ? "Running…" : "Run intake now"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={adminRunning}
          onClick={() => void handleRunAdminIntake()}
          title="Runs with the service-role client (cron mode) across every user's active boards"
        >
          <RefreshCw size={14} aria-hidden />
          {adminRunning ? "Running…" : "Run intake (cron mode)"}
        </Button>
      </div>

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
                    {" · "}
                    {lastPollLabel(c)}
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
          No companies being watched. Search the catalog below to activate some,
          or add a careers URL manually.
        </p>
      )}

      <div className={styles.catalog}>
        <p className={styles.label}>Search the company catalog</p>
        <div className={styles.searchRow}>
          <input
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch();
            }}
            placeholder="e.g. Stripe, Figma, Vercel"
          />
          <Button
            variant="secondary"
            size="sm"
            loading={searching}
            onClick={() => void handleSearch()}
          >
            <Search size={14} aria-hidden />
            Search
          </Button>
        </div>

        {results && results.length > 0 && (
          <div className={styles.list}>
            {results.map((c) => (
              <div key={c.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowText}>
                    <span className={styles.companyName}>{c.name}</span>
                    <span className={styles.meta}>
                      {PLATFORM_LABELS[c.platform] ?? c.platform}
                      {" · "}
                      {c.region.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className={styles.rowActions}>
                  {c.active ? (
                    <StatusBadge label="Active" tone="success" />
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={pendingId === c.id}
                      onClick={() => void handleActivate(c.id, true)}
                    >
                      <Play size={14} aria-hidden />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
          Add company manually
        </button>
      )}
    </div>
  );
}
