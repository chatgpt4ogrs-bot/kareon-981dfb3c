import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaciente } from "@/hooks/use-pacientes";
import { useSessoes } from "@/hooks/use-sessoes";
import { useObjetivos, useDeleteObjetivo } from "@/hooks/use-objetivos";
import { ArrowLeft, Plus, Pencil, Target, ClipboardList, TrendingUp, Trash2, Play, FileText, Loader2 } from "lucide-react";
import { format, differenceInYears, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = { nao_iniciado: "Não iniciado", em_andamento: "Em andamento", concluido: "Concluído" };
const statusColor: Record<string, string> = { nao_iniciado: "bg-muted text-muted-foreground", em_andamento: "bg-primary/10 text-primary", concluido: "bg-success/10 text-success" };
const engajamentoLabel: Record<string, { label: string; emoji: string }> = { baixo: { label: "Baixo", emoji: "😔" }, medio: { label: "Médio", emoji: "😐" }, alto: { label: "Alto", emoji: "😊" } };
const progressoLabel: Record<string, { label: string; emoji: string }> = { regressao: { label: "Regressão", emoji: "📉" }, manteve: { label: "Manteve", emoji: "➡️" }, progresso_leve: { label: "Progresso leve", emoji: "📈" }, progresso_significativo: { label: "Progresso significativo", emoji: "🚀" } };

const PacienteDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: paciente, isLoading } = usePaciente(id);
  const { data: sessoes = [] } = useSessoes(id);
  const { data: objetivos = [] } = useObjetivos(id);
  const deleteObjetivoMutation = useDeleteObjetivo();

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!paciente) return <div className="text-center py-16"><p className="text-muted-foreground">Paciente não encontrado</p><Button variant="outline" className="mt-4" onClick={() => navigate("/pacientes")}>Voltar</Button></div>;

  const sortedSessoes = [...sessoes].sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  const idade = differenceInYears(new Date(), new Date(paciente.dataNascimento));
  const now = new Date();
  const mesAtual = { start: startOfMonth(now), end: endOfMonth(now) };
  const sessoesMes = sortedSessoes.filter((s) => isWithinInterval(new Date(s.dataHora), mesAtual));
  const objetivosAtivos = objetivos.filter((o) => o.status === "em_andamento");
  const objetivosConcluidos = objetivos.filter((o) => o.status === "concluido");
  const progressoMedio = objetivos.length > 0 ? Math.round(objetivos.reduce((sum, o) => sum + o.progresso, 0) / objetivos.length) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Voltar para pacientes" onClick={() => navigate("/pacientes")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{paciente.nome}</h1>
            <Badge variant={paciente.status === "ativo" ? "default" : "secondary"}>{paciente.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{idade} anos · {paciente.diagnostico}</p>
        </div>
        <Link to={`/pacientes/${paciente.id}/sessao?modo=sessao`}><Button size="sm" className="gap-2"><Play className="w-4 h-4" /> Iniciar sessão</Button></Link>
        <Link to={`/pacientes/${paciente.id}/relatorio`}><Button variant="outline" size="sm" className="gap-2"><FileText className="w-4 h-4" /> Relatório</Button></Link>
        <Link to={`/pacientes/${paciente.id}/editar`}><Button variant="ghost" size="sm" className="gap-2"><Pencil className="w-4 h-4" /> Editar</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{sessoesMes.length}</p><p className="text-xs text-muted-foreground">Sessões este mês</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{sortedSessoes.length}</p><p className="text-xs text-muted-foreground">Total de sessões</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{objetivosAtivos.length}/{objetivos.length}</p><p className="text-xs text-muted-foreground">Objetivos ativos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{progressoMedio}%</p><p className="text-xs text-muted-foreground">Progresso médio</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Responsável</p>
          <p className="text-sm font-medium text-foreground">{paciente.responsavel.nome} ({paciente.responsavel.parentesco})</p>
          <p className="text-sm text-muted-foreground">{paciente.responsavel.telefone} · {paciente.responsavel.email}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="sessoes">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="sessoes" className="gap-2"><ClipboardList className="w-4 h-4" /> Sessões</TabsTrigger>
          <TabsTrigger value="objetivos" className="gap-2"><Target className="w-4 h-4" /> Objetivos</TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-2"><TrendingUp className="w-4 h-4" /> Evolução</TabsTrigger>
        </TabsList>

        <TabsContent value="sessoes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{sortedSessoes.length} sessões registradas</p>
            <Link to={`/pacientes/${paciente.id}/sessao`}><Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nova sessão</Button></Link>
          </div>
          {sortedSessoes.length === 0 ? <div className="text-center py-10"><p className="text-muted-foreground text-sm">Nenhuma sessão registrada</p></div> : (
            <div className="space-y-3">
              {sortedSessoes.map((s) => {
                const eng = engajamentoLabel[s.engajamento] || engajamentoLabel.medio;
                const prog = progressoLabel[s.progressoObservado] || progressoLabel.manteve;
                return (
                  <Card key={s.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{format(new Date(s.dataHora), "dd/MM/yyyy · HH:mm", { locale: ptBR })}</p>
                        <div className="flex gap-2 items-center"><span className="text-sm">{eng.emoji}</span><span className="text-sm">{prog.emoji}</span></div>
                      </div>
                      <div className="flex flex-wrap gap-1">{s.atividades.map((a) => <Badge key={a} variant="secondary" className="text-xs font-normal">{a}</Badge>)}</div>
                      {s.comportamentos.length > 0 && <p className="text-xs text-muted-foreground">Comportamento: {s.comportamentos.join(", ")}</p>}
                      {s.observacoes && <p className="text-sm text-muted-foreground">{s.observacoes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="objetivos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{objetivos.length} objetivos · {objetivosConcluidos.length} concluídos</p>
            <Link to={`/pacientes/${paciente.id}/objetivo`}><Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Novo objetivo</Button></Link>
          </div>
          {objetivos.length === 0 ? <div className="text-center py-10"><p className="text-muted-foreground text-sm">Nenhum objetivo definido</p></div> : (
            <div className="space-y-3">
              {objetivos.map((o) => (
                <Card key={o.id} className={cn(o.status === "concluido" && "opacity-60")}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{o.descricao}</p>
                        <span className={cn("inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium", statusColor[o.status])}>{statusLabel[o.status]}</span>
                      </div>
                      <Button variant="ghost" size="icon" aria-label="Excluir objetivo" className="text-muted-foreground hover:text-destructive" onClick={() => deleteObjetivoMutation.mutate(o.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex items-center gap-3"><Progress value={o.progresso} className="flex-1 h-2.5" /><span className="text-sm font-semibold text-foreground w-12 text-right">{o.progresso}%</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evolucao" className="mt-4">
          {sortedSessoes.length === 0 && objetivos.length === 0 ? <div className="text-center py-10"><p className="text-muted-foreground text-sm">Registre sessões e objetivos para ver a evolução</p></div> : (
            <div className="space-y-6">
              {objetivos.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground mb-3">Progresso geral dos objetivos</p>
                    <div className="flex items-center gap-3 mb-2"><Progress value={progressoMedio} className="flex-1 h-3" /><span className="text-lg font-bold text-primary">{progressoMedio}%</span></div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{objetivosAtivos.length} em andamento</span>
                      <span>{objetivosConcluidos.length} concluídos</span>
                      <span>{objetivos.filter(o => o.status === "nao_iniciado").length} não iniciados</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="relative pl-6 space-y-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                {[...sortedSessoes.map((s) => ({ tipo: "sessao" as const, data: s.dataHora, item: s })),
                  ...objetivos.map((o) => ({ tipo: "objetivo" as const, data: o.criadoEm, item: o }))]
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .map((evento, i) => (
                    <div key={i} className="relative">
                      <div className={cn("absolute -left-6 top-1 w-4 h-4 rounded-full border-2", evento.tipo === "sessao" ? "bg-primary border-primary" : "bg-accent border-accent")} />
                      <div className="bg-card rounded-lg p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">{format(new Date(evento.data), "dd/MM/yyyy · HH:mm", { locale: ptBR })}</p>
                        {evento.tipo === "sessao" ? (
                          <>
                            <p className="text-sm font-medium text-foreground">Sessão realizada</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span>{(engajamentoLabel[(evento.item as any).engajamento] || engajamentoLabel.medio).emoji}</span>
                              <span className="text-xs text-muted-foreground">{(engajamentoLabel[(evento.item as any).engajamento] || engajamentoLabel.medio).label}</span>
                              <span className="text-muted-foreground">·</span>
                              <span>{(progressoLabel[(evento.item as any).progressoObservado] || progressoLabel.manteve).emoji}</span>
                              <span className="text-xs text-muted-foreground">{(progressoLabel[(evento.item as any).progressoObservado] || progressoLabel.manteve).label}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">Objetivo criado</p>
                            <p className="text-xs text-muted-foreground">{(evento.item as any).descricao}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PacienteDetalhe;
