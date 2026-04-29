import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";
import { logCardEvento } from "@/lib/card-eventos";

const putSchema = z.object({
  etiquetaIds: z.array(z.string()),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const card = await prisma.competenciaCard.findFirst({
      where: { id: cardId, empresa: { escritorioId: usuario.escritorioId } },
      select: { id: true },
    });
    if (!card) return notFound();

    await prisma.$transaction([
      prisma.cardEtiqueta.deleteMany({ where: { cardId } }),
      ...(parsed.data.etiquetaIds.length > 0
        ? [prisma.cardEtiqueta.createMany({
            data: parsed.data.etiquetaIds.map((etiquetaId) => ({ cardId, etiquetaId })),
          })]
        : []),
    ]);

    const updated = await prisma.cardEtiqueta.findMany({
      where: { cardId },
      include: { etiqueta: true },
    });

    await logCardEvento({
      cardId,
      usuarioId: usuario.id,
      tipo: "ETIQUETA_ALTERADA",
      titulo: "Etiquetas atualizadas",
      detalhes: updated.map((e) => e.etiqueta.nome).join(", ") || "(nenhuma)",
    });

    return ok(updated);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
