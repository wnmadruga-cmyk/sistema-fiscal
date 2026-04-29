"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Filial {
  id: string;
  nome: string;
}

export function FiliaisManager({ initial }: { initial: Filial[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  function openNew() { setEditing(null); setNome(""); setOpen(true); }
  function openEdit(f: Filial) { setEditing(f); setNome(f.nome); setOpen(true); }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/filiais/${editing.id}` : "/api/filiais";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    toast.success("Salvo!");
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover escritório?")) return;
    const res = await fetch(`/api/filiais/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro"); return; }
    toast.success("Removido");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </div>
      <div className="grid gap-3">
        {initial.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum escritório cadastrado.</p>
        )}
        {initial.map((f) => (
          <Card key={f.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <span className="font-medium">{f.nome}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Escritório</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Matriz, Filial Centro..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !nome.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
