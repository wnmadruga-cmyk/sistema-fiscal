"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Sparkles, CalendarDays } from "lucide-react";
import { DefinirPrazosDialog, type PrazosCalculados } from "./DefinirPrazosDialog";
import { GerarCompetenciaDialog } from "./GerarCompetenciaDialog";
import { ExcluirCompetenciaButton } from "./ExcluirCompetenciaButton";

interface Prioridade { id: string; nome: string; cor: string; diasPrazo: number }
interface Empresa { id: string; nome: string; prioridadeId: string | null }
interface EtapaConfigItem { etapa: string; diasPrazo: number | null }

interface Props {
  competencia: string;
  prioridades: Prioridade[];
  empresas: Empresa[];
  etapasConfig: EtapaConfigItem[];
  total: number;
}

export function GerenciarDropdown({
  competencia,
  prioridades,
  empresas,
  etapasConfig,
  total,
}: Props) {
  const [openPrazos, setOpenPrazos] = useState(false);
  const [openGerar, setOpenGerar] = useState(false);
  const [prazosCalculados, setPrazosCalculados] = useState<PrazosCalculados | null>(null);

  // Prazos are valid as long as they have been calculated (for any competencia)
  const prazosOk = prazosCalculados !== null;

  function handlePrazosConfirm(data: PrazosCalculados) {
    setPrazosCalculados(data);
  }

  function handleGerarClick() {
    if (!prazosOk) return;
    setOpenGerar(true);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <Settings className="h-3.5 w-3.5" />
            Gestão
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Competência</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setOpenPrazos(true)}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Calcular Prazos do Mês
            {prazosOk && (
              <span className="ml-auto text-[10px] text-emerald-600 font-medium">
                {prazosCalculados!.competencia}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleGerarClick}
            disabled={!prazosOk}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Competência
            {!prazosOk && (
              <span className="ml-auto text-[10px] text-muted-foreground">calcule antes</span>
            )}
            {prazosOk && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                {prazosCalculados!.competencia}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <ExcluirCompetenciaButton
            competencia={competencia}
            total={total}
            asMenuItem
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <DefinirPrazosDialog
        open={openPrazos}
        onOpenChange={setOpenPrazos}
        competencia={competencia}
        prioridades={prioridades}
        etapasConfig={etapasConfig}
        onConfirm={handlePrazosConfirm}
      />

      {prazosOk && (
        <GerarCompetenciaDialog
          open={openGerar}
          onOpenChange={setOpenGerar}
          competencia={prazosCalculados!.competencia}
          prioridades={prioridades}
          empresas={empresas}
          prazosOverride={prazosCalculados!.prazos}
          prazosEtapasOverride={prazosCalculados!.etapas}
          competenciaFixed
        />
      )}
    </>
  );
}
