import { useState, useEffect } from "react";
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

const PacienteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: existing, isLoading: loadingExisting } = usePaciente(id);
  const { data: allProfiles = [] } = useClinicProfiles();
  const { data: existingVinculos = [] } = usePacienteUsuarios(id);
  const { isAdmin, hasRole, profile } = useAuth();
  const saveMutation = useSavePaciente();
  const saveVinculos = useSavePacienteUsuarios();

  const [form, setForm] = useState<any>(null);
  const [selectedTerapeutas, setSelectedTerapeutas] = useState<string[]>([]);
  const [selectedFamiliares, setSelectedFamiliares] = useState<string[]>([]);
  const [showTerapeutaDialog, setShowTerapeutaDialog] = useState(false);
  const [showFamiliarDialog, setShowFamiliarDialog] = useState(false);

  // Populate vínculos from existing data
  useEffect(() => {
    if (existingVinculos.length > 0) {
      setSelectedTerapeutas(existingVinculos.filter((v) => v.tipo === "terapeuta").map((v) => v.profile_id));
      setSelectedFamiliares(existingVinculos.filter((v) => v.tipo === "familiar").map((v) => v.profile_id));
    }
  }, [existingVinculos]);

  const formData = form || (existing ? {
    nome: existing.nome,
    dataNascimento: existing.dataNascimento,
    diagnostico: existing.diagnostico,
    status: existing.status,
    tags: existing.tags,
    respNome: existing.responsavel.nome,
    respTelefone: existing.responsavel.telefone,
    respEmail: existing.responsavel.email,
    respParentesco: existing.responsavel.parentesco,
  } : {
    nome: "",
    dataNascimento: "",
    diagnostico: "",
    status: "ativo" as const,
    tags: [] as string[],
    respNome: "",
    respTelefone: "",
    respEmail: "",
    respParentesco: "",
  });

  if (id && loadingExisting) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const canManage = isAdmin || hasRole("clinica_admin") || hasRole("responsavel_clinica");

  const terapeutaProfiles = allProfiles.filter((p: any) => p.roles.includes("terapeuta") && p.status === "ativo");
  const familiarProfiles = allProfiles.filter((p: any) => p.roles.includes("familiar") && p.status === "ativo");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paciente = {
      id: existing?.id || crypto.randomUUID(),
      existingId: existing?.id,
      nome: formData.nome,
      dataNascimento: formData.dataNascimento,
      diagnostico: formData.diagnostico,
      status: formData.status,
      tags: formData.tags,
      terapeutaId: selectedTerapeutas[0] || undefined,
      responsavel: {
        nome: formData.respNome,
        telefone: formData.respTelefone,
        email: formData.respEmail,
        parentesco: formData.respParentesco,
      },
      criadoEm: existing?.criadoEm || new Date().toISOString(),
    } as Paciente & { existingId?: string };

    const saved = await saveMutation.mutateAsync(paciente);
    const pacienteId = paciente.existingId || saved.id;

    // Save vínculos
    if (canManage) {
      await saveVinculos.mutateAsync({
        pacienteId,
        terapeutas: selectedTerapeutas,
        familiares: selectedFamiliares,
      });
    }

    navigate(`/pacientes/${pacienteId}`);
  };

  const update = (field: string, value: string) => {
    setForm((prev: any) => ({ ...(prev || formData), [field]: value }));
  };

  const toggleTag = (tag: string) => {
    const current = (form || formData);
    const tags = current.tags.includes(tag) ? current.tags.filter((t: string) => t !== tag) : [...current.tags, tag];
    setForm((prev: any) => ({ ...(prev || formData), tags }));
  };

  const toggleProfile = (profileId: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(profileId) ? list.filter((id) => id !== profileId) : [...list, profileId]);
  };

  const f = form || formData;

  const getProfileName = (profileId: string) => {
    const p = allProfiles.find((p: any) => p.id === profileId);
    return p?.nome || "Usuário";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{existing ? "Editar paciente" : "Novo paciente"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados da criança</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={f.nome} onChange={(e) => update("nome", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de nascimento *</Label>
                <Input type="date" value={f.dataNascimento} onChange={(e) => update("dataNascimento", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={f.status} onValueChange={(v) => update("status", v)}>
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
              <Textarea value={f.diagnostico} onChange={(e) => update("diagnostico", e.target.value)} placeholder="Ex: TEA, TDAH, atraso no desenvolvimento motor..." />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {TAGS_COMUNS.map((tag) => (
                  <Badge key={tag} variant={f.tags.includes(tag) ? "default" : "outline"} className="cursor-pointer py-1.5 px-3" onClick={() => toggleTag(tag)}>{tag}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vínculos */}
        {canManage && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Vínculos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Terapeutas */}
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
                        {terapeutaProfiles.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum terapeuta disponível</p>
                        ) : terapeutaProfiles.map((t: any) => (
                          <label key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={selectedTerapeutas.includes(t.id)}
                              onCheckedChange={() => toggleProfile(t.id, selectedTerapeutas, setSelectedTerapeutas)}
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground">{t.nome}</p>
                              <p className="text-xs text-muted-foreground">{t.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <Button type="button" onClick={() => setShowTerapeutaDialog(false)} className="w-full">Confirmar</Button>
                    </DialogContent>
                  </Dialog>
                </div>
                {selectedTerapeutas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTerapeutas.map((id) => (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {getProfileName(id)}
                        <button type="button" onClick={() => setSelectedTerapeutas((prev) => prev.filter((i) => i !== id))} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum terapeuta vinculado</p>
                )}
              </div>

              {/* Familiares */}
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
                        {familiarProfiles.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum familiar disponível</p>
                        ) : familiarProfiles.map((f: any) => (
                          <label key={f.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={selectedFamiliares.includes(f.id)}
                              onCheckedChange={() => toggleProfile(f.id, selectedFamiliares, setSelectedFamiliares)}
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground">{f.nome}</p>
                              <p className="text-xs text-muted-foreground">{f.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <Button type="button" onClick={() => setShowFamiliarDialog(false)} className="w-full">Confirmar</Button>
                    </DialogContent>
                  </Dialog>
                </div>
                {selectedFamiliares.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedFamiliares.map((id) => (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {getProfileName(id)}
                        <button type="button" onClick={() => setSelectedFamiliares((prev) => prev.filter((i) => i !== id))} className="ml-1 hover:text-destructive">
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
                <Input value={f.respNome} onChange={(e) => update("respNome", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Parentesco</Label>
                <Select value={f.respParentesco || "none"} onValueChange={(v) => update("respParentesco", v === "none" ? "" : v)}>
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
                <Input value={f.respTelefone} onChange={(e) => update("respTelefone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={f.respEmail} onChange={(e) => update("respEmail", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
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
