import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, notFound } from "@/lib/api-response";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;

    const notif = await prisma.notificacao.findFirst({
      where: { id, usuarioId: usuario.id },
      select: { id: true, lida: true },
    });

    if (!notif) return notFound("Notificação não encontrada");
    if (notif.lida) return ok(null);

    await prisma.notificacao.update({
      where: { id },
      data: { lida: true, lidaEm: new Date() },
    });

    return ok(null);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
