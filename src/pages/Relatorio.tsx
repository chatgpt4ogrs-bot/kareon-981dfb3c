import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePaciente } from "@/hooks/use-pacientes";
import { useEncounters } from "@/hooks/use-encounters";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { format, differenceInYears, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Relatorio = () => {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const { data: paciente, isLoading } = usePaciente(pacienteId);
  const { data: encounters = [] } = useEncounters(pacienteId);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [gerando, setGerando] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!paciente) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Paciente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/pacientes")}>
          Voltar
        </Button>
      </div>
    );
  }

  const idade = paciente.dataNascimento
    ? differenceInYears(new Date(), new Date(paciente.dataNascimento))
    : null;

  const filtrados = encounters.filter((e) => {
    const d = new Date(e.finalized_at || e.updated_at || e.created_at || "");
    if (de && ate) {
      return isWithinInterval(d, { start: parseISO(de), end: parseISO(ate) });
    }
    if (de) return d >= parseISO(de);
    if (ate) return d <= parseISO(ate);
    return true;
  });

  const handleExportPDF = async () => {
    setGerando(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 48;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Relatório Clínico", pageW / 2, y, { align: "center" });
      y += 22;
      doc.setFontSize(11);
      doc.text(paciente.nome, pageW / 2, y, { align: "center" });
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `${idade != null ? idade + " anos" : ""} · ${filtrados.length} atendimento(s) · ${format(new Date(), "dd/MM/yyyy")}`,
        pageW / 2,
        y,
        { align: "center" }
      );
      doc.setTextColor(0);
      y += 24;

      autoTable(doc, {
        startY: y,
        head: [["Data", "Profissional", "Status", "Resumo"]],
        body: filtrados.map((e) => [
          format(new Date(e.finalized_at || e.updated_at || e.created_at || ""), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          }),
          e.professional_nome || "—",
          e.status,
          (e.queixa_principal || e.diagnosticos || e.conduta || "—").slice(0, 80),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [8, 120, 249] },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Kareon · Página ${i} de ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 20, {
          align: "center",
        });
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/pacientes/${paciente.id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Relatório clínico</h1>
          <p className="text-sm text-muted-foreground">{paciente.nome}</p>
        </div>
        <Button onClick={handleExportPDF} disabled={gerando} className="gap-2">
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>De</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Atendimentos no período ({filtrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum atendimento no filtro.</p>
          ) : (
            filtrados.map((e) => (
              <Link
                key={e.id}
                to={`/atendimento/clinico/${e.id}`}
                className="block rounded-xl border px-4 py-3 hover:border-primary/40"
              >
                <p className="font-medium text-sm">
                  {format(
                    new Date(e.finalized_at || e.updated_at || e.created_at || ""),
                    "dd/MM/yyyy HH:mm",
                    { locale: ptBR }
                  )}{" "}
                  · {e.professional_nome || "—"}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {e.queixa_principal || e.diagnosticos || e.conduta || "Sem resumo"}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorio;
