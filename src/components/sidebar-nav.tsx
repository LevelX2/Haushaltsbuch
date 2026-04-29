"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Database,
  FileText,
  Gauge,
  Home,
  Inbox,
  Landmark,
  ListChecks,
  ReceiptText,
  Settings,
  Tags,
  UsersRound,
  WalletCards,
} from "lucide-react";
import clsx from "clsx";

const groups = [
  {
    label: "Überblick",
    items: [
      { href: "/", label: "Dashboard", icon: Gauge },
      { href: "/kostenpositionen", label: "Kostenpositionen", icon: WalletCards },
      { href: "/faelligkeiten", label: "Zahlungsprognose", icon: CalendarDays },
    ],
  },
  {
    label: "Erfassung",
    items: [
      { href: "/einmalige-ausgaben", label: "Einmalige Ausgaben", icon: ReceiptText },
      { href: "/befristete-kosten", label: "Befristete Kosten", icon: ListChecks },
      { href: "/zahlungen", label: "Zahlungen", icon: Landmark },
      { href: "/pruefeingang", label: "Prüfeingang", icon: Inbox },
    ],
  },
  {
    label: "Stammdaten",
    items: [
      { href: "/anbieter", label: "Anbieter", icon: UsersRound },
      { href: "/kategorien", label: "Kategorien", icon: Tags },
      { href: "/dokumente", label: "Dokumente / Belege", icon: FileText },
    ],
  },
  {
    label: "Betrieb",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/backup-export", label: "Backup / Export", icon: Archive },
      { href: "/einstellungen", label: "Einstellungen", icon: Settings },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>Haushaltsbuch</strong>
        <span>Fixkostenübersicht lokal</span>
      </div>
      {groups.map((group) => (
        <nav className="nav-group" key={group.label} aria-label={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link className={clsx("nav-link", active && "active")} href={item.href} key={item.href}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ))}
      <div className="small" style={{ padding: "10px 8px" }}>
        <Database size={16} aria-hidden="true" /> Lokale SQLite-Datenbank, Reports nach OneDrive.
      </div>
    </aside>
  );
}
