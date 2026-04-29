"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Competências",
    href: "/competencias",
    icon: CalendarDays,
  },
  {
    label: "Empresas",
    href: "/empresas",
    icon: Building2,
  },
  {
    label: "Qualidade",
    href: "/qualidade",
    icon: CheckSquare,
  },
];

const configItems = [
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full flex flex-col transition-all duration-300",
          "bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] border-r border-[var(--sidebar-border)]",
          sidebarCollapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-14 px-4 border-b border-[var(--sidebar-border)]",
            sidebarCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm tracking-tight">
                ECM Flow
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-white" />
            </div>
          )}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-6 w-6 text-[var(--sidebar-muted)] hover:text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-border)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        {/* Config section */}
        <div className="py-4 px-2 space-y-1 border-t border-[var(--sidebar-border)]">
          {configItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              collapsed={sidebarCollapsed}
            />
          ))}

          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="w-full h-9 text-[var(--sidebar-muted)] hover:text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-border)]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

interface NavItemProps {
  label: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
}

function NavItem({ label, href, icon: Icon, active, collapsed }: NavItemProps) {
  const content = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        collapsed ? "justify-center px-2" : "",
        active
          ? "bg-primary/20 text-white font-medium"
          : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-border)] hover:text-[var(--sidebar-fg)]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
