import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, created } from "@/lib/api-response";
import { z } from "zod";

const ETAPAS = ["BUSCA_DOCUMENTOS", "CONFERENCIA_APURACAO", "CONFERENCIA", "TRANSMISSAO", "ENVIO", "ENVIO_ACESSORIAS", "CONCLUIDO"] as const;

const createSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  etapa: z.enum(ETAPAS),
  escopo: z.enum(["GLOBAL", "GRUPO", "EMPRESA"]).default("GLOBAL"),
  empresaIds: z.array(z.string()).default([]),
  grupoIds: z.array(z.string()).default([]),
  obrigatorio: z.boolean().default(false),
  ordem: z.number().int().default(0),
  itens: z.array(z.object({
    texto: z.string().min(1),
    descricao: z.string().optional().nullable(),
    obrigatorio: z.boolean().default(false),
    ordem: z.number().int().default(0),
  })).default([]),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const templates = await prisma.checklistTemplate.findMany({
      where: {
        ativo: true,
        OR: [
          { escopo: "GLOBAL" },
          { empresas: { some: { empresa: { escritorioId: usuario.escritorioId } } } },
          { grupos: { some: { grupo: { escritorioId: usuario.escritorioId } } } },
        ],
      },
      include: {
        itens: { where: { ativo: true }, orderBy: { ordem: "asc" } },
        empresas: { include: { empresa: { select: { id: true, razaoSocial: true, codigoInterno: true } } } },
        grupos: { include: { grupo: { select: { id: true, nome: true, cor: true } } } },
      },
      orderBy: [{ etapa: "asc" }, { ordem: "asc" }],
    });
    return ok(templates);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { itens, empresaIds, grupoIds, ...data } = parsed.data;

    if (empresaIds.length) {
      const found = await prisma.empresa.count({
        where: { id: { in: empresaIds }, escritorioId: usuario.escritorioId },
      });
      if (found !== empresaIds.length) return badRequest("Alguma empresa inválida");
    }
    if (grupoIds.length) {
      const found = await prisma.grupo.count({
        where: { id: { in: grupoIds }, escritorioId: usuario.escritorioId },
      });
      if (found !== grupoIds.length) return badRequest("Algum grupo inválido");
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        ...data,
        empresaId: null,
        grupoId: null,
        itens: { create: itens },
        empresas: { create: empresaIds.map((empresaId) => ({ empresaId })) },
        grupos: { create: grupoIds.map((grupoId) => ({ grupoId })) },
      },
      include: {
        itens: true,
        empresas: { include: { empresa: { select: { id: true, razaoSocial: true } } } },
        grupos: { include: { grupo: { select: { id: true, nome: true, cor: true } } } },
      },
    });
    return created(template);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
