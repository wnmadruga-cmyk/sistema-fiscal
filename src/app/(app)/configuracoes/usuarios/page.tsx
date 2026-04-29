export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { UsuariosManager } from "@/components/configuracoes/UsuariosManager";

const getUsuariosData = unstable_cache(
  async (escritorioId: string) =>
    Promise.all([
      prisma.usuario.findMany({
        where: { escritorioId },
        select: { id: true, nome: true, email: true, perfil: true, avatar: true, ativo: true, createdAt: true },
        orderBy: { nome: "asc" },
      }),
      prisma.empresa.findMany({
        where: { escritorioId, ativa: true },
        select: { id: true, razaoSocial: true, nomeFantasia: true, respBuscaId: true, respElaboracaoId: true, respConferenciaId: true },
        orderBy: { razaoSocial: "asc" },
      }),
    ]),
  ["config-usuarios"],
  { revalidate: 60, tags: ["usuarios"] }
);

export default async function UsuariosPage() {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) redirect("/login");

  const [usuarios, empresas] = await getUsuariosData(usuario.escritorioId);

  const empresasLookup = empresas.map((e) => ({
    id: e.id,
    nome: e.nomeFantasia ?? e.razaoSocial,
    respBuscaId: e.respBuscaId,
    respElaboracaoId: e.respElaboracaoId,
    respConferenciaId: e.respConferenciaId,
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">Colaboradores e responsabilidades por empresa</p>
      </div>
      <UsuariosManager
        initial={usuarios}
        empresas={empresasLookup}
        canManage={usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE"}
        usuarioAtualId={usuario.id}
      />
    </div>
  );
}
