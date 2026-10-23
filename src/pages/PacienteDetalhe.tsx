import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaciente } from "@/hooks/use-pacientes";
import { useEncounters } from "@/hooks/use-encounters";
import { useDocuments } from "@/hooks/use-documents";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Loader2,
  Stethoscope,
  Clock,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

function summaryLine(e: {
  queixa_principal?: string | null;
  motivo_consulta?: string | null;
  diagnosticos?: string | null;
  conduta?: string | null;
  plano_terapeutico?: string | null;
  retorno_sugerido?: string | null;
  orientacoes?: string | null;
}) {
  return (
    e.queixa_principal ||
    e.motivo_consulta ||
    e.diagnosticos ||
    e.conduta ||
    e.plano_terapeutico ||
    e.orientacoes ||
    "Sem resumo registrado"
  );
}

const PacienteDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: paciente, isLoading } = usePaciente(id);
  const { data: encounters = [], isLoading: loadingEnc } = useEncounters(id);
  const { data: docs = [] } = useDocuments({ patient_id: id });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!paciente) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Paciente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/pacientes")}>
          Voltar
        </Button>
      </div>
    );
  }

  const idade = paciente.dataNascimento
    ? differenceInYears(new Date(), new Date(paciente.dataNascimento))
    : null;
  const ultimo = encounters[0];
  const finalizados = encounters.filter((e) => e.status === "finalizado");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Voltar"
          onClick={() => navigate("/pacientes")}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{paciente.nome}</h1>
            <Badge variant={paciente.status === "ativo" ? "default" : "secondary"}>
              {paciente.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {idade != null ? `${idade} anos` : "Idade não informada"}
            {paciente.diagnostico ? ` · ${paciente.diagnostico}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/pacientes/${paciente.id}/editar`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="w-4 h-4" /> Editar
            </Button>
          </Link>
          <Link to="/documentos">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-4 h-4" /> Documentos
            </Button>
          </Link>
        </div>
      </div>

      {/* Resumo rápido para o médico */}
      <Card className="border-primary/20 bg-primary/[0.03] shadow-soft">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Stethoscope className="w-4 h-4" />
            Onde paramos
          </div>
          {!ultimo ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há atendimentos clínicos registrados para este paciente.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Último atendimento: </span>
                <strong>
                  {format(new Date(ultimo.finalized_at || (ultimo as any).updated_at || (ultimo as any).created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </strong>
                {ultimo.professional_nome ? ` · ${ultimo.professional_nome}` : ""}
              </p>
              <p className="text-sm leading-relaxed">{summaryLine(ultimo)}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {ultimo.diagnostico_cid && (
                  <Badge variant="secondary">CID {ultimo.diagnostico_cid}</Badge>
                )}
                {ultimo.retorno_sugerido && (
                  <Badge variant="outline">Retorno: {ultimo.retorno_sugerido}</Badge>
                )}
                {ultimo.alergias && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3 h-3" /> Alergias: {ultimo.alergias}
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="link"
                className="px-0 h-auto"
                onClick={() => navigate(`/atendimento/clinico/${ultimo.id}`)}
              >
                Abrir prontuário completo <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{encounters.length}</p>
            <p className="text-xs text-muted-foreground">Atendimentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{finalizados.length}</p>
            <p className="text-xs text-muted-foreground">Finalizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{docs.length}</p>
            <p className="text-xs text-muted-foreground">Documentos</p>
          </CardContent>
        </Card>
      </div>

      {(paciente.responsavel?.nome || paciente.alergias || (paciente as any).alertas_clinicos) && (
        <Card>
          <CardContent className="p-4 grid sm:grid-cols-2 gap-4 text-sm">
            {paciente.responsavel?.nome && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contato / responsável</p>
                <p className="font-medium">
                  {paciente.responsavel.nome}
                  {paciente.responsavel.parentesco ? ` (${paciente.responsavel.parentesco})` : ""}
                </p>
                <p className="text-muted-foreground">
                  {[paciente.responsavel.telefone, paciente.responsavel.email]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Alertas clínicos</p>
              <p className="text-foreground">
                {(paciente as any).alergias ||
                  (paciente as any).alertas_clinicos ||
                  "Nenhum alerta cadastrado"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="historico">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="historico" className="gap-2">
            <Clock className="w-4 h-4" /> Histórico de atendimentos
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileText className="w-4 h-4" /> Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-3 mt-4">
          {loadingEnc ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Carregando histórico…
            </div>
          ) : encounters.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              Nenhum atendimento clínico ainda.
              <br />
              Use a Agenda → Recepção → Atendimento para registrar consultas.
            </div>
          ) : (
            encounters.map((e, idx) => (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate(`/atendimento/clinico/${e.id}`)}
                className={cn(
                  "w-full text-left rounded-2xl border bg-card p-4 shadow-soft hover:border-primary/40 transition-colors",
                  idx === 0 && "border-primary/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {format(
                          new Date(
                            e.finalized_at || (e as any).updated_at || (e as any).created_at
                          ),
                          "dd/MM/yyyy · HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                      <Badge variant="secondary" className="capitalize">
                        {e.status.replace(/_/g, " ")}
                      </Badge>
                      {idx === 0 && <Badge>Mais recente</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {e.professional_nome || "Profissional não informado"}
                    </p>
                    <p className="text-sm line-clamp-2">{summaryLine(e)}</p>
                    {(e.diagnosticos || e.conduta || e.prescricoes) && (
                      <div className="grid sm:grid-cols-3 gap-2 pt-2 text-xs">
                        {e.diagnosticos && (
                          <div className="rounded-lg bg-muted/50 px-2.5 py-2">
                            <p className="text-muted-foreground mb-0.5">Diagnóstico</p>
                            <p className="line-clamp-2">{e.diagnosticos}</p>
                          </div>
                        )}
                        {e.conduta && (
                          <div className="rounded-lg bg-muted/50 px-2.5 py-2">
                            <p className="text-muted-foreground mb-0.5">Conduta</p>
                            <p className="line-clamp-2">{e.conduta}</p>
                          </div>
                        )}
                        {e.prescricoes && (
                          <div className="rounded-lg bg-muted/50 px-2.5 py-2">
                            <p className="text-muted-foreground mb-0.5">Prescrição</p>
                            <p className="line-clamp-2">{e.prescricoes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4 space-y-2">
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum documento emitido para este paciente.
            </p>
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-sm">{d.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.tipo} · {format(new Date(d.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <Badge variant="secondary">{d.numero || "—"}</Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PacienteDetalhe;
