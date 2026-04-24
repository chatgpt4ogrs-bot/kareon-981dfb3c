import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePaciente, useSavePaciente } from "@/hooks/use-pacientes";
import { useClinicProfiles } from "@/hooks/use-clinic-profiles";
import { usePacienteUsuarios, useSavePacienteUsuarios } from "@/hooks/use-paciente-usuarios";
import { useAuth } from "@/contexts/AuthContext";
import { Paciente, TAGS_COMUNS } from "@/types";
import { ArrowLeft, Loader2, UserPlus, X } from "lucide-react";

/** Tag picker isolado — só re-renderiza quando suas tags mudam */
const TagsPicker = memo(function TagsPicker({
  tags,
  onToggle,
}: {
  tags: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAGS_COMUNS.map((tag) => (
        <Badge
          key={tag}
          variant={tags.includes(tag) ? "default" : "outline"}
          className="cursor-pointer py-1.5 px-3"
          onClick={() => onToggle(tag)}
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
});

/** Lista de seleção de profiles em modal — memoizada */
const ProfilePickerList = memo(function ProfilePickerList({
  profiles,
  selected,
  onToggle,
  emptyMsg,
}: {
  profiles: any[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyMsg: string;
}) {
  if (profiles.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{emptyMsg}</p>;
  }
  return (
    <>
      {profiles.map((p) => (
        <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
          <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => onToggle(p.id)} />
          <div>
            <p className="text-sm font-medium text-foreground">{p.nome}</p>
            <p className="text-xs text-muted-foreground">{p.email}</p>
          </div>
        </label>
      ))}
    </>
  );
});

const PacienteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: existing, isLoading: loadingExisting } = usePaciente(id);
  const { data: allProfiles = [] } = useClinicProfiles();
  const { data: existingVinculos = [] } = usePacienteUsuarios(id);
  const { isAdmin, hasRole } = useAuth();
  const saveMutation = useSavePaciente();
  const saveVinculos = useSavePacienteUsuarios();

  // Refs para campos de texto (uncontrolled — zero re-render ao digitar)
  const nomeRef = useRef<HTMLInputElement>(null);
  const dataNascRef = useRef<HTMLInputElement>(null);
  const diagnosticoRef = useRef<HTMLTextAreaElement>(null);
  const respNomeRef = useRef<HTMLInputElement>(null);
  const respTelRef = useRef<HTMLInputElement>(null);
  const respEmailRef = useRef<HTMLInputElement>(null);

  // State apenas para campos discretos (selects, badges, checkboxes)
  const [status, setStatus] = useState<string>("ativo");
  const [parentesco, setParentesco] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTerapeutas, setSelectedTerapeutas] = useState<string[]>([]);
  const [selectedFamiliares, setSelectedFamiliares] = useState<string[]>([]);
  const [showTerapeutaDialog, setShowTerapeutaDialog] = useState(false);
  const [showFamiliarDialog, setShowFamiliarDialog] = useState(false);

  // Hidrata refs quando carregar dados existentes
  useEffect(() => {
    if (!existing) return;
    if (nomeRef.current) nomeRef.current.value = existing.nome || "";
    if (dataNascRef.current) dataNascRef.current.value = existing.dataNascimento || "";
    if (diagnosticoRef.current) diagnosticoRef.current.value = existing.diagnostico || "";
    if (respNomeRef.current) respNomeRef.current.value = existing.responsavel.nome || "";
    if (respTelRef.current) respTelRef.current.value = existing.responsavel.telefone || "";
    if (respEmailRef.current) respEmailRef.current.value = existing.responsavel.email || "";
    setStatus(existing.status || "ativo");
    setParentesco(existing.responsavel.parentesco || "");
    setTags(existing.tags || []);
  }, [existing]);

  useEffect(() => {
    if (existingVinculos.length > 0) {
      setSelectedTerapeutas(existingVinculos.filter((v) => v.tipo === "terapeuta").map((v) => v.profile_id));
      setSelectedFamiliares(existingVinculos.filter((v) => v.tipo === "familiar").map((v) => v.profile_id));
    }
  }, [existingVinculos]);

  const canManage = isAdmin || hasRole("clinica_admin") || hasRole("responsavel_clinica");

  const terapeutaProfiles = useMemo(
    () => allProfiles.filter((p: any) => p.roles.includes("terapeuta") && p.status === "ativo"),
    [allProfiles]
  );
  const familiarProfiles = useMemo(
    () => allProfiles.filter((p: any) => p.roles.includes("familiar") && p.status === "ativo"),
    [allProfiles]
  );

  const profileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allProfiles as any[]) map[p.id] = p.nome;
    return map;
  }, [allProfiles]);

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const toggleTerapeuta = useCallback((pid: string) => {
    setSelectedTerapeutas((prev) => (prev.includes(pid) ? prev.filter((i) => i !== pid) : [...prev, pid]));
  }, []);

  const toggleFamiliar = useCallback((pid: string) => {
    setSelectedFamiliares((prev) => (prev.includes(pid) ? prev.filter((i) => i !== pid) : [...prev, pid]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paciente = {
      id: existing?.id || crypto.randomUUID(),
      existingId: existing?.id,
      nome: nomeRef.current?.value || "",
      dataNascimento: dataNascRef.current?.value || "",
      diagnostico: diagnosticoRef.current?.value || "",
      status,
      tags,
      terapeutaId: selectedTerapeutas[0] || undefined,
      responsavel: {
        nome: respNomeRef.current?.value || "",
        telefone: respTelRef.current?.value || "",
        email: respEmailRef.current?.value || "",
        parentesco,
      },
      criadoEm: existing?.criadoEm || new Date().toISOString(),
    } as Paciente & { existingId?: string };

    const saved = await saveMutation.mutateAsync(paciente);
    const pacienteId = paciente.existingId || saved.id;

    if (canManage) {
      await saveVinculos.mutateAsync({
        pacienteId,
        terapeutas: selectedTerapeutas,
        familiares: selectedFamiliares,
      });
    }

    navigate(`/pacientes/${pacienteId}`);
  };

  if (id && loadingExisting) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {existing ? "Editar paciente" : "Novo paciente"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da criança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input ref={nomeRef} defaultValue="" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de nascimento *</Label>
                <Input ref={dataNascRef} type="date" defaultValue="" required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Textarea
                ref={diagnosticoRef}
                defaultValue=""
                placeholder="Ex: TEA, TDAH, atraso no desenvolvimento motor..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagsPicker tags={tags} onToggle={toggleTag} />
            </div>
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Vínculos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Terapeutas vinculados</Label>
                  <Dialog open={showTerapeutaDialog} onOpenChange={setShowTerapeutaDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-1">
                        <UserPlus className="w-4 h-4" /> Vincular
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Selecionar terapeutas</DialogTitle></DialogHeader>
                      <div className="space-y-2 max-h-64 overflow-auto">
                        <ProfilePickerList
                          profiles={terapeutaProfiles}
                          selected={selectedTerapeutas}
                          onToggle={toggleTerapeuta}
                          emptyMsg="Nenhum terapeuta disponível"
                        />
                      </div>
                      <Button type="button" onClick={() => setShowTerapeutaDialog(false)} className="w-full">
                        Confirmar
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
                {selectedTerapeutas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTerapeutas.map((pid) => (
                      <Badge key={pid} variant="secondary" className="gap-1 pr-1">
                        {profileNameMap[pid] || "Usuário"}
                        <button
                          type="button"
                          onClick={() => setSelectedTerapeutas((prev) => prev.filter((i) => i !== pid))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum terapeuta vinculado</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Familiares vinculados</Label>
                  <Dialog open={showFamiliarDialog} onOpenChange={setShowFamiliarDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-1">
                        <UserPlus className="w-4 h-4" /> Vincular
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Selecionar familiares</DialogTitle></DialogHeader>
                      <div className="space-y-2 max-h-64 overflow-auto">
                        <ProfilePickerList
                          profiles={familiarProfiles}
                          selected={selectedFamiliares}
                          onToggle={toggleFamiliar}
                          emptyMsg="Nenhum familiar disponível"
                        />
                      </div>
                      <Button type="button" onClick={() => setShowFamiliarDialog(false)} className="w-full">
                        Confirmar
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
                {selectedFamiliares.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedFamiliares.map((pid) => (
                      <Badge key={pid} variant="secondary" className="gap-1 pr-1">
                        {profileNameMap[pid] || "Usuário"}
                        <button
                          type="button"
                          onClick={() => setSelectedFamiliares((prev) => prev.filter((i) => i !== pid))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum familiar vinculado</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Responsável</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input ref={respNomeRef} defaultValue="" required />
              </div>
              <div className="space-y-2">
                <Label>Parentesco</Label>
                <Select
                  value={parentesco || "none"}
                  onValueChange={(v) => setParentesco(v === "none" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    <SelectItem value="mae">Mãe</SelectItem>
                    <SelectItem value="pai">Pai</SelectItem>
                    <SelectItem value="avo">Avó/Avô</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input ref={respTelRef} defaultValue="" placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input ref={respEmailRef} type="email" defaultValue="" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Salvar alterações" : "Cadastrar paciente"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PacienteForm;
