import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePacientes } from "@/hooks/use-pacientes";
import { useSessoes } from "@/hooks/use-sessoes";
import { useObjetivos } from "@/hooks/use-objetivos";
import { Users, CalendarDays, Target, ClipboardList, Plus, Loader2 } from "lucide-react";
import { format, isToday, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TerapeutaDashboard = () => {
  const { profile } = useAuth();
  const { data: allPacientes = [], isLoading: loadingPac } = usePacientes();
  const { data: sessoes = [], isLoading: loadingSes } = useSessoes();
  const { data: objetivos = [] } = useObjetivos();

  if (loadingPac || loadingSes) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const pacientes = allPacientes.filter((p) => p.status === "ativo");
  const sessoesHoje = sessoes.filter((s) => isToday(new Date(s.dataHora)));
  const now = new Date();
  const semanaInterval = { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
  const sessoesSemana = sessoes.filter((s) => isWithinInterval(new Date(s.dataHora), semanaInterval));
  const objetivosAtivos = objetivos.filter((o) => o.status === "em_andamento");

  const stats = [
    { label: "Meus pacientes", value: pacientes.length, icon: Users, color: "text-primary" },
    { label: "Sessões hoje", value: sessoesHoje.length, icon: CalendarDays, color: "text-accent" },
    { label: "Sessões na semana", value: sessoesSemana.length, icon: ClipboardList, color: "text-primary" },
    { label: "Objetivos ativos", value: objetivosAtivos.length, icon: Target, color: "text-secondary" },
  ];

  const proximasSessoes = sessoes
    .filter((s) => new Date(s.dataHora) >= new Date())
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {profile?.nome?.split(" ")[0] || "Terapeuta"} 👋</h1>
          <p className="text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <Link to="/agenda">
          <Button className="gap-2"><CalendarDays className="w-4 h-4" /> Ver agenda</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Próximas sessões</CardTitle></CardHeader>
          <CardContent>
            {proximasSessoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão agendada</p>
            ) : (
              <div className="space-y-3">
                {proximasSessoes.map((s) => {
                  const pac = allPacientes.find((p) => p.id === s.pacienteId);
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

        <Card>
          <CardHeader><CardTitle className="text-lg">Meus pacientes</CardTitle></CardHeader>
          <CardContent>
            {pacientes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Nenhum paciente vinculado</p>
                <Link to="/pacientes/novo">
                  <Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Adicionar paciente</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pacientes.slice(0, 5).map((p) => (
                  <Link key={p.id} to={`/pacientes/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">{p.nome.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.diagnostico}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TerapeutaDashboard;
