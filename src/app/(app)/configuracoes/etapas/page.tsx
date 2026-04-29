export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EtapasManager } from "@/components/configuracoes/EtapasManager";

const ETAPAS_PADRAO = [
  { etapa: "BUSCA_DOCUMENTOS", nome: "Busca de Documentos", ordem: 1 },
  { etapa: "CONFERENCIA_APURACAO", nome: "Conferência e Apuração", ordem: 2 },
  { etapa: "CONFERENCIA", nome: "Conferência Final", ordem: 3 },
  { etapa: "TRANSMISSAO", nome: "Transmissão", ordem: 4 },
  { etapa: "ENVIO", nome: "Envio", ordem: 5 },
  { etapa: "ENVIO_ACESSORIAS", nome: "Enviado para Cliente via Acessorias", ordem: 6 },
  { etapa: "CONCLUIDO", nome: "Concluído", ordem: 7 },
] as const;

export default async function EtapasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const existentes = await prisma.etapaConfig.findMany({
    where: { escritorioId: usuario.escritorioId },
    orderBy: { ordem: "asc" },
  });

  // Mescla padrões com configurações existentes para garantir todas as 7 etapas
  const merged = ETAPAS_PADRAO.map((p) => {
    const existing = existentes.find((e) => e.etapa === p.etapa);
    return existing ?? {
      id: null,
      etapa: p.etapa,
      nome: p.nome,
      ordem: p.ordem,
      ativa: true,
      manualPdfUrl: null,
      manualVideoUrl: null,
      manualObservacao: null,
    };
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Etapas do Fluxo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o nome, ordem e manual de cada etapa
        </p>
      </div>
      <EtapasManager etapas={merged as any} />
    </div>
  );
}
