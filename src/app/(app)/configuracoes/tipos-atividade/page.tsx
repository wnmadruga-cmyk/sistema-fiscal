export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TiposAtividadeManager } from "@/components/configuracoes/TiposAtividadeManager";

export default async function TiposAtividadePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const tipos = await prisma.tipoAtividade.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tipos de Atividade</h1>
        <p className="text-sm text-muted-foreground mt-1">Categorias de atividade econômica das empresas</p>
      </div>
      <TiposAtividadeManager initial={tipos.map((t) => ({ id: t.id, nome: t.nome, descricao: t.descricao }))} />
    </div>
  );
}
