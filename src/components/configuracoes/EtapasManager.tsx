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
import { toast } from "sonner";
import { BookOpen, Loader2, FileText, Video } from "lucide-react";

interface EtapaItem {
  id: string | null;
  etapa: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  manualPdfUrl: string | null;
  manualVideoUrl: string | null;
  manualObservacao: string | null;
}

export function EtapasManager({ etapas: initial }: { etapas: EtapaItem[] }) {
  const router = useRouter();
  const [etapas, setEtapas] = useState(initial);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

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

  return (
    <div className="space-y-3">
      {etapas.map((e, idx) => (
        <Card key={e.etapa}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{e.ordem}</span>
              <Input
                value={e.nome}
                onChange={(ev) => update(idx, { nome: ev.target.value })}
                className="flex-1 font-medium"
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
            </div>
            {(e.manualPdfUrl || e.manualVideoUrl || e.manualObservacao) && (
              <div className="text-xs text-muted-foreground flex gap-3 pl-12">
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
