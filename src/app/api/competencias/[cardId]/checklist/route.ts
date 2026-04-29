import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const upsertSchema = z.object({
  etapaId: z.string().min(1),
  itemId: z.string().min(1),
  marcado: z.boolean(),
  observacao: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { etapaId, itemId, marcado, observacao } = parsed.data;

    const etapa = await prisma.cardEtapa.findFirst({
      where: { id: etapaId, cardId, card: { empresa: { escritorioId: usuario.escritorioId } } },
      select: { id: true },
    });
    if (!etapa) return notFound("Etapa");

    const resposta = await prisma.checklistResposta.upsert({
      where: { etapaId_itemId: { etapaId, itemId } },
      create: { etapaId, itemId, usuarioId: usuario.id, marcado, observacao: observacao ?? null },
      update: { marcado, usuarioId: usuario.id, observacao: observacao ?? null, respondidoEm: new Date() },
    });

    return ok(resposta);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
