import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, forbidden } from "@/lib/api-response";
import { z } from "zod";
import { EtapaCard, StatusEtapa, ResultadoConferencia } from "@prisma/client";
import { assertInlineAllowed } from "@/lib/competencia-guards";
import { etapasParaCard, LABEL_ETAPA } from "@/lib/competencia-utils";
import { logCardEvento } from "@/lib/card-eventos";

const updateEtapaSchema = z.object({
  etapa: z.nativeEnum(EtapaCard),
  status: z.nativeEnum(StatusEtapa),
  observacao: z.string().optional(),
  justificativa: z.string().optional(),
  resultadoConferencia: z.nativeEnum(ResultadoConferencia).optional(),
  comentarioRessalva: z.string().optional(),
  ressalvaResolvida: z.boolean().optional(),
  inline: z.boolean().optional(),
});

const ETAPAS_CONFERENCIA: EtapaCard[] = [EtapaCard.CONFERENCIA];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;

    const etapas = await prisma.cardEtapa.findMany({
      where: { cardId },
      include: {
        respostas: {
          include: {
            item: true,
            usuario: { select: { id: true, nome: true, avatar: true } },
          },
        },
      },
      orderBy: { etapa: "asc" },
    });

    return ok(etapas);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const body = await request.json();
    const parsed = updateEtapaSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { etapa, status, observacao, justificativa, resultadoConferencia, comentarioRessalva, ressalvaResolvida, inline } = parsed.data;

    if (inline) {
      const guard = await assertInlineAllowed(cardId, usuario.escritorioId);
      if (!guard.ok) return forbidden(guard.reason);
    }

    if (status === "REPROVADA" && !justificativa) {
      return badRequest("Justificativa obrigatória para reprovar");
    }

    const isConferencia = ETAPAS_CONFERENCIA.includes(etapa);
    if (isConferencia && ["ADMIN", "GERENTE", "CONFERENTE"].indexOf(usuario.perfil) === -1) {
      return forbidden("Apenas admins, gerentes e conferentes podem registrar conferência");
    }
    if (isConferencia && status === "CONCLUIDA" && !resultadoConferencia) {
      return badRequest("Resultado da conferência é obrigatório (Aprovado, Ressalva ou Reprovado)");
    }
    if (resultadoConferencia === "RESSALVA" && !comentarioRessalva?.trim()) {
      return badRequest("Comentário da ressalva é obrigatório");
    }

    const ressalvaPendente = resultadoConferencia === "RESSALVA" && ressalvaResolvida !== true;

    const cardEtapa = await prisma.cardEtapa.upsert({
      where: { cardId_etapa: { cardId, etapa } },
      update: {
        status,
        observacao,
        justificativa,
        ...(resultadoConferencia !== undefined && { resultadoConferencia }),
        ...(comentarioRessalva !== undefined && { comentarioRessalva }),
        ...(ressalvaResolvida !== undefined && { ressalvaResolvida }),
        ...(status === "EM_ANDAMENTO" && { iniciadoEm: new Date() }),
        ...(status === "CONCLUIDA" && { concluidoEm: new Date() }),
      },
      create: {
        cardId,
        etapa,
        status,
        observacao,
        justificativa,
        ...(resultadoConferencia !== undefined && { resultadoConferencia }),
        ...(comentarioRessalva !== undefined && { comentarioRessalva }),
        ...(ressalvaResolvida !== undefined && { ressalvaResolvida }),
        ...(status === "EM_ANDAMENTO" && { iniciadoEm: new Date() }),
        ...(status === "CONCLUIDA" && { concluidoEm: new Date() }),
      },
    });

    // Avança etapa atual exceto quando a conferência ficou com ressalva pendente
    // Calcula nota de qualidade quando a etapa CONFERENCIA é concluída
    if (isConferencia && status === "CONCLUIDA" && !ressalvaPendente) {
      const itens = await prisma.controleQualidade.findMany({
        where: { cardId, erroPossivelId: { not: null } },
        select: { statusItem: true, pesoSnapshot: true },
      });
      const itensConsiderados = itens.filter((i) => !!i.statusItem);
      const totalPeso = itensConsiderados.reduce((s, i) => s + (i.pesoSnapshot ?? 1), 0);
      const pesoOk = itensConsiderados
        .filter((i) => i.statusItem === "APROVADO")
        .reduce((s, i) => s + (i.pesoSnapshot ?? 1), 0);
      const nota = totalPeso > 0 ? (pesoOk / totalPeso) * 100 : null;
      await prisma.competenciaCard.update({
        where: { id: cardId },
        data: { notaQualidade: nota === null ? null : Number(nota.toFixed(2)) },
      });
    }

    if (status === "CONCLUIDA" && !ressalvaPendente) {
      const ctx = await prisma.competenciaCard.findFirst({
        where: { id: cardId },
        select: {
          conferenciaForcada: true,
          empresa: {
            select: {
              exigirConferencia: true,
              entregaImpressa: true,
              grupos: { select: { grupo: { select: { exigirConferencia: true } } } },
            },
          },
        },
      });
      const exigirConferencia =
        !!ctx?.empresa.exigirConferencia ||
        !!ctx?.empresa.grupos.some((g) => g.grupo.exigirConferencia) ||
        !!ctx?.conferenciaForcada;
      const exigirImpressao = !!ctx?.empresa.entregaImpressa;
      const ordem = etapasParaCard({ exigirConferencia, exigirImpressao });
      const idx = ordem.indexOf(etapa);
      const proxEtapa = idx >= 0 && idx < ordem.length - 1 ? ordem[idx + 1] : null;

      await prisma.competenciaCard.update({
        where: { id: cardId },
        data: {
          etapaAtual: proxEtapa ?? "CONCLUIDO",
          ...(proxEtapa === null && {
            status: "CONCLUIDO",
            concluidoEm: new Date(),
          }),
        },
      });
    }

    // Conferência REPROVADA: volta etapaAtual para a etapa anterior, registra observação e notifica responsável pela elaboração
    if (isConferencia && resultadoConferencia === "REPROVADO") {
      const ctx = await prisma.competenciaCard.findFirst({
        where: { id: cardId },
        select: {
          conferenciaForcada: true,
          empresaId: true,
          competencia: true,
          empresa: {
            select: {
              razaoSocial: true,
              respElaboracaoId: true,
              exigirConferencia: true,
              entregaImpressa: true,
              grupos: { select: { grupo: { select: { exigirConferencia: true } } } },
            },
          },
        },
      });
      const exigirConferencia =
        !!ctx?.empresa.exigirConferencia ||
        !!ctx?.empresa.grupos.some((g) => g.grupo.exigirConferencia) ||
        !!ctx?.conferenciaForcada;
      const exigirImpressao = !!ctx?.empresa.entregaImpressa;
      const ordem = etapasParaCard({ exigirConferencia, exigirImpressao });
      const idx = ordem.indexOf(etapa);
      const etapaAnterior = idx > 0 ? ordem[idx - 1] : ordem[0];

      await prisma.competenciaCard.update({
        where: { id: cardId },
        data: { etapaAtual: etapaAnterior, status: "EM_ANDAMENTO" },
      });

      await prisma.cardEtapa.upsert({
        where: { cardId_etapa: { cardId, etapa: etapaAnterior } },
        update: { status: "EM_ANDAMENTO", concluidoEm: null },
        create: { cardId, etapa: etapaAnterior, status: "EM_ANDAMENTO", iniciadoEm: new Date() },
      });

      if (ctx?.empresaId) {
        await prisma.observacao.create({
          data: {
            empresaId: ctx.empresaId,
            cardId,
            autorId: usuario.id,
            texto: `Reprovado na conferência — ajustes necessários: ${justificativa ?? ""}`,
            persistente: false,
          },
        });
      }

      if (ctx?.empresa.respElaboracaoId) {
        await prisma.notificacao.create({
          data: {
            usuarioId: ctx.empresa.respElaboracaoId,
            tipo: "CARD_ATRIBUIDO",
            titulo: "Card reprovado na conferência",
            mensagem: `${ctx.empresa.razaoSocial} (${ctx.competencia}) — voltou para ${LABEL_ETAPA[etapaAnterior]}: ${justificativa ?? ""}`,
            linkRef: `/competencias/${cardId}`,
          },
        });
      }
    }

    // Auto-cria ControleQualidade quando conferência retorna problema
    // E a empresa (ou algum grupo) exige conferência
    if (isConferencia && resultadoConferencia && resultadoConferencia !== "APROVADO") {
      const cardCtx = await prisma.competenciaCard.findFirst({
        where: { id: cardId },
        select: {
          empresa: {
            select: {
              exigirConferencia: true,
              entregaImpressa: true,
              grupos: { select: { grupo: { select: { exigirConferencia: true } } } },
            },
          },
        },
      });
      const exige =
        cardCtx?.empresa.exigirConferencia ||
        cardCtx?.empresa.grupos.some((g) => g.grupo.exigirConferencia);
      if (exige) {
        await prisma.controleQualidade.create({
          data: {
            cardId,
            etapa,
            responsavelId: usuario.id,
            tipoErro: resultadoConferencia === "RESSALVA" ? "DADO_INCORRETO" : "RETRABALHO",
            descricao:
              resultadoConferencia === "RESSALVA"
                ? `Ressalva: ${comentarioRessalva ?? ""}`
                : `Reprovação: ${justificativa ?? ""}`,
          },
        });
        await logCardEvento({
          cardId,
          usuarioId: usuario.id,
          tipo: "QUALIDADE_REGISTRADA",
          titulo: "Qualidade registrada automaticamente",
          detalhes: `Etapa ${LABEL_ETAPA[etapa]} — ${resultadoConferencia}`,
        });
      }
    }

    // Histórico
    if (isConferencia && resultadoConferencia) {
      const tipoEvt =
        resultadoConferencia === "APROVADO"
          ? "CONFERENCIA_APROVADA"
          : resultadoConferencia === "RESSALVA"
            ? (ressalvaResolvida ? "RESSALVA_RESOLVIDA" : "CONFERENCIA_RESSALVA")
            : "CONFERENCIA_REPROVADA";
      await logCardEvento({
        cardId,
        usuarioId: usuario.id,
        tipo: tipoEvt as never,
        titulo: `${LABEL_ETAPA[etapa]} — ${resultadoConferencia}`,
        detalhes: comentarioRessalva ?? justificativa ?? null,
      });
    } else if (status === "CONCLUIDA") {
      await logCardEvento({
        cardId,
        usuarioId: usuario.id,
        tipo: "ETAPA_CONCLUIDA",
        titulo: `Etapa concluída: ${LABEL_ETAPA[etapa]}`,
        detalhes: observacao ?? null,
      });
    } else if (status === "EM_ANDAMENTO") {
      await logCardEvento({
        cardId,
        usuarioId: usuario.id,
        tipo: "ETAPA_INICIADA",
        titulo: `Etapa iniciada: ${LABEL_ETAPA[etapa]}`,
      });
    } else if (status === "REPROVADA") {
      await logCardEvento({
        cardId,
        usuarioId: usuario.id,
        tipo: "ETAPA_REPROVADA",
        titulo: `Etapa reprovada: ${LABEL_ETAPA[etapa]}`,
        detalhes: justificativa ?? null,
      });
    }

    return ok(cardEtapa);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
