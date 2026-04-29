"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ExcluirCardButton({
  cardId,
  competencia,
  empresaNome,
  redirectTo,
}: {
  cardId: string;
  competencia: string;
  empresaNome: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [motivo, setMotivo] = useState("");

  async function executar() {
    if (!motivo.trim()) {
      toast.error("Descreva o motivo da exclusão");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/competencias/${cardId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivo.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao excluir");
      return;
    }
    toast.success("Card excluído");
    setOpen(false);
    setMotivo("");
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-1" /> Excluir card
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setMotivo(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir card de {empresaNome} ({competencia})?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              O card e seus dados (etapas, qualidade, observações) serão removidos. Uma observação persistente
              ficará registrada na empresa com o motivo informado.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Motivo (obrigatório) *</label>
              <Textarea
                autoFocus
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: empresa inativada antes de iniciar a competência"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={executar} disabled={busy || !motivo.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
