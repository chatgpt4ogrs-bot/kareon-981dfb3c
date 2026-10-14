import { Mail, Eye } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/permissions";

const VisitModeBanner = () => {
  return (
    <div
      role="status"
      className="border-b border-amber-200/80 bg-amber-50 text-amber-950"
    >
      <div className="px-4 md:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <span className="mt-0.5 sm:mt-0 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-200/70">
            <Eye className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="leading-snug">
            <span className="font-semibold">Modo visita</span>
            {" — "}
            você pode conhecer a plataforma. Dados clínicos e ações reais ficam
            disponíveis após aprovação da clínica.
          </p>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Quero saber mais sobre o Kareon")}`}
          className="inline-flex items-center gap-1.5 shrink-0 font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
        >
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
};

export default VisitModeBanner;
