import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, noContent, serverError, unauthorized, badRequest, notFound } from "@/lib/api-response";
import { z } from "zod";

const etapaCardEnum = z.enum([
  "BUSCA_DOCUMENTOS",
  "BAIXAR_NOTAS_ACESSO",
  "PEDIR_NOTAS_RECEITA_PR",
  "POSSIVEIS_SEM_MOVIMENTO",
  "CONFERENCIA_APURACAO",
  "CONFERENCIA",
  "TRANSMISSAO",
  "ENVIO",
  "ENVIO_ACESSORIAS",
  "IMPRESSAO_PROTOCOLO",
  "CONCLUIDO",
]);

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  diasPrazo: z.number().int().min(0).nullable().optional(),
  sobrepoePrioridade: z.boolean().optional(),
  exigirAbrirCard: z.boolean().optional(),
  exigirConferencia: z.boolean().optional(),
  etapaInicial: etapaCardEnum.nullable().optional(),
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

      // Se o grupo foi inativado, remove todos os vínculos com empresas
      if (data.ativo === false) {
        await tx.empresaGrupo.deleteMany({ where: { grupoId: id } });
      } else if (empresaIds !== undefined) {
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

    await prisma.$transaction([
      // Remove todos os vínculos empresa-grupo antes de inativar
      prisma.empresaGrupo.deleteMany({ where: { grupoId: id } }),
      prisma.grupo.update({ where: { id }, data: { ativo: false } }),
    ]);

    return noContent();
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
