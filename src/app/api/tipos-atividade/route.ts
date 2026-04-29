import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, created } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth();
    const tipos = await prisma.tipoAtividade.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    return ok(tipos);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);
    const tipo = await prisma.tipoAtividade.create({
      data: { nome: parsed.data.nome, descricao: parsed.data.descricao ?? null },
    });
    return created(tipo);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
