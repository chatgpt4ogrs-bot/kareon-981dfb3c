import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtendimento, useSaveAtendimento } from "@/hooks/use-atendimentos";
import { usePacientes } from "@/hooks/use-pacientes";
import { toast } from "sonner";

const empty = {
  paciente_id: "",
  status: "em_andamento",
  tipo: "presencial",
  queixa_principal: "",
  anamnese: "",
  exame_fisico: "",
  diagnostico_cid: "",
  diagnostico_descricao: "",
  conduta: "",
  evolucao: "",
  prescricao: "",
  exames_solicitados: "",
  atestado: "",
  observacoes: "",
  sinais_vitais: {
    peso: "",
    altura: "",
    pressao: "",
    temperatura: "",
    saturacao: "",
  } as Record<string, string>,
};

export default function AtendimentoForm() {
  const { id } = useParams();
  const isNew = !id || id === "novo";
  const navigate = useNavigate();
  const { data: existing, isLoading } = useAtendimento(isNew ? undefined : id);
  const { data: pacientes = [] } = usePacientes();
  const save = useSaveAtendimento();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (existing) {
      setForm({
        paciente_id: existing.paciente_id,
        status: existing.status,
        tipo: existing.tipo,
        queixa_principal: existing.queixa_principal || "",
        anamnese: existing.anamnese || "",
        exame_fisico: existing.exame_fisico || "",
        diagnostico_cid: existing.diagnostico_cid || "",
        diagnostico_descricao: existing.diagnostico_descricao || "",
        conduta: existing.conduta || "",
        evolucao: existing.evolucao || "",
        prescricao: existing.prescricao || "",
        exames_solicitados: existing.exames_solicitados || "",
        atestado: existing.atestado || "",
        observacoes: existing.observacoes || "",
        sinais_vitais: {
          peso: String((existing.sinais_vitais as any)?.peso ?? ""),
          altura: String((existing.sinais_vitais as any)?.altura ?? ""),
          pressao: String((existing.sinais_vitais as any)?.pressao ?? ""),
          temperatura: String((existing.sinais_vitais as any)?.temperatura ?? ""),
          saturacao: String((existing.sinais_vitais as any)?.saturacao ?? ""),
        },
      });
    }
  }, [existing]);

  async function handleSave() {
    if (!form.paciente_id) {
      toast.error("Selecione o paciente");
      return;
    }
    try {
      const saved = await save.mutateAsync({
        ...(isNew ? {} : { id }),
        ...form,
      });
      toast.success("Atendimento salvo");
      if (isNew) navigate(`/atendimento/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isNew ? "Novo atendimento" : "Prontuário do atendimento"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Histórico, exame, decisão clínica e documentos
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 p-4 rounded-xl border bg-card">
        <div className="space-y-1.5 sm:col-span-1">
          <Label>Paciente</Label>
          <Select
            value={form.paciente_id}
            onValueChange={(v) => set("paciente_id", v)}
            disabled={!isNew}
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
          <Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="teleconsulta">Teleconsulta</SelectItem>
              <SelectItem value="retorno">Retorno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="faltou">Faltou</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="historico" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="exame">Exame</TabsTrigger>
          <TabsTrigger value="decisao">Decisão</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-4 rounded-xl border p-4 bg-card">
          <div className="space-y-1.5">
            <Label>Queixa principal / atendimento atual</Label>
            <Textarea
              rows={3}
              value={form.queixa_principal}
              onChange={(e) => set("queixa_principal", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value="exame" className="space-y-4 rounded-xl border p-4 bg-card">
          <div className="space-y-1.5">
            <Label>Anamnese</Label>
            <Textarea rows={5} value={form.anamnese} onChange={(e) => set("anamnese", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Exame físico</Label>
            <Textarea
              rows={4}
              value={form.exame_fisico}
              onChange={(e) => set("exame_fisico", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              [
                ["peso", "Peso"],
                ["altura", "Altura"],
                ["pressao", "PA"],
                ["temperatura", "Temp."],
                ["saturacao", "SpO₂"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={form.sinais_vitais[key] || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sinais_vitais: { ...f.sinais_vitais, [key]: e.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="decisao" className="space-y-4 rounded-xl border p-4 bg-card">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CID-10</Label>
              <Input
                value={form.diagnostico_cid}
                onChange={(e) => set("diagnostico_cid", e.target.value)}
                placeholder="Ex.: F84.0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição do diagnóstico</Label>
              <Input
                value={form.diagnostico_descricao}
                onChange={(e) => set("diagnostico_descricao", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Conduta</Label>
            <Textarea rows={3} value={form.conduta} onChange={(e) => set("conduta", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Evolução</Label>
            <Textarea rows={3} value={form.evolucao} onChange={(e) => set("evolucao", e.target.value)} />
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4 rounded-xl border p-4 bg-card">
          <div className="space-y-1.5">
            <Label>Prescrição</Label>
            <Textarea
              rows={4}
              value={form.prescricao}
              onChange={(e) => set("prescricao", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Solicitar exames</Label>
            <Textarea
              rows={3}
              value={form.exames_solicitados}
              onChange={(e) => set("exames_solicitados", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Atestado / cartas</Label>
            <Textarea rows={3} value={form.atestado} onChange={(e) => set("atestado", e.target.value)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
