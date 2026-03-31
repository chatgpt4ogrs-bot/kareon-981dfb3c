import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPacientes, getSessoes } from "@/lib/store";
import { TAGS_COMUNS } from "@/types";
import { Plus, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const Pacientes = () => {
  const [busca, setBusca] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const pacientes = getPacientes();

  const filtrados = pacientes.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.diagnostico.toLowerCase().includes(busca.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(busca.toLowerCase()));
    const matchTag = !tagFiltro || (p.tags || []).includes(tagFiltro);
    return matchBusca && matchTag;
  });

  // Collect all used tags
  const tagsUsadas = Array.from(new Set(pacientes.flatMap((p) => p.tags || [])));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
        <Link to="/pacientes/novo">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Novo paciente
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, diagnóstico ou tag..."
            className="pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {tagsUsadas.length > 0 && (
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={cn(showFilters && "bg-primary/10 text-primary")}>
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
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            {pacientes.length === 0 ? "Nenhum paciente cadastrado ainda" : "Nenhum resultado encontrado"}
          </p>
          {pacientes.length === 0 && (
            <Link to="/pacientes/novo">
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Cadastrar primeiro paciente
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((p) => {
            const totalSessoes = getSessoes(p.id).length;
            return (
              <Link key={p.id} to={`/pacientes/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {p.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{p.nome}</p>
                        <Badge variant={p.status === "ativo" ? "default" : "secondary"} className="text-xs shrink-0">
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{p.diagnostico}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {totalSessoes} {totalSessoes === 1 ? "sessão" : "sessões"}
                        </span>
                        {(p.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs py-0 px-1.5 font-normal">{tag}</Badge>
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
    </div>
  );
};

export default Pacientes;
