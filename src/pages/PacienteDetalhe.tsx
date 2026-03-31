import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPaciente, getSessoes, getObjetivos, deleteObjetivo } from "@/lib/store";
import { ArrowLeft, Plus, Pencil, Target, ClipboardList, TrendingUp, Trash2 } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabel: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  nao_iniciado: "secondary",
  em_andamento: "default",
  concluido: "outline",
};

const engajamentoLabel: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

const progressoLabel: Record<string, string> = {
  regressao: "Regressão",
  manteve: "Manteve",
  progresso_leve: "Progresso leve",
  progresso_significativo: "Progresso significativo",
};

const PacienteDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const paciente = getPaciente(id!);
  const [, setRefresh] = useState(0);

  if (!paciente) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Paciente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/pacientes")}>Voltar</Button>
      </div>
    );
  }

  const sessoes = getSessoes(paciente.id).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  const objetivos = getObjetivos(paciente.id);
  const idade = differenceInYears(new Date(), new Date(paciente.dataNascimento));

  const handleDeleteObjetivo = (objId: string) => {
    deleteObjetivo(objId);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pacientes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{paciente.nome}</h1>
            <Badge variant={paciente.status === "ativo" ? "default" : "secondary"}>{paciente.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{idade} anos · {paciente.diagnostico}</p>
        </div>
        <Link to={`/pacientes/${paciente.id}/editar`}>
          <Button variant="outline" size="sm" className="gap-2"><Pencil className="w-4 h-4" /> Editar</Button>
        </Link>
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
            <p className="text-sm text-muted-foreground">{sessoes.length} sessões registradas</p>
            <Link to={`/pacientes/${paciente.id}/sessao`}>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nova sessão</Button>
            </Link>
          </div>

          {sessoes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">Nenhuma sessão registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessoes.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(s.dataHora), "dd/MM/yyyy · HH:mm", { locale: ptBR })}
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{engajamentoLabel[s.engajamento]}</Badge>
                        <Badge variant="outline">{progressoLabel[s.progressoObservado]}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.atividades.map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs font-normal">{a}</Badge>
                      ))}
                    </div>
                    {s.comportamentos.length > 0 && (
                      <p className="text-xs text-muted-foreground">Comportamento: {s.comportamentos.join(", ")}</p>
                    )}
                    {s.observacoes && (
                      <p className="text-sm text-muted-foreground">{s.observacoes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="objetivos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{objetivos.length} objetivos</p>
            <Link to={`/pacientes/${paciente.id}/objetivo`}>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Novo objetivo</Button>
            </Link>
          </div>

          {objetivos.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">Nenhum objetivo definido</p>
            </div>
          ) : (
            <div className="space-y-3">
              {objetivos.map((o) => (
                <Card key={o.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{o.descricao}</p>
                        <Badge variant={statusVariant[o.status]} className="mt-1 text-xs">{statusLabel[o.status]}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteObjetivo(o.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={o.progresso} className="flex-1 h-2" />
                      <span className="text-xs font-medium text-muted-foreground">{o.progresso}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evolucao" className="mt-4">
          {sessoes.length === 0 && objetivos.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">Registre sessões e objetivos para ver a evolução</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
              {[...sessoes.map((s) => ({ tipo: "sessao" as const, data: s.dataHora, item: s })),
                ...objetivos.map((o) => ({ tipo: "objetivo" as const, data: o.criadoEm, item: o })),
              ]
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                .map((evento, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                      evento.tipo === "sessao" ? "bg-primary border-primary" : "bg-accent border-accent"
                    }`} />
                    <div className="bg-card rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {format(new Date(evento.data), "dd/MM/yyyy · HH:mm", { locale: ptBR })}
                      </p>
                      {evento.tipo === "sessao" ? (
                        <>
                          <p className="text-sm font-medium text-foreground">Sessão realizada</p>
                          <p className="text-xs text-muted-foreground">
                            Engajamento: {engajamentoLabel[(evento.item as any).engajamento]} · {progressoLabel[(evento.item as any).progressoObservado]}
                          </p>
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PacienteDetalhe;
