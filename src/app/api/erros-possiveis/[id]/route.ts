import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, noContent, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const TIPOS = [
  "DADO_INCORRETO",
  "DADO_FALTANDO",
  "PRAZO_PERDIDO",
  "RETRABALHO",
  "COMUNICACAO",
  "SISTEMA",
  "OUTRO",
] as const;

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  tipoErro: z.enum(TIPOS).optional(),
  categorias: z.array(z.string().min(1)).optional(),
  peso: z.number().int().min(1).max(10).optional(),
  pesosCategoria: z.record(z.string(), z.number().int().min(1).max(10)).optional(),
  ativo: z.boolean().optional(),
  empresaIds: z.array(z.string()).optional(),
  grupoIds: z.array(z.string()).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const existing = await prisma.erroPossivel.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!existing) return notFound();

    const { empresaIds, grupoIds, ...data } = parsed.data;

    const erro = await prisma.$transaction(async (tx) => {
      if (empresaIds !== undefined) {
        await tx.erroPossivelEmpresa.deleteMany({ where: { erroId: id } });
        if (empresaIds.length) {
          await tx.erroPossivelEmpresa.createMany({
            data: empresaIds.map((empresaId) => ({ erroId: id, empresaId })),
          });
        }
      }
      if (grupoIds !== undefined) {
        await tx.erroPossivelGrupo.deleteMany({ where: { erroId: id } });
        if (grupoIds.length) {
          await tx.erroPossivelGrupo.createMany({
            data: grupoIds.map((grupoId) => ({ erroId: id, grupoId })),
          });
        }
      }
      return tx.erroPossivel.update({ where: { id }, data });
    });
    return ok(erro);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const existing = await prisma.erroPossivel.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
    });
    if (!existing) return notFound();
    await prisma.erroPossivel.update({ where: { id }, data: { ativo: false } });
    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
