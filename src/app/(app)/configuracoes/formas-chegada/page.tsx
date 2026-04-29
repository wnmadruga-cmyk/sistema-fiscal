export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FormasChegadaManager } from "@/components/configuracoes/FormasChegadaManager";

export default async function FormasChegadaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const formas = await prisma.formaChegadaConfig.findMany({
    where: { escritorioId: usuario.escritorioId, ativo: true },
    orderBy: { nome: "asc" },
  });

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
