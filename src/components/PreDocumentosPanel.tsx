import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import {
  useDeleteDocumentTemplate,
  useDocumentTemplates,
  useSaveDocumentTemplate,
} from "@/hooks/use-documents";
import { toast } from "sonner";

const TIPOS = [
  { id: "atestado", label: "Atestado" },
  { id: "receita", label: "Receita" },
  { id: "encaminhamento", label: "Encaminhamento" },
  { id: "pedido_exame", label: "Pedido de exame" },
  { id: "livre", label: "Texto livre" },
];

const VARS_HINT =
  "{{paciente_nome}} {{paciente_doc}} {{data}} {{data_extenso}} {{dias}} {{cid}} {{prescricao}} {{orientacoes}} {{profissional_nome}} {{conselho}} {{registro}}";

export default function PreDocumentosPanel() {
  const { data: templates = [], isLoading } = useDocumentTemplates({ all: true });
  const save = useSaveDocumentTemplate();
  const remove = useDeleteDocumentTemplate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    tipo: "atestado",
    nome: "",
    corpo: "",
    ativo: true,
  });

  function openCreate() {
    setForm({ id: "", tipo: "atestado", nome: "", corpo: "", ativo: true });
    setOpen(true);
  }

  function openEdit(t: any) {
    setForm({
      id: t.id,
      tipo: t.tipo,
      nome: t.nome,
      corpo: t.corpo,
      ativo: t.ativo !== false,
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        id: form.id || undefined,
        tipo: form.tipo,
        nome: form.nome,
        corpo: form.corpo,
        ativo: form.ativo,
      });
      toast.success(form.id ? "Pré-documento atualizado" : "Pré-documento criado");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Modelos usados na emissão de documentos. Variáveis: {VARS_HINT}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Novo pré-documento
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Carregando…
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum pré-documento</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{t.nome}</td>
                  <td className="px-4 py-3 capitalize">{t.tipo.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.ativo ? "default" : "secondary"}>
                      {t.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                      Editar
                    </Button>
                    {t.ativo && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={async () => {
                          try {
                            await remove.mutateAsync(t.id);
                            toast.success("Pré-documento desativado");
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                      >
                        Desativar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar pré-documento" : "Novo pré-documento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Corpo do modelo</Label>
              <Textarea
                rows={10}
                value={form.corpo}
                onChange={(e) => setForm((f) => ({ ...f, corpo: e.target.value }))}
                required
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
