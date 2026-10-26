import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useDeleteSchedule,
  useInsurancePlans,
  useRooms,
  useSaveInsurance,
  useSaveRoom,
  useSaveSchedule,
  useSaveService,
  useSchedules,
  useServices,
} from "@/hooks/use-clinic-ops";
import { useSpecialties } from "@/hooks/use-specialties";
import { useProfessionals } from "@/hooks/use-professionals";
import { useAuth } from "@/contexts/AuthContext";
import PreDocumentosPanel from "@/components/PreDocumentosPanel";
import { toast } from "sonner";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CadastrosClinica() {
  const { profile } = useAuth();
  const { data: rooms = [], isLoading: loadingRooms } = useRooms();
  const { data: services = [], isLoading: loadingServices } = useServices();
  const { data: plans = [], isLoading: loadingPlans } = useInsurancePlans();
  const { data: specialties = [] } = useSpecialties();
  const { data: professionals = [] } = useProfessionals();
  const saveRoom = useSaveRoom();
  const saveService = useSaveService();
  const saveInsurance = useSaveInsurance();
  const saveSchedule = useSaveSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [profId, setProfId] = useState("");
  const { data: schedules = [] } = useSchedules(profId || undefined);

  const [dialog, setDialog] = useState<"room" | "service" | "insurance" | "schedule" | null>(null);
  const [roomForm, setRoomForm] = useState({ nome: "", codigo: "", tipo: "consultorio" });
  const [svcForm, setSvcForm] = useState({
    nome: "",
    codigo: "",
    specialty_id: "",
    duracao_minutos: "30",
    valor: "0",
  });
  const [insForm, setInsForm] = useState({ nome: "", codigo: "", registro_ans: "", telefone: "" });
  const [schForm, setSchForm] = useState({ weekday: "1", hora_inicio: "08:00", hora_fim: "12:00" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cadastros da clínica</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Salas, serviços, convênios, escalas e pré-documentos
        </p>
      </div>

      <Tabs defaultValue="rooms">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="rooms">Salas</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="insurance">Convênios</TabsTrigger>
          <TabsTrigger value="schedules">Escalas</TabsTrigger>
          <TabsTrigger value="predocs">Pré-documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-3 mt-4">
          <Button size="sm" onClick={() => setDialog("room")}>
            <Plus className="w-4 h-4 mr-1" /> Nova sala
          </Button>
          <TableBlock loading={loadingRooms} empty={!rooms.length}>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-medium">{r.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.codigo || "—"}</td>
                <td className="px-4 py-3 capitalize">{r.tipo}</td>
              </tr>
            ))}
          </TableBlock>
        </TabsContent>

        <TabsContent value="services" className="space-y-3 mt-4">
          <Button size="sm" onClick={() => setDialog("service")}>
            <Plus className="w-4 h-4 mr-1" /> Novo serviço
          </Button>
          <TableBlock loading={loadingServices} empty={!services.length} cols={["Nome", "Especialidade", "Duração", "Valor"]}>
            {services.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3 font-medium">{s.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.specialty_nome || "—"}</td>
                <td className="px-4 py-3">{s.duracao_minutos} min</td>
                <td className="px-4 py-3">
                  {Number(s.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
              </tr>
            ))}
          </TableBlock>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-3 mt-4">
          <Button size="sm" onClick={() => setDialog("insurance")}>
            <Plus className="w-4 h-4 mr-1" /> Novo convênio
          </Button>
          <TableBlock loading={loadingPlans} empty={!plans.length} cols={["Nome", "Código", "ANS", "Telefone"]}>
            {plans.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="px-4 py-3">{p.codigo || "—"}</td>
                <td className="px-4 py-3">{p.registro_ans || "—"}</td>
                <td className="px-4 py-3">{p.telefone || "—"}</td>
              </tr>
            ))}
          </TableBlock>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-3 mt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={profId || "none"} onValueChange={(v) => setProfId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-[260px] bg-card">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione…</SelectItem>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!profId} onClick={() => setDialog("schedule")}>
              <Plus className="w-4 h-4 mr-1" /> Horário
            </Button>
          </div>
          {!profId ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Selecione um profissional para ver a escala
            </p>
          ) : (
            <TableBlock loading={false} empty={!schedules.length} cols={["Dia", "Início", "Fim", ""]}>
              {schedules.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3">{WEEKDAYS[s.weekday]}</td>
                  <td className="px-4 py-3">{String(s.hora_inicio).slice(0, 5)}</td>
                  <td className="px-4 py-3">{String(s.hora_fim).slice(0, 5)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        await deleteSchedule.mutateAsync(s.id);
                        toast.success("Removido");
                      }}
                    >
                      Remover
                    </Button>
                  </td>
                </tr>
              ))}
            </TableBlock>
          )}
        </TabsContent>

        <TabsContent value="predocs" className="mt-4">
          <PreDocumentosPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={dialog === "room"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova sala</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveRoom.mutateAsync({ ...roomForm, unit_id: profile?.clinica_id });
                toast.success("Sala criada");
                setDialog(null);
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={roomForm.nome}
                onChange={(e) => setRoomForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input
                  value={roomForm.codigo}
                  onChange={(e) => setRoomForm((f) => ({ ...f, codigo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={roomForm.tipo}
                  onValueChange={(v) => setRoomForm((f) => ({ ...f, tipo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultorio">Consultório</SelectItem>
                    <SelectItem value="sala">Sala</SelectItem>
                    <SelectItem value="procedimento">Procedimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "service"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo serviço</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveService.mutateAsync({
                  ...svcForm,
                  unit_id: profile?.clinica_id,
                  specialty_id: svcForm.specialty_id || null,
                  duracao_minutos: Number(svcForm.duracao_minutos),
                  valor: Number(svcForm.valor),
                });
                toast.success("Serviço criado");
                setDialog(null);
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={svcForm.nome}
                onChange={(e) => setSvcForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Especialidade</Label>
              <Select
                value={svcForm.specialty_id || "none"}
                onValueChange={(v) =>
                  setSvcForm((f) => ({ ...f, specialty_id: v === "none" ? "" : v }))
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input
                  value={svcForm.duracao_minutos}
                  onChange={(e) => setSvcForm((f) => ({ ...f, duracao_minutos: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input
                  value={svcForm.valor}
                  onChange={(e) => setSvcForm((f) => ({ ...f, valor: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "insurance"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo convênio</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveInsurance.mutateAsync({ ...insForm, unit_id: profile?.clinica_id });
                toast.success("Convênio criado");
                setDialog(null);
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={insForm.nome}
                onChange={(e) => setInsForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input
                  value={insForm.codigo}
                  onChange={(e) => setInsForm((f) => ({ ...f, codigo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Registro ANS</Label>
                <Input
                  value={insForm.registro_ans}
                  onChange={(e) => setInsForm((f) => ({ ...f, registro_ans: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={insForm.telefone}
                onChange={(e) => setInsForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "schedule"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horário na escala</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveSchedule.mutateAsync({
                  professional_id: profId,
                  unit_id: profile?.clinica_id,
                  weekday: Number(schForm.weekday),
                  hora_inicio: schForm.hora_inicio,
                  hora_fim: schForm.hora_fim,
                });
                toast.success("Horário adicionado");
                setDialog(null);
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label>Dia</Label>
              <Select
                value={schForm.weekday}
                onValueChange={(v) => setSchForm((f) => ({ ...f, weekday: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={schForm.hora_inicio}
                  onChange={(e) => setSchForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={schForm.hora_fim}
                  onChange={(e) => setSchForm((f) => ({ ...f, hora_fim: e.target.value }))}
                />
              </div>
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

function TableBlock({
  loading,
  empty,
  children,
  cols = ["Nome", "Código", "Tipo"],
}: {
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
  cols?: string[];
}) {
  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
        Carregando…
      </div>
    );
  }
  if (empty) {
    return <div className="py-12 text-center text-muted-foreground">Nenhum registro</div>;
  }
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
