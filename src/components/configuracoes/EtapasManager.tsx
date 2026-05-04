"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Loader2, FileText, Video, Trash2 } from "lucide-react";

interface EtapaItem {
  id: string | null;
  etapa: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  manualPdfUrl: string | null;
  manualVideoUrl: string | null;
  manualObservacao: string | null;
  responsavelPadraoId: string | null;
  diasPrazo: number | null;
}

interface Usuario { id: string; nome: string }

export function EtapasManager({ etapas: initial, usuarios }: { etapas: EtapaItem[]; usuarios: Usuario[] }) {
  const router = useRouter();
  const [etapas, setEtapas] = useState(initial);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  function update(idx: number, patch: Partial<EtapaItem>) {
    setEtapas((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  async function save(idx: number) {
    setSavingIdx(idx);
    const e = etapas[idx];
    const res = await fetch("/api/etapas-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etapa: e.etapa,
        nome: e.nome,
        ordem: e.ordem,
        ativa: e.ativa,
        manualPdfUrl: e.manualPdfUrl || null,
        manualVideoUrl: e.manualVideoUrl || null,
        manualObservacao: e.manualObservacao || null,
        responsavelPadraoId: e.responsavelPadraoId || null,
        diasPrazo: e.diasPrazo ?? null,
      }),
    });
    setSavingIdx(null);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    const { data } = await res.json();
    update(idx, { id: data.id });
    toast.success("Etapa salva!");
    router.refresh();
  }

  async function deleteEtapa(idx: number) {
    const e = etapas[idx];
    if (!e.id) return;
    if (!confirm(`Restaurar "${e.nome}" para o padrão do sistema?`)) return;
    setDeletingIdx(idx);
    const res = await fetch(`/api/etapas-config/${e.id}`, { method: "DELETE" });
    setDeletingIdx(null);
    if (!res.ok) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Etapa restaurada para o padrão");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {etapas.map((e, idx) => (
        <Card key={e.etapa}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{e.ordem}</span>
              <Input
                value={e.nome}
                onChange={(ev) => update(idx, { nome: ev.target.value })}
                className="flex-1 min-w-40 font-medium"
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs">Ativa</Label>
                <Switch checked={e.ativa} onCheckedChange={(v) => update(idx, { ativa: v })} />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Manual
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manual: {e.nome}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> URL do PDF
                      </Label>
                      <Input
                        value={e.manualPdfUrl ?? ""}
                        onChange={(ev) => update(idx, { manualPdfUrl: ev.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <Video className="h-4 w-4" /> URL do Vídeo
                      </Label>
                      <Input
                        value={e.manualVideoUrl ?? ""}
                        onChange={(ev) => update(idx, { manualVideoUrl: ev.target.value })}
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Observação resumida</Label>
                      <Textarea
                        rows={5}
                        value={e.manualObservacao ?? ""}
                        onChange={(ev) => update(idx, { manualObservacao: ev.target.value })}
                        placeholder="Resumo rápido do que fazer nesta etapa..."
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={() => save(idx)} disabled={savingIdx === idx} size="sm">
                {savingIdx === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteEtapa(idx)}
                disabled={!e.id || deletingIdx === idx}
                title={e.id ? "Restaurar padrão" : "Sem customização salva"}
              >
                {deletingIdx === idx
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            </div>

            <div className="flex gap-4 flex-wrap pl-10">
              <div className="space-y-1 flex-1 min-w-48">
                <Label className="text-xs text-muted-foreground">Responsável padrão</Label>
                <Select
                  value={e.responsavelPadraoId ?? "__none__"}
                  onValueChange={(v) => update(idx, { responsavelPadraoId: v === "__none__" ? null : v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Sem responsável padrão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Sem responsável padrão</span>
                    </SelectItem>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-44">
                <Label className="text-xs text-muted-foreground">Prazo (dias após fim do mês)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Sem prazo"
                  className="h-8 text-sm"
                  value={e.diasPrazo ?? ""}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    update(idx, { diasPrazo: v === "" ? null : parseInt(v) || 0 });
                  }}
                />
              </div>
            </div>

            {(e.manualPdfUrl || e.manualVideoUrl || e.manualObservacao) && (
              <div className="text-xs text-muted-foreground flex gap-3 pl-10">
                {e.manualPdfUrl && <span>📄 PDF</span>}
                {e.manualVideoUrl && <span>🎥 Vídeo</span>}
                {e.manualObservacao && <span>📝 Observação</span>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
