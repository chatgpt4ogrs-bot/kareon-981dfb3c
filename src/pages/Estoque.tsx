import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEstoque, type Produto, type ProdutoInput } from "@/hooks/use-estoque";
import { useAuth } from "@/contexts/AuthContext";
import { logDeletion } from "@/lib/audit";
import ProdutoModal from "@/components/estoque/ProdutoModal";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const formatQtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const formatPreco = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Estoque = () => {
  const { produtos, criar, atualizar } = useEstoque();
  const { profile } = useAuth();
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [excluindo, setExcluindo] = useState<Produto | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (!q) return lista;
    return lista.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q),
    );
  }, [produtos, busca]);

  const abaixoDoMinimo = produtos.filter((p) => p.quantidade <= p.estoqueMinimo).length;

  const abrirNovo = () => {
    setEditando(null);
    setModalOpen(true);
  };

  const abrirEdicao = (p: Produto) => {
    setEditando(p);
    setModalOpen(true);
  };

  const handleSave = async (input: ProdutoInput) => {
    try {
      if (editando) {
        await atualizar(editando.id, input);
        toast({ title: "Produto atualizado", description: input.nome });
      } else {
        await criar(input);
        toast({ title: "Produto cadastrado", description: input.nome });
      }
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const confirmarExclusao = async (reason: string) => {
    if (!excluindo) return;
    try {
      await logDeletion({
        entityType: "produto_estoque",
        entityId: excluindo.id,
        entityLabel: excluindo.nome,
        reason,
        snapshot: excluindo,
        clinicId: profile?.clinica_id ?? null,
      });
      toast({ title: "Produto excluído", description: excluindo.nome });
      setExcluindo(null);
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {produtos.length} {produtos.length === 1 ? "produto" : "produtos"}
            {abaixoDoMinimo > 0 && ` · ${abaixoDoMinimo} abaixo do mínimo`}
          </p>
        </div>
        <Button className="gap-2" onClick={abrirNovo}>
          <Plus className="w-4 h-4" /> Novo produto
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou categoria..."
          className="pl-10"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground mb-4">
            {produtos.length === 0 ? "Nenhum produto cadastrado ainda" : "Nenhum resultado encontrado"}
          </p>
          {produtos.length === 0 && (
            <Button variant="outline" className="gap-2" onClick={abrirNovo}>
              <Plus className="w-4 h-4" /> Cadastrar primeiro produto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((p) => {
            const baixo = p.quantidade <= p.estoqueMinimo;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{p.nome}</p>
                      {baixo && (
                        <Badge variant="destructive" className="text-xs shrink-0 gap-1">
                          <AlertTriangle className="w-3 h-3" /> Baixo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                      {p.categoria && <Badge variant="outline" className="text-xs py-0 px-1.5 font-normal">{p.categoria}</Badge>}
                      <span>Mínimo: {formatQtd(p.estoqueMinimo)} {p.unidade}</span>
                      {p.precoCusto != null && <span>· Custo: {formatPreco(p.precoCusto)}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={baixo ? "text-lg font-bold text-destructive" : "text-lg font-bold text-foreground"}>
                      {formatQtd(p.quantidade)}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.unidade}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" aria-label={`Editar ${p.nome}`} onClick={() => abrirEdicao(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir ${p.nome}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setExcluindo(p)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProdutoModal open={modalOpen} onOpenChange={setModalOpen} produto={editando} onSave={handleSave} />

      <ConfirmDeleteDialog
        open={!!excluindo}
        onOpenChange={(o) => { if (!o) setExcluindo(null); }}
        title="Excluir produto?"
        itemName={excluindo?.nome}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
};

export default Estoque;
