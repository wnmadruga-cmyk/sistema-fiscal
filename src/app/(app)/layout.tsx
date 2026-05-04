import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AppClientLayout } from "@/components/layout/AppClientLayout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabaseUser, usuario } = await getAuthUser();

  if (!supabaseUser) redirect("/login");

  return (
    <AppClientLayout>
      <Sidebar />
      <Header
        usuarioNome={usuario?.nome ?? supabaseUser.email ?? "Usuário"}
        usuarioAvatar={usuario?.avatar}
      />
      <main className="pt-14 transition-all duration-300" id="app-main">
        {children}
      </main>
    </AppClientLayout>
  );
}
