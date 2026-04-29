import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CompetenciasPageContent } from "@/components/competencias/CompetenciasPageContent";
import { competenciaAtual } from "@/lib/competencia-utils";

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

  const [cards, grupos, usuarios, prioridades, empresas, etiquetas, regimes, tiposAtividade, filiais] = await Promise.all([
    prisma.competenciaCard.findMany({
      where: cardVisibilityWhere,
      include: {
        empresa: {
          include: {
            regimeTributario: true,
            tipoAtividade: true,
            prioridade: true,
            filial: { select: { id: true, nome: true } },
            grupos: { include: { grupo: true } },
            respElaboracao: { select: { id: true, nome: true, avatar: true } },
            respConferencia: { select: { id: true, nome: true, avatar: true } },
          },
        },
        prioridade: true,
        responsavel: { select: { id: true, nome: true, avatar: true } },
        etapas: true,
        etiquetas: { include: { etiqueta: true } },
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
    prisma.grupo.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true, avatar: true },
    }),
    prisma.prioridade.findMany({
      where: { ativo: true },
      orderBy: { nivel: "asc" },
      select: { id: true, nome: true, cor: true, diasPrazo: true },
    }),
    prisma.empresa.findMany({
      where: { escritorioId: usuario.escritorioId, ativa: true },
      select: { id: true, razaoSocial: true, codigoInterno: true, prioridadeId: true },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.etiqueta.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.regimeTributario.findMany({ orderBy: { nome: "asc" } }),
    prisma.tipoAtividade.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.filial.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
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
