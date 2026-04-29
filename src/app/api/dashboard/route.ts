import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { competenciaAtual } from "@/lib/competencia-utils";
import { addDays } from "date-fns";

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const competencia = competenciaAtual();
    const hoje = new Date();
    const em7dias = addDays(hoje, 7);

    const [
      cardsPendentes,
      cardsUrgentes,
      prazoProximo,
      mencoesPendentes,
      errorsAbertos,
      resumoEtapas,
    ] = await Promise.all([
      // Cards pendentes do usuário
      prisma.competenciaCard.count({
        where: {
          responsavelId: usuario.id,
          competencia,
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
      }),

      // Cards urgentes
      prisma.competenciaCard.count({
        where: {
          empresa: { escritorioId: usuario.escritorioId },
          competencia,
          urgente: true,
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
      }),

      // Cards com prazo próximo (7 dias)
      prisma.competenciaCard.findMany({
        where: {
          empresa: { escritorioId: usuario.escritorioId },
          competencia,
          prazo: { lte: em7dias, gte: hoje },
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
        include: {
          empresa: { select: { razaoSocial: true, nomeFantasia: true } },
          prioridade: true,
        },
        orderBy: { prazo: "asc" },
        take: 10,
      }),

      // Menções não lidas
      prisma.notificacao.count({
        where: {
          usuarioId: usuario.id,
          lida: false,
          tipo: "MENCAO",
        },
      }),

      // Erros em aberto
      prisma.controleQualidade.count({
        where: {
          card: { empresa: { escritorioId: usuario.escritorioId } },
          resolvido: false,
        },
      }),

      // Resumo por etapa
      prisma.competenciaCard.groupBy({
        by: ["etapaAtual"],
        where: {
          empresa: { escritorioId: usuario.escritorioId },
          competencia,
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
        _count: { etapaAtual: true },
      }),
    ]);

    return ok({
      cardsPendentes,
      cardsUrgentes,
      prazoProximo,
      mencoesPendentes,
      errorsAbertos,
      resumoEtapas: resumoEtapas.map((r) => ({
        etapa: r.etapaAtual,
        total: r._count.etapaAtual,
      })),
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
