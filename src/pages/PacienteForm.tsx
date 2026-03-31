import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPaciente, savePaciente } from "@/lib/store";
import { Paciente } from "@/types";
import { ArrowLeft } from "lucide-react";

const PacienteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = id ? getPaciente(id) : undefined;

  const [form, setForm] = useState({
    nome: existing?.nome || "",
    dataNascimento: existing?.dataNascimento || "",
    diagnostico: existing?.diagnostico || "",
    status: existing?.status || "ativo" as "ativo" | "inativo",
    respNome: existing?.responsavel.nome || "",
    respTelefone: existing?.responsavel.telefone || "",
    respEmail: existing?.responsavel.email || "",
    respParentesco: existing?.responsavel.parentesco || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paciente: Paciente = {
      id: existing?.id || crypto.randomUUID(),
      nome: form.nome,
      dataNascimento: form.dataNascimento,
      diagnostico: form.diagnostico,
      status: form.status,
      responsavel: {
        nome: form.respNome,
        telefone: form.respTelefone,
        email: form.respEmail,
        parentesco: form.respParentesco,
      },
      criadoEm: existing?.criadoEm || new Date().toISOString(),
    };
    savePaciente(paciente);
    navigate(`/pacientes/${paciente.id}`);
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

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
              <Input value={form.nome} onChange={(e) => update("nome", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de nascimento *</Label>
                <Input type="date" value={form.dataNascimento} onChange={(e) => update("dataNascimento", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
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
              <Textarea value={form.diagnostico} onChange={(e) => update("diagnostico", e.target.value)} placeholder="Ex: TEA, TDAH, atraso no desenvolvimento motor..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Responsável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.respNome} onChange={(e) => update("respNome", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Parentesco</Label>
                <Select value={form.respParentesco} onValueChange={(v) => update("respParentesco", v)}>
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
                <Input value={form.respTelefone} onChange={(e) => update("respTelefone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.respEmail} onChange={(e) => update("respEmail", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit">{existing ? "Salvar alterações" : "Cadastrar paciente"}</Button>
        </div>
      </form>
    </div>
  );
};

export default PacienteForm;
