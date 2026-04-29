import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function formatDocument(doc: string): string {
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 14) return formatCNPJ(digits);
  if (digits.length === 11) return formatCPF(digits);
  return doc;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("pt-BR");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
