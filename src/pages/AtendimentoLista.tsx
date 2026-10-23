import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtendimentos } from "@/hooks/use-atendimentos";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const STATUS_CLASS: Record<string, string> = {
  agendado: "bg-sky-100 text-sky-800",
  em_andamento: "bg-amber-100 text-amber-800",
  finalizado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-slate-100 text-slate-600",
  faltou: "bg-rose-100 text-rose-800",
};

export default function AtendimentoLista() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      q: search || undefined,
      status: status === "todos" ? undefined : status,
    }),
    [search, status]
  );

  const { data = [], isLoading, isError, error } = useAtendimentos(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            Atendimentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lista de atendimentos e prontuário eletrônico
          </p>
        </div>
        <Button onClick={() => navigate("/atendimento/novo")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo atendimento
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por paciente, CID ou queixa…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(q.trim());
            }}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => setSearch(q.trim())}>
          Filtrar
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Profissional</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Diagnóstico</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-destructive">
                    {(error as Error)?.message || "Erro ao carregar"}
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum atendimento encontrado
                  </td>
                </tr>
              )}
              {data.map((a) => (
                <tr
                  key={a.id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/atendimento/${a.id}`)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(a.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/atendimento/${a.id}`}
                      className="font-medium text-foreground hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {a.paciente_nome || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.profissional_nome || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{a.tipo?.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                        STATUS_CLASS[a.status] || "bg-muted"
                      )}
                    >
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                    {a.diagnostico_cid
                      ? `${a.diagnostico_cid}${a.diagnostico_descricao ? ` — ${a.diagnostico_descricao}` : ""}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
