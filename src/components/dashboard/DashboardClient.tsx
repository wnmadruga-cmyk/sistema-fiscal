"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardContent } from "./DashboardContent";
import DashboardLoading from "@/app/(app)/dashboard/loading";
import { competenciaAnterior, competenciaAtual, proxCompetencia } from "@/lib/competencia-utils";

export function DashboardClient() {
  const [competencia, setCompetencia] = useState(() => competenciaAnterior(competenciaAtual()));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", competencia],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?competencia=${competencia}`);
      if (!res.ok) throw new Error("Erro ao carregar dashboard");
      const json = await res.json();
      return json.data;
    },
    staleTime: 60 * 1000,
  });

  function navPrev() { setCompetencia((c) => competenciaAnterior(c)); }
  function navNext() { setCompetencia((c) => proxCompetencia(c)); }

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
      competencia={competencia}
      gestorData={data.gestorData}
      operacionalData={data.operacionalData}
      onPrev={navPrev}
      onNext={navNext}
    />
  );
}
