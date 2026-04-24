import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { usePaciente } from "@/hooks/use-pacientes";
import { useObjetivos } from "@/hooks/use-objetivos";
import { useSessoes, useSaveSessao, useUltimaSessao } from "@/hooks/use-sessoes";
import { Sessao, COMPORTAMENTOS, ATIVIDADES_COMUNS, NivelEngajamento, ProgressoObservado } from "@/types";
import { ArrowLeft, Copy, X, Sparkles, CalendarCheck, Target, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInYears, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

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

/** Lista de chips selecionáveis — memoizada */
const ChipsList = memo(function ChipsList({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((item) => (
        <Badge
          key={item}
          variant={selected.includes(item) ? "default" : "outline"}
          className="cursor-pointer py-1.5 px-3 transition-all"
          onClick={() => onToggle(item)}
        >
          {item}
        </Badge>
      ))}
    </div>
  );
});

/** Seletor de engajamento */
const EngajamentoPicker = memo(function EngajamentoPicker({
  value,
  onChange,
}: {
  value: NivelEngajamento;
  onChange: (v: NivelEngajamento) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {engajamentoOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-xl border-2 py-4 text-center transition-all",
            value === opt.value ? opt.color : "border-border text-muted-foreground hover:border-muted-foreground"
          )}
        >
          <span className="text-2xl block mb-1">{opt.emoji}</span>
          <span className="text-xs font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  );
});

/** Seletor de progresso */
const ProgressoPicker = memo(function ProgressoPicker({
  value,
  onChange,
}: {
  value: ProgressoObservado;
  onChange: (v: ProgressoObservado) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {progressoOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-xl border-2 py-3 text-center transition-all",
            value === opt.value ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-muted-foreground"
          )}
        >
          <span className="text-lg block mb-0.5">{opt.emoji}</span>
          <span className="text-xs font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  );
});

/** Lista de objetivos selecionáveis */
const ObjetivosList = memo(function ObjetivosList({
  objetivos,
  selected,
  onToggle,
}: {
  objetivos: any[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {objetivos.map((o) => {
        const isSelected = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={cn(
              "w-full text-left rounded-lg border p-3 transition-all",
              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-foreground">{o.descricao}</p>
              {isSelected && <Badge variant="default" className="text-xs">Selecionado</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Progress value={o.progresso} className="flex-1 h-1.5" />
              <span className="text-xs text-muted-foreground">{o.progresso}%</span>
            </div>
          </button>
        );
      })}
    </>
  );
});

const SessaoForm = () => {
  const { pacienteId } = useParams();
  const [searchParams] = useSearchParams();
  const isModoSessao = searchParams.get("modo") === "sessao";
  const navigate = useNavigate();

  const { data: paciente, isLoading: loadingPaciente } = usePaciente(pacienteId);
  const { data: objetivos = [] } = useObjetivos(pacienteId);
  const { data: ultimaSessao } = useUltimaSessao(pacienteId);
  const { data: todasSessoes = [] } = useSessoes(pacienteId);
  const saveMutation = useSaveSessao();

  const now = useMemo(() => new Date(), []);
  const defaultDate = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    [now]
  );
  const defaultTime = useMemo(
    () => `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    [now]
  );

  // Inputs não controlados via refs (zero re-render)
  const dataRef = useRef<HTMLInputElement>(null);
  const horaRef = useRef<HTMLInputElement>(null);
  const obsRef = useRef<HTMLTextAreaElement>(null);

  // State apenas para o que é visualmente reativo
  const [objetivoIds, setObjetivoIds] = useState<string[]>([]);
  const [atividades, setAtividades] = useState<string[]>([]);
  const [comportamentos, setComportamentos] = useState<string[]>([]);
  const [engajamento, setEngajamento] = useState<NivelEngajamento>("medio");
  const [progressoObservado, setProgressoObservado] = useState<ProgressoObservado>("manteve");

  // Auto-preenche da última sessão (uma vez) — agora dentro de useEffect (sem set-state em render)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !ultimaSessao || !isModoSessao) return;
    initializedRef.current = true;
    setObjetivoIds([...ultimaSessao.objetivoIds]);
    setAtividades([...ultimaSessao.atividades]);
  }, [ultimaSessao, isModoSessao]);

  const objetivosAtivos = useMemo(
    () => objetivos.filter((o) => o.status !== "concluido"),
    [objetivos]
  );

  const sessoesMes = useMemo(() => {
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    return todasSessoes.filter((s) => isWithinInterval(new Date(s.dataHora), interval));
  }, [todasSessoes, now]);

  const toggleObjetivo = useCallback((id: string) => {
    setObjetivoIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);
  const toggleAtividade = useCallback((item: string) => {
    setAtividades((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }, []);
  const toggleComportamento = useCallback((item: string) => {
    setComportamentos((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }, []);

  const duplicarUltima = useCallback(() => {
    if (!ultimaSessao) return;
    setAtividades([...ultimaSessao.atividades]);
    setComportamentos([...ultimaSessao.comportamentos]);
    setEngajamento(ultimaSessao.engajamento);
    setObjetivoIds([...ultimaSessao.objetivoIds]);
  }, [ultimaSessao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;
    const data = dataRef.current?.value || defaultDate;
    const hora = horaRef.current?.value || defaultTime;
    const observacoes = obsRef.current?.value || "";

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
    await saveMutation.mutateAsync(sessao);
    navigate(isModoSessao ? "/agenda" : `/pacientes/${paciente.id}`);
  };

  const handleClose = () => navigate(isModoSessao ? "/agenda" : (-1 as any));

  if (loadingPaciente) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!paciente) {
    return <p className="text-muted-foreground text-center py-16">Paciente não encontrado</p>;
  }

  const idade = differenceInYears(new Date(), new Date(paciente.dataNascimento));

  // Form fields compartilhados
  const formFields = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Data</Label>
          <Input ref={dataRef} type="date" defaultValue={defaultDate} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hora</Label>
          <Input ref={horaRef} type="time" defaultValue={defaultTime} className="h-9" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Atividades</p>
        <ChipsList options={ATIVIDADES_COMUNS} selected={atividades} onToggle={toggleAtividade} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Comportamento</p>
        <ChipsList options={COMPORTAMENTOS} selected={comportamentos} onToggle={toggleComportamento} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Engajamento</p>
        <EngajamentoPicker value={engajamento} onChange={setEngajamento} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Progresso</p>
        <ProgressoPicker value={progressoObservado} onChange={setProgressoObservado} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Observações (opcional)</Label>
        <Textarea ref={obsRef} defaultValue="" placeholder="Anotações rápidas..." rows={2} />
      </div>
    </>
  );

  if (isModoSessao) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
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
            <Button variant="ghost" size="icon" onClick={handleClose}><X className="w-5 h-5" /></Button>
          </div>

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

          {objetivosAtivos.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Objetivos ativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ObjetivosList objetivos={objetivosAtivos} selected={objetivoIds} onToggle={toggleObjetivo} />
              </CardContent>
            </Card>
          )}

          {ultimaSessao && atividades.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Atividades sugeridas da última sessão ({format(new Date(ultimaSessao.dataHora), "dd/MM")})</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {formFields}
            <div className="flex gap-3 pb-8">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                Salvar sessão
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
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
        {objetivosAtivos.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Objetivos da sessão</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <ObjetivosList objetivos={objetivosAtivos} selected={objetivoIds} onToggle={toggleObjetivo} />
            </CardContent>
          </Card>
        )}

        {formFields}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" className="gap-2" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
            Salvar sessão
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SessaoForm;
