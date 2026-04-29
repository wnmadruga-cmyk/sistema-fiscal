import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, noContent, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  nivel: z.number().int().min(1).max(4).optional(),
  cor: z.string().min(4).optional(),
  icone: z.string().optional().nullable(),
  diasPrazo: z.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);
    const prioridade = await prisma.prioridade.update({ where: { id }, data: parsed.data });
    return ok(prioridade);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    await prisma.prioridade.update({ where: { id }, data: { ativo: false } });
    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
