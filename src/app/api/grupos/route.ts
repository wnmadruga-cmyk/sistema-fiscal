import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
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

const createSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  cor: z.string().optional(),
  diasPrazo: z.number().int().min(0).nullable().optional(),
  sobrepoePrioridade: z.boolean().optional(),
  exigirAbrirCard: z.boolean().optional(),
  exigirConferencia: z.boolean().optional(),
  etapaInicial: etapaCardEnum.nullable().optional(),
  empresaIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();

    const grupos = await prisma.grupo.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      orderBy: { nome: "asc" },
    });

    return ok(grupos);
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

    const { empresaIds, ...data } = parsed.data;

    const grupo = await prisma.$transaction(async (tx) => {
      const g = await tx.grupo.create({ data: { ...data, escritorioId: usuario.escritorioId } });
      if (empresaIds && empresaIds.length > 0) {
        const empresas = await tx.empresa.findMany({
          where: { id: { in: empresaIds }, escritorioId: usuario.escritorioId },
          select: { id: true },
        });
        if (empresas.length > 0) {
          await tx.empresaGrupo.createMany({
            data: empresas.map((e) => ({ grupoId: g.id, empresaId: e.id })),
          });
        }
      }
      return g;
    });

    return created(grupo);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
