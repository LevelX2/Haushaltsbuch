import type { ReactNode } from "react";
import { SidebarNav } from "@/components/sidebar-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <SidebarNav />
      <main className="main">{children}</main>
    </div>
  );
}
