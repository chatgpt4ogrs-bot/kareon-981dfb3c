import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FichaPodologia } from "@/lib/ficha-podologia";

function SimNao({
  label,
  value,
  onChange,
  dangerWhenYes,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  dangerWhenYes?: boolean;
}) {
  const yes = value === true;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            yes
              ? dangerWhenYes
                ? "bg-destructive/15 text-destructive border-destructive/30"
                : "bg-primary/15 text-primary border-primary/30"
              : "bg-background text-muted-foreground border-border hover:bg-muted/60"
          )}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            !yes
              ? "bg-primary/10 text-primary border-primary/25"
              : "bg-background text-muted-foreground border-border hover:bg-muted/60"
          )}
        >
          Não
        </button>
      </div>
    </div>
  );
}

export function FichaPodologiaForm({
  value,
  onChange,
}: {
  value: FichaPodologia;
  onChange: (next: FichaPodologia) => void;
}) {
  const set = <K extends keyof FichaPodologia>(key: K, v: FichaPodologia[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Anamnese</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <SimNao label="Gestante" value={value.gestante} onChange={(v) => set("gestante", v)} />
          <SimNao
            label="Hipertensão"
            value={value.hipertensao}
            onChange={(v) => set("hipertensao", v)}
            dangerWhenYes
          />
          <SimNao
            label="Cirurgia membros inf."
            value={value.cirurgia_membros_inferiores}
            onChange={(v) => set("cirurgia_membros_inferiores", v)}
          />
          <SimNao
            label="Pratica esporte"
            value={value.pratica_esporte}
            onChange={(v) => set("pratica_esporte", v)}
          />
          <SimNao
            label="Toma medicamento"
            value={value.toma_medicamento}
            onChange={(v) => set("toma_medicamento", v)}
            dangerWhenYes
          />
        </div>
        {value.cirurgia_membros_inferiores && (
          <div className="space-y-1.5">
            <Label>Qual cirurgia</Label>
            <Input
              value={value.cirurgia_membros_inferiores_qual}
              onChange={(e) => set("cirurgia_membros_inferiores_qual", e.target.value)}
              placeholder="Ex.: cantoplastia, joelho…"
            />
          </div>
        )}
        {value.pratica_esporte && (
          <div className="space-y-1.5">
            <Label>Qual esporte</Label>
            <Input
              value={value.pratica_esporte_qual}
              onChange={(e) => set("pratica_esporte_qual", e.target.value)}
              placeholder="Ex.: musculação, corrida…"
            />
          </div>
        )}
        {value.toma_medicamento && (
          <div className="space-y-1.5">
            <Label>Qual medicamento</Label>
            <Input
              value={value.toma_medicamento_qual}
              onChange={(e) => set("toma_medicamento_qual", e.target.value)}
              placeholder="Ex.: pressão, anticonceptivo…"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Alergias</Label>
          <Input
            value={value.alergias}
            onChange={(e) => set("alergias", e.target.value)}
            placeholder="Descreva alergias, se houver"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Problemas nos pés</Label>
          <Textarea
            value={value.problemas_pes}
            onChange={(e) => set("problemas_pes", e.target.value)}
            rows={2}
            placeholder="Ex.: onicocriptose, calosidade…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações clínicas</Label>
          <Textarea
            value={value.observacoes_clinicas}
            onChange={(e) => set("observacoes_clinicas", e.target.value)}
            rows={2}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Hábitos</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo de calçado</Label>
            <Input
              value={value.tipo_calcado}
              onChange={(e) => set("tipo_calcado", e.target.value)}
              placeholder="Aberto / Fechado…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de meia</Label>
            <Input
              value={value.tipo_meia}
              onChange={(e) => set("tipo_meia", e.target.value)}
              placeholder="Algodão…"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Condições de saúde</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <SimNao
            label="Marca-passo / pinos"
            value={value.marca_passos_pinos}
            onChange={(v) => set("marca_passos_pinos", v)}
            dangerWhenYes
          />
          <SimNao
            label="Problemas cancerígenos"
            value={value.problemas_cancerigenos}
            onChange={(v) => set("problemas_cancerigenos", v)}
            dangerWhenYes
          />
          <SimNao
            label="Pressão alta"
            value={value.pressao_alta}
            onChange={(v) => set("pressao_alta", v)}
            dangerWhenYes
          />
          <SimNao
            label="Diabetes"
            value={value.diabetes}
            onChange={(v) => set("diabetes", v)}
            dangerWhenYes
          />
          <SimNao
            label="Convulsões"
            value={value.convulsoes}
            onChange={(v) => set("convulsoes", v)}
            dangerWhenYes
          />
          <SimNao
            label="Problemas circulatórios"
            value={value.problemas_circulatorios}
            onChange={(v) => set("problemas_circulatorios", v)}
            dangerWhenYes
          />
          <SimNao
            label="Alergia"
            value={value.alergia}
            onChange={(v) => set("alergia", v)}
            dangerWhenYes
          />
        </div>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Observações finais</h3>
        <Textarea
          value={value.observacoes_finais}
          onChange={(e) => set("observacoes_finais", e.target.value)}
          rows={3}
          placeholder="Anotações do atendimento, valores, procedimentos…"
        />
      </section>
    </div>
  );
}
