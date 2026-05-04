"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardContent } from "./DashboardContent";
import DashboardLoading from "@/app/(app)/dashboard/loading";

export function DashboardClient() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Erro ao carregar dashboard");
      const json = await res.json();
      return json.data;
    },
    staleTime: 60 * 1000, // 1 minuto — dados do dashboard são relativamente estáveis
  });

  if (isLoading || !data) return <DashboardLoading />;

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Erro ao carregar dashboard. Tente novamente.
      </div>
    );
  }

  return (
    <DashboardContent
      usuarioNome={data.usuarioNome}
      usuarioPerfil={data.usuarioPerfil}
      competencia={data.competencia}
      gestorData={data.gestorData}
      operacionalData={data.operacionalData}
    />
  );
}
