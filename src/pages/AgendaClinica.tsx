import { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  isSameDay,
  parseISO,
  differenceInMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  Ban,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAppointments,
  useSaveAppointment,
  useAppointmentStatus,
  type Appointment,
} from "@/hooks/use-appointments";
import { usePacientes } from "@/hooks/use-pacientes";
import { useProfessionals, type Professional } from "@/hooks/use-professionals";
import { useSpecialties } from "@/hooks/use-specialties";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const START_HOUR = 7;
const END_HOUR = 21;
const PX_PER_MIN = 1.4;
const DAY_MINUTES = (END_HOUR - START_HOUR) * 60;
const GRID_HEIGHT = DAY_MINUTES * PX_PER_MIN;

const PRO_COLORS = [
  { bg: "bg-sky-50", border: "border-sky-200", avatar: "bg-sky-500", text: "text-sky-900", soft: "bg-sky-100" },
  { bg: "bg-orange-50", border: "border-orange-200", avatar: "bg-orange-500", text: "text-orange-900", soft: "bg-orange-100" },
  { bg: "bg-indigo-50", border: "border-indigo-200", avatar: "bg-indigo-600", text: "text-indigo-950", soft: "bg-indigo-100" },
  { bg: "bg-emerald-50", border: "border-emerald-200", avatar: "bg-emerald-500", text: "text-emerald-900", soft: "bg-emerald-100" },
  { bg: "bg-violet-50", border: "border-violet-200", avatar: "bg-violet-500", text: "text-violet-900", soft: "bg-violet-100" },
  { bg: "bg-rose-50", border: "border-rose-200", avatar: "bg-rose-500", text: "text-rose-900", soft: "bg-rose-100" },
];

type StatusBucket = "a_confirmar" | "confirmados" | "concluidos" | "faltas" | "outros";

function statusBucket(status: string): StatusBucket {
  if (status === "agendado" || status === "aguardando_checkin") return "a_confirmar";
  if (
    status === "aguardando_atendimento" ||
    status === "chamado" ||
    status === "em_atendimento"
  ) {
    return "confirmados";
  }
  if (status === "finalizado") return "concluidos";
  if (status === "faltou" || status === "ausente") return "faltas";
  return "outros";
}

function statusDot(status: string) {
  const b = statusBucket(status);
  if (b === "a_confirmar") return "bg-sky-500";
  if (b === "confirmados") return "bg-emerald-500";
  if (b === "concluidos") return "bg-violet-500";
  if (b === "faltas") return "bg-rose-500";
  return "bg-slate-400";
}

function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function minutesFromStart(iso: string, day: Date) {
  const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
  const start = new Date(day);
  start.setHours(START_HOUR, 0, 0, 0);
  return Math.max(0, Math.min(DAY_MINUTES, differenceInMinutes(d, start)));
}

function appointmentTopHeight(a: Appointment, day: Date) {
  const top = minutesFromStart(a.inicio, day) * PX_PER_MIN;
  const dur = Math.max(
    20,
    differenceInMinutes(new Date(a.fim), new Date(a.inicio)) || a.duracao_minutos || 30
  );
  return { top, height: Math.max(28, dur * PX_PER_MIN) };
}

export default function AgendaClinica() {
  const { profile, isAdmin, activeTenantId, activeTenantName } = useAuth();
  const unitId = profile?.clinica_id || activeTenantId || undefined;
  const needsClinic = isAdmin && !unitId;

  const [day, setDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const dayDate = useMemo(() => new Date(day + "T12:00:00"), [day]);
  const [proFilter, setProFilter] = useState("all");
  const [now, setNow] = useState(() => new Date());

  const from = startOfDay(dayDate).toISOString();
  const to = endOfDay(dayDate).toISOString();
  const { data = [], isLoading } = useAppointments({ from, to, unit_id: unitId });
  const { data: pacientes = [] } = usePacientes();
  const { data: specialties = [] } = useSpecialties();
  const { data: profissionais = [] } = useProfessionals();
  const save = useSaveAppointment();
  const setStatus = useAppointmentStatus();

  const [open, setOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    patient_id: "",
    professional_profile_id: "",
    specialty_id: "",
    hora: "09:00",
    duracao_minutos: "30",
    modalidade: "presencial",
    notes: "",
    recurrence_weeks: "0",
    valor: "",
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const activePros = useMemo(() => {
    const list = profissionais.filter((p) => p.ativo !== false);
    if (proFilter === "all") return list;
    return list.filter((p) => p.profile_id === proFilter);
  }, [profissionais, proFilter]);

  const columns = useMemo(() => {
    const byId = new Map(activePros.map((p) => [p.profile_id, p]));
    const cols: { id: string; nome: string; professional?: Professional }[] = activePros.map(
      (p) => ({ id: p.profile_id, nome: p.nome, professional: p })
    );
    const orphan = data.filter(
      (a) => a.professional_profile_id && !byId.has(a.professional_profile_id)
    );
    for (const a of orphan) {
      const id = a.professional_profile_id!;
      if (!cols.some((c) => c.id === id)) {
        cols.push({ id, nome: a.professional_nome || "Profissional" });
      }
    }
    if (data.some((a) => !a.professional_profile_id) && proFilter === "all") {
      cols.push({ id: "__none__", nome: "Sem profissional" });
    }
    return cols;
  }, [activePros, data, proFilter]);

  const stats = useMemo(() => {
    const visible = data.filter((a) => a.status !== "cancelado");
    return {
      total: visible.length,
      a_confirmar: visible.filter((a) => statusBucket(a.status) === "a_confirmar").length,
      confirmados: visible.filter((a) => statusBucket(a.status) === "confirmados").length,
      concluidos: visible.filter((a) => statusBucket(a.status) === "concluidos").length,
      faltas: visible.filter((a) => statusBucket(a.status) === "faltas").length,
    };
  }, [data]);

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    []
  );

  const isToday = isSameDay(dayDate, now);
  const nowTop = isToday ? minutesFromStart(now.toISOString(), dayDate) * PX_PER_MIN : null;

  function openCreate(opts?: { hora?: string; professional_profile_id?: string }) {
    const pr = profissionais.find((p) => p.profile_id === opts?.professional_profile_id);
    setForm({
      patient_id: "",
      professional_profile_id: opts?.professional_profile_id || "",
      specialty_id: pr?.specialty_id || "",
      hora: opts?.hora || "09:00",
      duracao_minutos: String(pr?.duracao_padrao_minutos || 30),
      modalidade: "presencial",
      notes: "",
      recurrence_weeks: "0",
      valor: "",
    });
    setOpen(true);
  }

  function onSelectProfessional(profileId: string) {
    const pr = profissionais.find((p) => p.profile_id === profileId);
    setForm((f) => ({
      ...f,
      professional_profile_id: profileId,
      specialty_id: pr?.specialty_id || f.specialty_id,
      duracao_minutos: String(pr?.duracao_padrao_minutos || f.duracao_minutos || 30),
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) {
      toast.error("Entre em uma clínica (tenant) para usar a agenda dela");
      return;
    }
    if (!form.patient_id) {
      toast.error("Selecione o paciente");
      return;
    }
    try {
      const inicio = new Date(`${day}T${form.hora}:00`);
      const res: any = await save.mutateAsync({
        patient_id: form.patient_id,
        professional_profile_id: form.professional_profile_id || profile?.id || null,
        specialty_id: form.specialty_id || null,
        unit_id: unitId,
        inicio: inicio.toISOString(),
        duracao_minutos: Number(form.duracao_minutos) || 30,
        modalidade: form.modalidade,
        notes: form.notes || null,
        status: "agendado",
        recurrence_weeks: Number(form.recurrence_weeks) || 0,
        valor: form.valor ? Number(form.valor) : null,
      } as any);
      const n = res?.recurrence_count || 1;
      toast.success(n > 1 ? `${n} consultas agendadas (recorrência)` : "Consulta agendada");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar");
    }
  }

  function apptsForColumn(colId: string) {
    return data.filter((a) => {
      if (a.status === "cancelado") return false;
      if (colId === "__none__") return !a.professional_profile_id;
      return a.professional_profile_id === colId;
    });
  }

  return (
    <div className="space-y-4">
      {needsClinic && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 text-amber-950 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 shrink-0" />
            Cada clínica tem sua própria agenda. Entre em um tenant para ver e agendar.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin?tab=tenants">Abrir tenants</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight mr-2">Agenda</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setDay(format(subDays(dayDate, 1), "yyyy-MM-dd"))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setDay(format(new Date(), "yyyy-MM-dd"))}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setDay(format(addDays(dayDate, 1), "yyyy-MM-dd"))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Input
            type="date"
            className="w-auto h-9 bg-card"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <p className="text-sm text-muted-foreground capitalize pl-1">
            {format(dayDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => toast.message("Folgas e bloqueios em breve")}
          >
            <Ban className="w-3.5 h-3.5" />
            Folgas e bloqueios
          </Button>
          <Select value={proFilter} onValueChange={setProFilter}>
            <SelectTrigger className="w-[220px] h-9 bg-card">
              <SelectValue placeholder="Profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {profissionais.map((p) => (
                <SelectItem key={p.profile_id} value={p.profile_id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-9 shadow-sm"
            disabled={needsClinic}
            onClick={() => openCreate()}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova consulta
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{stats.total} agendamentos</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          {stats.a_confirmar} a confirmar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {stats.confirmados} confirmados
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          {stats.concluidos} concluídos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          {stats.faltas} faltas
        </span>
        {activeTenantName && (
          <span className="text-xs ml-auto">Clínica: {activeTenantName}</span>
        )}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Carregando…
          </div>
        ) : columns.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground space-y-3">
            <p>Nenhum profissional nesta unidade.</p>
            <Button variant="outline" size="sm" onClick={() => openCreate()}>
              Agendar mesmo assim
            </Button>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <div
              className="min-w-max"
              style={{
                display: "grid",
                gridTemplateColumns: `64px repeat(${columns.length}, minmax(200px, 1fr))`,
              }}
            >
              {/* Header */}
              <div className="sticky top-0 z-20 bg-card border-b border-border/70 h-16" />
              {columns.map((col, idx) => {
                const color = PRO_COLORS[idx % PRO_COLORS.length];
                const count = apptsForColumn(col.id).length;
                return (
                  <div
                    key={col.id}
                    className="sticky top-0 z-20 bg-card border-b border-l border-border/70 h-16 px-3 flex items-center gap-2.5"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                        color.avatar
                      )}
                    >
                      {initials(col.nome) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{col.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} agendamento{count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Time gutter */}
              <div className="relative border-r border-border/60 bg-muted/20" style={{ height: GRID_HEIGHT }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 text-[11px] text-muted-foreground pr-2 text-right -translate-y-1/2"
                    style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Columns */}
              {columns.map((col, idx) => {
                const color = PRO_COLORS[idx % PRO_COLORS.length];
                const appts = apptsForColumn(col.id);
                return (
                  <div
                    key={col.id}
                    className="relative border-l border-border/60"
                    style={{ height: GRID_HEIGHT }}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const mins = Math.round(y / PX_PER_MIN / 15) * 15;
                      const h = START_HOUR + Math.floor(mins / 60);
                      const m = mins % 60;
                      if (h < START_HOUR || h >= END_HOUR) return;
                      openCreate({
                        hora: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
                        professional_profile_id: col.id === "__none__" ? "" : col.id,
                      });
                    }}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
                        style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
                      />
                    ))}
                    {hours.map((h) => (
                      <div
                        key={`${h}-half`}
                        className="absolute left-0 right-0 border-t border-dashed border-border/25 pointer-events-none"
                        style={{ top: ((h - START_HOUR) * 60 + 30) * PX_PER_MIN }}
                      />
                    ))}

                    {nowTop != null && (
                      <div
                        className="absolute left-0 right-0 z-10 pointer-events-none"
                        style={{ top: nowTop }}
                      >
                        <div className="relative h-0 border-t-2 border-rose-500">
                          <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-rose-500" />
                        </div>
                      </div>
                    )}

                    {appts.map((a) => {
                      const { top, height } = appointmentTopHeight(a, dayDate);
                      const online = a.modalidade === "teleconsulta";
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppt(a);
                          }}
                          className={cn(
                            "absolute left-1.5 right-1.5 rounded-xl border text-left px-2.5 py-1.5 shadow-sm overflow-hidden transition-shadow hover:shadow-md z-[5]",
                            color.bg,
                            color.border,
                            color.text
                          )}
                          style={{ top, height: Math.max(height, 36) }}
                        >
                          <span
                            className={cn(
                              "absolute top-2 right-2 w-2 h-2 rounded-full",
                              statusDot(a.status)
                            )}
                          />
                          <p className="text-[11px] font-semibold leading-tight pr-3 truncate">
                            {format(new Date(a.inicio), "HH:mm")} {a.patient_nome || "Paciente"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {online && (
                              <span className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded bg-pink-500 text-white">
                                ONLINE
                              </span>
                            )}
                            <span className="text-[10px] opacity-80 truncate">
                              {a.specialty_nome || a.service_nome || a.modalidade}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detalhe do agendamento */}
      <Dialog open={!!selectedAppt} onOpenChange={(o) => !o && setSelectedAppt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consulta</DialogTitle>
          </DialogHeader>
          {selectedAppt && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Paciente: </span>
                <strong>{selectedAppt.patient_nome}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Horário: </span>
                {format(new Date(selectedAppt.inicio), "dd/MM/yyyy HH:mm")} –{" "}
                {format(new Date(selectedAppt.fim), "HH:mm")}
              </p>
              <p>
                <span className="text-muted-foreground">Profissional: </span>
                {selectedAppt.professional_nome || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Status: </span>
                {selectedAppt.status.replace(/_/g, " ")}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedAppt.status === "agendado" && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await setStatus.mutateAsync({
                          id: selectedAppt.id,
                          status: "aguardando_atendimento",
                        });
                        toast.success("Consulta confirmada");
                        setSelectedAppt(null);
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    Confirmar
                  </Button>
                )}
                {!["cancelado", "finalizado", "faltou"].includes(selectedAppt.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={async () => {
                      const reason = window.prompt("Motivo do cancelamento:");
                      if (!reason || reason.trim().length < 3) return;
                      try {
                        await setStatus.mutateAsync({
                          id: selectedAppt.id,
                          status: "cancelado",
                          reason,
                        });
                        toast.success("Consulta cancelada");
                        setSelectedAppt(null);
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                {!["cancelado", "finalizado", "faltou"].includes(selectedAppt.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await setStatus.mutateAsync({
                          id: selectedAppt.id,
                          status: "faltou",
                        });
                        toast.success("Marcado como falta");
                        setSelectedAppt(null);
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    Falta
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova consulta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select
                value={form.patient_id}
                onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Especialidade</Label>
              <Select
                value={form.specialty_id || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, specialty_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select
                value={form.professional_profile_id || "none"}
                onValueChange={(v) =>
                  v === "none" ? setForm((f) => ({ ...f, professional_profile_id: "" })) : onSelectProfessional(v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {profissionais.map((p) => (
                    <SelectItem key={p.profile_id} value={p.profile_id}>
                      {p.titulo ? `${p.titulo} ` : ""}
                      {p.nome}
                      {p.specialty_nome ? ` · ${p.specialty_nome}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input
                  value={form.duracao_minutos}
                  onChange={(e) => setForm((f) => ({ ...f, duracao_minutos: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <Select
                  value={form.modalidade}
                  onValueChange={(v) => setForm((f) => ({ ...f, modalidade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="teleconsulta">Teleconsulta</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="encaixe">Encaixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recorrência (semanas)</Label>
                <Select
                  value={form.recurrence_weeks}
                  onValueChange={(v) => setForm((f) => ({ ...f, recurrence_weeks: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Somente esta</SelectItem>
                    <SelectItem value="3">+3 semanas</SelectItem>
                    <SelectItem value="7">+7 semanas</SelectItem>
                    <SelectItem value="11">+11 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (opcional)</Label>
                <Input
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Agendar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
