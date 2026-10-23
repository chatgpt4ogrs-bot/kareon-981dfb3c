import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Timer, Megaphone, Stethoscope, Loader2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWaitingQueue, useCallNext, useAppointmentStatus } from "@/hooks/use-appointments";
import { useSaveEncounter } from "@/hooks/use-encounters";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  aguardando_atendimento: "bg-amber-100 text-amber-900",
  chamado: "bg-sky-100 text-sky-900",
  em_atendimento: "bg-emerald-100 text-emerald-900",
};

export default function SalaEspera() {
  const { data = [], isLoading } = useWaitingQueue();
  const callNext = useCallNext();
  const setStatus = useAppointmentStatus();
  const startEncounter = useSaveEncounter();
  const { profile } = useAuth();
  const navigate = useNavigate();

  async function handleCallNext() {
    try {
      const row = await callNext.mutateAsync({
        professional_profile_id: profile?.id,
        unit_id: profile?.clinica_id || undefined,
      });
      toast.success(`Chamado: ${(row as any).patient_nome}`);
    } catch (e: any) {
      toast.error(e.message || "Nenhum paciente na fila");
    }
  }

  async function handleStart(appointmentId: string, patientId: string, unitId: string) {
    try {
      await setStatus.mutateAsync({ id: appointmentId, status: "em_atendimento" });
      const enc = await startEncounter.mutateAsync({
        appointment_id: appointmentId,
        patient_id: patientId,
        unit_id: unitId,
      });
      navigate(`/atendimento/clinico/${enc.id}`);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível iniciar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sala de espera</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Timer className="w-3.5 h-3.5" />
            Atualização automática · {data.length} na fila
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.clinica_id && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/painel-tv?unit_id=${profile.clinica_id}`, "_blank", "noopener")
              }
            >
              <Monitor className="w-4 h-4 mr-2" />
              Abrir painel TV
            </Button>
          )}
          <Button onClick={handleCallNext} disabled={callNext.isPending} className="shadow-sm">
            <Megaphone className="w-4 h-4 mr-2" />
            Chamar próximo
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading && (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Carregando fila…
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            Nenhum paciente aguardando no momento
          </div>
        )}
        {data.map((w) => (
          <div
            key={w.id}
            className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-lg">{w.patient_nome}</span>
                <Badge className={cn("font-normal", STATUS_CLASS[w.status] || "bg-muted")}>
                  {w.status.replace(/_/g, " ")}
                </Badge>
                {w.prioridade > 0 && <Badge variant="destructive">Prioridade</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Senha <span className="font-mono font-medium text-foreground">{w.senha}</span>
                {" · "}
                Agendado{" "}
                {w.horario_agendado
                  ? format(new Date(w.horario_agendado), "HH:mm")
                  : "—"}
                {" · "}
                Chegada{" "}
                {w.checkin_at ? format(new Date(w.checkin_at), "HH:mm") : "—"}
                {" · "}
                Espera{" "}
                <strong>{Math.max(0, Math.round(Number(w.espera_minutos) || 0))} min</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {w.professional_nome || "Sem profissional"} · {w.room_nome || "Sala a definir"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {w.status === "aguardando_atendimento" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStatus.mutateAsync({ id: w.appointment_id, status: "chamado" }).then(() =>
                      toast.success("Paciente chamado")
                    )
                  }
                >
                  Chamar
                </Button>
              )}
              {(w.status === "chamado" || w.status === "aguardando_atendimento") && (
                <Button
                  size="sm"
                  onClick={() => handleStart(w.appointment_id, w.patient_id, w.unit_id)}
                >
                  <Stethoscope className="w-4 h-4 mr-1" />
                  Iniciar atendimento
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
