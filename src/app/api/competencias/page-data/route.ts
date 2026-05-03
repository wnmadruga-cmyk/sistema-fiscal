import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { unstable_cache } from "next/cache";

// Dados de referência com cache de 5 minutos por escritório
const getDadosEstaticos = unstable_cache(
  async (escritorioId: string) => {
    const [grupos, usuarios, prioridades, empresas, etiquetas, regimes, tiposAtividade, filiais, etapasConfig] =
      await Promise.all([
        prisma.grupo.findMany({
          where: { escritorioId, ativo: true },
          orderBy: { nome: "asc" },
        }),
        prisma.usuario.findMany({
          where: { escritorioId, ativo: true },
          select: { id: true, nome: true, avatar: true },
        }),
        prisma.prioridade.findMany({
          where: { ativo: true },
          orderBy: { nivel: "asc" },
          select: { id: true, nome: true, cor: true, diasPrazo: true },
        }),
        prisma.empresa.findMany({
          where: { escritorioId, ativa: true },
          select: { id: true, razaoSocial: true, codigoInterno: true, prioridadeId: true },
          orderBy: { razaoSocial: "asc" },
        }),
        prisma.etiqueta.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
        prisma.regimeTributario.findMany({ orderBy: { nome: "asc" } }),
        prisma.tipoAtividade.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
        prisma.filial.findMany({
          where: { escritorioId, ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        }),
        prisma.etapaConfig.findMany({
          where: { escritorioId },
          select: { etapa: true, diasPrazo: true },
        }),
      ]);
    return { grupos, usuarios, prioridades, empresas, etiquetas, regimes, tiposAtividade, filiais, etapasConfig };
  },
  ["page-data-estaticos"],
  { revalidate: 300 }
);

export async function GET(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const competencia = searchParams.get("competencia");
    if (!competencia) return ok({ cards: [], metadata: await getDadosEstaticos(usuario.escritorioId) });

    const isPrivileged = usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE";
    const isConferente = usuario.perfil === "CONFERENTE";

    const cardWhere = isPrivileged
      ? { empresa: { escritorioId: usuario.escritorioId }, competencia }
      : isConferente
      ? {
          empresa: { escritorioId: usuario.escritorioId },
          competencia,
          etapaAtual: "CONFERENCIA" as const,
          OR: [
            { empresa: { respConferenciaId: usuario.id } },
            { conferenciaResponsavelId: usuario.id },
          ],
        }
      : {
          empresa: { escritorioId: usuario.escritorioId },
          competencia,
          OR: [
            { empresa: { respBuscaId: usuario.id } },
            { empresa: { respElaboracaoId: usuario.id } },
            { responsavelId: usuario.id },
          ],
        };

    const [cards, metadata] = await Promise.all([
      prisma.competenciaCard.findMany({
        where: cardWhere,
        include: {
          empresa: {
            include: {
              regimeTributario: { select: { id: true, nome: true, codigo: true } },
              tipoAtividade: { select: { id: true, nome: true } },
              prioridade: { select: { id: true, nome: true, cor: true } },
              filial: { select: { id: true, nome: true } },
              grupos: {
                include: {
                  grupo: {
                    select: { id: true, nome: true, cor: true, exigirConferencia: true, exigirAbrirCard: true },
                  },
                },
              },
              respElaboracao: { select: { id: true, nome: true, avatar: true } },
              respConferencia: { select: { id: true, nome: true, avatar: true } },
            },
          },
          prioridade: { select: { id: true, nome: true, cor: true } },
          responsavel: { select: { id: true, nome: true, avatar: true } },
          etapas: { select: { id: true, etapa: true, status: true, resultadoConferencia: true, ressalvaResolvida: true } },
          etiquetas: { include: { etiqueta: { select: { id: true, nome: true, cor: true } } } },
          _count: {
            select: {
              comentarios: true,
              qualidade: { where: { resolvido: false } },
            },
          },
        },
        orderBy: [{ urgente: "desc" }, { empresa: { razaoSocial: "asc" } }],
      }),
      getDadosEstaticos(usuario.escritorioId),
    ]);

    const cardsSerialized = cards.map((c) => ({
      ...c,
      notaQualidade: c.notaQualidade != null ? Number(c.notaQualidade) : null,
    }));

    return ok({
      cards: cardsSerialized,
      metadata,
      usuarioId: usuario.id,
      usuarioPerfil: usuario.perfil,
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
