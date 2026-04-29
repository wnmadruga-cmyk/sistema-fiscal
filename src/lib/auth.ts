import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Usuario } from "@prisma/client";

// React.cache deduplicates calls within a single request — layout + page share one auth lookup
export const getAuthUser = cache(async (): Promise<{
  supabaseUser: { id: string; email?: string } | null;
  usuario: Usuario | null;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabaseUser: null, usuario: null };

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseId: user.id },
  });

  return { supabaseUser: user, usuario };
});

export async function requireAuth(): Promise<{
  supabaseUser: { id: string; email?: string };
  usuario: Usuario;
}> {
  const { supabaseUser, usuario } = await getAuthUser();
  if (!supabaseUser || !usuario) {
    throw new Error("UNAUTHORIZED");
  }
  return { supabaseUser, usuario };
}
