import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { EmpresasPageContent } from "@/components/empresas/EmpresasPageContent";

// Dropdowns raramente mudam — cache de 5 minutos
const getEmpresasDropdowns = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.grupo.findMany({ where: { escritorioId, ativo: true }, orderBy: { nome: "asc" } }),
      prisma.regimeTributario.findMany({ where: { ativo: true } }),
    ]),
  ["empresas-dropdowns"],
  { revalidate: 300, tags: ["grupos"] }
);

export default async function EmpresasPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [grupos, regimes] = await getEmpresasDropdowns(usuario.escritorioId);

  return <EmpresasPageContent grupos={grupos} regimes={regimes} />;
}
