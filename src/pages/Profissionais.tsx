import { useMemo, useState } from "react";
import { Loader2, Plus, Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProfessionals, useSaveProfessional } from "@/hooks/use-professionals";
import { useSpecialties, useSpecialtyAreas } from "@/hooks/use-specialties";
import { useTerapeutas } from "@/hooks/use-terapeutas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONSELHOS = ["CRM", "CRO", "CRP", "CREFITO", "CRN", "COREN", "CRF", "Outro"];

export default function Profissionais() {
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const { data: areas = [] } = useSpecialtyAreas();
  const { data: specialties = [] } = useSpecialties(
    areaFilter !== "all" ? { area: areaFilter } : undefined
  );
  const { data: professionals = [], isLoading } = useProfessionals({
    area: areaFilter !== "all" ? areaFilter : undefined,
    specialty_id: specialtyFilter !== "all" ? specialtyFilter : undefined,
  });
  const { data: profiles = [] } = useTerapeutas();
  const save = useSaveProfessional();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    profile_id: "",
    specialty_ids: [] as string[],
    conselho: "",
    registro_profissional: "",
    titulo: "",
    duracao_padrao_minutos: "30",
    bio: "",
  });

  const linkedProfileIds = useMemo(
    () => new Set(professionals.map((p) => p.profile_id)),
    [professionals]
  );

  const availableProfiles = useMemo(
    () =>
      profiles.filter(
        (p) =>
          !linkedProfileIds.has(p.id) ||
          (editingId && professionals.find((pr) => pr.id === editingId)?.profile_id === p.id)
      ),
    [profiles, linkedProfileIds, editingId, professionals]
  );

  function openCreate() {
    setEditingId(null);
    setForm({
      profile_id: "",
      specialty_ids: [],
      conselho: "",
      registro_profissional: "",
      titulo: "",
      duracao_padrao_minutos: "30",
      bio: "",
    });
    setOpen(true);
  }

  function openEdit(p: (typeof professionals)[0]) {
    setEditingId(p.id);
    setForm({
      profile_id: p.profile_id,
      specialty_ids:
        p.specialties?.length > 0
          ? p.specialties.map((s) => s.id)
          : p.specialty_id
          ? [p.specialty_id]
          : [],
      conselho: p.conselho || "",
      registro_profissional: p.registro_profissional || "",
      titulo: p.titulo || "",
      duracao_padrao_minutos: String(p.duracao_padrao_minutos || 30),
      bio: p.bio || "",
    });
    setOpen(true);
  }

  function toggleSpecialty(id: string) {
    setForm((f) => ({
      ...f,
      specialty_ids: f.specialty_ids.includes(id)
        ? f.specialty_ids.filter((x) => x !== id)
        : [...f.specialty_ids, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.profile_id) {
      toast.error("Selecione o usuário");
      return;
    }
    if (form.specialty_ids.length === 0) {
      toast.error("Selecione ao menos uma especialidade");
      return;
    }
    try {
      await save.mutateAsync({
        id: editingId || undefined,
        profile_id: form.profile_id,
        specialty_id: form.specialty_ids[0],
        specialty_ids: form.specialty_ids,
        conselho: form.conselho || null,
        registro_profissional: form.registro_profissional || null,
        titulo: form.titulo || null,
        duracao_padrao_minutos: Number(form.duracao_padrao_minutos) || 30,
        bio: form.bio || null,
      });
      toast.success(editingId ? "Profissional atualizado" : "Profissional cadastrado");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  }

  const specialtiesByArea = useMemo(() => {
    const map = new Map<string, typeof specialties>();
    for (const s of specialties) {
      const list = map.get(s.area) || [];
      list.push(s);
      map.set(s.area, list);
    }
    return map;
  }, [specialties]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Médicos, dentistas, psicólogos, podólogos e demais especialistas da clínica
          </p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo profissional
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={areaFilter}
          onValueChange={(v) => {
            setAreaFilter(v);
            setSpecialtyFilter("all");
          }}
        >
          <SelectTrigger className="w-[200px] bg-card">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
          <SelectTrigger className="w-[240px] bg-card">
            <SelectValue placeholder="Especialidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as especialidades</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-soft">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Carregando…
          </div>
        ) : professionals.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Stethoscope className="w-8 h-8 mx-auto opacity-40" />
            <p>Nenhum profissional cadastrado nesta especialidade</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3">Especialidades</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.titulo ? `${p.titulo} ${p.nome}` : p.nome}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.specialties?.length
                        ? p.specialties
                        : p.specialty_nome
                        ? [{ id: p.specialty_id!, nome: p.specialty_nome, area: p.specialty_area || "", principal: true }]
                        : []
                      ).map((s) => (
                        <Badge key={s.id} variant={s.principal ? "default" : "secondary"}>
                          {s.nome}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {p.conselho && p.registro_profissional
                      ? `${p.conselho} ${p.registro_profissional}`
                      : p.registro_profissional || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.duracao_padrao_minutos || 30} min
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar profissional" : "Novo profissional"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId && (
              <div className="space-y-1.5">
                <Label>Usuário do sistema</Label>
                <Select
                  value={form.profile_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, profile_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cadastre o usuário em Usuários e depois vincule a especialidade aqui.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  placeholder="Dr., Dra., Psicol…"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duração padrão (min)</Label>
                <Input
                  value={form.duracao_padrao_minutos}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duracao_padrao_minutos: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Conselho</Label>
                <Select
                  value={form.conselho || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, conselho: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="CRM, CRO…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {CONSELHOS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº do registro</Label>
                <Input
                  placeholder="12345"
                  value={form.registro_profissional}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, registro_profissional: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Especialidades</Label>
              <div className="rounded-lg border p-3 max-h-48 overflow-y-auto space-y-3">
                {[...specialtiesByArea.entries()].map(([area, list]) => (
                  <div key={area}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      {areas.find((a) => a.id === area)?.label || area}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((s) => {
                        const selected = form.specialty_ids.includes(s.id);
                        const principal = form.specialty_ids[0] === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSpecialty(s.id)}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border transition-colors",
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted"
                            )}
                          >
                            {s.nome}
                            {principal ? " ★" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                A primeira marcada (★) é a especialidade principal.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Bio / observações</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
