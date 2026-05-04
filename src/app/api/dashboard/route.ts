import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { competenciaAtual } from "@/lib/competencia-utils";
import { addDays } from "date-fns";

async function getCompetenciaAtiva(escritorioId: string): Promise<string> {
  const card = await prisma.competenciaCard.findFirst({
    where: {
      empresa: { escritorioId },
      status: { notIn: ["CONCLUIDO", "CANCELADO"] },
    },
    orderBy: { competencia: "desc" },
    select: { competencia: true },
  });
  return card?.competencia ?? competenciaAtual();
}

async function getDashboardGestor(usuarioId: string, escritorioId: string, competencia: string) {
  const hoje = new Date();
  const em2dias = addDays(hoje, 2);

  const [
    totalCards, concluidosCount, atrasadosCount, urgentesCount, meusPendentes,
    resumoEtapasRaw, prioridadesRaw, prazosProximos, workloadRaw,
    qualidadeAberta, notaAggregate, notificacoesCount,
  ] = await Promise.all([
    prisma.competenciaCard.count({ where: { empresa: { escritorioId }, competencia } }),
    prisma.competenciaCard.count({ where: { empresa: { escritorioId }, competencia, status: "CONCLUIDO" } }),
    prisma.competenciaCard.count({
      where: { empresa: { escritorioId }, competencia, prazo: { lt: hoje }, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    }),
    prisma.competenciaCard.count({
      where: { empresa: { escritorioId }, competencia, urgente: true, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    }),
    prisma.competenciaCard.count({
      where: { empresa: { escritorioId }, competencia, responsavelId: usuarioId, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    }),
    prisma.competenciaCard.groupBy({
      by: ["etapaAtual"],
      where: { empresa: { escritorioId }, competencia },
      _count: { etapaAtual: true },
    }),
    prisma.competenciaCard.groupBy({
      by: ["prioridadeId"],
      where: { empresa: { escritorioId }, competencia, prioridadeId: { not: null } },
      _count: { id: true },
    }),
    prisma.competenciaCard.findMany({
      where: {
        empresa: { escritorioId }, competencia,
        prazo: { gte: hoje, lte: em2dias },
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      },
      select: {
        id: true, prazo: true, urgente: true, etapaAtual: true,
        empresa: { select: { razaoSocial: true, nomeFantasia: true, codigoInterno: true } },
        prioridade: { select: { nome: true, cor: true } },
        responsavel: { select: { nome: true } },
      },
      orderBy: { prazo: "asc" },
      take: 20,
    }),
    prisma.competenciaCard.findMany({
      where: { empresa: { escritorioId }, competencia, responsavelId: { not: null }, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      select: { responsavelId: true, urgente: true, responsavel: { select: { id: true, nome: true, avatar: true } } },
    }),
    prisma.controleQualidade.count({ where: { card: { empresa: { escritorioId }, competencia }, resolvido: false } }),
    prisma.competenciaCard.aggregate({
      where: { empresa: { escritorioId }, competencia, notaQualidade: { not: null } },
      _avg: { notaQualidade: true },
      _count: { notaQualidade: true },
    }),
    prisma.notificacao.count({ where: { usuarioId, lida: false } }),
  ]);

  const prioridadeIds = prioridadesRaw.map((p) => p.prioridadeId).filter((id): id is string => id !== null);
  const prioridades = await prisma.prioridade.findMany({
    where: { id: { in: prioridadeIds } },
    select: { id: true, nome: true, cor: true },
  });

  const workloadMap = new Map<string, { responsavel: { id: string; nome: string; avatar: string | null }; total: number; urgentes: number }>();
  for (const c of workloadRaw) {
    if (!c.responsavelId || !c.responsavel) continue;
    const entry = workloadMap.get(c.responsavelId) ?? { responsavel: c.responsavel, total: 0, urgentes: 0 };
    entry.total++;
    if (c.urgente) entry.urgentes++;
    workloadMap.set(c.responsavelId, entry);
  }

  return {
    totalCards, concluidosCount, atrasadosCount, urgentesCount, meusPendentes,
    resumoEtapas: resumoEtapasRaw.map((r) => ({ etapa: r.etapaAtual, total: r._count.etapaAtual })),
    prioridadesDistribuicao: prioridadesRaw.map((r) => ({
      prioridade: prioridades.find((p) => p.id === r.prioridadeId) ?? { id: "", nome: "Sem prioridade", cor: "#94a3b8" },
      total: r._count.id,
    })),
    prazosProximos,
    workload: Array.from(workloadMap.values()).sort((a, b) => b.total - a.total).slice(0, 10),
    qualidadeAberta,
    notaMedia: notaAggregate._avg.notaQualidade ? Number(Number(notaAggregate._avg.notaQualidade).toFixed(1)) : null,
    notaMediaCount: notaAggregate._count.notaQualidade,
    notificacoesCount,
  };
}

async function getDashboardOperacional(usuarioId: string, escritorioId: string, competencia: string) {
  const hoje = new Date();
  const em2dias = addDays(hoje, 2);

  const [meusCardsAtivos, notificacoes] = await Promise.all([
    prisma.competenciaCard.findMany({
      where: {
        empresa: { escritorioId }, competencia,
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
        OR: [
          { responsavelId: usuarioId },
          { empresa: { respElaboracaoId: usuarioId } },
          { empresa: { respBuscaId: usuarioId } },
        ],
      },
      select: {
        id: true, etapaAtual: true, urgente: true, prazo: true,
        empresa: { select: { razaoSocial: true, nomeFantasia: true, codigoInterno: true } },
        prioridade: { select: { nome: true, cor: true } },
      },
    }),
    prisma.notificacao.findMany({
      where: { usuarioId, lida: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const porEtapaMap = new Map<string, number>();
  for (const c of meusCardsAtivos) {
    porEtapaMap.set(c.etapaAtual, (porEtapaMap.get(c.etapaAtual) ?? 0) + 1);
  }

  return {
    meusPendentes: meusCardsAtivos.length,
    meusUrgentes: meusCardsAtivos.filter((c) => c.urgente).length,
    meusPrazos: meusCardsAtivos.filter((c) => c.prazo && c.prazo >= hoje && c.prazo <= em2dias).length,
    resumoEtapas: Array.from(porEtapaMap.entries()).map(([etapa, total]) => ({
      etapa: etapa as import("@prisma/client").EtapaCard,
      total,
    })),
    prazosProximos: meusCardsAtivos
      .filter((c) => c.prazo && c.prazo >= hoje && c.prazo <= em2dias)
      .sort((a, b) => (a.prazo?.getTime() ?? 0) - (b.prazo?.getTime() ?? 0)),
    notificacoes,
  };
}

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const isPrivileged = usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE";
    const competencia = await getCompetenciaAtiva(usuario.escritorioId);

    const [gestorData, operacionalData] = await Promise.all([
      isPrivileged ? getDashboardGestor(usuario.id, usuario.escritorioId, competencia) : Promise.resolve(null),
      !isPrivileged ? getDashboardOperacional(usuario.id, usuario.escritorioId, competencia) : Promise.resolve(null),
    ]);

    return ok({
      usuarioNome: usuario.nome,
      usuarioPerfil: usuario.perfil,
      competencia,
      gestorData,
      operacionalData,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
