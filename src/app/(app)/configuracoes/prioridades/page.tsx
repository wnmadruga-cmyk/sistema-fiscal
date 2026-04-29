export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { PrioridadesManager } from "@/components/configuracoes/PrioridadesManager";

const getPrioridades = unstable_cache(
  async () => prisma.prioridade.findMany({ where: { ativo: true }, orderBy: { nivel: "asc" } }),
  ["config-prioridades"],
  { revalidate: 300, tags: ["prioridades"] }
);

export default async function PrioridadesPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const prioridades = await getPrioridades();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Prioridades</h1>
        <p className="text-sm text-muted-foreground mt-1">Níveis de urgência dos cards</p>
      </div>
      <PrioridadesManager initial={prioridades} />
    </div>
  );
}
