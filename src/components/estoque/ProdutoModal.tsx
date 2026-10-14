import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Produto, ProdutoInput } from "@/hooks/use-estoque";

export const UNIDADES = ["un", "cx", "pct", "ml", "L", "g", "kg", "par"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: Produto | null;
  onSave: (input: ProdutoInput) => void;
}

interface FormState {
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: string;
  estoqueMinimo: string;
  precoCusto: string;
  observacoes: string;
}

const EMPTY: FormState = {
  nome: "",
  categoria: "",
  unidade: "un",
  quantidade: "0",
  estoqueMinimo: "0",
  precoCusto: "",
  observacoes: "",
};

function toForm(p: Produto): FormState {
  return {
    nome: p.nome,
    categoria: p.categoria,
    unidade: p.unidade,
    quantidade: String(p.quantidade),
    estoqueMinimo: String(p.estoqueMinimo),
    precoCusto: p.precoCusto == null ? "" : String(p.precoCusto),
    observacoes: p.observacoes,
  };
}

const ProdutoModal = ({ open, onOpenChange, produto, onSave }: Props) => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(produto ? toForm(produto) : EMPTY);
      setErrors({});
    }
  }, [open, produto]);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const quantidade = Number(form.quantidade.replace(",", "."));
    const estoqueMinimo = Number(form.estoqueMinimo.replace(",", "."));
    const precoCusto = form.precoCusto.trim() === "" ? null : Number(form.precoCusto.replace(",", "."));

    if (!form.nome.trim()) next.nome = "Informe o nome do produto";
    if (!Number.isFinite(quantidade) || quantidade < 0) next.quantidade = "Quantidade inválida";
    if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) next.estoqueMinimo = "Valor inválido";
    if (precoCusto !== null && (!Number.isFinite(precoCusto) || precoCusto < 0)) next.precoCusto = "Preço inválido";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      nome: form.nome.trim(),
      categoria: form.categoria.trim(),
      unidade: form.unidade,
      quantidade,
      estoqueMinimo,
      precoCusto,
      observacoes: form.observacoes.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Cadastrar produto"}</DialogTitle>
          <DialogDescription>
            {produto ? "Atualize as informações do produto." : "Preencha os dados do novo produto do estoque."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="produto-nome">Nome *</Label>
            <Input
              id="produto-nome"
              autoFocus
              value={form.nome}
              onChange={(e) => set("nome")(e.target.value)}
              placeholder="Ex.: Lâmina de bisturi nº 15"
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="produto-categoria">Categoria</Label>
              <Input
                id="produto-categoria"
                value={form.categoria}
                onChange={(e) => set("categoria")(e.target.value)}
                placeholder="Ex.: Descartáveis"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select value={form.unidade} onValueChange={set("unidade")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="produto-qtd">Quantidade</Label>
              <Input
                id="produto-qtd"
                inputMode="decimal"
                value={form.quantidade}
                onChange={(e) => set("quantidade")(e.target.value)}
              />
              {errors.quantidade && <p className="text-xs text-destructive">{errors.quantidade}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="produto-min">Estoque mínimo</Label>
              <Input
                id="produto-min"
                inputMode="decimal"
                value={form.estoqueMinimo}
                onChange={(e) => set("estoqueMinimo")(e.target.value)}
              />
              {errors.estoqueMinimo && <p className="text-xs text-destructive">{errors.estoqueMinimo}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="produto-preco">Preço de custo</Label>
              <Input
                id="produto-preco"
                inputMode="decimal"
                value={form.precoCusto}
                onChange={(e) => set("precoCusto")(e.target.value)}
                placeholder="R$"
              />
              {errors.precoCusto && <p className="text-xs text-destructive">{errors.precoCusto}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="produto-obs">Observações</Label>
            <Textarea
              id="produto-obs"
              rows={3}
              value={form.observacoes}
              onChange={(e) => set("observacoes")(e.target.value)}
              placeholder="Fornecedor, lote, validade..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{produto ? "Salvar alterações" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProdutoModal;
