import { useMemo, useState } from "react";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { CalendarDays, Plus, Loader2, Building2 } from "lucide-react";
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
import { useAppointments, useSaveAppointment, useAppointmentStatus } from "@/hooks/use-appointments";
import { usePacientes } from "@/hooks/use-pacientes";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSpecialties, useSpecialtyAreas } from "@/hooks/use-specialties";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AgendaClinica() {
  const { profile, isAdmin, activeTenantId, activeTenantName } = useAuth();
  const unitId = profile?.clinica_id || activeTenantId || undefined;
  const needsClinic = isAdmin && !unitId;

  const [day, setDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [areaFilter, setAreaFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const from = startOfDay(new Date(day + "T12:00:00")).toISOString();
  const to = endOfDay(new Date(day + "T12:00:00")).toISOString();
  const { data = [], isLoading } = useAppointments({
    from,
    to,
    unit_id: unitId,
    specialty_id: specialtyFilter !== "all" ? specialtyFilter : undefined,
    area: areaFilter !== "all" ? areaFilter : undefined,
  });
  const { data: pacientes = [] } = usePacientes();
  const { data: areas = [] } = useSpecialtyAreas();
  const { data: specialties = [] } = useSpecialties(
    areaFilter !== "all" ? { area: areaFilter } : undefined
  );
  const { data: profissionais = [] } = useProfessionals({
    area: areaFilter !== "all" ? areaFilter : undefined,
    specialty_id: specialtyFilter !== "all" ? specialtyFilter : undefined,
  });
  const save = useSaveAppointment();
  const setStatus = useAppointmentStatus();

  const [open, setOpen] = useState(false);
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

  const sorted = useMemo(
    () => [...data].sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio)),
    [data]
  );

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

  return (
    <div className="space-y-6">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {activeTenantName
              ? `Clínica: ${activeTenantName}`
              : "Consultas desta unidade · isolada por clínica"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={areaFilter}
            onValueChange={(v) => {
              setAreaFilter(v);
              setSpecialtyFilter("all");
            }}
          >
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-[220px] bg-card">
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="w-auto bg-card shadow-soft border-border/70"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <Button variant="outline" onClick={() => setDay(format(new Date(), "yyyy-MM-dd"))}>
            Hoje
          </Button>
          <Button variant="outline" onClick={() => setDay(format(addDays(new Date(day), 1), "yyyy-MM-dd"))}>
            +1 dia
          </Button>
          <Button onClick={() => setOpen(true)} className="shadow-sm" disabled={needsClinic}>
            <Plus className="w-4 h-4 mr-2" />
            Nova consulta
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-soft">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Carregando…
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">Nenhuma consulta neste dia</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3">Especialidade</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {format(new Date(a.inicio), "HH:mm", { locale: ptBR })}–
                    {format(new Date(a.fim), "HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.patient_nome}</div>
                    <div className="text-xs text-muted-foreground">{a.patient_codigo}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.professional_nome || "—"}</td>
                  <td className="px-4 py-3">
                    {a.specialty_nome ? (
                      <Badge variant="secondary">{a.specialty_nome}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{a.modalidade}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{a.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!["cancelado", "finalizado"].includes(a.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={async () => {
                          const reason = window.prompt("Motivo do cancelamento:");
                          if (!reason || reason.trim().length < 3) return;
                          try {
                            await setStatus.mutateAsync({
                              id: a.id,
                              status: "cancelado",
                              reason,
                            });
                            toast.success("Consulta cancelada");
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
                value={form.professional_profile_id}
                onValueChange={onSelectProfessional}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
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
