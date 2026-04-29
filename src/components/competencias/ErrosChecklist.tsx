"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type ItemStatus = "APROVADO" | "COM_ERRO" | "RESSALVA" | null;

interface ErroItem {
  id: string;
  nome: string;
  descricao: string | null;
  categorias: string[];
  peso: number;
}

interface MarcadoItem {
  id: string;
  erroPossivelId: string | null;
  statusItem: "APROVADO" | "COM_ERRO" | "RESSALVA";
  observacao: string | null;
}

export function ErrosChecklist({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [erros, setErros] = useState<ErroItem[]>([]);
  const [statusByErro, setStatusByErro] = useState<Map<string, ItemStatus>>(new Map());
  const [obsByErro, setObsByErro] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/competencias/${cardId}/erros-checklist`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const data = d.data ?? d;
        setErros(data.erros ?? []);
        const sMap = new Map<string, ItemStatus>();
        const oMap = new Map<string, string>();
        for (const m of (data.marcados ?? []) as MarcadoItem[]) {
          if (!m.erroPossivelId) continue;
          sMap.set(m.erroPossivelId, m.statusItem);
          if (m.observacao) oMap.set(m.erroPossivelId, m.observacao);
        }
        setStatusByErro(sMap);
        setObsByErro(oMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { alive = false; };
  }, [cardId]);

  async function setStatus(erroId: string, status: "APROVADO" | "COM_ERRO" | "RESSALVA" | "LIMPAR") {
    const observacao = obsByErro.get(erroId) ?? "";
    if (status === "RESSALVA" && !observacao.trim()) {
      toast.error("Informe a observação para registrar como ressalva.");
      return;
    }
    setBusy(erroId);
    const res = await fetch(`/api/competencias/${cardId}/erros-checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ erroPossivelId: erroId, status, observacao }),
    });
    setBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro");
      return;
    }
    setStatusByErro((prev) => {
      const next = new Map(prev);
      if (status === "LIMPAR") next.delete(erroId);
      else next.set(erroId, status);
      return next;
    });
    router.refresh();
  }

  const totals = useMemo(() => {
    let pesoTotal = 0;
    let pesoOk = 0;
    let pesoErro = 0;
    let pesoRessalva = 0;
    for (const e of erros) {
      const w = e.peso ?? 1;
      pesoTotal += w;
      const s = statusByErro.get(e.id);
      if (s === "APROVADO") pesoOk += w;
      else if (s === "COM_ERRO") pesoErro += w;
      else if (s === "RESSALVA") pesoRessalva += w;
    }
    const nota = pesoTotal > 0 ? (pesoOk / pesoTotal) * 100 : 0;
    return { pesoTotal, pesoOk, pesoErro, pesoRessalva, nota };
  }, [erros, statusByErro]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando checklist…
      </div>
    );
  }

  if (erros.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic px-1 py-2">
        Nenhum erro configurado para esta empresa/grupo. Configure em Configurações → Erros Possíveis.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium">Erros possíveis</p>
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">OK {totals.pesoOk}</Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Ressalva {totals.pesoRessalva}</Badge>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Erro {totals.pesoErro}</Badge>
          <Badge variant="secondary">Nota {totals.nota.toFixed(1)}/100</Badge>
        </div>
      </div>
      <ul className="border rounded-md divide-y">
        {erros.map((e) => {
          const status = statusByErro.get(e.id);
          const obs = obsByErro.get(e.id) ?? "";
          return (
            <li key={e.id} className="p-2.5 hover:bg-muted/30">
              <div className="flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{e.nome}</span>
                    {e.categorias?.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                    <Badge variant="outline" className="text-[10px]">Peso {e.peso ?? 1}</Badge>
                    {status === "APROVADO" && <Badge className="text-[10px] bg-emerald-600">OK</Badge>}
                    {status === "COM_ERRO" && <Badge className="text-[10px] bg-rose-600">Erro</Badge>}
                    {status === "RESSALVA" && <Badge className="text-[10px] bg-amber-600">Ressalva</Badge>}
                  </div>
                  {e.descricao && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{e.descricao}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="OK"
                    disabled={busy === e.id}
                    onClick={() => setStatus(e.id, status === "APROVADO" ? "LIMPAR" : "APROVADO")}
                    className={`h-7 w-7 rounded-md border flex items-center justify-center transition ${
                      status === "APROVADO" ? "bg-emerald-600 border-emerald-600 text-white" : "hover:bg-emerald-50"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Com erro"
                    disabled={busy === e.id}
                    onClick={() => setStatus(e.id, status === "COM_ERRO" ? "LIMPAR" : "COM_ERRO")}
                    className={`h-7 w-7 rounded-md border flex items-center justify-center transition ${
                      status === "COM_ERRO" ? "bg-rose-600 border-rose-600 text-white" : "hover:bg-rose-50"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Com ressalva (observação obrigatória)"
                    disabled={busy === e.id}
                    onClick={() => setStatus(e.id, status === "RESSALVA" ? "LIMPAR" : "RESSALVA")}
                    className={`h-7 w-7 rounded-md border flex items-center justify-center transition ${
                      status === "RESSALVA" ? "bg-amber-500 border-amber-500 text-white" : "hover:bg-amber-50"
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </button>
                  {busy === e.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />}
                </div>
              </div>
              {(status || obs) && (
                <Textarea
                  value={obs}
                  onChange={(ev) => setObsByErro((prev) => new Map(prev).set(e.id, ev.target.value))}
                  onBlur={() => {
                    if (status) setStatus(e.id, status);
                  }}
                  rows={2}
                  placeholder={status === "RESSALVA" ? "Observação obrigatória para ressalva…" : "Observação (opcional)"}
                  className="mt-2 text-xs"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
