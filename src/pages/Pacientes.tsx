import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePacientes, useSavePaciente } from "@/hooks/use-pacientes";
import { useSessoes } from "@/hooks/use-sessoes";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import VisitExploreNotice from "@/components/VisitExploreNotice";
import { toast } from "sonner";

const Pacientes = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [respNome, setRespNome] = useState("");
  const [respTel, setRespTel] = useState("");
  const { data: pacientes = [], isLoading } = usePacientes();
  const { data: allSessoes = [] } = useSessoes();
  const { isVisitor } = useAuth();
  const savePaciente = useSavePaciente();

  const filtrados = pacientes.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.diagnostico || "").toLowerCase().includes(busca.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(busca.toLowerCase()));
    const matchTag = !tagFiltro || (p.tags || []).includes(tagFiltro);
    return matchBusca && matchTag;
  });

  const tagsUsadas = Array.from(new Set(pacientes.flatMap((p) => p.tags || [])));

  function openCreate() {
    setNome("");
    setDataNascimento("");
    setDiagnostico("");
    setRespNome("");
    setRespTel("");
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do paciente");
      return;
    }
    try {
      const saved = await savePaciente.mutateAsync({
        id: "",
        nome: nome.trim(),
        dataNascimento,
        diagnostico,
        status: "ativo",
        tags: [],
        responsavel: {
          nome: respNome,
          telefone: respTel,
          email: "",
          parentesco: "",
        },
        criadoEm: new Date().toISOString(),
      });
      toast.success("Paciente cadastrado");
      setModalOpen(false);
      navigate(`/pacientes/${saved.id}`);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível cadastrar");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isVisitor && <VisitExploreNotice area="pacientes" />}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pacientes.length} cadastrado{pacientes.length === 1 ? "" : "s"}
          </p>
        </div>
        {!isVisitor && (
          <Button className="gap-2 shadow-sm" type="button" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Novo paciente
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, diagnóstico ou tag..."
            className="pl-10 bg-card shadow-soft border-border/70"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {tagsUsadas.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Filtrar pacientes"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary/10 text-primary")}
          >
            <Filter className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showFilters && tagsUsadas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={tagFiltro === null ? "default" : "outline"}
            className="cursor-pointer py-1.5 px-3"
            onClick={() => setTagFiltro(null)}
          >
            Todos
          </Badge>
          {tagsUsadas.map((tag) => (
            <Badge
              key={tag}
              variant={tagFiltro === tag ? "default" : "outline"}
              className="cursor-pointer py-1.5 px-3"
              onClick={() => setTagFiltro(tagFiltro === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border/80 bg-card/50">
          <p className="text-muted-foreground mb-4">
            {pacientes.length === 0
              ? isVisitor
                ? "Nenhum paciente de demonstração aqui — no acesso completo sua clínica gerencia a lista real."
                : "Nenhum paciente cadastrado ainda"
              : "Nenhum resultado encontrado"}
          </p>
          {pacientes.length === 0 && !isVisitor && (
            <Button variant="outline" className="gap-2" type="button" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Cadastrar primeiro paciente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((p) => {
            const totalSessoes = allSessoes.filter((s) => s.pacienteId === p.id).length;
            return (
              <Link key={p.id} to={`/pacientes/${p.id}`}>
                <Card className="hover:shadow-soft-md transition-shadow cursor-pointer border-border/70 shadow-soft">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {p.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{p.nome}</p>
                        <Badge
                          variant={p.status === "ativo" ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {p.diagnostico || "Sem diagnóstico informado"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {totalSessoes} {totalSessoes === 1 ? "sessão" : "sessões"}
                        </span>
                        {(p.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs py-0 px-1.5 font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pac-nome">Nome completo *</Label>
              <Input
                id="pac-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do paciente"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pac-nasc">Data de nascimento</Label>
              <Input
                id="pac-nasc"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pac-diag">Diagnóstico / observação</Label>
              <Textarea
                id="pac-diag"
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                rows={2}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pac-resp">Responsável</Label>
                <Input
                  id="pac-resp"
                  value={respNome}
                  onChange={(e) => setRespNome(e.target.value)}
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pac-tel">Telefone</Label>
                <Input
                  id="pac-tel"
                  value={respTel}
                  onChange={(e) => setRespTel(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savePaciente.isPending}>
                {savePaciente.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pacientes;
