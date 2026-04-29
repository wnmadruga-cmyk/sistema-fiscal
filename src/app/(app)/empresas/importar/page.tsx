import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ImportEmpresasView } from "@/components/empresas/ImportEmpresasView";

export default async function ImportarEmpresasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  return <ImportEmpresasView />;
}
