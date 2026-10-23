import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useEncounter,
  useSaveEncounter,
  useFinalizeEncounter,
} from "@/hooks/use-encounters";
import { toast } from "sonner";

export default function AtendimentoClinico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useEncounter(id);
  const save = useSaveEncounter();
  const finalize = useFinalizeEncounter();
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data) {
      setForm({
        motivo_consulta: data.motivo_consulta || "",
        queixa_principal: data.queixa_principal || "",
        anamnese: data.anamnese || "",
        historico_medico: data.historico_medico || "",
        historico_familiar: data.historico_familiar || "",
        alergias: data.alergias || "",
        medicamentos_uso: data.medicamentos_uso || "",
        sinais_vitais: data.sinais_vitais || {},
        exame_fisico: data.exame_fisico || "",
        avaliacao: data.avaliacao || "",
        hipoteses: data.hipoteses || "",
        diagnosticos: data.diagnosticos || "",
        diagnostico_cid: data.diagnostico_cid || "",
        conduta: data.conduta || "",
        plano_terapeutico: data.plano_terapeutico || "",
        exames_solicitados: data.exames_solicitados || "",
        prescricoes: data.prescricoes || "",
        encaminhamentos: data.encaminhamentos || "",
        orientacoes: data.orientacoes || "",
        retorno_sugerido: data.retorno_sugerido || "",
      });
    }
  }, [data]);

  const locked = data?.status === "finalizado";

  async function handleSave() {
    if (!id || locked) return;
    try {
      await save.mutateAsync({ id, ...form });
      toast.success("Rascunho salvo");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleFinalize() {
    if (!id) return;
    try {
      await save.mutateAsync({ id, ...form });
      await finalize.mutateAsync(id);
      toast.success("Atendimento finalizado. Registro preservado com auditoria.");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sala-espera")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.patient_nome}</h1>
            <p className="text-sm text-muted-foreground">
              Profissional: {data.professional_nome || "—"} · Prontuário eletrônico
            </p>
            <Badge className="mt-2" variant={locked ? "default" : "secondary"}>
              {locked ? "Finalizado" : "Em elaboração"}
            </Badge>
          </div>
        </div>
        {!locked && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={save.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Salvar rascunho
            </Button>
            <Button onClick={handleFinalize} disabled={finalize.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finalizar
            </Button>
          </div>
        )}
      </div>

      {locked && (
        <p className="text-sm bg-muted/60 border rounded-lg px-4 py-3">
          Este registro está finalizado. Alterações só via adendo (trilha de auditoria preservada).
        </p>
      )}

      <Tabs defaultValue="consulta" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="consulta">Consulta</TabsTrigger>
          <TabsTrigger value="exame">Exame</TabsTrigger>
          <TabsTrigger value="decisao">Decisão</TabsTrigger>
          <TabsTrigger value="saida">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="consulta" className="space-y-4 rounded-xl border p-4 bg-card">
          <Field label="Motivo da consulta" value={form.motivo_consulta} onChange={(v) => set("motivo_consulta", v)} disabled={locked} />
          <Field label="Queixa principal" value={form.queixa_principal} onChange={(v) => set("queixa_principal", v)} disabled={locked} />
          <Field label="Anamnese" value={form.anamnese} onChange={(v) => set("anamnese", v)} disabled={locked} rows={5} />
          <Field label="Histórico médico" value={form.historico_medico} onChange={(v) => set("historico_medico", v)} disabled={locked} />
          <Field label="Histórico familiar" value={form.historico_familiar} onChange={(v) => set("historico_familiar", v)} disabled={locked} />
          <Field label="Alergias" value={form.alergias} onChange={(v) => set("alergias", v)} disabled={locked} />
          <Field label="Medicamentos em uso" value={form.medicamentos_uso} onChange={(v) => set("medicamentos_uso", v)} disabled={locked} />
        </TabsContent>

        <TabsContent value="exame" className="space-y-4 rounded-xl border p-4 bg-card">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(["peso", "altura", "pressao", "temperatura", "saturacao"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label className="capitalize">{k}</Label>
                <Input
                  disabled={locked}
                  value={form.sinais_vitais?.[k] || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sinais_vitais: { ...f.sinais_vitais, [k]: e.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <Field label="Exame físico" value={form.exame_fisico} onChange={(v) => set("exame_fisico", v)} disabled={locked} rows={4} />
          <Field label="Avaliação profissional" value={form.avaliacao} onChange={(v) => set("avaliacao", v)} disabled={locked} rows={4} />
        </TabsContent>

        <TabsContent value="decisao" className="space-y-4 rounded-xl border p-4 bg-card">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CID-10</Label>
              <Input disabled={locked} value={form.diagnostico_cid || ""} onChange={(e) => set("diagnostico_cid", e.target.value)} />
            </div>
            <Field label="Diagnósticos / hipóteses" value={form.diagnosticos || form.hipoteses} onChange={(v) => set("diagnosticos", v)} disabled={locked} />
          </div>
          <Field label="Conduta" value={form.conduta} onChange={(v) => set("conduta", v)} disabled={locked} />
          <Field label="Plano terapêutico" value={form.plano_terapeutico} onChange={(v) => set("plano_terapeutico", v)} disabled={locked} />
        </TabsContent>

        <TabsContent value="saida" className="space-y-4 rounded-xl border p-4 bg-card">
          <Field label="Prescrições" value={form.prescricoes} onChange={(v) => set("prescricoes", v)} disabled={locked} rows={4} />
          <Field label="Exames solicitados" value={form.exames_solicitados} onChange={(v) => set("exames_solicitados", v)} disabled={locked} />
          <Field label="Encaminhamentos" value={form.encaminhamentos} onChange={(v) => set("encaminhamentos", v)} disabled={locked} />
          <Field label="Orientações" value={form.orientacoes} onChange={(v) => set("orientacoes", v)} disabled={locked} />
          <Field label="Retorno sugerido" value={form.retorno_sugerido} onChange={(v) => set("retorno_sugerido", v)} disabled={locked} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={rows} disabled={disabled} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
