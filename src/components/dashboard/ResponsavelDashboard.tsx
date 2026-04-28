import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePacientes } from "@/hooks/use-pacientes";
import { useSessoes } from "@/hooks/use-sessoes";
import { Users, CalendarDays, ClipboardList, Loader2 } from "lucide-react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ResponsavelDashboard = () => {
  const { profile } = useAuth();
  const { data: pacientes = [], isLoading: loadingPac } = usePacientes();
  const { data: sessoes = [], isLoading: loadingSes } = useSessoes();

  if (loadingPac || loadingSes) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const ativos = pacientes.filter((p) => p.status === "ativo");
  const sessoesHoje = sessoes.filter((s) => isToday(new Date(s.dataHora)));

  const stats = [
    { label: "Sessões hoje", value: sessoesHoje.length, icon: CalendarDays, color: "text-primary" },
    { label: "Pacientes cadastrados", value: ativos.length, icon: Users, color: "text-accent" },
    { label: "Total de sessões", value: sessoes.length, icon: ClipboardList, color: "text-secondary" },
  ];

  const proximasSessoes = sessoes
    .filter((s) => new Date(s.dataHora) >= new Date())
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {profile?.nome?.split(" ")[0] || "Responsável"} 👋</h1>
          <p className="text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <Link to="/agenda">
          <Button className="gap-2"><CalendarDays className="w-4 h-4" /> Ver agenda</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-semibold text-foreground mt-2 tracking-tight">{stat.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                  <stat.icon className={cn("w-[18px] h-[18px]", stat.color)} strokeWidth={1.85} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Agenda — Próximas sessões</CardTitle></CardHeader>
        <CardContent>
          {proximasSessoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão agendada</p>
          ) : (
            <div className="space-y-3">
              {proximasSessoes.map((s) => {
                const pac = pacientes.find((p) => p.id === s.pacienteId);
                return (
                  <Link key={s.id} to={`/pacientes/${s.pacienteId}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{pac?.nome || "Paciente"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.dataHora), "dd/MM · HH:mm")}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponsavelDashboard;
