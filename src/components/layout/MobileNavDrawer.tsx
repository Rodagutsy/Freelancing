"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions";
import { NAV_ITEMS, SETTINGS_ITEM, isNavActive } from "@/components/layout/nav";
import styles from "./MobileNavDrawer.module.css";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const navItems = [...NAV_ITEMS, SETTINGS_ITEM];

  const isActive = (href: string) => isNavActive(navItems, pathname, href);

  return (
    <div
      className={cn(styles.backdrop, open && styles.backdropOpen)}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className={cn(styles.drawer, open && styles.drawerOpen)}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.brand}>
            <span className={styles.brandMark} aria-hidden />
            Upwork Radar
          </span>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className={styles.closeIcon} aria-hidden />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Mobile navigation">
          <ul className={styles.items}>
            {[...NAV_ITEMS, SETTINGS_ITEM].map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(styles.item, isActive(href) && styles.itemActive)}
                  aria-current={isActive(href) ? "page" : undefined}
                  onClick={onClose}
                >
                  <Icon className={cn(styles.icon, isActive(href) && styles.iconActive)} aria-hidden />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.signOut}
            onClick={() => void signOut()}
          >
            <LogOut className={styles.icon} aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}