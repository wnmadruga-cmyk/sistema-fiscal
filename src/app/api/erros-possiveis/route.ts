import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
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

const createSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  tipoErro: z.enum(TIPOS).default("OUTRO"),
  categorias: z.array(z.string().min(1)).optional().default([]),
  peso: z.number().int().min(1).max(10).default(1),
  pesosCategoria: z.record(z.string(), z.number().int().min(1).max(10)).optional().default({}),
  empresaIds: z.array(z.string()).optional(),
  grupoIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const erros = await prisma.erroPossivel.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      include: {
        empresas: { include: { empresa: { select: { id: true, razaoSocial: true } } } },
        grupos: { include: { grupo: { select: { id: true, nome: true, cor: true } } } },
      },
      orderBy: { nome: "asc" },
    });
    return ok(erros);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { empresaIds = [], grupoIds = [], ...data } = parsed.data;

    const erro = await prisma.erroPossivel.create({
      data: {
        ...data,
        escritorioId: usuario.escritorioId,
        empresas: { create: empresaIds.map((empresaId) => ({ empresaId })) },
        grupos: { create: grupoIds.map((grupoId) => ({ grupoId })) },
      },
    });
    return created(erro);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
