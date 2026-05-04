"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateTime } from "@/lib/utils";

type Notif = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  linkRef: string | null;
  lida: boolean;
  createdAt: string;
};

const TIPO_DOT: Record<string, string> = {
  MENCAO: "bg-indigo-500",
  PRAZO_PROXIMO: "bg-amber-500",
  ETAPA_CONCLUIDA: "bg-emerald-500",
  ERRO_REGISTRADO: "bg-red-500",
  CARD_ATRIBUIDO: "bg-blue-500",
  COMENTARIO_NOVO: "bg-violet-500",
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(() => {
    fetch("/api/notificacoes")
      .then((r) => r.json())
      .then((j) => {
        const data: Notif[] = j.data ?? j ?? [];
        setUnread(data.filter((n) => !n.lida).length);
        if (open) setItems(data);
      })
      .catch(() => {});
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notificacoes");
    const j = await res.json();
    const data: Notif[] = j.data ?? j ?? [];
    setItems(data);
    setUnread(data.filter((n) => !n.lida).length);
    setLoading(false);
  }, []);

  // Busca o badge ao montar e a cada 60s
  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 60_000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function marcarTodasLidas() {
    await fetch("/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "marcar-todas-lidas" }),
    });
    setItems((arr) => arr.map((n) => ({ ...n, lida: true })));
    setUnread(0);
  }

  function abrir(n: Notif) {
    if (!n.lida) {
      fetch(`/api/notificacoes/${n.id}`, { method: "PATCH" }).catch(() => {});
      setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    }
    if (n.linkRef) {
      router.push(n.linkRef);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0"
        style={{ backgroundColor: "var(--popover)" }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-medium">Notificações</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={marcarTodasLidas} className="h-7 text-xs">
              <CheckCheck className="h-3 w-3 mr-1" /> Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Sem notificações.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => abrir(n)}
                className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${!n.lida ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${TIPO_DOT[n.tipo] ?? "bg-muted"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.lida && <span className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
