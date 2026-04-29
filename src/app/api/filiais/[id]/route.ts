import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, noContent, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({ nome: z.string().min(1).optional(), ativo: z.boolean().optional() });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);
    const existing = await prisma.filial.findFirst({ where: { id, escritorioId: usuario.escritorioId } });
    if (!existing) return unauthorized();
    const filial = await prisma.filial.update({ where: { id }, data: parsed.data });
    return ok(filial);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const existing = await prisma.filial.findFirst({ where: { id, escritorioId: usuario.escritorioId } });
    if (!existing) return unauthorized();
    await prisma.filial.update({ where: { id }, data: { ativo: false } });
    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
