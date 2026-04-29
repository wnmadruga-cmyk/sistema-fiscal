export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ErrosManager } from "@/components/configuracoes/ErrosManager";

export default async function ErrosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const [erros, empresas, grupos] = await Promise.all([
    prisma.erroPossivel.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      include: {
        empresas: { select: { empresaId: true } },
        grupos: { select: { grupoId: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.empresa.findMany({
      where: { escritorioId: usuario.escritorioId, ativa: true },
      select: { id: true, razaoSocial: true, codigoInterno: true },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.grupo.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true, cor: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const errosForUI = erros.map((e) => ({
    id: e.id,
    nome: e.nome,
    descricao: e.descricao,
    categorias: e.categorias,
    peso: e.peso,
    pesosCategoria: (e.pesosCategoria as Record<string, number>) ?? {},
    empresaIds: e.empresas.map((x) => x.empresaId),
    grupoIds: e.grupos.map((x) => x.grupoId),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Erros Possíveis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catálogo de erros — vincule a grupos ou empresas específicas
        </p>
      </div>
      <ErrosManager initial={errosForUI} empresas={empresas} grupos={grupos} />
    </div>
  );
}
