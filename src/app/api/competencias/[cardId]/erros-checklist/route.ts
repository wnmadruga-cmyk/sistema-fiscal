import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized, notFound, badRequest } from "@/lib/api-response";
import { z } from "zod";
import { logCardEvento } from "@/lib/card-eventos";
import { EtapaCard, StatusItemQualidade } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;

    const card = await prisma.competenciaCard.findFirst({
      where: { id: cardId, empresa: { escritorioId: usuario.escritorioId } },
      select: {
        empresaId: true,
        empresa: { select: { grupos: { select: { grupoId: true } } } },
      },
    });
    if (!card) return notFound();

    const grupoIds = card.empresa.grupos.map((g) => g.grupoId);

    const erros = await prisma.erroPossivel.findMany({
      where: {
        escritorioId: usuario.escritorioId,
        ativo: true,
        OR: [
          { empresas: { some: { empresaId: card.empresaId } } },
          ...(grupoIds.length ? [{ grupos: { some: { grupoId: { in: grupoIds } } } }] : []),
        ],
      },
      select: { id: true, nome: true, descricao: true, categorias: true, peso: true },
      orderBy: [{ nome: "asc" }],
    });

    const marcados = await prisma.controleQualidade.findMany({
      where: { cardId, erroPossivelId: { not: null } },
      select: { id: true, erroPossivelId: true, statusItem: true, observacao: true, pesoSnapshot: true },
    });

    return ok({ erros, marcados });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}

const setStatusSchema = z.object({
  erroPossivelId: z.string(),
  status: z.enum(["APROVADO", "COM_ERRO", "RESSALVA", "LIMPAR"]),
  observacao: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { usuario } = await requireAuth();
    const { cardId } = await params;
    const parsed = setStatusSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Dados inválidos", parsed.error.issues);

    const { erroPossivelId, status, observacao } = parsed.data;

    if (status === "RESSALVA" && !observacao?.trim()) {
      return badRequest("Observação obrigatória para ressalva");
    }

    const card = await prisma.competenciaCard.findFirst({
      where: { id: cardId, empresa: { escritorioId: usuario.escritorioId } },
      select: { id: true },
    });
    if (!card) return notFound();

    const erro = await prisma.erroPossivel.findFirst({
      where: { id: erroPossivelId, escritorioId: usuario.escritorioId },
    });
    if (!erro) return notFound("Erro possível não encontrado");

    if (status === "LIMPAR") {
      await prisma.controleQualidade.deleteMany({
        where: { cardId, erroPossivelId: erro.id, resolvido: false },
      });
      return ok({ success: true });
    }

    const existing = await prisma.controleQualidade.findFirst({
      where: { cardId, erroPossivelId: erro.id, resolvido: false },
    });

    const data = {
      statusItem: status as StatusItemQualidade,
      observacao: observacao?.trim() || null,
      pesoSnapshot: erro.peso,
      tipoErro: erro.tipoErro,
      descricao: erro.nome,
    };

    if (existing) {
      await prisma.controleQualidade.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.controleQualidade.create({
        data: {
          ...data,
          cardId,
          etapa: EtapaCard.CONFERENCIA,
          responsavelId: usuario.id,
          erroPossivelId: erro.id,
        },
      });
    }

    await logCardEvento({
      cardId,
      usuarioId: usuario.id,
      tipo: "QUALIDADE_REGISTRADA",
      titulo: `${erro.nome}: ${status}`,
      detalhes: observacao?.trim() ? `Peso ${erro.peso} — ${observacao.trim()}` : `Peso ${erro.peso}`,
    });

    return ok({ success: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
