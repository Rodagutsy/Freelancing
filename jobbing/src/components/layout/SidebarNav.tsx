"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions";
import { NAV_ITEMS, SETTINGS_ITEM, isNavActive } from "@/components/layout/nav";
import styles from "./SidebarNav.module.css";

export function SidebarNav() {
  const pathname = usePathname();
  const navItems = [...NAV_ITEMS, SETTINGS_ITEM];

  const isActive = (href: string) => isNavActive(navItems, pathname, href);

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link href="/dashboard" className={styles.brand}>
        <span className={styles.brandMark} aria-hidden />
        Upwork Radar
      </Link>

      <ul className={styles.items}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(styles.item, isActive(href) && styles.itemActive)}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <Icon className={cn(styles.icon, isActive(href) && styles.iconActive)} aria-hidden />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <Link
          href={SETTINGS_ITEM.href}
          className={cn(styles.item, isActive(SETTINGS_ITEM.href) && styles.itemActive)}
          aria-current={isActive(SETTINGS_ITEM.href) ? "page" : undefined}
        >
          <SETTINGS_ITEM.icon className={cn(styles.icon, isActive(SETTINGS_ITEM.href) && styles.iconActive)} aria-hidden />
          <span>{SETTINGS_ITEM.label}</span>
        </Link>
        <button
          type="button"
          className={styles.signOut}
          onClick={() => void signOut()}
        >
          <LogOut className={styles.icon} aria-hidden />
          Sign out
        </button>
      </div>
    </nav>
  );
}