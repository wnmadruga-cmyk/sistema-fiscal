export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { FiliaisManager } from "@/components/configuracoes/FiliaisManager";

const getFiliais = unstable_cache(
  async (escritorioId: string) =>
    prisma.filial.findMany({ where: { escritorioId, ativo: true }, orderBy: { nome: "asc" } }),
  ["config-filiais"],
  { revalidate: 300, tags: ["filiais"] }
);

export default async function FiliaisPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const filiais = await getFiliais(usuario.escritorioId);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Escritórios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre os escritórios/filiais para vincular às empresas
        </p>
      </div>
      <FiliaisManager initial={filiais.map((f) => ({ id: f.id, nome: f.nome }))} />
    </div>
  );
}
