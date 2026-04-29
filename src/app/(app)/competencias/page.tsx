"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { competenciaAtual } from "@/lib/competencia-utils";
import { CompetenciasPageContent } from "@/components/competencias/CompetenciasPageContent";
import CompetenciasLoading from "./loading";

export default function CompetenciasPage() {
  const searchParams = useSearchParams();
  const competencia = searchParams.get("competencia") || competenciaAtual();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["competencias-page-data", competencia],
    queryFn: async () => {
      const res = await fetch(`/api/competencias/page-data?competencia=${competencia}`);
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const json = await res.json();
      return json.data;
    },
    staleTime: 30 * 1000, // 30 segundos — revalida em background
  });

  if (isLoading || !data) return <CompetenciasLoading />;

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Erro ao carregar competências. Tente novamente.
      </div>
    );
  }

  const { cards, metadata, usuarioId, usuarioPerfil } = data;

  return (
    <CompetenciasPageContent
      cards={cards}
      grupos={metadata.grupos}
      usuarios={metadata.usuarios}
      competenciaAtual={competencia}
      usuarioId={usuarioId}
      usuarioPerfil={usuarioPerfil}
      prioridades={metadata.prioridades}
      empresas={metadata.empresas.map((e: { id: string; codigoInterno: string | null; razaoSocial: string; prioridadeId: string | null }) => ({
        id: e.id,
        nome: e.codigoInterno ? `${e.codigoInterno} — ${e.razaoSocial}` : e.razaoSocial,
        prioridadeId: e.prioridadeId,
      }))}
      etiquetas={metadata.etiquetas}
      regimes={metadata.regimes}
      tiposAtividade={metadata.tiposAtividade}
      filiais={metadata.filiais}
    />
  );
}
