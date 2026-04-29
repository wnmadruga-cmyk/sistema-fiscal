"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { competenciaLabel } from "@/lib/competencia-utils";

interface Prioridade { id: string; nome: string; cor: string; diasPrazo: number }
interface Empresa { id: string; nome: string; prioridadeId: string | null }

export function GerarCompetenciaDialog({
  competencia,
  prioridades,
  empresas,
  trigger,
}: {
  competencia: string;
  prioridades: Prioridade[];
  empresas: Empresa[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [todas, setTodas] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [comp, setComp] = useState(competencia);
  const [overridePrazos, setOverridePrazos] = useState(false);
  const [prazos, setPrazos] = useState<Record<string, number>>(() =>
    Object.fromEntries(prioridades.map((p) => [p.id, p.diasPrazo]))
  );
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => empresas.filter((e) => e.nome.toLowerCase().includes(search.toLowerCase())),
    [empresas, search]
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function gerar() {
    if (!todas && selectedIds.size === 0) {
      toast.error("Selecione ao menos uma empresa");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = { competencia: comp };
    if (!todas) body.empresaIds = Array.from(selectedIds);
    if (overridePrazos) body.prazosOverride = prazos;

    const res = await fetch("/api/competencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao gerar");
      return;
    }
    const data = await res.json();
    toast.success(`${data.count ?? ""} card${(data.count ?? 0) > 1 ? "s" : ""} gerado${(data.count ?? 0) > 1 ? "s" : ""}`);
    setOpen(false);
    router.push(`/competencias?competencia=${comp}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> Gerar Competência
        </Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Gerar Competência {competenciaLabel(comp)}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Competência (AAAA-MM)</Label>
            <Input value={comp} onChange={(e) => setComp(e.target.value)} placeholder="2026-04" />
          </div>

          <div className="border rounded p-3 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Gerar para todas as empresas</Label>
                <p className="text-xs text-muted-foreground">Desativar para selecionar empresas individualmente</p>
              </div>
              <Switch checked={todas} onCheckedChange={setTodas} />
            </div>
            {!todas && (
              <div className="space-y-2">
                <Input placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="max-h-56 overflow-y-auto border rounded p-2 space-y-1">
                  {filtered.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma empresa</p>}
                  {filtered.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggle(e.id)} />
                      <span className="text-sm">{e.nome}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>

          <div className="border rounded p-3 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Sobrescrever prazos (apenas para esta geração)</Label>
                <p className="text-xs text-muted-foreground">Por padrão usa o prazo cadastrado em cada prioridade. Grupos com sobreposição ativa têm precedência.</p>
              </div>
              <Switch checked={overridePrazos} onCheckedChange={setOverridePrazos} />
            </div>
            {overridePrazos && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prioridades.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: p.cor }} />
                      {p.nome}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={prazos[p.id] ?? 0}
                      onChange={(e) => setPrazos((prev) => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={gerar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Gerar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
