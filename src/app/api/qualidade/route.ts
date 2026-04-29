import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { EtapaCard, TipoErro } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const { searchParams } = new URL(request.url);

    const etapa = searchParams.get("etapa") as EtapaCard | null;
    const tipo = searchParams.get("tipo") as TipoErro | null;
    const responsavelId = searchParams.get("responsavelId");
    const resolvido = searchParams.get("resolvido");
    const periodo = searchParams.get("periodo");

    const [erros, totalPorTipo, totalPorEtapa, totalPorResponsavel] =
      await Promise.all([
        prisma.controleQualidade.findMany({
          where: {
            card: { empresa: { escritorioId: usuario.escritorioId } },
            ...(etapa && { etapa }),
            ...(tipo && { tipoErro: tipo }),
            ...(responsavelId && { responsavelId }),
            ...(resolvido !== null && { resolvido: resolvido === "true" }),
            ...(periodo && {
              card: {
                empresa: { escritorioId: usuario.escritorioId },
                competencia: periodo,
              },
            }),
          },
          include: {
            card: {
              include: {
                empresa: { select: { razaoSocial: true } },
              },
            },
            responsavel: { select: { id: true, nome: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),

        prisma.controleQualidade.groupBy({
          by: ["tipoErro"],
          where: {
            card: { empresa: { escritorioId: usuario.escritorioId } },
          },
          _count: { tipoErro: true },
        }),

        prisma.controleQualidade.groupBy({
          by: ["etapa"],
          where: {
            card: { empresa: { escritorioId: usuario.escritorioId } },
          },
          _count: { etapa: true },
        }),

        prisma.controleQualidade.groupBy({
          by: ["responsavelId"],
          where: {
            card: { empresa: { escritorioId: usuario.escritorioId } },
          },
          _count: { responsavelId: true },
        }),
      ]);

    return ok({ erros, totalPorTipo, totalPorEtapa, totalPorResponsavel });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
