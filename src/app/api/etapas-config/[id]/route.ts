import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, noContent, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  ordem: z.number().int().optional(),
  ativa: z.boolean().optional(),
  manualPdfUrl: z.string().optional().nullable(),
  manualVideoUrl: z.string().optional().nullable(),
  manualObservacao: z.string().optional().nullable(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const existing = await prisma.etapaConfig.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!existing) return notFound();

    const etapa = await prisma.etapaConfig.update({ where: { id }, data: parsed.data });
    return ok(etapa);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const existing = await prisma.etapaConfig.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!existing) return notFound();
    await prisma.etapaConfig.delete({ where: { id } });
    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
