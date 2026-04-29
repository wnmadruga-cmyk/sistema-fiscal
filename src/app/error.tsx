"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "sans-serif", padding: "2rem", background: "#0f172a", color: "#f1f5f9" }}>
        <div style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Algo deu errado</h1>
          <p style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>
            {error?.message ?? "Erro desconhecido"}
          </p>
          {error?.digest && (
            <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "1.5rem" }}>
              Código: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ padding: "0.5rem 1.5rem", borderRadius: "0.5rem", background: "#3b82f6", color: "white", border: "none", cursor: "pointer" }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
