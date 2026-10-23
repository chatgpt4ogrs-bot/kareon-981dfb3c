import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDashboardOps, useAppointments } from "@/hooks/use-appointments";
import { usePacientes } from "@/hooks/use-pacientes";
import { useTerapeutas } from "@/hooks/use-terapeutas";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarDays,
  Users,
  Stethoscope,
  TrendingUp,
  Plus,
  Loader2,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

function Sparkline({ color = "#4F46E5" }: { color?: string }) {
  return (
    <svg viewBox="0 0 80 28" className="w-20 h-7" aria-hidden>
      <path
        className="stat-spark"
        d="M2 20 L12 16 L22 18 L32 10 L42 14 L52 8 L62 12 L78 4"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

export default function OpsDashboard() {
  const { profile } = useAuth();
  const { data: ops, isLoading } = useDashboardOps();
  const { data: pacientes = [] } = usePacientes();
  const { data: profissionais = [] } = useTerapeutas();

  const todayFrom = startOfDay(new Date()).toISOString();
  const todayTo = endOfDay(new Date()).toISOString();
  const yearFrom = startOfMonth(subMonths(new Date(), 11)).toISOString();
  const yearTo = endOfMonth(new Date()).toISOString();

  const { data: todayAppts = [] } = useAppointments({ from: todayFrom, to: todayTo });
  const { data: yearAppts = [] } = useAppointments({ from: yearFrom, to: yearTo });

  const [calMonth] = useState(new Date());

  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    });
    return months.map((m) => {
      const inMonth = yearAppts.filter((a) => {
        const d = new Date(a.inicio);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      });
      return {
        name: format(m, "MMM", { locale: ptBR }),
        Finalizados: inMonth.filter((a) => a.status === "finalizado").length,
        Andamento: inMonth.filter((a) =>
          ["em_atendimento", "chamado", "aguardando_atendimento"].includes(a.status)
        ).length,
        Cancelados: inMonth.filter((a) =>
          ["cancelado", "faltou", "ausente"].includes(a.status)
        ).length,
      };
    });
  }, [yearAppts]);

  const stats = [
    {
      label: "Profissionais",
      value: profissionais.length,
      icon: Stethoscope,
      tint: "bg-indigo-50 text-indigo-600",
      spark: "#4F46E5",
      hint: "Ativos no sistema",
    },
    {
      label: "Pacientes",
      value: pacientes.length,
      icon: Users,
      tint: "bg-orange-50 text-orange-600",
      spark: "#EA580C",
      hint: "Cadastros",
    },
    {
      label: "Consultas hoje",
      value: ops?.hoje_agendados ?? 0,
      icon: CalendarDays,
      tint: "bg-sky-50 text-sky-600",
      spark: "#0284C7",
      hint: `${ops?.finalizados ?? 0} finalizadas`,
    },
    {
      label: "Na fila / espera",
      value: ops?.aguardando ?? 0,
      icon: Clock,
      tint: "bg-emerald-50 text-emerald-600",
      spark: "#059669",
      hint: `Média ${ops?.tempo_medio_espera_min ?? 0} min`,
    },
  ];

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calMonth);
    const end = endOfMonth(calMonth);
    const days: Date[] = [];
    const firstWeekday = (start.getDay() + 6) % 7;
    for (let i = 0; i < firstWeekday; i++) days.push(new Date(NaN));
    for (let d = start.getDate(); d <= end.getDate(); d++) {
      days.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    }
    return days;
  }, [calMonth]);

  const todayList = useMemo(
    () =>
      [...todayAppts]
        .filter((a) => a.status !== "cancelado")
        .sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio))
        .slice(0, 6),
    [todayAppts]
  );

  const totals = useMemo(() => {
    const all = yearAppts.length;
    const cancelled = yearAppts.filter((a) =>
      ["cancelado", "faltou", "ausente"].includes(a.status)
    ).length;
    const completed = yearAppts.filter((a) => a.status === "finalizado").length;
    const ongoing = yearAppts.filter((a) =>
      ["em_atendimento", "chamado", "aguardando_atendimento", "agendado"].includes(a.status)
    ).length;
    return { all, cancelled, completed, ongoing };
  }, [yearAppts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            {profile?.nome ? ` · Olá, ${profile.nome.split(" ")[0]}` : ""}
          </p>
        </div>
        <Button asChild className="shadow-sm self-start">
          <Link to="/agenda">
            <Plus className="w-4 h-4 mr-1.5" />
            Nova consulta
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Carregando indicadores…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="shadow-soft border-border/70 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.tint)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <Sparkline color={s.spark} />
                </div>
                <p className="text-sm text-muted-foreground mt-4">{s.label}</p>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-3xl font-bold tabular-nums tracking-tight">{s.value}</p>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mb-1">
                    <TrendingUp className="w-3 h-3" />
                    {s.hint}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3 shadow-soft border-border/70">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Estatísticas de consultas</CardTitle>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  Todas <strong className="text-foreground">{totals.all}</strong>
                </span>
                <span>
                  Canceladas <strong className="text-destructive">{totals.cancelled}</strong>
                </span>
                <span>
                  Em aberto <strong className="text-sky-600">{totals.ongoing}</strong>
                </span>
                <span>
                  Finalizadas <strong className="text-emerald-600">{totals.completed}</strong>
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="font-normal">
              12 meses
            </Badge>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 16% 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(220 16% 90%)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Finalizados" stackId="a" fill="#4F46E5" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Andamento" stackId="a" fill="#38BDF8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Cancelados" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 shadow-soft border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold capitalize">
              {format(calMonth, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-2">
              {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {calendarDays.map((d, i) => {
                if (Number.isNaN(+d)) return <div key={`e-${i}`} />;
                const has = todayAppts.some((a) => isSameDay(new Date(a.inicio), d)) ||
                  yearAppts.some((a) => isSameDay(new Date(a.inicio), d));
                const isToday = isSameDay(d, new Date());
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "aspect-square rounded-lg text-xs flex items-center justify-center relative",
                      isToday && "bg-primary text-primary-foreground font-semibold",
                      !isToday && has && "bg-primary/10 text-primary font-medium",
                      !isToday && !has && "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Consultas de hoje</p>
                <Link to="/agenda" className="text-xs text-primary font-medium flex items-center">
                  Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {todayList.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma consulta hoje</p>
              )}
              {todayList.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60 transition-colors"
                >
                  <div className="text-xs font-semibold tabular-nums w-12 text-muted-foreground">
                    {format(new Date(a.inicio), "HH:mm")}
                  </div>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-[10px] bg-sky-100 text-sky-700">
                      {(a.patient_nome || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.patient_nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.professional_nome || "Sem profissional"} · {a.status.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-soft border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Profissionais</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/clinica/usuarios">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              {profissionais.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border/80 p-4 hover:shadow-soft transition-shadow bg-card"
                >
                  <Avatar className="w-12 h-12 mb-3">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {p.nome.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm truncate">{p.nome}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {p.cargo || "Profissional"}
                  </p>
                  <Badge variant="secondary" className="mt-3 font-normal text-[10px]">
                    {p.email}
                  </Badge>
                </div>
              ))}
              {profissionais.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-3 py-6 text-center">
                  Nenhum profissional cadastrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Atalhos operacionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { to: "/recepcao", label: "Recepção / Check-in", desc: "Confirmar chegada" },
              { to: "/sala-espera", label: "Sala de espera", desc: "Fila em tempo real" },
              { to: "/pacientes", label: "Pacientes", desc: "Cadastro e fichas" },
              { to: "/atendimento", label: "Atendimentos", desc: "Prontuário eletrônico" },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-3 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
