import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Restringe a lista a uma clínica; null = todas as clínicas que o usuário enxerga. */
  clinicaId: string | null;
  clinicNames?: Record<string, string>;
}

interface PacienteOption {
  id: string;
  nome: string;
  clinica_id: string | null;
}

const PacientesVinculoPicker = ({ value, onChange, clinicaId, clinicNames }: Props) => {
  const [busca, setBusca] = useState("");

  const { data: pacientes = [], isLoading } = useQuery({
    queryKey: ["vinculo-pacientes", clinicaId],
    queryFn: async () => {
      let q = (supabase.from("pacientes") as any).select("id, nome, clinica_id").order("nome");
      if (clinicaId) q = q.eq("clinica_id", clinicaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PacienteOption[];
    },
  });

  const nomePorId = useMemo(() => Object.fromEntries(pacientes.map((p) => [p.id, p.nome])), [pacientes]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? pacientes.filter((p) => p.nome.toLowerCase().includes(q)) : pacientes;
  }, [pacientes, busca]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {nomePorId[id] || "Paciente"}
              <button type="button" onClick={() => toggle(id)} className="ml-0.5 hover:text-destructive" aria-label="Remover vínculo">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar paciente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : filtrados.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground text-center">
            {pacientes.length === 0 ? "Nenhum paciente cadastrado nesta clínica." : "Nenhum paciente encontrado."}
          </p>
        ) : (
          filtrados.map((p) => {
            const checked = value.includes(p.id);
            return (
              <label
                key={p.id}
                className={cn("flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40", checked && "bg-primary/5")}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} />
                <span className="flex-1 truncate">{p.nome}</span>
                {!clinicaId && p.clinica_id && clinicNames?.[p.clinica_id] && (
                  <span className="text-[10px] text-muted-foreground truncate">{clinicNames[p.clinica_id]}</span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PacientesVinculoPicker;
