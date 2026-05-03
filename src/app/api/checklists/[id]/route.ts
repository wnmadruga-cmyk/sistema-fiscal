import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const ETAPAS = ["BUSCA_DOCUMENTOS", "CONFERENCIA_APURACAO", "CONFERENCIA", "TRANSMISSAO", "ENVIO", "ENVIO_ACESSORIAS", "CONCLUIDO"] as const;

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  etapa: z.enum(ETAPAS).optional(),
  escopo: z.enum(["GLOBAL", "GRUPO", "EMPRESA"]).optional(),
  empresaIds: z.array(z.string()).optional(),
  grupoIds: z.array(z.string()).optional(),
  obrigatorio: z.boolean().optional(),
  ordem: z.number().int().optional(),
  itens: z.array(z.object({
    texto: z.string().min(1),
    descricao: z.string().optional().nullable(),
    obrigatorio: z.boolean().default(false),
    ordem: z.number().int().default(0),
  })).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const current = await prisma.checklistTemplate.findFirst({
      where: {
        id,
        OR: [
          { escopo: "GLOBAL" },
          { empresas: { some: { empresa: { escritorioId: usuario.escritorioId } } } },
          { grupos: { some: { grupo: { escritorioId: usuario.escritorioId } } } },
        ],
      },
    });
    if (!current) return notFound("Checklist");

    const { itens, empresaIds, grupoIds, ...data } = parsed.data;

    if (empresaIds && empresaIds.length) {
      const found = await prisma.empresa.count({
        where: { id: { in: empresaIds }, escritorioId: usuario.escritorioId },
      });
      if (found !== empresaIds.length) return badRequest("Alguma empresa inválida");
    }
    if (grupoIds && grupoIds.length) {
      const found = await prisma.grupo.count({
        where: { id: { in: grupoIds }, escritorioId: usuario.escritorioId },
      });
      if (found !== grupoIds.length) return badRequest("Algum grupo inválido");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (itens) {
        await tx.checklistItem.deleteMany({ where: { templateId: id } });
      }
      if (empresaIds !== undefined) {
        await tx.checklistTemplateEmpresa.deleteMany({ where: { templateId: id } });
        if (empresaIds.length) {
          await tx.checklistTemplateEmpresa.createMany({
            data: empresaIds.map((empresaId) => ({ templateId: id, empresaId })),
          });
        }
      }
      if (grupoIds !== undefined) {
        await tx.checklistTemplateGrupo.deleteMany({ where: { templateId: id } });
        if (grupoIds.length) {
          await tx.checklistTemplateGrupo.createMany({
            data: grupoIds.map((grupoId) => ({ templateId: id, grupoId })),
          });
        }
      }
      return tx.checklistTemplate.update({
        where: { id },
        data: {
          ...data,
          empresaId: null,
          grupoId: null,
          ...(itens ? { itens: { create: itens } } : {}),
        },
        include: {
          itens: true,
          empresas: { include: { empresa: { select: { id: true, razaoSocial: true } } } },
          grupos: { include: { grupo: { select: { id: true, nome: true, cor: true } } } },
        },
      });
    });

    revalidateTag("checklists");
    return ok(updated);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { usuario } = await requireAuth();
    const { id } = await params;

    const current = await prisma.checklistTemplate.findFirst({
      where: {
        id,
        OR: [
          { escopo: "GLOBAL" },
          { empresas: { some: { empresa: { escritorioId: usuario.escritorioId } } } },
          { grupos: { some: { grupo: { escritorioId: usuario.escritorioId } } } },
        ],
      },
    });
    if (!current) return notFound("Checklist");

    await prisma.checklistTemplate.update({ where: { id }, data: { ativo: false } });
    revalidateTag("checklists");
    return ok({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
