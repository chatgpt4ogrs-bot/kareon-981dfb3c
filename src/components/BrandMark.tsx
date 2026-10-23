import { cn } from "@/lib/utils";

type BrandMarkProps = {
  /** icon = só o símbolo; wordmark = símbolo + Kareon; stacked = logo completa */
  variant?: "icon" | "wordmark" | "stacked";
  /** light = fundo claro; dark = fundo escuro / painel brand */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
};

const sizeMap = {
  sm: { box: "w-8 h-8", title: "text-sm", tag: "text-[9px]", stacked: "h-11 max-w-[220px]" },
  md: { box: "w-9 h-9", title: "text-[15px]", tag: "text-[10px]", stacked: "h-12 max-w-[260px]" },
  lg: { box: "w-12 h-12", title: "text-xl", tag: "text-xs", stacked: "h-14 max-w-[300px]" },
  xl: { box: "w-16 h-16", title: "text-2xl", tag: "text-sm", stacked: "h-16 max-w-[340px]" },
};

/** Marca visual Kareon — logo sem fundo, cores oficiais */
export function BrandMark({
  variant = "wordmark",
  tone = "light",
  size = "md",
  className,
  showTagline = true,
}: BrandMarkProps) {
  const s = sizeMap[size];
  const titleColor = tone === "dark" ? "text-white" : "text-foreground";
  const tagColor = tone === "dark" ? "text-white/70" : "text-muted-foreground";

  const Icon = (
    <img
      src="/brand/kareon-mark.png"
      alt=""
      className={cn("object-contain shrink-0", s.box)}
      draggable={false}
    />
  );

  if (variant === "icon") {
    return <div className={cn("inline-flex", className)}>{Icon}</div>;
  }

  if (variant === "stacked") {
    return (
      <div className={cn("inline-flex flex-col items-center gap-2 text-center", className)}>
        <img
          src="/brand/kareon-logo.png"
          alt="Kareon"
          className={cn("object-contain w-auto", s.stacked)}
          draggable={false}
        />
        {showTagline && (
          <p className={cn("font-medium tracking-[0.14em] uppercase", s.tag, tagColor)}>
            Clinic OS
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5 min-w-0", className)}>
      {Icon}
      <div className="min-w-0">
        <p className={cn("font-bold tracking-tight leading-none", s.title, titleColor)}>Kareon</p>
        {showTagline && (
          <p className={cn("mt-0.5 font-medium tracking-wide uppercase", s.tag, tagColor)}>
            Clinic OS
          </p>
        )}
      </div>
    </div>
  );
}

export default BrandMark;
