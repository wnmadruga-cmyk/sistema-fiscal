import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  nome: z.string().min(1),
  nivel: z.number().int().min(1).max(4),
  cor: z.string().min(4),
  icone: z.string().optional(),
  diasPrazo: z.number().int().min(0).default(0),
});

export async function GET() {
  try {
    await requireAuth();
    const prioridades = await prisma.prioridade.findMany({
      where: { ativo: true },
      orderBy: { nivel: "asc" },
    });
    return ok(prioridades);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const prioridade = await prisma.prioridade.create({ data: parsed.data });
    return created(prioridade);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
