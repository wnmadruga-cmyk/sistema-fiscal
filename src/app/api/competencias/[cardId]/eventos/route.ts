import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;

    const card = await prisma.competenciaCard.findFirst({
      where: { id: cardId, empresa: { escritorioId: usuario.escritorioId } },
      select: { id: true },
    });
    if (!card) return ok([]);

    const eventos = await prisma.cardEvento.findMany({
      where: { cardId },
      include: { usuario: { select: { id: true, nome: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return ok(eventos, 200, {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
