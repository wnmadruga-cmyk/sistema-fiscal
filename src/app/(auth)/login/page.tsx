export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/auth/LoginForm";
import { FileText } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4 shadow-lg">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ECM Flow Fiscal</h1>
          <p className="text-slate-400 text-sm mt-1">
            Sistema de Gestão do Fluxo Fiscal
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
