import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPacientes, getSessoes, getObjetivos, getAuth } from "@/lib/store";
import { Users, ClipboardList, Target, Plus, CalendarDays } from "lucide-react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const auth = getAuth();
  const pacientes = getPacientes().filter((p) => p.status === "ativo");
  const sessoes = getSessoes();
  const objetivos = getObjetivos();
  const sessoesHoje = sessoes.filter((s) => isToday(new Date(s.dataHora)));

  const stats = [
    { label: "Pacientes ativos", value: pacientes.length, icon: Users, color: "text-primary" },
    { label: "Sessões hoje", value: sessoesHoje.length, icon: CalendarDays, color: "text-accent" },
    { label: "Total de sessões", value: sessoes.length, icon: ClipboardList, color: "text-primary" },
    { label: "Objetivos ativos", value: objetivos.filter((o) => o.status === "em_andamento").length, icon: Target, color: "text-secondary" },
  ];

  const proximasSessoes = sessoes
    .filter((s) => new Date(s.dataHora) >= new Date())
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {auth?.nome?.split(" ")[0] || "Terapeuta"} 👋</h1>
          <p className="text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <Link to="/agenda">
          <Button className="gap-2">
            <CalendarDays className="w-4 h-4" /> Ver agenda
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas sessões</CardTitle>
          </CardHeader>
          <CardContent>
            {proximasSessoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão agendada</p>
            ) : (
              <div className="space-y-3">
                {proximasSessoes.map((s) => {
                  const pac = getPacientes().find((p) => p.id === s.pacienteId);
                  return (
                    <Link key={s.id} to={`/pacientes/${s.pacienteId}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{pac?.nome || "Paciente"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.dataHora), "dd/MM · HH:mm")}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pacientes recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pacientes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Nenhum paciente cadastrado</p>
                <Link to="/pacientes/novo">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Adicionar paciente
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pacientes.slice(0, 5).map((p) => (
                  <Link key={p.id} to={`/pacientes/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {p.nome.charAt(0)}
                    </div>
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

export default Dashboard;
