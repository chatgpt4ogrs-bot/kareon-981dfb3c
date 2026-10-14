import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { APP_TABS, type AppTab } from "@/lib/permissions";

interface Props {
  value: AppTab[];
  onChange: (tabs: AppTab[]) => void;
  /** Abas que quem está cadastrando pode liberar; as demais aparecem bloqueadas. */
  grantable?: AppTab[];
  disabled?: boolean;
}

const AcessosPicker = ({ value, onChange, grantable, disabled }: Props) => {
  const canGrant = (id: AppTab) => !grantable || grantable.includes(id);

  const toggle = (id: AppTab) => {
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  };

  const grantableIds = APP_TABS.map((t) => t.id).filter(canGrant);
  const allSelected = grantableIds.every((id) => value.includes(id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Início e Meu perfil estão sempre liberados.</span>
        {!disabled && (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() =>
              onChange(allSelected ? value.filter((t) => !canGrant(t)) : Array.from(new Set([...value, ...grantableIds])))
            }
          >
            {allSelected ? "Desmarcar todas" : "Marcar todas"}
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {APP_TABS.map((tab) => {
          const checked = value.includes(tab.id);
          const locked = disabled || !canGrant(tab.id);
          return (
            <label
              key={tab.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                checked ? "border-primary/40 bg-primary/5" : "border-border bg-background",
                locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40",
              )}
            >
              <Checkbox
                className="mt-0.5"
                checked={checked}
                disabled={locked}
                onCheckedChange={() => toggle(tab.id)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{tab.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {!disabled && !canGrant(tab.id) ? "Você não tem esta aba para liberar." : tab.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default AcessosPicker;
