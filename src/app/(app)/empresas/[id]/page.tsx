export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { EmpresaForm } from "@/components/empresas/EmpresaForm";

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseId: user.id },
  });
  if (!usuario) redirect("/login");

  const [empresa, regimes, tipos, prioridades, grupos, etiquetas, usuarios, formasChegada, filiais, checklists, erros] = await Promise.all([
    prisma.empresa.findFirst({
      where: { id, escritorioId: usuario.escritorioId },
      include: {
        grupos: { select: { grupoId: true } },
        etiquetas: { select: { etiquetaId: true } },
        configDocumentos: true,
        checklistsVinculados: { select: { templateId: true } },
        checklistsExcluidos: { select: { templateId: true } },
        errosVinculados: { select: { erroId: true } },
      },
    }),
    prisma.regimeTributario.findMany({ where: { ativo: true } }),
    prisma.tipoAtividade.findMany({ where: { ativo: true } }),
    prisma.prioridade.findMany({ where: { ativo: true }, orderBy: { nivel: "asc" } }),
    prisma.grupo.findMany({ where: { escritorioId: usuario.escritorioId, ativo: true } }),
    prisma.etiqueta.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.usuario.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true, avatar: true },
    }),
    prisma.formaChegadaConfig.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.filial.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.checklistTemplate.findMany({
      where: {
        ativo: true,
        OR: [
          { escopo: "GLOBAL" },
          { escopo: "EMPRESA" },
        ],
      },
      select: { id: true, nome: true, etapa: true, escopo: true },
      orderBy: [{ etapa: "asc" }, { nome: "asc" }],
    }),
    prisma.erroPossivel.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true, categorias: true, peso: true, pesosCategoria: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!empresa) notFound();

  const empresaForForm = {
    ...empresa,
    grupoIds: empresa.grupos.map((g) => g.grupoId),
    etiquetaIds: empresa.etiquetas.map((e) => e.etiquetaId),
    checklistTemplateIds: empresa.checklistsVinculados.map((c) => c.templateId),
    checklistExcluidosIds: empresa.checklistsExcluidos.map((c) => c.templateId),
    erroPossivelIds: empresa.errosVinculados.map((e) => e.erroId),
  };

  const errosForForm = erros.map((e) => ({
    id: e.id,
    nome: e.nome,
    categorias: e.categorias,
    peso: e.peso,
    pesosCategoria: (e.pesosCategoria as Record<string, number>) ?? {},
  }));

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Editar Empresa</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {empresa.razaoSocial}
            </p>
          </div>
          <a href={`/empresas/${empresa.id}/qualidade`} className="text-sm text-primary hover:underline">
            Histórico de qualidade →
          </a>
        </div>
        <EmpresaForm
          empresa={empresaForForm}
          regimes={regimes}
          tipos={tipos}
          prioridades={prioridades}
          filiais={filiais}
          grupos={grupos}
          etiquetas={etiquetas}
          usuarios={usuarios}
          formasChegada={formasChegada}
          configDocumentos={empresa.configDocumentos}
          checklists={checklists}
          erros={errosForForm}
          canDelete={usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE"}
        />
      </div>
    </div>
  );
}
