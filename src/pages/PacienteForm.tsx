import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaciente, useSavePaciente } from "@/hooks/use-pacientes";
import { useTerapeutas } from "@/hooks/use-terapeutas";
import { useAuth } from "@/contexts/AuthContext";
import { Paciente, TAGS_COMUNS } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";

const PacienteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: existing, isLoading: loadingExisting } = usePaciente(id);
  const { data: terapeutas = [] } = useTerapeutas();
  const { isAdmin, profile } = useAuth();
  const saveMutation = useSavePaciente();

  const [form, setForm] = useState<any>(null);

  const formData = form || (existing ? {
    nome: existing.nome,
    dataNascimento: existing.dataNascimento,
    diagnostico: existing.diagnostico,
    status: existing.status,
    tags: existing.tags,
    terapeutaId: existing.terapeutaId || "",
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
    terapeutaId: profile?.id || "",
    respNome: "",
    respTelefone: "",
    respEmail: "",
    respParentesco: "",
  });

  if (id && loadingExisting) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

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
      terapeutaId: formData.terapeutaId || undefined,
      responsavel: {
        nome: formData.respNome,
        telefone: formData.respTelefone,
        email: formData.respEmail,
        parentesco: formData.respParentesco,
      },
      criadoEm: existing?.criadoEm || new Date().toISOString(),
    } as Paciente & { existingId?: string };

    await saveMutation.mutateAsync(paciente);
    navigate(`/pacientes/${paciente.existingId || paciente.id}`);
  };

  const update = (field: string, value: string) => {
    setForm((prev: any) => ({ ...(prev || formData), [field]: value }));
  };

  const toggleTag = (tag: string) => {
    const current = (form || formData);
    const tags = current.tags.includes(tag) ? current.tags.filter((t: string) => t !== tag) : [...current.tags, tag];
    setForm((prev: any) => ({ ...(prev || formData), tags }));
  };

  const f = form || formData;

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
            {isAdmin && terapeutas.length > 1 && (
              <div className="space-y-2">
                <Label>Terapeuta responsável</Label>
                <Select value={f.terapeutaId} onValueChange={(v) => update("terapeutaId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um terapeuta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem terapeuta (visível para todos)</SelectItem>
                    {terapeutas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

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
                <Select value={f.respParentesco} onValueChange={(v) => update("respParentesco", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
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
