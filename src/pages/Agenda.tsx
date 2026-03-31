import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSessoes, getPacientes } from "@/lib/store";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const Agenda = () => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const sessoes = getSessoes();
  const pacientes = getPacientes();

  const dias = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevWeek}><ChevronLeft className="w-5 h-5" /></Button>
        <p className="text-sm font-medium text-foreground">
          {format(dias[0], "dd MMM", { locale: ptBR })} — {format(dias[6], "dd MMM yyyy", { locale: ptBR })}
        </p>
        <Button variant="ghost" size="icon" onClick={nextWeek}><ChevronRight className="w-5 h-5" /></Button>
      </div>

      <div className="grid gap-4">
        {dias.map((dia) => {
          const sessoesDia = sessoes
            .filter((s) => isSameDay(new Date(s.dataHora), dia))
            .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
          const isHoje = isSameDay(dia, new Date());

          return (
            <div key={dia.toISOString()}>
              <div className={cn(
                "flex items-center gap-2 mb-2 px-1",
                isHoje && "text-primary"
              )}>
                <p className="text-xs font-medium uppercase">
                  {format(dia, "EEEE", { locale: ptBR })}
                </p>
                <p className={cn(
                  "text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center",
                  isHoje && "bg-primary text-primary-foreground"
                )}>
                  {format(dia, "dd")}
                </p>
              </div>

              {sessoesDia.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-1">Sem sessões</p>
              ) : (
                <div className="space-y-2">
                  {sessoesDia.map((s) => {
                    const pac = pacientes.find((p) => p.id === s.pacienteId);
                    return (
                      <Card key={s.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-1 h-10 rounded-full bg-primary shrink-0" />
                          <Link to={`/pacientes/${s.pacienteId}`} className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{pac?.nome || "Paciente"}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(s.dataHora), "HH:mm")}</p>
                          </Link>
                          <Link to={`/pacientes/${s.pacienteId}/sessao?modo=sessao`}>
                            <Button size="sm" className="gap-1.5 rounded-full h-8 px-3">
                              <Play className="w-3.5 h-3.5" /> Iniciar
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Agenda;
