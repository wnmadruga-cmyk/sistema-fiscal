import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound, created } from "@/lib/api-response";
import { z } from "zod";

const createSchema = z.object({
  nome: z.string().min(1),
  url: z.string().min(1),
  login: z.string().min(1),
  senha: z.string().min(1),
  observacao: z.string().optional().nullable(),
});

async function ensureEmpresa(id: string, escritorioId: string) {
  return prisma.empresa.findFirst({ where: { id, escritorioId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const empresa = await ensureEmpresa(id, usuario.escritorioId);
    if (!empresa) return notFound("Empresa");
    const buscas = await prisma.configBusca.findMany({
      where: { empresaId: id, ativo: true },
      orderBy: { nome: "asc" },
    });
    return ok(buscas);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const empresa = await ensureEmpresa(id, usuario.escritorioId);
    if (!empresa) return notFound("Empresa");

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { senha, ...rest } = parsed.data;
    const busca = await prisma.configBusca.create({
      data: { ...rest, empresaId: id, senhaHash: senha, observacao: rest.observacao ?? null },
    });
    return created(busca);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
