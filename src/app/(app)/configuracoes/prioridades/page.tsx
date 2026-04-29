export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PrioridadesManager } from "@/components/configuracoes/PrioridadesManager";

export default async function PrioridadesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const prioridades = await prisma.prioridade.findMany({
    where: { ativo: true },
    orderBy: { nivel: "asc" },
  });

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
