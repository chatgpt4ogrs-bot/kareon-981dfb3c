import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { usePaciente } from "@/hooks/use-pacientes";
import { useSaveObjetivo } from "@/hooks/use-objetivos";
import { ObjetivoTerapeutico } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";

const ObjetivoForm = () => {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const { data: paciente } = usePaciente(pacienteId);
  const saveMutation = useSaveObjetivo();

  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<"nao_iniciado" | "em_andamento" | "concluido">("nao_iniciado");
  const [progresso, setProgresso] = useState(0);

  if (!paciente) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const objetivo: ObjetivoTerapeutico = {
      id: crypto.randomUUID(),
      pacienteId: paciente.id,
      descricao,
      status,
      progresso,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    await saveMutation.mutateAsync(objetivo);
    navigate(`/pacientes/${paciente.id}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div><h1 className="text-xl font-bold text-foreground">Novo objetivo</h1><p className="text-sm text-muted-foreground">{paciente.nome}</p></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Descrição do objetivo *</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Melhorar preensão palmar para grafismo" required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Progresso: {progresso}%</Label>
              <Slider value={[progresso]} onValueChange={([v]) => setProgresso(v)} max={100} step={5} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar objetivo
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ObjetivoForm;
