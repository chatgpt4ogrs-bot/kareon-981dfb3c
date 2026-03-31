import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPaciente, getSessoes, getObjetivos } from "@/lib/store";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

const engajamentoLabel: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };
const progressoLabel: Record<string, string> = { regressao: "Regressão", manteve: "Manteve", progresso_leve: "Progresso leve", progresso_significativo: "Progresso significativo" };
const statusLabel: Record<string, string> = { nao_iniciado: "Não iniciado", em_andamento: "Em andamento", concluido: "Concluído" };

const Relatorio = () => {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const paciente = getPaciente(pacienteId!);
  const sessoes = getSessoes(pacienteId!).sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  const objetivos = getObjetivos(pacienteId!);

  if (!paciente) return null;

  const idade = differenceInYears(new Date(), new Date(paciente.dataNascimento));
  const progressoMedio = objetivos.length > 0
    ? Math.round(objetivos.reduce((s, o) => s + o.progresso, 0) / objetivos.length)
    : 0;

  const handleExport = () => {
    const lines: string[] = [];
    lines.push("RELATÓRIO TERAPÊUTICO");
    lines.push("=".repeat(50));
    lines.push(`Paciente: ${paciente.nome}`);
    lines.push(`Idade: ${idade} anos`);
    lines.push(`Diagnóstico: ${paciente.diagnostico}`);
    lines.push(`Responsável: ${paciente.responsavel.nome} (${paciente.responsavel.parentesco})`);
    lines.push(`Data do relatório: ${format(new Date(), "dd/MM/yyyy")}`);
    lines.push("");
    lines.push("OBJETIVOS TERAPÊUTICOS");
    lines.push("-".repeat(50));
    objetivos.forEach((o) => {
      lines.push(`• ${o.descricao}`);
      lines.push(`  Status: ${statusLabel[o.status]} | Progresso: ${o.progresso}%`);
    });
    lines.push("");
    lines.push(`Progresso médio: ${progressoMedio}%`);
    lines.push("");
    lines.push("SESSÕES REALIZADAS");
    lines.push("-".repeat(50));
    sessoes.forEach((s) => {
      lines.push(`\n${format(new Date(s.dataHora), "dd/MM/yyyy HH:mm")}`);
      if (s.atividades.length) lines.push(`  Atividades: ${s.atividades.join(", ")}`);
      if (s.comportamentos.length) lines.push(`  Comportamento: ${s.comportamentos.join(", ")}`);
      lines.push(`  Engajamento: ${engajamentoLabel[s.engajamento]}`);
      lines.push(`  Progresso: ${progressoLabel[s.progressoObservado]}`);
      if (s.observacoes) lines.push(`  Obs: ${s.observacoes}`);
    });
    lines.push("");
    lines.push(`Total de sessões: ${sessoes.length}`);
    lines.push(`Relatório gerado automaticamente por TerapiaKids`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${paciente.nome.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório Terapêutico</h1>
            <p className="text-sm text-muted-foreground">{paciente.nome}</p>
          </div>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Exportar
        </Button>
      </div>

      {/* Patient info */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Paciente</p>
              <p className="text-sm font-semibold text-foreground">{paciente.nome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Idade</p>
              <p className="text-sm font-semibold text-foreground">{idade} anos</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diagnóstico</p>
              <p className="text-sm font-semibold text-foreground">{paciente.diagnostico}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="text-sm font-semibold text-foreground">{paciente.responsavel.nome}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Objetivos Terapêuticos
            <span className="text-sm font-normal text-muted-foreground">Progresso médio: {progressoMedio}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {objetivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum objetivo definido</p>
          ) : (
            objetivos.map((o) => (
              <div key={o.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{o.descricao}</p>
                  <Badge variant="outline" className="text-xs">{statusLabel[o.status]}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={o.progresso} className="flex-1 h-2.5" />
                  <span className="text-sm font-semibold text-foreground w-12 text-right">{o.progresso}%</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sessions summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Sessões Realizadas
            <span className="text-sm font-normal text-muted-foreground">{sessoes.length} sessões</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessoes.map((s) => (
            <div key={s.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(s.dataHora), "dd/MM/yyyy · HH:mm", { locale: ptBR })}
                </p>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">Eng: {engajamentoLabel[s.engajamento]}</Badge>
                  <Badge variant="outline" className="text-xs">{progressoLabel[s.progressoObservado]}</Badge>
                </div>
              </div>
              {s.atividades.length > 0 && (
                <p className="text-xs text-muted-foreground">Atividades: {s.atividades.join(", ")}</p>
              )}
              {s.comportamentos.length > 0 && (
                <p className="text-xs text-muted-foreground">Comportamento: {s.comportamentos.join(", ")}</p>
              )}
              {s.observacoes && (
                <p className="text-sm text-muted-foreground mt-1 italic">"{s.observacoes}"</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorio;
