import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPaciente, getObjetivos, saveSessao, getUltimaSessao } from "@/lib/store";
import { Sessao, COMPORTAMENTOS, ATIVIDADES_COMUNS, NivelEngajamento, ProgressoObservado } from "@/types";
import { ArrowLeft, Copy, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const engajamentoOptions: { value: NivelEngajamento; label: string; color: string }[] = [
  { value: "baixo", label: "Baixo", color: "border-destructive text-destructive" },
  { value: "medio", label: "Médio", color: "border-accent text-accent" },
  { value: "alto", label: "Alto", color: "border-success text-success" },
];

const progressoOptions: { value: ProgressoObservado; label: string }[] = [
  { value: "regressao", label: "Regressão" },
  { value: "manteve", label: "Manteve" },
  { value: "progresso_leve", label: "Progresso leve" },
  { value: "progresso_significativo", label: "Progresso significativo" },
];

const SessaoForm = () => {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const paciente = getPaciente(pacienteId!);
  const objetivos = getObjetivos(pacienteId!);
  const ultimaSessao = getUltimaSessao(pacienteId!);

  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [data, setData] = useState(defaultDate);
  const [hora, setHora] = useState(defaultTime);
  const [objetivoIds, setObjetivoIds] = useState<string[]>([]);
  const [atividades, setAtividades] = useState<string[]>([]);
  const [comportamentos, setComportamentos] = useState<string[]>([]);
  const [engajamento, setEngajamento] = useState<NivelEngajamento>("medio");
  const [progressoObservado, setProgressoObservado] = useState<ProgressoObservado>("manteve");
  const [observacoes, setObservacoes] = useState("");

  if (!paciente) {
    return <p className="text-muted-foreground text-center py-16">Paciente não encontrado</p>;
  }

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const duplicarUltima = () => {
    if (!ultimaSessao) return;
    setAtividades([...ultimaSessao.atividades]);
    setComportamentos([...ultimaSessao.comportamentos]);
    setEngajamento(ultimaSessao.engajamento);
    setObjetivoIds([...ultimaSessao.objetivoIds]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessao: Sessao = {
      id: crypto.randomUUID(),
      pacienteId: paciente.id,
      dataHora: new Date(`${data}T${hora}`).toISOString(),
      objetivoIds,
      atividades,
      comportamentos,
      engajamento,
      progressoObservado,
      observacoes,
      criadoEm: new Date().toISOString(),
    };
    saveSessao(sessao);
    navigate(`/pacientes/${paciente.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Registrar sessão</h1>
            <p className="text-sm text-muted-foreground">{paciente.nome}</p>
          </div>
        </div>
        {ultimaSessao && (
          <Button variant="outline" size="sm" className="gap-2" onClick={duplicarUltima}>
            <Copy className="w-4 h-4" /> Duplicar última
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Data e hora */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Objetivos vinculados */}
        {objetivos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Objetivos da sessão</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {objetivos.filter((o) => o.status !== "concluido").map((o) => (
                <Badge
                  key={o.id}
                  variant={objetivoIds.includes(o.id) ? "default" : "outline"}
                  className="cursor-pointer py-1.5 px-3"
                  onClick={() => toggleItem(objetivoIds, setObjetivoIds, o.id)}
                >
                  {o.descricao}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Atividades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Atividades realizadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ATIVIDADES_COMUNS.map((a) => (
              <Badge
                key={a}
                variant={atividades.includes(a) ? "default" : "outline"}
                className="cursor-pointer py-1.5 px-3"
                onClick={() => toggleItem(atividades, setAtividades, a)}
              >
                {a}
              </Badge>
            ))}
          </CardContent>
        </Card>

        {/* Comportamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comportamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {COMPORTAMENTOS.map((c) => (
              <Badge
                key={c}
                variant={comportamentos.includes(c) ? "default" : "outline"}
                className="cursor-pointer py-1.5 px-3"
                onClick={() => toggleItem(comportamentos, setComportamentos, c)}
              >
                {c}
              </Badge>
            ))}
          </CardContent>
        </Card>

        {/* Engajamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nível de engajamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {engajamentoOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEngajamento(opt.value)}
                  className={cn(
                    "rounded-lg border-2 py-3 text-sm font-medium transition-all",
                    engajamento === opt.value
                      ? `${opt.color} bg-muted`
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progresso */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progresso observado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {progressoOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProgressoObservado(opt.value)}
                  className={cn(
                    "rounded-lg border-2 py-3 text-sm font-medium transition-all",
                    progressoObservado === opt.value
                      ? "border-primary text-primary bg-primary/5"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observações clínicas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações adicionais (opcional)..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-8">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit">Salvar sessão</Button>
        </div>
      </form>
    </div>
  );
};

export default SessaoForm;
