import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, notFound, badRequest, forbidden } from "@/lib/api-response";
import { z } from "zod";
import { EtapaCard, StatusCard } from "@prisma/client";
import { proximaEtapa, etapasParaCard } from "@/lib/competencia-utils";
import { assertInlineAllowed } from "@/lib/competencia-guards";
import { logCardEvento } from "@/lib/card-eventos";

const updateSchema = z.object({
  status: z.nativeEnum(StatusCard).optional(),
  etapaAtual: z.nativeEnum(EtapaCard).optional(),
  responsavelId: z.string().optional().nullable(),
  prioridadeId: z.string().optional().nullable(),
  prazo: z.string().datetime().optional().nullable(),
  urgente: z.boolean().optional(),
  semMovimento: z.boolean().optional(),
  observacoes: z.string().optional(),
  inline: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;

    const card = await prisma.competenciaCard.findFirst({
      where: {
        id: cardId,
        empresa: { escritorioId: usuario.escritorioId },
      },
      include: {
        empresa: {
          include: {
            regimeTributario: true,
            tipoAtividade: true,
            prioridade: true,
            configDocumentos: true,
            configBuscas: {
              select: { id: true, nome: true, url: true, login: true, ativo: true },
            },
          },
        },
        prioridade: true,
        responsavel: { select: { id: true, nome: true, avatar: true, perfil: true } },
        etapas: true,
        etiquetas: { include: { etiqueta: true } },
        qualidade: {
          where: { resolvido: false },
          include: {
            responsavel: { select: { id: true, nome: true, avatar: true } },
          },
        },
        observacoesCard: {
          where: { ativa: true },
          include: {
            autor: { select: { id: true, nome: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { comentarios: true, arquivos: true },
        },
      },
    });

    if (!card) return notFound("Card não encontrado");
    return ok(card);
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { inline, ...data } = parsed.data;
    if (inline) {
      const guard = await assertInlineAllowed(cardId, usuario.escritorioId);
      if (!guard.ok) return forbidden(guard.reason);
    }

    const before = await prisma.competenciaCard.findUnique({
      where: { id: cardId },
      select: { urgente: true, semMovimento: true, responsavelId: true },
    });

    const smLigando = data.semMovimento === true && before?.semMovimento !== true;

    // Quando SM liga: descobre quais etapas estão antes de TRANSMISSAO neste card
    let smEtapasParaConcluir: EtapaCard[] = [];
    if (smLigando) {
      const cardInfo = await prisma.competenciaCard.findUnique({
        where: { id: cardId },
        select: {
          conferenciaForcada: true,
          empresa: { select: { exigirConferencia: true, entregaImpressa: true } },
        },
      });
      if (cardInfo) {
        const etapas = etapasParaCard({
          exigirConferencia: cardInfo.empresa.exigirConferencia,
          conferenciaForcada: cardInfo.conferenciaForcada ?? false,
          exigirImpressao: cardInfo.empresa.entregaImpressa,
        });
        const idxTransmissao = etapas.indexOf(EtapaCard.TRANSMISSAO);
        smEtapasParaConcluir = idxTransmissao > 0 ? etapas.slice(0, idxTransmissao) : [];
      }
    }

    const card = await prisma.competenciaCard.update({
      where: { id: cardId },
      data: {
        ...data,
        prazo: parsed.data.prazo ? new Date(parsed.data.prazo) : parsed.data.prazo,
        // SM ligando: vai direto para TRANSMISSAO (pendente lá)
        ...(smLigando && {
          etapaAtual: EtapaCard.TRANSMISSAO,
          status: "EM_ANDAMENTO" as StatusCard,
          iniciadoEm: new Date(),
        }),
        ...(!smLigando && parsed.data.etapaAtual === "CONCLUIDO" && {
          status: "CONCLUIDO" as StatusCard,
          concluidoEm: new Date(),
        }),
        ...(!smLigando && parsed.data.etapaAtual && parsed.data.etapaAtual !== "CONCLUIDO" && {
          status: "EM_ANDAMENTO" as StatusCard,
          iniciadoEm: new Date(),
        }),
      },
    });

    // Marca busca, apuração e conferência (se existir no card) como CONCLUIDA
    if (smEtapasParaConcluir.length > 0) {
      const agora = new Date();
      await prisma.$transaction(
        smEtapasParaConcluir.map((etapa) =>
          prisma.cardEtapa.upsert({
            where: { cardId_etapa: { cardId, etapa } },
            update: { status: "CONCLUIDA", concluidoEm: agora },
            create: { cardId, etapa, status: "CONCLUIDA", concluidoEm: agora },
          })
        )
      );
    }

    if (before && data.urgente !== undefined && data.urgente !== before.urgente) {
      await logCardEvento({
        cardId, usuarioId: usuario.id,
        tipo: data.urgente ? "URGENTE_MARCADO" : "URGENTE_REMOVIDO",
        titulo: data.urgente ? "Marcado como urgente" : "Urgente removido",
      });
    }
    if (before && data.semMovimento !== undefined && data.semMovimento !== before.semMovimento) {
      await logCardEvento({
        cardId, usuarioId: usuario.id,
        tipo: data.semMovimento ? "SEM_MOVIMENTO_MARCADO" : "SEM_MOVIMENTO_REMOVIDO",
        titulo: data.semMovimento ? "Marcado sem movimento" : "Com movimento",
      });
    }
    if (before && data.responsavelId !== undefined && data.responsavelId !== before.responsavelId) {
      await logCardEvento({
        cardId, usuarioId: usuario.id,
        tipo: "RESPONSAVEL_ALTERADO",
        titulo: "Responsável alterado",
      });
    }

    return ok(card);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    if (usuario.perfil !== "ADMIN" && usuario.perfil !== "GERENTE") return forbidden("Apenas admins e gerentes podem excluir cards");
    const { cardId } = await params;
    const body = await request.json().catch(() => ({}));
    const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
    if (!motivo) return badRequest("Comentário/motivo é obrigatório para excluir");

    const card = await prisma.competenciaCard.findFirst({
      where: { id: cardId, empresa: { escritorioId: usuario.escritorioId } },
      select: { id: true, empresaId: true, competencia: true },
    });
    if (!card) return notFound("Card não encontrado");

    await prisma.observacao.create({
      data: {
        empresaId: card.empresaId,
        autorId: usuario.id,
        texto: `Card da competência ${card.competencia} excluído. Motivo: ${motivo}`,
        persistente: true,
      },
    });

    await prisma.$transaction([
      prisma.observacao.deleteMany({ where: { cardId } }),
      prisma.controleQualidade.deleteMany({ where: { cardId } }),
      prisma.arquivo.deleteMany({ where: { cardId } }),
      prisma.competenciaCard.delete({ where: { id: cardId } }),
    ]);

    return ok({ deleted: 1 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
