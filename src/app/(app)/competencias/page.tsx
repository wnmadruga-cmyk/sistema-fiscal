import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { CompetenciasPageContent } from "@/components/competencias/CompetenciasPageContent";
import { competenciaAtual } from "@/lib/competencia-utils";

// Dados de referência raramente mudam — cache por 5 minutos
const getDadosEstaticos = unstable_cache(
  async (escritorioId: string) => {
    const [grupos, usuarios, prioridades, empresas, etiquetas, regimes, tiposAtividade, filiais] =
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
      ]);
    return { grupos, usuarios, prioridades, empresas, etiquetas, regimes, tiposAtividade, filiais };
  },
  ["competencias-dados-estaticos"],
  { revalidate: 300 } // 5 minutos
);

export default async function CompetenciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseId: user.id },
  });
  if (!usuario) redirect("/login");

  const params = await searchParams;
  const competencia = params.competencia || competenciaAtual();

  const isPrivileged = usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE";
  const isConferente = usuario.perfil === "CONFERENTE";

  const cardVisibilityWhere = isPrivileged
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

  const [cards, { grupos, usuarios, prioridades, empresas, etiquetas, regimes, tiposAtividade, filiais }] = await Promise.all([
    prisma.competenciaCard.findMany({
      where: cardVisibilityWhere,
      include: {
        empresa: {
          include: {
            regimeTributario: { select: { id: true, nome: true, codigo: true } },
            tipoAtividade: { select: { id: true, nome: true } },
            prioridade: { select: { id: true, nome: true, cor: true } },
            filial: { select: { id: true, nome: true } },
            grupos: { include: { grupo: { select: { id: true, nome: true, cor: true, exigirConferencia: true, exigirAbrirCard: true } } } },
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
      orderBy: [
        { urgente: "desc" },
        { empresa: { razaoSocial: "asc" } },
      ],
    }),
    getDadosEstaticos(usuario.escritorioId),
  ]);

  const cardsSerialized = cards.map((c) => ({
    ...c,
    notaQualidade: c.notaQualidade != null ? Number(c.notaQualidade) : null,
  }));

  return (
    <CompetenciasPageContent
      cards={cardsSerialized}
      grupos={grupos}
      usuarios={usuarios}
      competenciaAtual={competencia}
      usuarioId={usuario.id}
      usuarioPerfil={usuario.perfil}
      prioridades={prioridades}
      empresas={empresas.map((e) => ({ id: e.id, nome: e.codigoInterno ? `${e.codigoInterno} — ${e.razaoSocial}` : e.razaoSocial, prioridadeId: e.prioridadeId }))}
      etiquetas={etiquetas}
      regimes={regimes}
      tiposAtividade={tiposAtividade}
      filiais={filiais}
    />
  );
}
