import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { usuario } = await requireAuth();

    const notificacoes = await prisma.notificacao.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok(notificacoes, 200, {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=30",
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const { action } = await request.json();

    if (action === "marcar-todas-lidas") {
      await prisma.notificacao.updateMany({
        where: { usuarioId: usuario.id, lida: false },
        data: { lida: true, lidaEm: new Date() },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
