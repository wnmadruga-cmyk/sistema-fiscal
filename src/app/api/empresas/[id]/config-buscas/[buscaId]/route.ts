import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  login: z.string().min(1).optional(),
  senha: z.string().optional(),
  observacao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

async function ensure(id: string, buscaId: string, escritorioId: string) {
  return prisma.configBusca.findFirst({
    where: { id: buscaId, empresaId: id, empresa: { escritorioId } },
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; buscaId: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id, buscaId } = await params;
    const current = await ensure(id, buscaId, usuario.escritorioId);
    if (!current) return notFound();

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { senha, ...rest } = parsed.data;
    const busca = await prisma.configBusca.update({
      where: { id: buscaId },
      data: { ...rest, ...(senha ? { senhaHash: senha } : {}) },
    });
    return ok(busca);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; buscaId: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id, buscaId } = await params;
    const current = await ensure(id, buscaId, usuario.escritorioId);
    if (!current) return notFound();
    await prisma.configBusca.update({ where: { id: buscaId }, data: { ativo: false } });
    return ok({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
