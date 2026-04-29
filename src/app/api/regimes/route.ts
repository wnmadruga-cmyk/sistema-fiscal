import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";

export async function GET() {
  try {
    await requireAuth();
    const regimes = await prisma.regimeTributario.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    return ok(regimes);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
