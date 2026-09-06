import {
  LayoutDashboard,
  Briefcase,
  ClipboardCheck,
  FolderKanban,
  BarChart3,
  Users,
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
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};