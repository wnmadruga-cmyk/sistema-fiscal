import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";
import { logCardEvento } from "@/lib/card-eventos";

const schema = z.object({
  motivo: z.string().min(1, "Motivo obrigatório"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const card = await prisma.competenciaCard.findFirst({
      where: { id: cardId, empresa: { escritorioId: usuario.escritorioId } },
      select: { id: true, conferenciaForcada: true, empresa: { select: { razaoSocial: true } } },
    });
    if (!card) return notFound();
    if (card.conferenciaForcada) return badRequest("Conferência já foi forçada");

    const escritorio = await prisma.escritorio.findUnique({
      where: { id: usuario.escritorioId },
      select: { usuarioConferenciaPadraoId: true },
    });

    const responsavelId = escritorio?.usuarioConferenciaPadraoId ?? null;

    const updated = await prisma.competenciaCard.update({
      where: { id: cardId },
      data: {
        conferenciaForcada: true,
        motivoConferencia: parsed.data.motivo,
        conferenciaResponsavelId: responsavelId,
      },
    });

    if (responsavelId) {
      await prisma.notificacao.create({
        data: {
          usuarioId: responsavelId,
          tipo: "CARD_ATRIBUIDO",
          titulo: "Conferência forçada atribuída",
          mensagem: `${card.empresa.razaoSocial}: ${parsed.data.motivo}`,
          linkRef: `/competencias/${cardId}`,
        },
      });
    }

    await logCardEvento({
      cardId,
      usuarioId: usuario.id,
      tipo: "OUTRO",
      titulo: "Conferência forçada",
      detalhes: parsed.data.motivo,
    });

    return ok(updated);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
