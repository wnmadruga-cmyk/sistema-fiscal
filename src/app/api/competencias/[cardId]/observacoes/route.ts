import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";
import { logCardEvento } from "@/lib/card-eventos";

const createSchema = z.object({
  texto: z.string().min(1),
  persistente: z.boolean().default(true),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    await requireAuth();
    const { cardId } = await params;

    const observacoes = await prisma.observacao.findMany({
      where: { cardId, ativa: true },
      include: {
        autor: { select: { id: true, nome: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(observacoes);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const card = await prisma.competenciaCard.findUnique({
      where: { id: cardId },
    });
    if (!card) return badRequest("Card não encontrado");

    const observacao = await prisma.observacao.create({
      data: {
        ...parsed.data,
        cardId,
        empresaId: card.empresaId,
        autorId: usuario.id,
      },
      include: {
        autor: { select: { id: true, nome: true, avatar: true } },
      },
    });

    await logCardEvento({
      cardId,
      usuarioId: usuario.id,
      tipo: "OBSERVACAO",
      titulo: "Nova observação",
      detalhes: parsed.data.texto.substring(0, 200),
    });

    return created(observacao);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
