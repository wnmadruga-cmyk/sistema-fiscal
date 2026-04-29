import { create } from "zustand";
import { EtapaCard, StatusCard } from "@prisma/client";
import { competenciaAtual } from "@/lib/competencia-utils";

interface FiltrosState {
  competencia: string;
  empresaId: string;
  grupoId: string;
  responsavelId: string;
  status: StatusCard | "";
  etapaAtual: EtapaCard | "";
  urgente: boolean;
  semMovimento: boolean;
  search: string;

  setCompetencia: (v: string) => void;
  setEmpresaId: (v: string) => void;
  setGrupoId: (v: string) => void;
  setResponsavelId: (v: string) => void;
  setStatus: (v: StatusCard | "") => void;
  setEtapaAtual: (v: EtapaCard | "") => void;
  setUrgente: (v: boolean) => void;
  setSemMovimento: (v: boolean) => void;
  setSearch: (v: string) => void;
  resetFiltros: () => void;
}

const defaultState = {
  competencia: competenciaAtual(),
  empresaId: "",
  grupoId: "",
  responsavelId: "",
  status: "" as const,
  etapaAtual: "" as const,
  urgente: false,
  semMovimento: false,
  search: "",
};

export const useFiltrosStore = create<FiltrosState>()((set) => ({
  ...defaultState,
  setCompetencia: (v) => set({ competencia: v }),
  setEmpresaId: (v) => set({ empresaId: v }),
  setGrupoId: (v) => set({ grupoId: v }),
  setResponsavelId: (v) => set({ responsavelId: v }),
  setStatus: (v) => set({ status: v }),
  setEtapaAtual: (v) => set({ etapaAtual: v }),
  setUrgente: (v) => set({ urgente: v }),
  setSemMovimento: (v) => set({ semMovimento: v }),
  setSearch: (v) => set({ search: v }),
  resetFiltros: () => set(defaultState),
}));
