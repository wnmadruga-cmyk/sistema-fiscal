export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EscritorioForm } from "@/components/configuracoes/EscritorioForm";

export default async function EscritorioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { supabaseId: user.id } });
  if (!usuario) redirect("/login");

  const [escritorio, usuarios] = await Promise.all([
    prisma.escritorio.findUnique({ where: { id: usuario.escritorioId } }),
    prisma.usuario.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);
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
