import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPacientes, getSessoes } from "@/lib/store";
import { Plus, Search } from "lucide-react";

const Pacientes = () => {
  const [busca, setBusca] = useState("");
  const pacientes = getPacientes();
  const filtrados = pacientes.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.diagnostico.toLowerCase().includes(busca.toLowerCase())
  );

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou diagnóstico..."
          className="pl-10"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

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
                        <Badge variant={p.status === "ativo" ? "default" : "secondary"} className="text-xs">
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{p.diagnostico}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalSessoes} {totalSessoes === 1 ? "sessão" : "sessões"} · Resp: {p.responsavel.nome}
                      </p>
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
