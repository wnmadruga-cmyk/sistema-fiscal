import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  nome: z.string().min(1),
  cor: z.string().min(4),
});

export async function GET() {
  try {
    await requireAuth();
    const etiquetas = await prisma.etiqueta.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    return ok(etiquetas);
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

    const etiqueta = await prisma.etiqueta.create({ data: parsed.data });
    return created(etiqueta);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
