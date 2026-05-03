import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const upsertSchema = z.object({
  tipo: z.enum([
    "ORIGEM_ESCRITORIO",
    "ORIGEM_TERCEIROS_ACESSO",
    "ORIGEM_RECEITA_PR",
    "ORIGEM_EMAIL_WHATSAPP",
    "SEM_MOVIMENTO_TEMP",
  ]),
  etapaInicial: z.enum([
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
  ]).nullable(),
  ativo: z.boolean().optional(),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();

    const regras = await prisma.regraFluxoInicial.findMany({
      where: { escritorioId: usuario.escritorioId },
      orderBy: { tipo: "asc" },
    });

    return ok(regras);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { tipo, etapaInicial, ativo } = parsed.data;

    // Se etapaInicial é null, remove a regra (ou desativa)
    if (etapaInicial === null) {
      await prisma.regraFluxoInicial.deleteMany({
        where: { escritorioId: usuario.escritorioId, tipo },
      });
      return ok({ deleted: true });
    }

    const regra = await prisma.regraFluxoInicial.upsert({
      where: { escritorioId_tipo: { escritorioId: usuario.escritorioId, tipo } },
      create: {
        escritorioId: usuario.escritorioId,
        tipo,
        etapaInicial,
        ativo: ativo ?? true,
      },
      update: {
        etapaInicial,
        ...(ativo !== undefined && { ativo }),
      },
    });

    return ok(regra);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
