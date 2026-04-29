import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EmpresasPageContent } from "@/components/empresas/EmpresasPageContent";

export default async function EmpresasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseId: user.id },
  });
  if (!usuario) redirect("/login");

  const isPrivileged = usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE";
  const empresaWhere = isPrivileged
    ? { escritorioId: usuario.escritorioId, ativa: true }
    : usuario.perfil === "CONFERENTE"
    ? { escritorioId: usuario.escritorioId, ativa: true, respConferenciaId: usuario.id }
    : { escritorioId: usuario.escritorioId, ativa: true, OR: [{ respBuscaId: usuario.id }, { respElaboracaoId: usuario.id }] };

  const [empresas, grupos, regimes] = await Promise.all([
    prisma.empresa.findMany({
      where: empresaWhere,
      include: {
        regimeTributario: true,
        tipoAtividade: true,
        prioridade: true,
        respBusca: { select: { id: true, nome: true, avatar: true } },
        respElaboracao: { select: { id: true, nome: true, avatar: true } },
        grupos: { include: { grupo: true } },
        etiquetas: { include: { etiqueta: true } },
      },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.grupo.findMany({
      where: { escritorioId: usuario.escritorioId, ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.regimeTributario.findMany({ where: { ativo: true } }),
  ]);

  return (
    <EmpresasPageContent
      empresas={empresas}
      grupos={grupos}
      regimes={regimes}
    />
  );
}
