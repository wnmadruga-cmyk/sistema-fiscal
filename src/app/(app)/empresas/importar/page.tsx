import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { ImportEmpresasView } from "@/components/empresas/ImportEmpresasView";

export default async function ImportarEmpresasPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  return <ImportEmpresasView />;
}
