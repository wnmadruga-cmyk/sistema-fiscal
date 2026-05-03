"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ExcluirCompetenciaButton({
  competencia,
  total,
  asMenuItem,
}: {
  competencia: string;
  total: number;
  asMenuItem?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirma, setConfirma] = useState("");

  async function executar() {
    setBusy(true);
    const res = await fetch(`/api/competencias?competencia=${competencia}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao excluir");
      return;
    }
    const d = await res.json();
    toast.success(`${d.data?.deleted ?? 0} card(s) excluído(s)`);
    setOpen(false);
    setConfirma("");
    router.refresh();
  }

  const trigger = asMenuItem ? (
    <DropdownMenuItem
      onSelect={(e) => { e.preventDefault(); setOpen(true); }}
      disabled={total === 0}
      className="text-red-600 focus:text-red-600"
    >
      <Trash2 className="h-4 w-4 mr-2" /> Excluir Competência
    </DropdownMenuItem>
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
      onClick={() => setOpen(true)}
      disabled={total === 0}
    >
      <Trash2 className="h-4 w-4 mr-1" /> Excluir competência
    </Button>
  );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirma(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir competência {competencia}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Esta ação removerá <strong>{total}</strong> card(s) da competência <strong>{competencia}</strong>,
              incluindo etapas, qualidade, observações e arquivos vinculados. Não há como desfazer.
            </p>
            <p>Para confirmar, digite a competência exatamente: <code className="bg-muted px-1 rounded">{competencia}</code></p>
            <input
              autoFocus
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="YYYY-MM"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={executar}
              disabled={busy || confirma !== competencia}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
