import { useMemo, useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppointments, useCheckin } from "@/hooks/use-appointments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  aguardando_checkin: "Aguardando check-in",
  aguardando_atendimento: "Na fila",
  chamado: "Chamado",
  em_atendimento: "Em atendimento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  faltou: "Faltou",
  ausente: "Ausente",
};

export default function Recepcao() {
  const todayFrom = startOfDay(new Date()).toISOString();
  const todayTo = endOfDay(new Date()).toISOString();
  const { data = [], isLoading } = useAppointments({ from: todayFrom, to: todayTo });
  const checkin = useCheckin();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data
      .filter((a) => !["cancelado", "finalizado"].includes(a.status))
      .filter((a) => {
        if (!term) return true;
        return (
          a.patient_nome?.toLowerCase().includes(term) ||
          a.patient_codigo?.toLowerCase().includes(term) ||
          a.patient_telefone?.includes(term) ||
          a.professional_nome?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio));
  }, [data, q]);

  async function handleCheckin(id: string) {
    try {
      await checkin.mutateAsync(id);
      toast.success("Check-in registrado. Paciente na sala de espera.");
    } catch (e: any) {
      toast.error(e.message || "Falha no check-in");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recepção</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Check-in do dia · sem acesso ao prontuário clínico
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-card shadow-soft border-border/70"
            placeholder="Buscar paciente, código ou telefone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Horário</th>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Profissional</th>
              <th className="px-4 py-3 font-medium">Sala</th>
              <th className="px-4 py-3 font-medium">Modalidade</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Chegada</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  Carregando agenda do dia…
                </td>
              </tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum agendamento para hoje
                </td>
              </tr>
            )}
            {list.map((a) => {
              const canCheckin = ["agendado", "aguardando_checkin"].includes(a.status) && !a.checkin_at;
              return (
                <tr key={a.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {format(new Date(a.inicio), "HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.patient_nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.patient_codigo || "—"} · {a.patient_telefone || "sem telefone"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.professional_nome || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.room_nome || "—"}</td>
                  <td className="px-4 py-3 capitalize">{a.modalidade}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={cn("font-normal")}>
                      {STATUS_LABEL[a.status] || a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {a.checkin_at
                      ? format(new Date(a.checkin_at), "HH:mm", { locale: ptBR })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canCheckin ? (
                      <Button
                        size="sm"
                        onClick={() => handleCheckin(a.id)}
                        disabled={checkin.isPending}
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Check-in
                      </Button>
                    ) : a.checkin_at ? (
                      <span className="text-xs text-emerald-700">Presente</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
