import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { EmpresaForm } from "@/components/empresas/EmpresaForm";

export default async function NovaEmpresaPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [regimes, tipos, prioridades, grupos, etiquetas, usuarios, formasChegada, filiais, checklists, erros] = await Promise.all([
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Nova Empresa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre uma nova empresa cliente
          </p>
        </div>
        <EmpresaForm
          regimes={regimes}
          tipos={tipos}
          prioridades={prioridades}
          filiais={filiais}
          grupos={grupos}
          etiquetas={etiquetas}
          usuarios={usuarios}
          formasChegada={formasChegada}
          checklists={checklists}
          erros={errosForForm}
        />
      </div>
    </div>
  );
}
