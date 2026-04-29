export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { EtiquetasManager } from "@/components/configuracoes/EtiquetasManager";

const getEtiquetas = unstable_cache(
  async () => prisma.etiqueta.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ["config-etiquetas"],
  { revalidate: 300, tags: ["etiquetas"] }
);

export default async function EtiquetasPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const etiquetas = await getEtiquetas();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Etiquetas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tags coloridas para empresas e cards
        </p>
      </div>
      <EtiquetasManager initial={etiquetas} />
    </div>
  );
}
