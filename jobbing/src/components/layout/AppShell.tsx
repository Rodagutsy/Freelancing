"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ToastProvider } from "@/components/common/Toast";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { NAV_ITEMS, SETTINGS_ITEM } from "@/components/layout/nav";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const currentLabel =
    [...NAV_ITEMS, SETTINGS_ITEM].find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? "Dashboard";

  return (
    <ToastProvider>
      <a href="#main" className={styles.skipLink}>
        Skip to main content
      </a>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <SidebarNav />
        </aside>
        <div className={styles.content}>
          <header className={styles.topbar}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className={styles.menuIcon} aria-hidden />
            </button>
            <span className={styles.topbarTitle}>{currentLabel}</span>
          </header>
          <main id="main" className={styles.main} tabIndex={-1}>
            {children}
          </main>
        </div>
        <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </ToastProvider>
  );
}