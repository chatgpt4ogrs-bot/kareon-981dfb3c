import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Plus,
  Search,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIAS, Evento, EventoCategoria, useEventos } from "@/hooks/use-eventos";
import { EventoModal } from "@/components/agenda/EventoModal";
import { useTerapeutas } from "@/hooks/use-terapeutas";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

type Visao = "dia" | "semana" | "mes";

const Agenda = () => {
  const { data: eventos = [], isLoading } = useEventos();
  const { data: terapeutas = [] } = useTerapeutas();
  const terapeutaMap = useMemo(() => {
    const m = new Map<string, string>();
    terapeutas.forEach((t) => m.set(t.id, t.nome));
    return m;
  }, [terapeutas]);
  const [visao, setVisao] = useState<Visao>("semana");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [filtros, setFiltros] = useState<EventoCategoria[]>(
    CATEGORIAS.map((c) => c.value)
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [eventoSel, setEventoSel] = useState<Evento | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const eventosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eventos.filter((e) => {
      if (!filtros.includes(e.categoria as EventoCategoria)) return false;
      if (q && !e.titulo.toLowerCase().includes(q) && !(e.descricao || "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [eventos, filtros, search]);

  const periodo = useMemo(() => {
    if (range?.from && range?.to) return { inicio: range.from, fim: range.to };
    if (visao === "dia") return { inicio: cursor, fim: cursor };
    if (visao === "semana") {
      const ini = startOfWeek(cursor, { weekStartsOn: 1 });
      return { inicio: ini, fim: addDays(ini, 6) };
    }
    return { inicio: startOfMonth(cursor), fim: endOfMonth(cursor) };
  }, [cursor, visao, range]);

  const labelPeriodo = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, "dd MMM", { locale: ptBR })} — ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`;
    }
    if (visao === "dia") return format(cursor, "dd 'de' MMMM yyyy", { locale: ptBR });
    if (visao === "semana")
      return `${format(periodo.inicio, "dd MMM", { locale: ptBR })} — ${format(periodo.fim, "dd MMM yyyy", { locale: ptBR })}`;
    return format(cursor, "MMMM yyyy", { locale: ptBR });
  }, [cursor, visao, periodo, range]);

  const navegar = (dir: -1 | 1) => {
    if (range) setRange(undefined);
    if (visao === "dia") setCursor(addDays(cursor, dir));
    else if (visao === "semana") setCursor(dir > 0 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
    else setCursor(addMonths(cursor, dir));
  };

  const abrirNovo = (data?: Date) => {
    setEventoSel(null);
    setDefaultDate(data ?? cursor);
    setModalOpen(true);
  };
  const abrirEvento = (e: Evento) => {
    setEventoSel(e);
    setDefaultDate(undefined);
    setModalOpen(true);
  };

  const eventosDoDia = (dia: Date) =>
    eventosFiltrados
      .filter((e) => isSameDay(new Date(e.data_inicio), dia))
      .sort(
        (a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
      );

  const toggleFiltro = (cat: EventoCategoria) => {
    setFiltros((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Organize sessões, avaliações e compromissos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento..."
              className="h-10 w-56 rounded-xl pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-xl gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Categorias</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORIAS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.value}
                  checked={filtros.includes(c.value)}
                  onCheckedChange={() => toggleFiltro(c.value)}
                >
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.cor }}
                  />
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => abrirNovo()}
            className="h-10 rounded-xl gap-1.5 bg-primary shadow-sm hover:shadow-md transition-shadow"
          >
            <Plus className="h-4 w-4" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Toolbar de navegação + visão */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => navegar(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-lg px-3 text-sm font-medium"
              onClick={() => setCursor(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => navegar(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className="ml-2 rounded-lg px-2 py-1 text-base font-semibold text-foreground capitalize transition-colors hover:bg-muted"
                  title="Selecionar data"
                >
                  {labelPeriodo}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={(r) => {
                    setRange(r);
                    if (r?.from && r?.to) {
                      setCursor(r.from);
                      setPickerOpen(false);
                    }
                  }}
                  defaultMonth={range?.from ?? cursor}
                  locale={ptBR}
                  initialFocus
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
                <div className="flex items-center justify-between gap-3 border-t p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRange(undefined);
                    }}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Limpar intervalo
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {!range?.from
                      ? "Selecione a data inicial"
                      : !range?.to
                      ? "Selecione a data final"
                      : ""}
                  </span>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="inline-flex rounded-xl bg-muted/60 p-1">
            {(["dia", "semana", "mes"] as Visao[]).map((v) => (
              <button
                key={v}
                onClick={() => setVisao(v)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all",
                  visao === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "mes" ? "Mês" : v}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visao === "dia" ? (
        <VisaoDia data={cursor} eventos={eventosDoDia(cursor)} onNew={() => abrirNovo(cursor)} onOpen={abrirEvento} terapeutaMap={terapeutaMap} />
      ) : range?.from && range?.to ? (
        <VisaoIntervalo
          inicio={range.from}
          fim={range.to}
          eventosDoDia={eventosDoDia}
          onNew={abrirNovo}
          onOpen={abrirEvento}
          terapeutaMap={terapeutaMap}
        />
      ) : visao === "semana" ? (
        <VisaoSemana inicio={periodo.inicio} eventosDoDia={eventosDoDia} onNew={abrirNovo} onOpen={abrirEvento} terapeutaMap={terapeutaMap} />
      ) : (
        <VisaoMes cursor={cursor} eventosDoDia={eventosDoDia} onNew={abrirNovo} onOpen={abrirEvento} />
      )}

      <EventoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        evento={eventoSel}
        defaultDate={defaultDate}
      />
    </div>
  );
};

/* ---------- Subcomponentes de visão ---------- */

function EventoCard({ evento, onOpen, terapeutaMap }: { evento: Evento; onOpen: (e: Evento) => void; terapeutaMap?: Map<string, string> }) {
  const ini = new Date(evento.data_inicio);
  const fim = evento.data_fim ? new Date(evento.data_fim) : null;
  const ids =
    evento.terapeuta_ids && evento.terapeuta_ids.length > 0
      ? evento.terapeuta_ids
      : evento.terapeuta_id
      ? [evento.terapeuta_id]
      : [];
  const nomes = ids
    .map((id) => terapeutaMap?.get(id))
    .filter((n): n is string => Boolean(n));
  const label =
    nomes.length === 0
      ? null
      : nomes.length <= 2
      ? nomes.join(", ")
      : `${nomes[0]} +${nomes.length - 1}`;
  return (
    <button
      onClick={() => onOpen(evento)}
      className="group w-full text-left rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-border"
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-1 h-full min-h-[28px] w-1 shrink-0 rounded-full"
          style={{ backgroundColor: evento.cor }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {evento.titulo}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(ini, "HH:mm")}
            {fim && ` — ${format(fim, "HH:mm")}`}
          </div>
          {label && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate" title={nomes.join(", ")}>
                {label}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function ColunaDia({
  data,
  eventos,
  destaque,
  onNew,
  onOpen,
  terapeutaMap,
}: {
  data: Date;
  eventos: Evento[];
  destaque?: boolean;
  onNew: (d: Date) => void;
  onOpen: (e: Evento) => void;
  terapeutaMap?: Map<string, string>;
}) {
  const hoje = isSameDay(data, new Date());
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/60 bg-card p-3 transition-all",
        hoje && "border-primary/40 bg-primary/5",
        destaque && "ring-2 ring-primary/20"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
              hoje && "text-primary"
            )}
          >
            {format(data, "EEE", { locale: ptBR })}
          </p>
          <p
            className={cn(
              "text-2xl font-bold leading-none text-foreground mt-1",
              hoje && "text-primary"
            )}
          >
            {format(data, "dd")}
          </p>
        </div>
        {eventos.length > 0 && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              hoje ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {eventos.length}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 min-h-[120px]">
        {eventos.length === 0 ? (
          <button
            onClick={() => onNew(data)}
            className="flex h-full min-h-[80px] w-full items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/5"
          >
            Sem sessões
          </button>
        ) : (
          eventos.map((ev) => <EventoCard key={ev.id} evento={ev} onOpen={onOpen} terapeutaMap={terapeutaMap} />)
        )}
      </div>
    </div>
  );
}

function VisaoDia({
  data,
  eventos,
  onNew,
  onOpen,
  terapeutaMap,
}: {
  data: Date;
  eventos: Evento[];
  onNew: () => void;
  onOpen: (e: Evento) => void;
  terapeutaMap?: Map<string, string>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <Card className="rounded-2xl shadow-sm h-fit">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {format(data, "EEEE", { locale: ptBR })}
          </p>
          <p className="mt-1 text-5xl font-bold text-foreground">{format(data, "dd")}</p>
          <p className="text-sm text-muted-foreground">
            {format(data, "MMMM yyyy", { locale: ptBR })}
          </p>
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="font-semibold text-foreground">{eventos.length}</span>{" "}
            <span className="text-muted-foreground">
              {eventos.length === 1 ? "evento" : "eventos"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {eventos.length === 0 ? (
          <Card className="rounded-2xl border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
              <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Nenhum evento neste dia</p>
              <Button onClick={onNew} variant="outline" className="rounded-xl gap-1.5">
                <Plus className="h-4 w-4" />
                Adicionar evento
              </Button>
            </CardContent>
          </Card>
        ) : (
          eventos.map((ev) => <EventoCard key={ev.id} evento={ev} onOpen={onOpen} terapeutaMap={terapeutaMap} />)
        )}
      </div>
    </div>
  );
}

function VisaoSemana({
  inicio,
  eventosDoDia,
  onNew,
  onOpen,
  terapeutaMap,
}: {
  inicio: Date;
  eventosDoDia: (d: Date) => Evento[];
  onNew: (d: Date) => void;
  onOpen: (e: Evento) => void;
  terapeutaMap?: Map<string, string>;
}) {
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  return (
    <>
      {/* Desktop: grid de 7 colunas */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-3">
        {dias.map((d) => (
          <ColunaDia
            key={d.toISOString()}
            data={d}
            eventos={eventosDoDia(d)}
            onNew={onNew}
            onOpen={onOpen}
            terapeutaMap={terapeutaMap}
          />
        ))}
      </div>
      {/* Mobile: lista vertical */}
      <div className="space-y-3 md:hidden">
        {dias.map((d) => (
          <ColunaDia
            key={d.toISOString()}
            data={d}
            eventos={eventosDoDia(d)}
            onNew={onNew}
            onOpen={onOpen}
            terapeutaMap={terapeutaMap}
          />
        ))}
      </div>
    </>
  );
}

function VisaoIntervalo({
  inicio,
  fim,
  eventosDoDia,
  onNew,
  onOpen,
  terapeutaMap,
}: {
  inicio: Date;
  fim: Date;
  eventosDoDia: (d: Date) => Evento[];
  onNew: (d: Date) => void;
  onOpen: (e: Evento) => void;
  terapeutaMap?: Map<string, string>;
}) {
  const dias: Date[] = [];
  let cur = inicio;
  while (cur <= fim) {
    dias.push(cur);
    cur = addDays(cur, 1);
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {dias.map((d) => (
        <ColunaDia
          key={d.toISOString()}
          data={d}
          eventos={eventosDoDia(d)}
          onNew={onNew}
          onOpen={onOpen}
          terapeutaMap={terapeutaMap}
        />
      ))}
    </div>
  );
}

function VisaoMes({
  cursor,
  eventosDoDia,
  onNew,
  onOpen,
}: {
  cursor: Date;
  eventosDoDia: (d: Date) => Evento[];
  onNew: (d: Date) => void;
  onOpen: (e: Evento) => void;
}) {
  const inicio = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const fim = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const dias: Date[] = [];
  let cur = inicio;
  while (cur <= fim) {
    dias.push(cur);
    cur = addDays(cur, 1);
  }
  const semanas: Date[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  const labels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {labels.map((l) => (
          <div
            key={l}
            className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const evs = eventosDoDia(d);
          const hoje = isSameDay(d, new Date());
          const noMes = isSameMonth(d, cursor);
          return (
            <button
              key={d.toISOString()}
              onClick={() => (evs[0] ? onOpen(evs[0]) : onNew(d))}
              className={cn(
                "min-h-[100px] border-b border-r p-2 text-left transition-colors hover:bg-muted/40",
                !noMes && "bg-muted/10 text-muted-foreground/60",
                hoje && "bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    hoje && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(d, "d")}
                </span>
                {evs.length > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {evs.length}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {evs.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: ev.cor }}
                  >
                    {format(new Date(ev.data_inicio), "HH:mm")} {ev.titulo}
                  </div>
                ))}
                {evs.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{evs.length - 3} mais
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export default Agenda;