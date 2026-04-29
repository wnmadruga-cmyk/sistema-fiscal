export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EtiquetasManager } from "@/components/configuracoes/EtiquetasManager";

export default async function EtiquetasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const etiquetas = await prisma.etiqueta.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });

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
