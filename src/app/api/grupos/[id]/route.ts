import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, noContent, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  diasPrazo: z.number().int().min(0).nullable().optional(),
  sobrepoePrioridade: z.boolean().optional(),
  exigirAbrirCard: z.boolean().optional(),
  exigirConferencia: z.boolean().optional(),
  ativo: z.boolean().optional(),
  empresaIds: z.array(z.string()).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const existing = await prisma.grupo.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!existing) return notFound();

    const { empresaIds, ...data } = parsed.data;

    const grupo = await prisma.$transaction(async (tx) => {
      const updated = Object.keys(data).length > 0
        ? await tx.grupo.update({ where: { id }, data })
        : await tx.grupo.findUniqueOrThrow({ where: { id } });

      if (empresaIds) {
        const empresas = await tx.empresa.findMany({
          where: { id: { in: empresaIds }, escritorioId: usuario.escritorioId },
          select: { id: true },
        });
        const valid = empresas.map((e) => e.id);
        await tx.empresaGrupo.deleteMany({ where: { grupoId: id } });
        if (valid.length > 0) {
          await tx.empresaGrupo.createMany({
            data: valid.map((empresaId) => ({ grupoId: id, empresaId })),
          });
        }
      }
      return updated;
    });

    return ok(grupo);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const existing = await prisma.grupo.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!existing) return notFound();
    await prisma.grupo.update({ where: { id }, data: { ativo: false } });
    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
