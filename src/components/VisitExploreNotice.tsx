import { Mail } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/permissions";

/** Aviso compacto em páginas de listagem no modo visita */
const VisitExploreNotice = ({ area }: { area: string }) => (
  <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
    <p className="leading-relaxed">
      Esta é a área de <strong>{area}</strong> em modo visita — explore a interface.
      Para cadastrar dados reais e liberar o acesso completo, fale conosco:{" "}
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Quero saber mais sobre o Kareon")}`}
        className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
      >
        <Mail className="w-3.5 h-3.5" />
        {SUPPORT_EMAIL}
      </a>
    </p>
  </div>
);

export default VisitExploreNotice;
