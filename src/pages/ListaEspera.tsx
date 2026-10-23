import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useSaveWaitlist, useWaitlist } from "@/hooks/use-clinic-ops";
import { usePacientes } from "@/hooks/use-pacientes";
import { useSpecialties } from "@/hooks/use-specialties";
import { useProfessionals } from "@/hooks/use-professionals";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ListaEspera() {
  const { profile } = useAuth();
  const { data = [], isLoading } = useWaitlist("ativa");
  const save = useSaveWaitlist();
  const { data: pacientes = [] } = usePacientes();
  const { data: specialties = [] } = useSpecialties();
  const { data: professionals = [] } = useProfessionals();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    specialty_id: "",
    professional_profile_id: "",
    preferencia_periodo: "qualquer",
    prioridade: "0",
    observacoes: "",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista de espera</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pacientes aguardando vaga para agendamento
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Incluir
        </Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-soft">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Carregando…
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">Lista vazia</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Especialidade</th>
                <th className="px-4 py-3">Preferência</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(w.created_at), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{w.patient_nome}</div>
                    <div className="text-xs text-muted-foreground">{w.patient_telefone}</div>
                  </td>
                  <td className="px-4 py-3">{w.specialty_nome || "—"}</td>
                  <td className="px-4 py-3 capitalize">{w.preferencia_periodo}</td>
                  <td className="px-4 py-3">
                    <Badge variant={w.prioridade > 0 ? "default" : "secondary"}>
                      {w.prioridade}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await save.mutateAsync({ id: w.id, status: "agendada" });
                        toast.success("Marcado como agendado");
                      }}
                    >
                      Agendado
                    </Button>
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
            <DialogTitle>Incluir na lista de espera</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await save.mutateAsync({
                  ...form,
                  unit_id: profile?.clinica_id,
                  specialty_id: form.specialty_id || null,
                  professional_profile_id: form.professional_profile_id || null,
                  prioridade: Number(form.prioridade) || 0,
                });
                toast.success("Incluído na lista");
                setOpen(false);
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          >
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
                  <SelectValue />
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
              <Label>Profissional preferido</Label>
              <Select
                value={form.professional_profile_id || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, professional_profile_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p.profile_id} value={p.profile_id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select
                  value={form.preferencia_periodo}
                  onValueChange={(v) => setForm((f) => ({ ...f, preferencia_periodo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualquer">Qualquer</SelectItem>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => setForm((f) => ({ ...f, prioridade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Normal</SelectItem>
                    <SelectItem value="1">Alta</SelectItem>
                    <SelectItem value="2">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
