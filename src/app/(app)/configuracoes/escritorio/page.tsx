export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { EscritorioForm } from "@/components/configuracoes/EscritorioForm";

const getEscritorioData = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.escritorio.findUnique({ where: { id: escritorioId } }),
      prisma.usuario.findMany({
        where: { escritorioId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
    ]),
  ["config-escritorio"],
  { revalidate: 300, tags: ["escritorio"] }
);

export default async function EscritorioPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [escritorio, usuarios] = await getEscritorioData(usuario.escritorioId);
  if (!escritorio) redirect("/login");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Escritório</h1>
        <p className="text-sm text-muted-foreground mt-1">Dados gerais</p>
      </div>
      <EscritorioForm initial={escritorio} usuarios={usuarios} canEdit={usuario.perfil === "ADMIN"} />
    </div>
  );
}
