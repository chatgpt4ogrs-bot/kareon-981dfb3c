import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORT_EMAIL } from "@/lib/permissions";
import {
  Users,
  CalendarDays,
  BarChart3,
  ShieldCheck,
  Mail,
  Eye,
  ArrowRight,
} from "lucide-react";

const highlights = [
  {
    icon: CalendarDays,
    title: "Agenda clínica",
    text: "Organize sessões, horários e equipe em um só lugar.",
  },
  {
    icon: Users,
    title: "Pacientes e evolução",
    text: "Cadastre pacientes e acompanhe objetivos terapêuticos.",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    text: "Gere visão clara do progresso para a clínica e famílias.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança e LGPD",
    text: "Acesso controlado por papéis e dados clínicos protegidos.",
  },
];

const VisitorDashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(" ")[0] || "visitante";

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-semibold">
          <Eye className="w-3.5 h-3.5" />
          Modo visita
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Olá, {firstName} — conheça o Kareon
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
          Você está explorando a plataforma em modo visita. Navegue pelos menus para
          entender o fluxo de gestão terapêutica. Para liberar o acesso completo da
          sua clínica, fale com o suporte.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {highlights.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="border-border/60 shadow-none">
            <CardContent className="pt-5 pb-5 flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="gap-2">
          <Link to="/pacientes">
            Ver área de pacientes <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/agenda">Explorar agenda</Link>
        </Button>
        <Button asChild variant="secondary" className="gap-2">
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Quero saber mais sobre o Kareon")}`}>
            <Mail className="w-4 h-4" />
            {SUPPORT_EMAIL}
          </a>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Dúvidas ou interesse em contratar? Escreva para{" "}
        <a className="underline hover:text-foreground" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
};

export default VisitorDashboard;
