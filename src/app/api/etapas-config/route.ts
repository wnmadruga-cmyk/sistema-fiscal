import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";

const ETAPAS = [
  "BUSCA_DOCUMENTOS",
  "CONFERENCIA_APURACAO",
  "CONFERENCIA",
  "TRANSMISSAO",
  "ENVIO",
  "ENVIO_ACESSORIAS",
  "CONCLUIDO",
] as const;

const upsertSchema = z.object({
  etapa: z.enum(ETAPAS),
  nome: z.string().min(1),
  ordem: z.number().int().optional(),
  ativa: z.boolean().optional(),
  manualPdfUrl: z.string().optional().nullable(),
  manualVideoUrl: z.string().optional().nullable(),
  manualObservacao: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const etapas = await prisma.etapaConfig.findMany({
      where: { escritorioId: usuario.escritorioId },
      orderBy: { ordem: "asc" },
    });
    return ok(etapas);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const parsed = upsertSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const etapa = await prisma.etapaConfig.upsert({
      where: {
        escritorioId_etapa: { escritorioId: usuario.escritorioId, etapa: parsed.data.etapa },
      },
      create: { ...parsed.data, escritorioId: usuario.escritorioId },
      update: parsed.data,
    });
    return created(etapa);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
