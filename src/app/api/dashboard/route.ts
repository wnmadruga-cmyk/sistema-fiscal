import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { competenciaAtual } from "@/lib/competencia-utils";
import { addDays } from "date-fns";

function workingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

function workingDaysElapsed(year: number, month: number, today: Date): number {
  const endOfMonth = new Date(year, month, 0);
  const cutoff = today <= endOfMonth ? today : endOfMonth;
  let count = 0;
  for (let d = 1; ; d++) {
    const date = new Date(year, month - 1, d);
    if (date > cutoff) break;
    const wd = date.getDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

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

  const [compYear, compMonth] = competencia.split("-").map(Number);
  const totalWorkingDays = workingDaysInMonth(compYear, compMonth);
  const elapsedWorkingDays = workingDaysElapsed(compYear, compMonth, hoje);
  const remainingWorkingDays = totalWorkingDays - elapsedWorkingDays;

  const [
    totalCards, concluidosCount, atrasadosCount, urgentesCount, meusPendentes,
    resumoEtapasRaw, prioridadesRaw, prazosProximos, workloadRaw,
    qualidadeAberta, notaAggregate, notificacoesCount,
    filialRaw, prodRaw,
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
    // filial stats
    prisma.competenciaCard.findMany({
      where: { empresa: { escritorioId }, competencia },
      select: {
        status: true,
        empresa: { select: { filial: { select: { id: true, nome: true } } } },
      },
    }),
    // produtividade por respElaboracao
    prisma.competenciaCard.findMany({
      where: { empresa: { escritorioId, respElaboracaoId: { not: null } }, competencia },
      select: {
        status: true,
        etapaAtual: true,
        empresa: { select: { respElaboracao: { select: { id: true, nome: true, avatar: true } } } },
      },
    }),
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

  // filial stats
  const filialMap = new Map<string, { nome: string; total: number; concluidas: number }>();
  for (const c of filialRaw) {
    const fil = c.empresa.filial;
    if (!fil) continue;
    const entry = filialMap.get(fil.id) ?? { nome: fil.nome, total: 0, concluidas: 0 };
    entry.total++;
    if (c.status === "CONCLUIDO") entry.concluidas++;
    filialMap.set(fil.id, entry);
  }
  const filiaisStats = Array.from(filialMap.values())
    .map((f) => ({ ...f, pendentes: f.total - f.concluidas, pct: f.total > 0 ? Math.round((f.concluidas / f.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  // produtividade por respElaboracao
  type ProdEntry = {
    responsavel: { id: string; nome: string; avatar: string | null };
    total: number;
    concluidas: number;
    etapas: Map<string, number>;
  };
  const prodMap = new Map<string, ProdEntry>();
  for (const c of prodRaw) {
    const resp = c.empresa.respElaboracao;
    if (!resp) continue;
    const entry = prodMap.get(resp.id) ?? { responsavel: resp, total: 0, concluidas: 0, etapas: new Map() };
    entry.total++;
    if (c.status === "CONCLUIDO") {
      entry.concluidas++;
    } else {
      entry.etapas.set(c.etapaAtual, (entry.etapas.get(c.etapaAtual) ?? 0) + 1);
    }
    prodMap.set(resp.id, entry);
  }
  const safeElapsed = Math.max(elapsedWorkingDays, 1);
  const produtividade = Array.from(prodMap.values())
    .map(({ responsavel, total, concluidas, etapas }) => {
      const pendentes = total - concluidas;
      const media = parseFloat((concluidas / safeElapsed).toFixed(2));
      const ideal = parseFloat((total / Math.max(totalWorkingDays, 1)).toFixed(2));
      const ratio = total > 0 ? concluidas / total : 1;
      const status: "otimo" | "bom" | "regular" | "ruim" =
        ratio >= 1 ? "otimo" : ratio >= 0.95 ? "bom" : ratio >= 0.8 ? "regular" : "ruim";
      return {
        responsavel,
        total,
        concluidas,
        pendentes,
        media,
        ideal,
        status,
        porEtapa: Array.from(etapas.entries()).map(([etapa, count]) => ({ etapa, count })),
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    totalCards, concluidosCount, atrasadosCount, urgentesCount, meusPendentes,
    pendentesCount: totalCards - concluidosCount,
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
    filiaisStats,
    produtividade,
    diasUteis: { total: totalWorkingDays, elapsed: elapsedWorkingDays, restantes: remainingWorkingDays },
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
