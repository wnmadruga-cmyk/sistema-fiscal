"use client";

import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div
      className={cn(
        "min-h-screen transition-all duration-300",
        sidebarCollapsed ? "pl-[60px]" : "pl-[220px]"
      )}
    >
      {children}
    </div>
  );
}
