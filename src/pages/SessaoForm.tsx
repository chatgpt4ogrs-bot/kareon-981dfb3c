import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPaciente, getObjetivos, saveSessao, getUltimaSessao, getSessoes } from "@/lib/store";
import { Sessao, COMPORTAMENTOS, ATIVIDADES_COMUNS, NivelEngajamento, ProgressoObservado } from "@/types";
import { ArrowLeft, Copy, X, Sparkles, CalendarCheck, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, differenceInYears, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const engajamentoOptions: { value: NivelEngajamento; label: string; emoji: string; color: string }[] = [
  { value: "baixo", label: "Baixo", emoji: "😔", color: "border-destructive text-destructive bg-destructive/5" },
  { value: "medio", label: "Médio", emoji: "😐", color: "border-accent text-accent bg-accent/5" },
  { value: "alto", label: "Alto", emoji: "😊", color: "border-success text-success bg-success/5" },
];

const progressoOptions: { value: ProgressoObservado; label: string; emoji: string }[] = [
  { value: "regressao", label: "Regressão", emoji: "📉" },
  { value: "manteve", label: "Manteve", emoji: "➡️" },
  { value: "progresso_leve", label: "Progresso leve", emoji: "📈" },
  { value: "progresso_significativo", label: "Progresso significativo", emoji: "🚀" },
];

const SessaoForm = () => {
  const { pacienteId } = useParams();
  const [searchParams] = useSearchParams();
  const isModoSessao = searchParams.get("modo") === "sessao";
  const navigate = useNavigate();
  const paciente = getPaciente(pacienteId!);
  const objetivos = getObjetivos(pacienteId!);
  const ultimaSessao = getUltimaSessao(pacienteId!);
  const todasSessoes = getSessoes(pacienteId!);

  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Auto-suggest from last session
  const [data, setData] = useState(defaultDate);
  const [hora, setHora] = useState(defaultTime);
  const [objetivoIds, setObjetivoIds] = useState<string[]>(
    isModoSessao && ultimaSessao ? [...ultimaSessao.objetivoIds] : []
  );
  const [atividades, setAtividades] = useState<string[]>(
    isModoSessao && ultimaSessao ? [...ultimaSessao.atividades] : []
  );
  const [comportamentos, setComportamentos] = useState<string[]>([]);
  const [engajamento, setEngajamento] = useState<NivelEngajamento>("medio");
  const [progressoObservado, setProgressoObservado] = useState<ProgressoObservado>("manteve");
  const [observacoes, setObservacoes] = useState("");

  if (!paciente) {
    return <p className="text-muted-foreground text-center py-16">Paciente não encontrado</p>;
  }

  const idade = differenceInYears(new Date(), new Date(paciente.dataNascimento));
  const objetivosAtivos = objetivos.filter((o) => o.status !== "concluido");

  // Frequency stats
  const mesAtual = { start: startOfMonth(now), end: endOfMonth(now) };
  const sessoesMes = todasSessoes.filter((s) =>
    isWithinInterval(new Date(s.dataHora), mesAtual)
  );

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
    navigate(isModoSessao ? "/agenda" : `/pacientes/${paciente.id}`);
  };

  const handleClose = () => {
    navigate(isModoSessao ? "/agenda" : -1 as any);
  };

  // Focused session mode layout
  if (isModoSessao) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
          {/* Header - minimal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {paciente.nome.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{paciente.nome}</h1>
                <p className="text-xs text-muted-foreground">{idade} anos · {paciente.diagnostico}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick stats bar */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-lg font-bold text-primary">{sessoesMes.length}</p>
              <p className="text-xs text-muted-foreground">Sessões este mês</p>
            </div>
            <div className="flex-1 rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-bold text-foreground">{todasSessoes.length}</p>
              <p className="text-xs text-muted-foreground">Total de sessões</p>
            </div>
            <div className="flex-1 rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-bold text-foreground">{objetivosAtivos.length}</p>
              <p className="text-xs text-muted-foreground">Objetivos ativos</p>
            </div>
          </div>

          {/* Active objectives with progress */}
          {objetivosAtivos.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Objetivos ativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {objetivosAtivos.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleItem(objetivoIds, setObjetivoIds, o.id)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-all",
                      objetivoIds.includes(o.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">{o.descricao}</p>
                      {objetivoIds.includes(o.id) && (
                        <Badge variant="default" className="text-xs">Selecionado</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={o.progresso} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground">{o.progresso}%</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggested activities from last session */}
          {ultimaSessao && atividades.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Atividades sugeridas da última sessão ({format(new Date(ultimaSessao.dataHora), "dd/MM")})</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date/time compact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="h-9" />
              </div>
            </div>

            {/* Activities - chips */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Atividades</p>
              <div className="flex flex-wrap gap-2">
                {ATIVIDADES_COMUNS.map((a) => (
                  <Badge
                    key={a}
                    variant={atividades.includes(a) ? "default" : "outline"}
                    className="cursor-pointer py-1.5 px-3 transition-all"
                    onClick={() => toggleItem(atividades, setAtividades, a)}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Behavior - chips */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Comportamento</p>
              <div className="flex flex-wrap gap-2">
                {COMPORTAMENTOS.map((c) => (
                  <Badge
                    key={c}
                    variant={comportamentos.includes(c) ? "default" : "outline"}
                    className="cursor-pointer py-1.5 px-3 transition-all"
                    onClick={() => toggleItem(comportamentos, setComportamentos, c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Engagement - big buttons */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Engajamento</p>
              <div className="grid grid-cols-3 gap-3">
                {engajamentoOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEngajamento(opt.value)}
                    className={cn(
                      "rounded-xl border-2 py-4 text-center transition-all",
                      engajamento === opt.value ? opt.color : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    <span className="text-2xl block mb-1">{opt.emoji}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress - big buttons */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Progresso</p>
              <div className="grid grid-cols-2 gap-3">
                {progressoOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProgressoObservado(opt.value)}
                    className={cn(
                      "rounded-xl border-2 py-3 text-center transition-all",
                      progressoObservado === opt.value
                        ? "border-primary text-primary bg-primary/5"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    <span className="text-lg block mb-0.5">{opt.emoji}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes - optional */}
            <div className="space-y-1">
              <Label className="text-xs">Observações (opcional)</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações rápidas..."
                rows={2}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pb-8">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" className="flex-1 gap-2">
                <CalendarCheck className="w-4 h-4" /> Salvar sessão
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Regular mode (existing layout, enhanced)
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

        {objetivosAtivos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Objetivos da sessão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {objetivosAtivos.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleItem(objetivoIds, setObjetivoIds, o.id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-all",
                    objetivoIds.includes(o.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{o.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={o.progresso} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground">{o.progresso}%</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Atividades realizadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ATIVIDADES_COMUNS.map((a) => (
              <Badge key={a} variant={atividades.includes(a) ? "default" : "outline"} className="cursor-pointer py-1.5 px-3" onClick={() => toggleItem(atividades, setAtividades, a)}>
                {a}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comportamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {COMPORTAMENTOS.map((c) => (
              <Badge key={c} variant={comportamentos.includes(c) ? "default" : "outline"} className="cursor-pointer py-1.5 px-3" onClick={() => toggleItem(comportamentos, setComportamentos, c)}>
                {c}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nível de engajamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {engajamentoOptions.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setEngajamento(opt.value)}
                  className={cn("rounded-xl border-2 py-4 text-center transition-all", engajamento === opt.value ? opt.color : "border-border text-muted-foreground hover:border-muted-foreground")}>
                  <span className="text-2xl block mb-1">{opt.emoji}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progresso observado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {progressoOptions.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setProgressoObservado(opt.value)}
                  className={cn("rounded-xl border-2 py-3 text-center transition-all", progressoObservado === opt.value ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                  <span className="text-lg block mb-0.5">{opt.emoji}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observações clínicas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Anotações adicionais (opcional)..." rows={3} />
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
