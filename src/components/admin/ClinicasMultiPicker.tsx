import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface Props {
  clinicas: { id: string; nome: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

const ClinicasMultiPicker = ({ clinicas, value, onChange, disabled }: Props) => {
  const [search, setSearch] = useState("");
  const visible = clinicas.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  if (clinicas.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma clínica cadastrada.</p>;
  }

  return (
    <div className="space-y-2">
      {clinicas.length > 6 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Buscar clínica" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto">
        {visible.map((c) => {
          const checked = value.includes(c.id);
          return (
            <label
              key={c.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors",
                checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(c.id)} disabled={disabled} />
              <span className="truncate">{c.nome}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{value.length} clínica(s) selecionada(s)</p>
    </div>
  );
};

export default ClinicasMultiPicker;
