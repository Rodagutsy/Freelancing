import {
  LayoutDashboard,
  Briefcase,
  ClipboardCheck,
  FolderKanban,
  BarChart3,
  Users,
  Send,
  Ban,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: ClipboardCheck },
  { href: "/portfolio", label: "Portfolio", icon: FolderKanban },
  { href: "/audits", label: "Audits", icon: BarChart3 },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/outbounds", label: "Outreach", icon: Send },
  { href: "/outbounds/suppressed", label: "Blocklist", icon: Ban },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

/**
 * Longest-matching-prefix resolution so nested routes like
 * /outbounds/suppressed highlight Blocklist, not Outreach.
 */
export function findActiveNav(
  items: Array<Pick<NavItem, "href">>,
  pathname: string,
): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export function isNavActive(
  items: Array<Pick<NavItem, "href">>,
  pathname: string,
  href: string,
): boolean {
  return findActiveNav(items, pathname) === href;
}