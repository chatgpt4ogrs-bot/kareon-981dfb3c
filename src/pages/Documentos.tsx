import { useState } from "react";
import { format } from "date-fns";
import { FileText, Loader2, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDocument, useDocumentTemplates, useDocuments } from "@/hooks/use-documents";
import { usePacientes } from "@/hooks/use-pacientes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";

const TIPOS = [
  { id: "atestado", label: "Atestado" },
  { id: "receita", label: "Receita" },
  { id: "encaminhamento", label: "Encaminhamento" },
  { id: "pedido_exame", label: "Pedido de exame" },
];

export default function Documentos() {
  const { profile } = useAuth();
  const [tipoFilter, setTipoFilter] = useState("all");
  const { data: docs = [], isLoading } = useDocuments({
    tipo: tipoFilter === "all" ? undefined : tipoFilter,
  });
  const { data: templates = [] } = useDocumentTemplates();
  const { data: pacientes = [] } = usePacientes();
  const create = useCreateDocument();

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [form, setForm] = useState({
    tipo: "atestado",
    patient_id: "",
    dias: "1",
    cid: "",
    prescricao: "",
    orientacoes: "",
    especialidade_destino: "",
    motivo: "",
    observacoes: "",
    exames: "",
    indicacao: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const doc = await create.mutateAsync({
        unit_id: profile?.clinica_id,
        patient_id: form.patient_id,
        tipo: form.tipo,
        dias: form.dias,
        cid: form.cid,
        prescricao: form.prescricao,
        orientacoes: form.orientacoes,
        especialidade_destino: form.especialidade_destino,
        motivo: form.motivo,
        observacoes: form.observacoes,
        exames: form.exames,
        indicacao: form.indicacao,
        professional_profile_id: profile?.id,
      });
      toast.success("Documento emitido");
      setOpen(false);
      setPreview(doc);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function exportPdf(doc: any) {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("KAREON", margin, y);
    y += 18;
    pdf.setFontSize(11);
    pdf.text(doc.titulo || doc.tipo, margin, y);
    y += 12;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Nº ${doc.numero || "—"} · ${format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}`, margin, y);
    pdf.setTextColor(0);
    y += 24;
    const lines = pdf.splitTextToSize(doc.conteudo || "", 500);
    pdf.setFontSize(11);
    pdf.text(lines, margin, y);
    pdf.save(`${(doc.titulo || doc.tipo).replace(/\s+/g, "_")}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos clínicos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atestados, receitas, encaminhamentos e pedidos de exame
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Emitir documento
        </Button>
      </div>

      <Select value={tipoFilter} onValueChange={setTipoFilter}>
        <SelectTrigger className="w-[220px] bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {TIPOS.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-soft">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Carregando…
          </div>
        ) : docs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-40" />
            <p>Nenhum documento emitido</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3">{d.patient_nome}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{d.tipo}</Badge>
                  </td>
                  <td className="px-4 py-3">{d.titulo}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreview(d)}>
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportPdf(d)}>
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                      {templates.some((x) => x.tipo === t.id) ? "" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select
                value={form.patient_id}
                onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.tipo === "atestado" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Dias</Label>
                  <Input
                    value={form.dias}
                    onChange={(e) => setForm((f) => ({ ...f, dias: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CID</Label>
                  <Input
                    value={form.cid}
                    onChange={(e) => setForm((f) => ({ ...f, cid: e.target.value }))}
                  />
                </div>
              </div>
            )}
            {form.tipo === "receita" && (
              <>
                <div className="space-y-1.5">
                  <Label>Prescrição</Label>
                  <Textarea
                    rows={4}
                    value={form.prescricao}
                    onChange={(e) => setForm((f) => ({ ...f, prescricao: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Orientações</Label>
                  <Textarea
                    rows={2}
                    value={form.orientacoes}
                    onChange={(e) => setForm((f) => ({ ...f, orientacoes: e.target.value }))}
                  />
                </div>
              </>
            )}
            {form.tipo === "encaminhamento" && (
              <>
                <div className="space-y-1.5">
                  <Label>Especialidade destino</Label>
                  <Input
                    value={form.especialidade_destino}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, especialidade_destino: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Motivo</Label>
                  <Textarea
                    value={form.motivo}
                    onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                    required
                  />
                </div>
              </>
            )}
            {form.tipo === "pedido_exame" && (
              <>
                <div className="space-y-1.5">
                  <Label>Exames</Label>
                  <Textarea
                    rows={3}
                    value={form.exames}
                    onChange={(e) => setForm((f) => ({ ...f, exames: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Indicação clínica</Label>
                  <Textarea
                    value={form.indicacao}
                    onChange={(e) => setForm((f) => ({ ...f, indicacao: e.target.value }))}
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                Emitir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.titulo}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm bg-muted/40 rounded-lg p-4 max-h-[50vh] overflow-y-auto font-sans">
            {preview?.conteudo}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => preview && exportPdf(preview)}>
              <Printer className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
