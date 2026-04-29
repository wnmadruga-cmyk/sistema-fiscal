export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { FormasChegadaManager } from "@/components/configuracoes/FormasChegadaManager";

const getFormasChegada = unstable_cache(
  async (escritorioId: string) =>
    prisma.formaChegadaConfig.findMany({ where: { escritorioId, ativo: true }, orderBy: { nome: "asc" } }),
  ["config-formas-chegada"],
  { revalidate: 300, tags: ["formas-chegada"] }
);

export default async function FormasChegadaPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const formas = await getFormasChegada(usuario.escritorioId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Formas de Chegada</h1>
        <p className="text-sm text-muted-foreground mt-1">Como os documentos chegam até o escritório (Email, Acesso ao sistema, etc.)</p>
      </div>
      <FormasChegadaManager initial={formas} />
    </div>
  );
}
