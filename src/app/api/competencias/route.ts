import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest, forbidden } from "@/lib/api-response";
import { etapasParaCard, competenciaAnterior, parseCompetencia } from "@/lib/competencia-utils";
import { EtapaCard, StatusEtapa } from "@prisma/client";
import { z } from "zod";

const gerarSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}$/),
  empresaIds: z.array(z.string()).optional(),
  // ISO date strings keyed by prioridadeId (e.g. "2026-05-07")
  prazosOverride: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  // ISO date strings keyed by etapa name
  prazosEtapasOverride: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

const legacySchema = z.object({
  empresaId: z.string(),
  competencias: z.array(z.string().regex(/^\d{4}-\d{2}$/)),
});

function calcPrazo(competencia: string, dias: number): Date {
  const { ano, mes } = parseCompetencia(competencia);
  const base = new Date(Date.UTC(ano, mes, 0));
  base.setUTCDate(base.getUTCDate() + dias);
  return base;
}

export async function GET(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const { searchParams } = new URL(request.url);

    const competencia = searchParams.get("competencia");
    const empresaId = searchParams.get("empresaId");
    const grupoId = searchParams.get("grupoId");
    const responsavelId = searchParams.get("responsavelId");
    const status = searchParams.get("status") as string | null;
    const etapaAtual = searchParams.get("etapaAtual") as string | null;
    const urgente = searchParams.get("urgente");
    const search = searchParams.get("search");

    const cards = await prisma.competenciaCard.findMany({
      where: {
        empresa: { escritorioId: usuario.escritorioId },
        ...(competencia && { competencia }),
        ...(empresaId && { empresaId }),
        ...(grupoId && {
          empresa: {
            escritorioId: usuario.escritorioId,
            grupos: { some: { grupoId } },
          },
        }),
        ...(responsavelId && { responsavelId }),
        ...(status && { status: status as never }),
        ...(etapaAtual && { etapaAtual: etapaAtual as never }),
        ...(urgente === "true" && { urgente: true }),
        ...(search && {
          empresa: {
            escritorioId: usuario.escritorioId,
            OR: [
              { razaoSocial: { contains: search, mode: "insensitive" } },
              { codigoInterno: { contains: search, mode: "insensitive" } },
            ],
          },
        }),
      },
      include: {
        empresa: { include: { regimeTributario: true, prioridade: true } },
        prioridade: true,
        responsavel: { select: { id: true, nome: true, avatar: true } },
        etapas: true,
        etiquetas: { include: { etiqueta: true } },
        _count: {
          select: {
            comentarios: true,
            arquivos: true,
            qualidade: { where: { resolvido: false } },
          },
        },
      },
      orderBy: [{ urgente: "desc" }, { prazo: "asc" }, { empresa: { razaoSocial: "asc" } }],
    });

    return ok(cards);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return forbidden("Apenas admins e gerentes podem gerar competências");
    const body = await request.json();

    const url = new URL(request.url);
    const wantStream = url.searchParams.get("stream") === "true";

    // Accept legacy shape: { empresaId, competencias: [...] }
    const legacy = legacySchema.safeParse(body);
    if (legacy.success) {
      try {
        const result = await gerar({
          competencias: legacy.data.competencias,
          empresaIds: [legacy.data.empresaId],
          escritorioId: usuario.escritorioId,
        });
        return created(result);
      } catch (err) {
        return badRequest(err instanceof Error ? err.message : "Erro ao gerar");
      }
    }

    const parsed = gerarSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const opts = {
      competencias: [parsed.data.competencia],
      empresaIds: parsed.data.empresaIds,
      prazosOverride: parsed.data.prazosOverride,
      prazosEtapasOverride: parsed.data.prazosEtapasOverride,
      escritorioId: usuario.escritorioId,
    };

    if (!wantStream) {
      try {
        return created(await gerar(opts));
      } catch (err) {
        return badRequest(err instanceof Error ? err.message : "Erro ao gerar");
      }
    }

    // SSE streaming path
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        try {
          const result = await gerar({
            ...opts,
            onProgress: (processed, total) => send({ processed, total }),
          });
          send({ done: true, count: result.count });
        } catch (err) {
          send({ error: err instanceof Error ? err.message : "Erro ao gerar", done: true });
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

type EmpresaComDocs = {
  semMovimentoTemp: boolean;
  configDocumentos: {
    tipoDocumento: string;
    origem: string;
    formaChegada: string | null;
    tipoPortal: string | null;
    formaChegadaConfig: { nome: string } | null;
  }[];
};

type GrupoComEtapa = {
  etapaInicial: EtapaCard | null;
  sobrepoePrioridade: boolean;
  diasPrazo: number | null;
};

type RegraFluxo = {
  tipo: string;
  etapaInicial: EtapaCard;
};

function isPortalNacionalOuSemDocs(empresa: EmpresaComDocs): boolean {
  const docs = empresa.configDocumentos;
  // Sem nenhum documento configurado
  if (docs.length === 0) return true;
  // Apenas NOTA_SERVICO e o portal é do tipo NACIONAL
  const todosSaoServico = docs.every((d) => d.tipoDocumento === "NOTA_SERVICO");
  const temPortalNacional = docs.some((d) => d.tipoPortal === "NACIONAL");
  return todosSaoServico && temPortalNacional;
}

function resolverEtapaInicial(
  empresa: EmpresaComDocs,
  grupos: GrupoComEtapa[],
  regras: RegraFluxo[]
): EtapaCard {
  // 0. Sem documentos fiscais OU apenas NFS-e via Portal Nacional → sempre CONFERENCIA_APURACAO
  if (isPortalNacionalOuSemDocs(empresa)) return EtapaCard.CONFERENCIA_APURACAO;

  // 1. Grupo com etapaInicial definida tem prioridade máxima
  const grupoComEtapa = grupos.find((g) => g.etapaInicial != null);
  if (grupoComEtapa?.etapaInicial) return grupoComEtapa.etapaInicial;

  if (regras.length === 0) return EtapaCard.BUSCA_DOCUMENTOS;

  const docs = empresa.configDocumentos;

  for (const regra of regras) {
    switch (regra.tipo) {
      case "ORIGEM_ESCRITORIO":
        if (docs.some((d) => d.origem === "ESCRITORIO")) return regra.etapaInicial;
        break;
      case "ORIGEM_TERCEIROS_ACESSO":
        if (docs.some((d) => d.origem === "TERCEIROS" && d.formaChegada === "ACESSO"))
          return regra.etapaInicial;
        break;
      case "ORIGEM_RECEITA_PR":
        if (
          docs.some(
            (d) =>
              d.formaChegadaConfig?.nome?.toLowerCase().includes("receita")
          )
        )
          return regra.etapaInicial;
        break;
      case "ORIGEM_EMAIL_WHATSAPP":
        if (docs.some((d) => d.formaChegada === "EMAIL")) return regra.etapaInicial;
        break;
      case "SEM_MOVIMENTO_TEMP":
        if (empresa.semMovimentoTemp) return regra.etapaInicial;
        break;
    }
  }

  return EtapaCard.BUSCA_DOCUMENTOS;
}

function isoToDate(iso: string): Date {
  // Parse "YYYY-MM-DD" as noon UTC to avoid timezone edge cases
  return new Date(iso + "T12:00:00Z");
}

async function gerar(opts: {
  competencias: string[];
  empresaIds?: string[];
  prazosOverride?: Record<string, string>;
  prazosEtapasOverride?: Record<string, string>;
  escritorioId: string;
  onProgress?: (processed: number, total: number) => void;
}): Promise<{ count: number; cards: { id: string; empresaId: string; competencia: string }[] }> {
  const { competencias, empresaIds, prazosOverride, prazosEtapasOverride, escritorioId, onProgress } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const [empresas, regrasFluxo, etapasConfig] = await Promise.all([
    prisma.empresa.findMany({
      where: {
        escritorioId,
        ativa: true,
        ...(empresaIds && empresaIds.length > 0 && { id: { in: empresaIds } }),
      },
      include: {
        prioridade: true,
        grupos: { include: { grupo: true } },
        configDocumentos: {
          where: { ativo: true },
          include: { formaChegadaConfig: true },
        },
      },
    }),
    db.regraFluxoInicial.findMany({
      where: { escritorioId, ativo: true },
    }) as Promise<RegraFluxo[]>,
    prisma.etapaConfig.findMany({
      where: { escritorioId },
      select: { etapa: true, responsavelPadraoId: true, diasPrazo: true },
    }),
  ]);

  if (empresas.length === 0) throw new Error("Nenhuma empresa encontrada");

  // Lookup rápido: etapa → config
  const etapaConfigMap = new Map(etapasConfig.map((c) => [c.etapa, c]));

  const criados: { id: string; empresaId: string; competencia: string }[] = [];

  const BATCH_SIZE = 50;

  for (const competencia of competencias) {
    const { ano, mes } = parseCompetencia(competencia);

    // Build all card payloads in memory (fast, no I/O)
    type CardPayload = {
      empresaId: string;
      prazo: Date;
      prioridadeId: string | null;
      respElaboracaoId: string | null;
      etapaInicial: EtapaCard;
      etapasCreate: {
        etapa: EtapaCard;
        status: StatusEtapa;
        concluidoEm?: Date;
        responsavelId?: string;
        prazo?: Date;
      }[];
    };

    const payloads: CardPayload[] = empresas.map((empresa) => {
      const grupos = empresa.grupos.map((g) => g.grupo) as unknown as GrupoComEtapa[];
      const grupoOverride = grupos.find((g: GrupoComEtapa) => g.sobrepoePrioridade && g.diasPrazo != null);

      let prazo: Date;
      if (grupoOverride?.diasPrazo != null) {
        prazo = calcPrazo(competencia, grupoOverride.diasPrazo);
      } else if (empresa.prioridadeId && prazosOverride?.[empresa.prioridadeId]) {
        prazo = isoToDate(prazosOverride[empresa.prioridadeId]);
      } else {
        prazo = calcPrazo(competencia, empresa.prioridade?.diasPrazo ?? 0);
      }

      const docs = empresa.configDocumentos;
      const etapaInicial = resolverEtapaInicial(empresa, grupos, regrasFluxo);

      const etapasOrdenadas = etapasParaCard({
        exigirConferencia: empresa.exigirConferencia || grupos.some((g) => (g as unknown as { exigirConferencia: boolean }).exigirConferencia),
        exigirImpressao: empresa.entregaImpressa,
        incluiBaixarNotasAcesso: docs.some((d) => d.origem === "TERCEIROS" && d.formaChegada === "ACESSO") || etapaInicial === EtapaCard.BAIXAR_NOTAS_ACESSO,
        incluiPedirNotasReceita: docs.some((d) => d.formaChegadaConfig?.nome?.toLowerCase().includes("receita")) || etapaInicial === EtapaCard.PEDIR_NOTAS_RECEITA_PR,
        incluiPossiveisSemMovimento: empresa.semMovimentoTemp || etapaInicial === EtapaCard.POSSIVEIS_SEM_MOVIMENTO,
      });

      const etapaInicialIdx = etapasOrdenadas.indexOf(etapaInicial);
      const etapasCreate = etapasOrdenadas.map((etapa, idx) => {
        const cfg = etapaConfigMap.get(etapa);
        const concluida = idx < etapaInicialIdx;
        let etapaPrazo: Date | undefined;
        if (!concluida && cfg?.diasPrazo != null) {
          etapaPrazo = prazosEtapasOverride?.[etapa]
            ? isoToDate(prazosEtapasOverride[etapa])
            : calcPrazo(competencia, cfg.diasPrazo);
        }
        return {
          etapa,
          status: (concluida ? StatusEtapa.CONCLUIDA : StatusEtapa.PENDENTE) as StatusEtapa,
          concluidoEm: concluida ? new Date() : undefined,
          responsavelId: (!concluida && cfg?.responsavelPadraoId) ? cfg.responsavelPadraoId : undefined,
          prazo: etapaPrazo,
        };
      });

      return { empresaId: empresa.id, prazo, prioridadeId: empresa.prioridadeId, respElaboracaoId: empresa.respElaboracaoId, etapaInicial, etapasCreate };
    });

    console.log(`[gerar] competencia=${competencia} total_empresas=${payloads.length}`);

    // Process in parallel batches to avoid sequential N×DB-roundtrip timeout
    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((p) =>
          prisma.competenciaCard.upsert({
            where: { empresaId_competencia: { empresaId: p.empresaId, competencia } },
            create: {
              empresaId: p.empresaId,
              competencia,
              mes,
              ano,
              prazo: p.prazo,
              prioridadeId: p.prioridadeId,
              responsavelId: p.respElaboracaoId,
              etapaAtual: p.etapaInicial,
              etapas: { create: p.etapasCreate },
            },
            update: { prazo: p.prazo },
          })
        )
      );
      for (let j = 0; j < results.length; j++) {
        criados.push({ id: results[j].id, empresaId: batch[j].empresaId, competencia });
      }
      console.log(`[gerar] competencia=${competencia} batch=${Math.floor(i / BATCH_SIZE) + 1} processadas=${Math.min(i + BATCH_SIZE, payloads.length)}/${payloads.length}`);
      onProgress?.(criados.length, payloads.length);
    }
  }

  // Herdar sem-movimento do mês anterior — busca em lote em vez de N findUnique individuais
  const prevCompetencias = [...new Set(criados.map((c) => competenciaAnterior(c.competencia)))];
  const prevSemMovimento = await prisma.competenciaCard.findMany({
    where: {
      competencia: { in: prevCompetencias },
      empresaId: { in: criados.map((c) => c.empresaId) },
      semMovimento: true,
    },
    select: { empresaId: true },
  });
  const semMovimentoSet = new Set(prevSemMovimento.map((c) => c.empresaId));
  const idsParaAtualizar = criados.filter((c) => semMovimentoSet.has(c.empresaId)).map((c) => c.id);
  if (idsParaAtualizar.length > 0) {
    await prisma.competenciaCard.updateMany({
      where: { id: { in: idsParaAtualizar } },
      data: { semMovimentoMesAnterior: true },
    });
  }

  return { count: criados.length, cards: criados };
}

export async function DELETE(request: Request) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return forbidden("Apenas admins e gerentes podem excluir competências");

    const { searchParams } = new URL(request.url);
    const competencia = searchParams.get("competencia");
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      return badRequest("Parâmetro 'competencia' obrigatório (YYYY-MM)");
    }

    const cards = await prisma.competenciaCard.findMany({
      where: { competencia, empresa: { escritorioId: usuario.escritorioId } },
      select: { id: true },
    });
    const ids = cards.map((c) => c.id);
    if (ids.length === 0) return ok({ deleted: 0 });

    await prisma.$transaction([
      prisma.observacao.deleteMany({ where: { cardId: { in: ids } } }),
      prisma.controleQualidade.deleteMany({ where: { cardId: { in: ids } } }),
      prisma.arquivo.deleteMany({ where: { cardId: { in: ids } } }),
      prisma.competenciaCard.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return ok({ deleted: ids.length });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
