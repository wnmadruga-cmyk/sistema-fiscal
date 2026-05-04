import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { competenciaAtual } from "@/lib/competencia-utils";
import { sendEmail } from "@/lib/email";
import { buildDashboardEmail } from "@/lib/email-dashboard-template";
import { addDays } from "date-fns";

async function getCompetenciaAtiva(escritorioId: string) {
  const card = await prisma.competenciaCard.findFirst({
    where: { empresa: { escritorioId }, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    orderBy: { competencia: "desc" },
    select: { competencia: true },
  });
  return card?.competencia ?? competenciaAtual();
}

function workingDaysInMonth(year: number, month: number) {
  const days = new Date(year, month, 0).getDate();
  let c = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (wd !== 0 && wd !== 6) c++;
  }
  return c;
}

function workingDaysElapsed(year: number, month: number, today: Date) {
  const endOfMonth = new Date(year, month, 0);
  const cutoff = today <= endOfMonth ? today : endOfMonth;
  let c = 0;
  for (let d = 1; ; d++) {
    const date = new Date(year, month - 1, d);
    if (date > cutoff) break;
    const wd = date.getDay();
    if (wd !== 0 && wd !== 6) c++;
  }
  return c;
}

export async function collectDashboardData(escritorioId: string) {
  const hoje = new Date();
  const em2dias = addDays(hoje, 2);
  const competencia = await getCompetenciaAtiva(escritorioId);
  const [compYear, compMonth] = competencia.split("-").map(Number);
  const totalWorkingDays = workingDaysInMonth(compYear, compMonth);
  const elapsedWorkingDays = workingDaysElapsed(compYear, compMonth, hoje);
  const effectiveElapsed = Math.max(0, elapsedWorkingDays - 1);

  const [
    totalCards, concluidosCount, urgentesCount, atrasadosCount,
    filialRaw, prodRaw, escritorio,
  ] = await Promise.all([
    prisma.competenciaCard.count({ where: { empresa: { escritorioId }, competencia } }),
    prisma.competenciaCard.count({ where: { empresa: { escritorioId }, competencia, status: "CONCLUIDO" } }),
    prisma.competenciaCard.count({ where: { empresa: { escritorioId }, competencia, urgente: true, status: { notIn: ["CONCLUIDO", "CANCELADO"] } } }),
    prisma.competenciaCard.count({ where: { empresa: { escritorioId }, competencia, prazo: { lt: hoje }, status: { notIn: ["CONCLUIDO", "CANCELADO"] } } }),
    prisma.competenciaCard.findMany({
      where: { empresa: { escritorioId }, competencia },
      select: { status: true, empresa: { select: { filial: { select: { id: true, nome: true } } } } },
    }),
    prisma.competenciaCard.findMany({
      where: { empresa: { escritorioId, respElaboracaoId: { not: null } }, competencia },
      select: {
        status: true,
        empresa: { select: { respElaboracao: { select: { id: true, nome: true } } } },
        prioridade: { select: { id: true, diasPrazo: true } },
      },
    }),
    prisma.escritorio.findUnique({ where: { id: escritorioId }, select: { nome: true } }),
  ]);

  // filial stats
  const filialMap = new Map<string, { nome: string; total: number; concluidas: number }>();
  for (const c of filialRaw) {
    const fil = c.empresa.filial;
    if (!fil) continue;
    const e = filialMap.get(fil.id) ?? { nome: fil.nome, total: 0, concluidas: 0 };
    e.total++;
    if (c.status === "CONCLUIDO") e.concluidas++;
    filialMap.set(fil.id, e);
  }
  const filiaisStats = Array.from(filialMap.values())
    .map((f) => ({ ...f, pendentes: f.total - f.concluidas, pct: f.total > 0 ? Math.round((f.concluidas / f.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  // produtividade
  type PrioInfo = { id: string; diasPrazo: number };
  type PEntry = { responsavel: { id: string; nome: string }; total: number; concluidas: number; prios: Map<string, { info: PrioInfo; total: number; concluidas: number }> };
  const prodMap = new Map<string, PEntry>();
  const priosVistas = new Map<string, PrioInfo>();

  for (const c of prodRaw) {
    const resp = c.empresa.respElaboracao;
    if (!resp) continue;
    const entry = prodMap.get(resp.id) ?? { responsavel: resp, total: 0, concluidas: 0, prios: new Map() };
    entry.total++;
    if (c.status === "CONCLUIDO") entry.concluidas++;
    if (c.prioridade) {
      const p = c.prioridade as PrioInfo;
      priosVistas.set(p.id, p);
      const pp = entry.prios.get(p.id) ?? { info: p, total: 0, concluidas: 0 };
      pp.total++;
      if (c.status === "CONCLUIDO") pp.concluidas++;
      entry.prios.set(p.id, pp);
    }
    prodMap.set(resp.id, entry);
  }

  const maxDiasPrazo = Array.from(priosVistas.values()).reduce((m, p) => Math.max(m, p.diasPrazo ?? 0), 0) || totalWorkingDays;

  const produtividade = Array.from(prodMap.values()).map(({ responsavel, total, concluidas, prios }) => {
    let expectedByNow = 0;
    if (effectiveElapsed > 0) {
      for (const [, pp] of prios) {
        const dias = pp.info.diasPrazo > 0 ? pp.info.diasPrazo : maxDiasPrazo;
        expectedByNow += pp.total * Math.min(effectiveElapsed / dias, 1);
      }
    }
    const ratio = expectedByNow > 0 ? concluidas / expectedByNow : 1;
    const status = effectiveElapsed === 0 ? "otimo" : ratio >= 1 ? "otimo" : ratio >= 0.85 ? "bom" : ratio >= 0.65 ? "regular" : "ruim";
    return { responsavel, total, concluidas, pendentes: total - concluidas, status };
  }).sort((a, b) => b.total - a.total);

  const pct = totalCards > 0 ? Math.round((concluidosCount / totalCards) * 100) : 0;

  return {
    escritorioNome: escritorio?.nome ?? "Escritório",
    competencia,
    totalCards,
    concluidosCount,
    pendentesCount: totalCards - concluidosCount,
    urgentesCount,
    atrasadosCount,
    pct,
    filiaisStats,
    produtividade,
    dataEnvio: hoje,
  };
}

// POST — envia email (chamado pelo botão "Forçar envio" ou pelo cron)
export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return unauthorized();

    const config = await prisma.configEmailNotificacao.findUnique({
      where: { escritorioId: usuario.escritorioId },
    });

    const destinatarios: string[] = (await request.json().catch(() => ({}))).destinatarios ?? config?.destinatarios ?? [];
    if (destinatarios.length === 0) {
      return ok({ enviado: false, motivo: "Nenhum destinatário configurado" });
    }

    const data = await collectDashboardData(usuario.escritorioId);

    if (data.pct === 100) {
      return ok({ enviado: false, motivo: "Competência já 100% concluída" });
    }

    const assunto = config?.assunto ?? "Relatório Diário — Fluxo Fiscal";
    const html = buildDashboardEmail(data);
    await sendEmail({ to: destinatarios, subject: assunto, html });

    await prisma.configEmailNotificacao.updateMany({
      where: { escritorioId: usuario.escritorioId },
      data: { ultimoEnvio: new Date() },
    });

    return ok({ enviado: true, destinatarios, competencia: data.competencia, pct: data.pct });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
