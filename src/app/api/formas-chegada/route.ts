import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, created } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({ nome: z.string().min(1) });

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const formas = await prisma.formaChegadaConfig.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      orderBy: { nome: "asc" },
    });
    return ok(formas);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);
    const forma = await prisma.formaChegadaConfig.create({
      data: { nome: parsed.data.nome, escritorioId: usuario.escritorioId },
    });
    return created(forma);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
