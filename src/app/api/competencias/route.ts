import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest, forbidden } from "@/lib/api-response";
import { ORDEM_ETAPAS, competenciaAnterior, parseCompetencia } from "@/lib/competencia-utils";
import { z } from "zod";

const gerarSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}$/),
  empresaIds: z.array(z.string()).optional(),
  prazosOverride: z.record(z.string(), z.number().int().min(0)).optional(),
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

    // Accept legacy shape: { empresaId, competencias: [...] }
    const legacy = legacySchema.safeParse(body);
    if (legacy.success) {
      return await gerar({
        competencias: legacy.data.competencias,
        empresaIds: [legacy.data.empresaId],
        escritorioId: usuario.escritorioId,
      });
    }

    const parsed = gerarSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    return await gerar({
      competencias: [parsed.data.competencia],
      empresaIds: parsed.data.empresaIds,
      prazosOverride: parsed.data.prazosOverride,
      escritorioId: usuario.escritorioId,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

async function gerar(opts: {
  competencias: string[];
  empresaIds?: string[];
  prazosOverride?: Record<string, number>;
  escritorioId: string;
}) {
  const { competencias, empresaIds, prazosOverride, escritorioId } = opts;

  const empresas = await prisma.empresa.findMany({
    where: {
      escritorioId,
      ativa: true,
      ...(empresaIds && empresaIds.length > 0 && { id: { in: empresaIds } }),
    },
    include: {
      prioridade: true,
      grupos: { include: { grupo: true } },
    },
  });

  if (empresas.length === 0) return badRequest("Nenhuma empresa encontrada");

  const criados: { id: string; empresaId: string; competencia: string }[] = [];

  for (const competencia of competencias) {
    const { ano, mes } = parseCompetencia(competencia);

    for (const empresa of empresas) {
      const grupoOverride = empresa.grupos
        .map((g) => g.grupo)
        .find((g) => g.sobrepoePrioridade && g.diasPrazo != null);

      const dias =
        grupoOverride?.diasPrazo ??
        (empresa.prioridadeId && prazosOverride?.[empresa.prioridadeId] != null
          ? prazosOverride[empresa.prioridadeId]
          : empresa.prioridade?.diasPrazo ?? 0);

      const prazo = calcPrazo(competencia, dias);

      const card = await prisma.competenciaCard.upsert({
        where: { empresaId_competencia: { empresaId: empresa.id, competencia } },
        create: {
          empresaId: empresa.id,
          competencia,
          mes,
          ano,
          prazo,
          prioridadeId: empresa.prioridadeId,
          responsavelId: empresa.respElaboracaoId,
          etapas: { create: ORDEM_ETAPAS.map((etapa) => ({ etapa })) },
        },
        update: { prazo },
      });

      criados.push({ id: card.id, empresaId: empresa.id, competencia });
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

  return created({ count: criados.length, cards: criados });
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
