import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, FileText } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/hooks/use-toast";
import { CATEGORIAS, EventoCategoria, useEventos, getCategoriaInfo } from "@/hooks/use-eventos";
import { usePacientes } from "@/hooks/use-pacientes";
import { useTerapeutas } from "@/hooks/use-terapeutas";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type StatusFiltro = "todos" | "confirmado" | "pendente" | "cancelado" | "concluido";

const STATUS_OPTS: { value: StatusFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "confirmado", label: "Confirmado" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelado", label: "Cancelado" },
  { value: "concluido", label: "Concluído" },
];

type ColKey = "data" | "paciente" | "profissional" | "tipo" | "status" | "observacoes" | "valor";

const COLUNAS: { key: ColKey; label: string }[] = [
  { key: "data", label: "Data e hora" },
  { key: "paciente", label: "Paciente" },
  { key: "profissional", label: "Profissional" },
  { key: "tipo", label: "Tipo de serviço" },
  { key: "status", label: "Status" },
  { key: "observacoes", label: "Observações" },
  { key: "valor", label: "Valor" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RelatorioAgendaDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const { data: eventos = [] } = useEventos();
  const { data: pacientes = [] } = usePacientes();
  const { data: terapeutas = [] } = useTerapeutas();

  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(format(subMonths(hoje, 1), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(hoje, "yyyy-MM-dd"));
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [pacienteId, setPacienteId] = useState<string>("todos");
  const [terapeutaId, setTerapeutaId] = useState<string>("todos");
  const [tipos, setTipos] = useState<EventoCategoria[]>(CATEGORIAS.map((c) => c.value));
  const [colunas, setColunas] = useState<ColKey[]>(["data", "paciente", "profissional", "tipo", "status", "observacoes"]);
  const [gerando, setGerando] = useState(false);

  const pacienteMap = useMemo(() => {
    const m = new Map<string, string>();
    pacientes.forEach((p) => m.set(p.id, p.nome));
    return m;
  }, [pacientes]);
  const terapeutaMap = useMemo(() => {
    const m = new Map<string, string>();
    terapeutas.forEach((t) => m.set(t.id, t.nome));
    return m;
  }, [terapeutas]);

  const eventosFiltrados = useMemo(() => {
    const ini = startOfDay(new Date(dataInicio));
    const fim = endOfDay(new Date(dataFim));
    return eventos
      .filter((e) => {
        const d = new Date(e.data_inicio);
        if (!isWithinInterval(d, { start: ini, end: fim })) return false;
        if (!tipos.includes(e.categoria as EventoCategoria)) return false;
        if (pacienteId !== "todos" && e.paciente_id !== pacienteId) return false;
        if (terapeutaId !== "todos") {
          const ids = e.terapeuta_ids && e.terapeuta_ids.length > 0 ? e.terapeuta_ids : e.terapeuta_id ? [e.terapeuta_id] : [];
          if (!ids.includes(terapeutaId)) return false;
        }
        // status atualmente não persistido — filtro só ignora se "todos"
        return true;
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
  }, [eventos, dataInicio, dataFim, tipos, pacienteId, terapeutaId]);

  const toggleTipo = (t: EventoCategoria) =>
    setTipos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleColuna = (c: ColKey) =>
    setColunas((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const handleGerar = async () => {
    if (colunas.length === 0) {
      toast({ title: "Selecione ao menos uma coluna", variant: "destructive" });
      return;
    }
    try {
      setGerando(true);

      // nome da clínica
      let clinicaNome = "Kareon";
      if (profile?.clinica_id) {
        const { data } = await supabase.from("clinicas").select("nome").eq("id", profile.clinica_id).maybeSingle();
        if (data?.nome) clinicaNome = data.nome;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 40;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(clinicaNome, pageW / 2, y, { align: "center" });
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Relatório de Agenda", pageW / 2, y, { align: "center" });
      y += 14;
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(
        `Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}`,
        pageW / 2,
        y,
        { align: "center" }
      );
      y += 12;
      const filtrosLinha: string[] = [];
      filtrosLinha.push(`Status: ${STATUS_OPTS.find((s) => s.value === status)?.label}`);
      filtrosLinha.push(`Paciente: ${pacienteId === "todos" ? "Todos" : pacienteMap.get(pacienteId) || "—"}`);
      filtrosLinha.push(`Profissional: ${terapeutaId === "todos" ? "Todos" : terapeutaMap.get(terapeutaId) || "—"}`);
      filtrosLinha.push(`Tipos: ${tipos.length === CATEGORIAS.length ? "Todos" : tipos.map((t) => getCategoriaInfo(t).label).join(", ")}`);
      doc.text(filtrosLinha.join("  ·  "), pageW / 2, y, { align: "center" });
      y += 16;
      doc.setTextColor(0);

      const head = [colunas.map((c) => COLUNAS.find((x) => x.key === c)!.label)];
      const body = eventosFiltrados.map((e) => {
        const ids = e.terapeuta_ids && e.terapeuta_ids.length > 0 ? e.terapeuta_ids : e.terapeuta_id ? [e.terapeuta_id] : [];
        const nomes = ids.map((id) => terapeutaMap.get(id)).filter(Boolean).join(", ");
        return colunas.map((c) => {
          switch (c) {
            case "data":
              return format(new Date(e.data_inicio), "dd/MM/yyyy HH:mm");
            case "paciente":
              return e.paciente_id ? pacienteMap.get(e.paciente_id) || "—" : "—";
            case "profissional":
              return nomes || "—";
            case "tipo":
              return getCategoriaInfo(e.categoria).label;
            case "status":
              return "—";
            case "observacoes":
              return e.descricao || "—";
            case "valor":
              return "—";
          }
        });
      });

      autoTable(doc, {
        startY: y,
        head,
        body: body.length === 0 ? [colunas.map(() => "—")] : body,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [74, 144, 226], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      const totalPaginas = doc.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(130);
        const rodape = `Total de agendamentos: ${eventosFiltrados.length}  ·  Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}  ·  Página ${i} de ${totalPaginas}`;
        doc.text(rodape, pageW / 2, doc.internal.pageSize.getHeight() - 18, { align: "center" });
      }

      doc.save(`agenda_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
      toast({ title: "Relatório gerado", description: `${eventosFiltrados.length} agendamento(s) exportado(s).` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Relatório da agenda
          </DialogTitle>
          <DialogDescription>
            Personalize os filtros e escolha as colunas do PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data inicial</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data final</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFiltro)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={terapeutaId} onValueChange={setTerapeutaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {terapeutas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipos de serviço</Label>
            <div className="flex flex-wrap gap-3 rounded-md border bg-muted/30 p-3">
              {CATEGORIAS.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={tipos.includes(c.value)} onCheckedChange={() => toggleTipo(c.value)} />
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Colunas do PDF</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-3">
              {COLUNAS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={colunas.includes(c.key)} onCheckedChange={() => toggleColuna(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border bg-primary/5 p-3 text-sm">
            <span className="font-semibold text-foreground">{eventosFiltrados.length}</span>{" "}
            <span className="text-muted-foreground">agendamento(s) no filtro selecionado</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={gerando}>Cancelar</Button>
          <Button onClick={handleGerar} disabled={gerando} className="gap-2">
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}