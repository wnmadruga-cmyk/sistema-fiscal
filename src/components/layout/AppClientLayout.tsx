"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,       // dados ficam "frescos" por 1 minuto
            gcTime: 5 * 60 * 1000,      // cache mantido por 5 minutos
            refetchOnWindowFocus: false, // não recarrega ao focar a janela
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarCollapsed ? "pl-[60px]" : "pl-[220px]"
        )}
      >
        {children}
      </div>
    </QueryClientProvider>
  );
}
