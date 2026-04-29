import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  ativo: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const current = await prisma.formaChegadaConfig.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!current) return notFound();
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);
    const forma = await prisma.formaChegadaConfig.update({ where: { id }, data: parsed.data });
    return ok(forma);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const current = await prisma.formaChegadaConfig.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!current) return notFound();
    await prisma.formaChegadaConfig.update({ where: { id }, data: { ativo: false } });
    return ok({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
