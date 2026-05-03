export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { EtapasManager } from "@/components/configuracoes/EtapasManager";

const ETAPAS_PADRAO = [
  { etapa: "BUSCA_DOCUMENTOS",        nome: "Busca de Documentos",                 ordem: 1 },
  { etapa: "BAIXAR_NOTAS_ACESSO",     nome: "Baixar Notas Acesso Sistema",          ordem: 2 },
  { etapa: "PEDIR_NOTAS_RECEITA_PR",  nome: "Pedir Notas Receita PR",              ordem: 3 },
  { etapa: "POSSIVEIS_SEM_MOVIMENTO", nome: "Possíveis Sem Movimento",             ordem: 4 },
  { etapa: "CONFERENCIA_APURACAO",    nome: "Conferência e Apuração",              ordem: 5 },
  { etapa: "CONFERENCIA",             nome: "Conferência Final",                   ordem: 6 },
  { etapa: "TRANSMISSAO",             nome: "Transmissão",                         ordem: 7 },
  { etapa: "ENVIO",                   nome: "Envio",                               ordem: 8 },
  { etapa: "ENVIO_ACESSORIAS",        nome: "Enviado para Cliente via Acessorias", ordem: 9 },
  { etapa: "IMPRESSAO_PROTOCOLO",     nome: "Impressão e Protocolo",               ordem: 10 },
  { etapa: "CONCLUIDO",               nome: "Concluído",                           ordem: 11 },
] as const;

export default async function EtapasPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [existentes, usuarios] = await Promise.all([
    prisma.etapaConfig.findMany({ where: { escritorioId: usuario.escritorioId }, orderBy: { ordem: "asc" } }),
    prisma.usuario.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  // Mescla padrões com configurações existentes para garantir todas as etapas
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
      responsavelPadraoId: null,
      diasPrazo: null,
    };
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Etapas do Fluxo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o nome, ordem, responsável padrão e prazo de cada etapa
        </p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <EtapasManager etapas={merged as any} usuarios={usuarios} />
    </div>
  );
}
