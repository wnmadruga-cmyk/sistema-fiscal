export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FiliaisManager } from "@/components/configuracoes/FiliaisManager";

export default async function FiliaisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const filiais = await prisma.filial.findMany({
    where: { escritorioId: usuario.escritorioId, ativo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Escritórios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre os escritórios/filiais para vincular às empresas
        </p>
      </div>
      <FiliaisManager initial={filiais.map((f) => ({ id: f.id, nome: f.nome }))} />
    </div>
  );
}
