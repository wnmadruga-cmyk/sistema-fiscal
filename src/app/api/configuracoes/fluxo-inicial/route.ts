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
    "CONFERENCIA_APURACAO",
    "CONFERENCIA",
    "TRANSMISSAO",
    "ENVIO",
    "ENVIO_ACESSORIAS",
    "IMPRESSAO_PROTOCOLO",
    "CONCLUIDO",
  ]).nullable(),
  etiquetaId: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();

    const [regras, etiquetas] = await Promise.all([
      prisma.regraFluxoInicial.findMany({
        where: { escritorioId: usuario.escritorioId },
        orderBy: { tipo: "asc" },
      }),
      prisma.etiqueta.findMany({
        where: { ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, cor: true },
      }),
    ]);

    return ok({ regras, etiquetas });
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

    const { tipo, etapaInicial, etiquetaId, ativo } = parsed.data;

    // Se etapaInicial é null, remove a regra
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
        etiquetaId: etiquetaId ?? null,
        ativo: ativo ?? true,
      },
      update: {
        etapaInicial,
        etiquetaId: etiquetaId ?? null,
        ...(ativo !== undefined && { ativo }),
      },
    });

    return ok(regra);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
