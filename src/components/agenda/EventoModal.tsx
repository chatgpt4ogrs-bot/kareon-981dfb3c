import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CATEGORIAS, Evento, EventoCategoria, getCategoriaInfo, useDeleteEvento, useSaveEvento } from "@/hooks/use-eventos";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: Evento | null;
  defaultDate?: Date;
}

function toDateInput(d: Date) {
  return format(d, "yyyy-MM-dd");
}
function toTimeInput(d: Date) {
  return format(d, "HH:mm");
}

export function EventoModal({ open, onOpenChange, evento, defaultDate }: Props) {
  const save = useSaveEvento();
  const del = useDeleteEvento();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [categoria, setCategoria] = useState<EventoCategoria>("sessao");

  useEffect(() => {
    if (!open) return;
    if (evento) {
      const ini = new Date(evento.data_inicio);
      const fim = evento.data_fim ? new Date(evento.data_fim) : null;
      setTitulo(evento.titulo);
      setDescricao(evento.descricao || "");
      setData(toDateInput(ini));
      setHoraInicio(toTimeInput(ini));
      setHoraFim(fim ? toTimeInput(fim) : toTimeInput(new Date(ini.getTime() + 60 * 60 * 1000)));
      setCategoria(evento.categoria as EventoCategoria);
    } else {
      const base = defaultDate ?? new Date();
      setTitulo("");
      setDescricao("");
      setData(toDateInput(base));
      setHoraInicio("09:00");
      setHoraFim("10:00");
      setCategoria("sessao");
    }
  }, [open, evento, defaultDate]);

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("Informe um título");
      return;
    }
    if (!data) {
      toast.error("Informe a data");
      return;
    }
    const inicio = new Date(`${data}T${horaInicio}:00`);
    const fim = horaFim ? new Date(`${data}T${horaFim}:00`) : null;
    const cat = getCategoriaInfo(categoria);

    try {
      await save.mutateAsync({
        id: evento?.id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_inicio: inicio.toISOString(),
        data_fim: fim ? fim.toISOString() : null,
        categoria,
        cor: cat.cor,
      });
      toast.success(evento ? "Evento atualizado" : "Evento criado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleDelete = async () => {
    if (!evento) return;
    if (!confirm("Excluir este evento?")) return;
    try {
      await del.mutateAsync(evento.id);
      toast.success("Evento excluído");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{evento ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Sessão com João"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => {
                const ativo = categoria === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategoria(c.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                      ativo
                        ? "border-transparent text-white shadow-sm"
                        : "border-border bg-background hover:bg-muted"
                    )}
                    style={ativo ? { backgroundColor: c.cor } : undefined}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: ativo ? "rgba(255,255,255,0.9)" : c.cor }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Notas, observações ou agenda"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {evento && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={del.isPending}
              className="mr-auto text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {evento ? "Salvar" : "Criar evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}