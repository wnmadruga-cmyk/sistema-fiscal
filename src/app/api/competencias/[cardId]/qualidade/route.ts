import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError, unauthorized, badRequest } from "@/lib/api-response";
import { z } from "zod";
import { EtapaCard, TipoErro } from "@prisma/client";

const createSchema = z.object({
  etapa: z.nativeEnum(EtapaCard),
  responsavelId: z.string(),
  tipoErro: z.nativeEnum(TipoErro),
  descricao: z.string().min(1),
  impacto: z.string().optional(),
  correcao: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    await requireAuth();
    const { cardId } = await params;

    const erros = await prisma.controleQualidade.findMany({
      where: { cardId },
      include: {
        responsavel: { select: { id: true, nome: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(erros);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const erro = await prisma.controleQualidade.create({
      data: { ...parsed.data, cardId },
      include: {
        responsavel: { select: { id: true, nome: true, avatar: true } },
      },
    });

    const { logCardEvento } = await import("@/lib/card-eventos");
    await logCardEvento({
      cardId,
      usuarioId: usuario.id,
      tipo: "QUALIDADE_REGISTRADA",
      titulo: "Erro de qualidade registrado",
      detalhes: parsed.data.descricao?.substring(0, 200),
    });

    return created(erro);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
