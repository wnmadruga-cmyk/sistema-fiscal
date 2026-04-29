export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { TiposAtividadeManager } from "@/components/configuracoes/TiposAtividadeManager";

const getTiposAtividade = unstable_cache(
  async () => prisma.tipoAtividade.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ["config-tipos-atividade"],
  { revalidate: 300, tags: ["tipos-atividade"] }
);

export default async function TiposAtividadePage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const tipos = await getTiposAtividade();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tipos de Atividade</h1>
        <p className="text-sm text-muted-foreground mt-1">Categorias de atividade econômica das empresas</p>
      </div>
      <TiposAtividadeManager initial={tipos.map((t) => ({ id: t.id, nome: t.nome, descricao: t.descricao }))} />
    </div>
  );
}
