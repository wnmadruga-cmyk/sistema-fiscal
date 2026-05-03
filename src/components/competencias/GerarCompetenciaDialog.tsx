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

interface GerarCompetenciaDialogProps {
  competencia: string;
  prioridades: Prioridade[];
  empresas: Empresa[];
  trigger?: React.ReactNode;
  // External control (used from GerenciarDropdown)
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  // Pre-calculated date overrides (ISO date strings keyed by prioridadeId / etapa)
  prazosOverride?: Record<string, string>;
  prazosEtapasOverride?: Record<string, string>;
  // When true, the competencia field is read-only (prazos were calculated for this exact competencia)
  competenciaFixed?: boolean;
}

export function GerarCompetenciaDialog({
  competencia,
  prioridades,
  empresas,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  prazosOverride,
  prazosEtapasOverride,
  competenciaFixed,
}: GerarCompetenciaDialogProps) {
  const router = useRouter();
  const [openInternal, setOpenInternal] = useState(false);
  const [todas, setTodas] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [comp, setComp] = useState(competencia);
  const [saving, setSaving] = useState(false);

  // Support both controlled (from dropdown) and uncontrolled usage
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp! : openInternal;
  function setOpen(v: boolean) {
    if (isControlled) onOpenChangeProp?.(v);
    else setOpenInternal(v);
  }

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
    if (prazosOverride) body.prazosOverride = prazosOverride;
    if (prazosEtapasOverride) body.prazosEtapasOverride = prazosEtapasOverride;

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
      {!isControlled && (trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> Gerar Competência
        </Button>
      ))}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Competência {competenciaLabel(comp)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!competenciaFixed && (
            <div className="space-y-1">
              <Label>Competência (AAAA-MM)</Label>
              <Input value={comp} onChange={(e) => setComp(e.target.value)} placeholder="2026-04" />
            </div>
          )}

          {prazosOverride && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Prazos calculados e prontos para uso
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {prioridades.map((p) => (
                  <span key={p.id} className="text-xs text-emerald-600 dark:text-emerald-500">
                    <span className="font-medium">{p.nome}:</span> {prazosOverride[p.id] ?? "—"}
                  </span>
                ))}
              </div>
            </div>
          )}

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
