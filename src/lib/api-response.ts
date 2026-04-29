import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, success: true }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, errors?: unknown) {
  return NextResponse.json(
    { error: message, errors, success: false },
    { status: 400 }
  );
}

export function unauthorized(message = "Não autorizado") {
  return NextResponse.json({ error: message, success: false }, { status: 401 });
}

export function forbidden(message = "Acesso negado") {
  return NextResponse.json({ error: message, success: false }, { status: 403 });
}

export function notFound(message = "Não encontrado") {
  return NextResponse.json({ error: message, success: false }, { status: 404 });
}

const FIELD_LABEL: Record<string, string> = {
  cnpj: "CNPJ",
  cpf: "CPF",
  codigoInterno: "Código interno",
  email: "E-mail",
  nome: "Nome",
  razaoSocial: "Razão Social",
  supabaseId: "Usuário",
};

function friendlyFields(target: unknown): string {
  const arr = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];
  const filtered = arr.filter((f) => f !== "escritorioId");
  if (filtered.length === 0) return "este registro";
  return filtered.map((f) => FIELD_LABEL[f] ?? f).join(", ");
}

function mapPrismaError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { name?: string; code?: string; meta?: { target?: unknown; field_name?: string; modelName?: string } };
  if (e.name !== "PrismaClientKnownRequestError" && !e.code?.startsWith?.("P")) return null;

  switch (e.code) {
    case "P2002": {
      const fields = friendlyFields(e.meta?.target);
      return { status: 409, message: `Já existe um registro com este(s) ${fields}.` };
    }
    case "P2003":
      return { status: 400, message: "Registro vinculado a outro item — não pode ser referenciado." };
    case "P2025":
      return { status: 404, message: "Registro não encontrado." };
    case "P2014":
      return { status: 400, message: "Esta operação violaria um vínculo obrigatório entre registros." };
    default:
      return null;
  }
}

export function serverError(error: unknown) {
  const friendly = mapPrismaError(error);
  if (friendly) {
    console.warn("[API Prisma]", (error as { code?: string }).code, (error as { meta?: unknown }).meta);
    return NextResponse.json(
      { error: friendly.message, success: false },
      { status: friendly.status }
    );
  }
  console.error("[API Error]", error);
  const message =
    error instanceof Error ? error.message : "Erro interno do servidor";
  return NextResponse.json(
    { error: message, success: false },
    { status: 500 }
  );
}
