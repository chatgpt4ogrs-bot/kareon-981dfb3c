import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeFichaPodologia, type FichaPodologia } from "@/lib/ficha-podologia";
import { cn } from "@/lib/utils";

function Flag({ label, value }: { label: string; value: boolean | null }) {
  const yes = value === true;
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <Badge
        variant="outline"
        className={cn(
          "text-xs",
          yes
            ? "bg-destructive/10 text-destructive border-destructive/30"
            : "bg-primary/10 text-primary border-primary/25"
        )}
      >
        {yes ? "Sim" : "Não"}
      </Badge>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value?.trim() || "—"}</p>
    </div>
  );
}

export function FichaPodologiaView({
  ficha,
  pessoais,
}: {
  ficha?: FichaPodologia | Record<string, unknown> | null;
  pessoais?: {
    cpf?: string;
    dataNascimento?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
  };
}) {
  if (!ficha && !pessoais) return null;
  const f = normalizeFichaPodologia(ficha);

  return (
    <div className="grid gap-3">
      {pessoais && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="CPF" value={pessoais.cpf} />
            <Field label="Data de nascimento" value={pessoais.dataNascimento} />
            <Field label="Telefone" value={pessoais.telefone} />
            <Field label="E-mail" value={pessoais.email} />
            <div className="sm:col-span-2">
              <Field label="Endereço" value={pessoais.endereco} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Anamnese</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            <Flag label="Gestante" value={f.gestante} />
            <Flag label="Hipertensão" value={f.hipertensao} />
            <Flag label="Cirurgia membros inf." value={f.cirurgia_membros_inferiores} />
            <Flag label="Pratica esporte" value={f.pratica_esporte} />
            <Flag label="Toma medicamento" value={f.toma_medicamento} />
          </div>
          {f.cirurgia_membros_inferiores && (
            <Field label="Qual cirurgia" value={f.cirurgia_membros_inferiores_qual} />
          )}
          {f.pratica_esporte && <Field label="Qual esporte" value={f.pratica_esporte_qual} />}
          {f.toma_medicamento && (
            <Field label="Qual medicamento" value={f.toma_medicamento_qual} />
          )}
          <Field label="Alergias" value={f.alergias} />
          <Field label="Problemas nos pés" value={f.problemas_pes} />
          <Field label="Observações clínicas" value={f.observacoes_clinicas} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hábitos</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="Tipo de calçado" value={f.tipo_calcado} />
          <Field label="Tipo de meia" value={f.tipo_meia} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Condições de saúde</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
          <Flag label="Marca-passo / pinos" value={f.marca_passos_pinos} />
          <Flag label="Problemas cancerígenos" value={f.problemas_cancerigenos} />
          <Flag label="Pressão alta" value={f.pressao_alta} />
          <Flag label="Diabetes" value={f.diabetes} />
          <Flag label="Convulsões" value={f.convulsoes} />
          <Flag label="Problemas circulatórios" value={f.problemas_circulatorios} />
          <Flag label="Alergia" value={f.alergia} />
        </CardContent>
      </Card>

      {f.observacoes_finais && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observações finais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{f.observacoes_finais}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
