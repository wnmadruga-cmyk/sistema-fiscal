"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ThumbsUp, AlertTriangle, ThumbsDown, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { EtapaCard } from "@prisma/client";

type EtapaData = {
  etapa: EtapaCard;
  status: string;
  resultadoConferencia: "APROVADO" | "REPROVADO" | "RESSALVA" | null;
  comentarioRessalva: string | null;
  ressalvaResolvida: boolean;
};

type Mode = "idle" | "ressalva" | "reprovar";

export function ConferenciaActions({
  cardId,
  etapa,
  data,
}: {
  cardId: string;
  etapa: EtapaCard;
  data?: EtapaData;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  const ressalvaPendente = data?.resultadoConferencia === "RESSALVA" && !data.ressalvaResolvida;

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/competencias/${cardId}/etapas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa, ...payload }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro");
      return;
    }
    toast.success("Atualizado");
    setMode("idle");
    setTexto("");
    router.refresh();
  }

  function aprovar() {
    return send({ status: "CONCLUIDA", resultadoConferencia: "APROVADO" });
  }
  function confirmarRessalva() {
    if (!texto.trim()) {
      toast.error("Descreva a ressalva");
      return;
    }
    return send({
      status: "CONCLUIDA",
      resultadoConferencia: "RESSALVA",
      comentarioRessalva: texto.trim(),
      ressalvaResolvida: false,
    });
  }
  function confirmarReprovacao() {
    if (!texto.trim()) {
      toast.error("Descreva o motivo");
      return;
    }
    return send({
      status: "REPROVADA",
      resultadoConferencia: "REPROVADO",
      justificativa: texto.trim(),
    });
  }
  function resolverRessalva() {
    return send({ status: "CONCLUIDA", resultadoConferencia: "APROVADO", ressalvaResolvida: true });
  }

  if (ressalvaPendente) {
    return (
      <div className="border rounded-lg p-3 space-y-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Ressalva pendente</p>
            <p className="text-sm whitespace-pre-wrap mt-1">{data?.comentarioRessalva}</p>
          </div>
        </div>
        <Button size="sm" onClick={resolverRessalva} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
          {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Marcar ressalva resolvida e avançar
        </Button>
      </div>
    );
  }

  if (mode === "ressalva" || mode === "reprovar") {
    const isRess = mode === "ressalva";
    return (
      <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
        <p className="text-sm font-medium">
          {isRess ? "Descreva a ressalva (obrigatório)" : "Justificativa da reprovação (obrigatório)"}
        </p>
        <Textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setMode("idle"); setTexto(""); }}>Cancelar</Button>
          <Button size="sm" onClick={isRess ? confirmarRessalva : confirmarReprovacao} disabled={busy || !texto.trim()}>
            {busy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Confirmar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button onClick={aprovar} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
        <ThumbsUp className="h-4 w-4 mr-1" /> Aprovar
      </Button>
      <Button onClick={() => setMode("ressalva")} variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 mr-1" /> Ressalva
      </Button>
      <Button onClick={() => setMode("reprovar")} variant="outline" className="border-red-400 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
        <ThumbsDown className="h-4 w-4 mr-1" /> Reprovar
      </Button>
    </div>
  );
}
