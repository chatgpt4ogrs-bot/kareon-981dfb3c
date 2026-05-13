import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { usePaciente } from "@/hooks/use-pacientes";
import { useSessoes } from "@/hooks/use-sessoes";
import { useObjetivos } from "@/hooks/use-objetivos";
import { ArrowLeft, Download, Loader2, FileText } from "lucide-react";
import { format, differenceInYears, isWithinInterval, startOfDay, endOfDay, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/hooks/use-toast";

const engajamentoLabel: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };
const progressoLabel: Record<string, string> = { regressao: "Regressão", manteve: "Manteve", progresso_leve: "Progresso leve", progresso_significativo: "Progresso significativo" };
const statusLabel: Record<string, string> = { nao_iniciado: "Não iniciado", em_andamento: "Em andamento", concluido: "Concluído" };

const Relatorio = () => {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const { data: paciente, isLoading } = usePaciente(pacienteId);
  const { data: sessoes = [] } = useSessoes(pacienteId);
  const { data: objetivos = [] } = useObjetivos(pacienteId);

  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(format(subMonths(hoje, 3), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(hoje, "yyyy-MM-dd"));
  const [incluirEvolucao, setIncluirEvolucao] = useState(true);
  const [incluirObjetivos, setIncluirObjetivos] = useState(true);
  const [incluirSessoes, setIncluirSessoes] = useState(true);
  const [gerando, setGerando] = useState(false);

  const sessoesFiltradas = useMemo(() => {
    const inicio = startOfDay(new Date(dataInicio));
    const fim = endOfDay(new Date(dataFim));
    return [...sessoes]
      .filter((s) => {
        const d = new Date(s.dataHora);
        return isWithinInterval(d, { start: inicio, end: fim });
      })
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  }, [sessoes, dataInicio, dataFim]);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!paciente) return null;

  const idade = paciente.dataNascimento ? differenceInYears(new Date(), new Date(paciente.dataNascimento)) : null;
  const progressoMedio = objetivos.length > 0 ? Math.round(objetivos.reduce((s, o) => s + o.progresso, 0) / objetivos.length) : 0;

  const evolucaoTexto = useMemo(() => {
    if (sessoesFiltradas.length === 0) return "Sem sessões registradas no período.";
    const total = sessoesFiltradas.length;
    const eng = { baixo: 0, medio: 0, alto: 0 };
    const prog = { regressao: 0, manteve: 0, progresso_leve: 0, progresso_significativo: 0 };
    sessoesFiltradas.forEach((s) => {
      eng[s.engajamento as keyof typeof eng] = (eng[s.engajamento as keyof typeof eng] || 0) + 1;
      prog[s.progressoObservado as keyof typeof prog] = (prog[s.progressoObservado as keyof typeof prog] || 0) + 1;
    });
    const positivos = prog.progresso_leve + prog.progresso_significativo;
    const pct = Math.round((positivos / total) * 100);
    return `No período avaliado, foram realizadas ${total} sessão(ões). Em ${pct}% delas houve progresso observável. Engajamento predominante: ${
      eng.alto >= eng.medio && eng.alto >= eng.baixo ? "alto" : eng.medio >= eng.baixo ? "médio" : "baixo"
    }.`;
  }, [sessoesFiltradas]);

  const handleExportPDF = async () => {
    try {
      setGerando(true);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 50;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Relatório Terapêutico", pageW / 2, y, { align: "center" });
      y += 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}`, pageW / 2, y, { align: "center" });
      y += 14;
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW / 2, y, { align: "center" });
      y += 24;
      doc.setTextColor(0);

      // Patient info
      autoTable(doc, {
        startY: y,
        theme: "grid",
        head: [["Dados do paciente", ""]],
        body: [
          ["Nome", paciente.nome],
          ["Idade", idade !== null ? `${idade} anos` : "—"],
          ["Diagnóstico", paciente.diagnostico || "—"],
          ["Responsável", `${paciente.responsavel.nome || "—"}${paciente.responsavel.parentesco ? ` (${paciente.responsavel.parentesco})` : ""}`],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [74, 144, 226] },
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      if (incluirEvolucao) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Evolução no período", 40, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(evolucaoTexto, pageW - 80);
        doc.text(lines, 40, y);
        y += lines.length * 12 + 16;
      }

      if (incluirObjetivos) {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(`Objetivos terapêuticos (média: ${progressoMedio}%)`, 40, y);
        y += 8;
        autoTable(doc, {
          startY: y + 4,
          theme: "striped",
          head: [["Objetivo", "Status", "Progresso"]],
          body: objetivos.length === 0
            ? [["Nenhum objetivo cadastrado", "—", "—"]]
            : objetivos.map((o) => [o.descricao, statusLabel[o.status] || o.status, `${o.progresso}%`]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [74, 144, 226] },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      if (incluirSessoes) {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(`Sessões (${sessoesFiltradas.length})`, 40, y);
        y += 8;
        autoTable(doc, {
          startY: y + 4,
          theme: "grid",
          head: [["Data", "Engajamento", "Progresso", "Atividades / Observações"]],
          body: sessoesFiltradas.length === 0
            ? [["—", "—", "—", "Sem sessões no período"]]
            : sessoesFiltradas.map((s) => [
                format(new Date(s.dataHora), "dd/MM/yyyy HH:mm"),
                engajamentoLabel[s.engajamento] || s.engajamento,
                progressoLabel[s.progressoObservado] || s.progressoObservado,
                [s.atividades.join(", "), s.observacoes].filter(Boolean).join(" — "),
              ]),
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [74, 144, 226] },
          columnStyles: { 3: { cellWidth: 220 } },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Kareon · Página ${i} de ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });
      }

      doc.save(`relatorio_${paciente.nome.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast({ title: "Relatório gerado", description: "O PDF foi baixado." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório terapêutico</h1>
            <p className="text-sm text-muted-foreground">{paciente.nome}</p>
          </div>
        </div>
        <Button onClick={handleExportPDF} disabled={gerando} className="gap-2">
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Início do período</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fim do período</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Seções incluídas</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={incluirEvolucao} onCheckedChange={(v) => setIncluirEvolucao(!!v)} />
                Evolução
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={incluirObjetivos} onCheckedChange={(v) => setIncluirObjetivos(!!v)} />
                Objetivos
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={incluirSessoes} onCheckedChange={(v) => setIncluirSessoes(!!v)} />
                Sessões detalhadas
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Info label="Paciente" value={paciente.nome} />
          <Info label="Idade" value={idade !== null ? `${idade} anos` : "—"} />
          <Info label="Diagnóstico" value={paciente.diagnostico || "—"} />
          <Info label="Sessões no período" value={String(sessoesFiltradas.length)} />
        </CardContent>
      </Card>

      {incluirObjetivos && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">Objetivos<span className="text-sm font-normal text-muted-foreground">Média: {progressoMedio}%</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {objetivos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum objetivo definido</p> : (
              objetivos.map((o) => (
                <div key={o.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{o.descricao}</p>
                    <Badge variant="outline" className="text-xs">{statusLabel[o.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-3"><Progress value={o.progresso} className="flex-1 h-2.5" /><span className="text-sm font-semibold text-foreground w-12 text-right">{o.progresso}%</span></div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {incluirSessoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">Sessões no período<span className="text-sm font-normal text-muted-foreground">{sessoesFiltradas.length} sessões</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessoesFiltradas.length === 0 && <p className="text-sm text-muted-foreground">Sem sessões no período selecionado</p>}
            {sessoesFiltradas.map((s) => (
              <div key={s.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <p className="text-sm font-medium text-foreground">{format(new Date(s.dataHora), "dd/MM/yyyy · HH:mm", { locale: ptBR })}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">Eng: {engajamentoLabel[s.engajamento]}</Badge>
                    <Badge variant="outline" className="text-xs">{progressoLabel[s.progressoObservado]}</Badge>
                  </div>
                </div>
                {s.atividades.length > 0 && <p className="text-xs text-muted-foreground">Atividades: {s.atividades.join(", ")}</p>}
                {s.observacoes && <p className="text-sm text-muted-foreground mt-1 italic">"{s.observacoes}"</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-semibold text-foreground">{value}</p></div>
);

export default Relatorio;
