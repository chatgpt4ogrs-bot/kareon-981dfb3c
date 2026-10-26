import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  usePacientes,
  useSavePaciente,
  useImportPacientes,
  useDeletePaciente,
  type ImportPacientesProgress,
} from "@/hooks/use-pacientes";
import { useSessoes } from "@/hooks/use-sessoes";
import { Plus, Search, Filter, Loader2, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import VisitExploreNotice from "@/components/VisitExploreNotice";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { toast } from "sonner";
import type { Paciente } from "@/types";
import {
  parsePacientesXlsx,
  type PacienteImportPayload,
  type ParsePacientesResult,
} from "@/lib/import-pacientes-xlsx";
import { useClinicPodologia } from "@/hooks/use-clinic-podologia";
import { FichaPodologiaForm } from "@/components/pacientes/FichaPodologiaForm";
import {
  EMPTY_FICHA_PODOLOGIA,
  fichaToAlertas,
  fichaToDiagnostico,
  fichaToTags,
  type FichaPodologia,
} from "@/lib/ficha-podologia";

const Pacientes = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [respNome, setRespNome] = useState("");
  const [respTel, setRespTel] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [ficha, setFicha] = useState<FichaPodologia>(EMPTY_FICHA_PODOLOGIA);

  const [importOpen, setImportOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsePacientesResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [importProgress, setImportProgress] = useState<ImportPacientesProgress | null>(null);
  const [excluindo, setExcluindo] = useState<Paciente | null>(null);

  const { data: pacientes = [], isLoading } = usePacientes();
  const { data: allSessoes = [] } = useSessoes();
  const { isVisitor } = useAuth();
  const { useFichaPodologia } = useClinicPodologia();
  const savePaciente = useSavePaciente();
  const importPacientes = useImportPacientes();
  const deletePaciente = useDeletePaciente();

  const filtrados = pacientes.filter((p) => {
    const nome = (p.nome || "").toLowerCase();
    const diag = (p.diagnostico || "").toLowerCase();
    const q = busca.toLowerCase();
    const matchBusca =
      nome.includes(q) ||
      diag.includes(q) ||
      (p.tags || []).some((t) => String(t).toLowerCase().includes(q));
    const matchTag = !tagFiltro || (p.tags || []).includes(tagFiltro);
    return matchBusca && matchTag;
  });

  const tagsUsadas = Array.from(new Set(pacientes.flatMap((p) => p.tags || [])));

  function openCreate() {
    setNome("");
    setDataNascimento("");
    setDiagnostico("");
    setRespNome("");
    setRespTel("");
    setCpf("");
    setEmail("");
    setEndereco("");
    setFicha({ ...EMPTY_FICHA_PODOLOGIA });
    setModalOpen(true);
  }

  function resetImport() {
    setParsed(null);
    setFileName("");
    setImportProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
      toast.error("Use uma planilha .xlsx (export pacientes_export)");
      return;
    }
    setParsing(true);
    setImportProgress(null);
    try {
      const result = await parsePacientesXlsx(file);
      setParsed(result);
      setFileName(file.name);
      setImportOpen(true);
      if (result.warnings.length) {
        result.warnings.forEach((w) => toast.message(w));
      }
    } catch (err: any) {
      toast.error(err.message || "Não foi possível ler a planilha");
      resetImport();
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirmImport() {
    if (!parsed?.rows.length) return;
    try {
      const result = await importPacientes.mutateAsync({
        rows: parsed.rows,
        onProgress: setImportProgress,
      });
      const parts = [
        `${result.created} importado${result.created === 1 ? "" : "s"}`,
        result.skipped ? `${result.skipped} já existia${result.skipped === 1 ? "" : "m"}` : null,
        result.errors.length ? `${result.errors.length} com erro` : null,
      ].filter(Boolean);
      if (result.created > 0) {
        toast.success(parts.join(" · "));
      } else if (result.errors.length) {
        toast.error(parts.join(" · "));
      } else {
        toast.message(parts.join(" · ") || "Nada a importar");
      }
      if (!result.errors.length) {
        setImportOpen(false);
        resetImport();
      }
    } catch (err: any) {
      toast.error(err.message || "Falha na importação");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do paciente");
      return;
    }
    try {
      const diag = useFichaPodologia
        ? fichaToDiagnostico(ficha) || diagnostico
        : diagnostico;
      const tags = useFichaPodologia ? fichaToTags(ficha) : [];
      const saved = await savePaciente.mutateAsync({
        id: "",
        nome: nome.trim(),
        dataNascimento,
        diagnostico: diag,
        status: "ativo",
        tags,
        cpf: cpf || undefined,
        telefone: respTel || undefined,
        email: email || undefined,
        endereco_rua: endereco || undefined,
        alergias: useFichaPodologia ? ficha.alergias || undefined : undefined,
        alertas_clinicos: useFichaPodologia
          ? fichaToAlertas(ficha) || undefined
          : undefined,
        observacoes: useFichaPodologia
          ? ficha.observacoes_finais || undefined
          : undefined,
        fichaPodologia: useFichaPodologia ? ficha : undefined,
        responsavel: {
          nome: respNome,
          telefone: respTel,
          email: email,
          parentesco: useFichaPodologia && (respTel || email) ? "próprio" : "",
        },
        criadoEm: new Date().toISOString(),
      });
      toast.success("Paciente cadastrado");
      setModalOpen(false);
      navigate(`/pacientes/${saved.id}`);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível cadastrar");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewRows: PacienteImportPayload[] = parsed?.rows.slice(0, 8) || [];
  const importing = importPacientes.isPending;

  return (
    <div className="space-y-6">
      {isVisitor && <VisitExploreNotice area="pacientes" />}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pacientes.length} cadastrado{pacientes.length === 1 ? "" : "s"}
          </p>
        </div>
        {!isVisitor && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              className="gap-2"
              type="button"
              disabled={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Importar dados
            </Button>
            <Button className="gap-2 shadow-sm" type="button" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Novo paciente
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, diagnóstico ou tag..."
            className="pl-10 bg-card shadow-soft border-border/70"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {tagsUsadas.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Filtrar pacientes"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary/10 text-primary")}
          >
            <Filter className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showFilters && tagsUsadas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={tagFiltro === null ? "default" : "outline"}
            className="cursor-pointer py-1.5 px-3"
            onClick={() => setTagFiltro(null)}
          >
            Todos
          </Badge>
          {tagsUsadas.map((tag) => (
            <Badge
              key={tag}
              variant={tagFiltro === tag ? "default" : "outline"}
              className="cursor-pointer py-1.5 px-3"
              onClick={() => setTagFiltro(tagFiltro === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border/80 bg-card/50">
          <p className="text-muted-foreground mb-4">
            {pacientes.length === 0
              ? isVisitor
                ? "Nenhum paciente de demonstração aqui — no acesso completo sua clínica gerencia a lista real."
                : "Nenhum paciente cadastrado ainda"
              : "Nenhum resultado encontrado"}
          </p>
          {pacientes.length === 0 && !isVisitor && (
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                className="gap-2"
                type="button"
                disabled={parsing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> Importar planilha
              </Button>
              <Button variant="outline" className="gap-2" type="button" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Cadastrar primeiro paciente
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map((p) => {
            const totalSessoes = allSessoes.filter((s) => s.pacienteId === p.id).length;
            return (
              <Card
                key={p.id}
                className="hover:shadow-soft-md transition-shadow border-border/70 shadow-soft"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Link
                    to={`/pacientes/${p.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {(p.nome || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{p.nome}</p>
                        <Badge
                          variant={p.status === "ativo" ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {p.diagnostico || "Sem diagnóstico informado"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {totalSessoes} {totalSessoes === 1 ? "sessão" : "sessões"}
                        </span>
                        {(p.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs py-0 px-1.5 font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Link>
                  {!isVisitor && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Excluir ${p.nome}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExcluindo(p);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className={
            useFichaPodologia
              ? "sm:max-w-2xl max-h-[90vh] overflow-y-auto"
              : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {useFichaPodologia ? "Novo paciente — Podologia" : "Novo paciente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pac-nome">Nome completo *</Label>
              <Input
                id="pac-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do paciente"
                autoFocus
                required
              />
            </div>

            {useFichaPodologia ? (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-nasc">Data de nascimento</Label>
                    <Input
                      id="pac-nasc"
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-cpf">CPF</Label>
                    <Input
                      id="pac-cpf"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-tel">Telefone</Label>
                    <Input
                      id="pac-tel"
                      value={respTel}
                      onChange={(e) => setRespTel(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-email">E-mail</Label>
                    <Input
                      id="pac-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pac-end">Endereço</Label>
                  <Input
                    id="pac-end"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <FichaPodologiaForm value={ficha} onChange={setFicha} />
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="pac-nasc">Data de nascimento</Label>
                  <Input
                    id="pac-nasc"
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pac-diag">Diagnóstico / observação</Label>
                  <Textarea
                    id="pac-diag"
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    rows={2}
                    placeholder="Opcional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-resp">Responsável</Label>
                    <Input
                      id="pac-resp"
                      value={respNome}
                      onChange={(e) => setRespNome(e.target.value)}
                      placeholder="Nome"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-tel">Telefone</Label>
                    <Input
                      id="pac-tel"
                      value={respTel}
                      onChange={(e) => setRespTel(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savePaciente.isPending}>
                {savePaciente.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (importing) return;
          setImportOpen(open);
          if (!open) resetImport();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar pacientes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Planilha reconhecida
              {fileName ? (
                <>
                  : <span className="text-foreground font-medium">{fileName}</span>
                </>
              ) : null}
              {parsed ? (
                <>
                  {" "}
                  · aba <span className="font-medium text-foreground">{parsed.sheetName}</span> ·{" "}
                  <span className="font-medium text-foreground">{parsed.rows.length}</span> paciente
                  {parsed.rows.length === 1 ? "" : "s"}
                </>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              Importa a ficha completa de podologia: dados pessoais, anamnese, hábitos, condições
              de saúde e observações finais. Quem já existir com o mesmo nome e data de nascimento
              será ignorado.
            </p>

            {previewRows.length > 0 && (
              <div className="rounded-lg border border-border/70 max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Nome</th>
                      <th className="text-left p-2 font-medium">Nascimento</th>
                      <th className="text-left p-2 font-medium">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={`${r.nome}-${i}`} className="border-t border-border/50">
                        <td className="p-2 truncate max-w-[10rem]">{r.nome}</td>
                        <td className="p-2 whitespace-nowrap">{r.data_nascimento || "—"}</td>
                        <td className="p-2 whitespace-nowrap">{r.responsavel_telefone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed && parsed.rows.length > previewRows.length && (
                  <p className="text-xs text-muted-foreground p-2 border-t">
                    + {parsed.rows.length - previewRows.length} na lista completa
                  </p>
                )}
              </div>
            )}

            {importProgress && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {importProgress.done}/{importProgress.total}
                  </span>
                  <span>
                    {importProgress.created} novos · {importProgress.skipped} ignorados
                    {importProgress.errors.length
                      ? ` · ${importProgress.errors.length} erros`
                      : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${
                        importProgress.total
                          ? Math.round((importProgress.done / importProgress.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                {importProgress.errors.length > 0 && (
                  <ul className="text-xs text-destructive max-h-24 overflow-auto space-y-0.5">
                    {importProgress.errors.slice(0, 5).map((e) => (
                      <li key={e.nome + e.message}>
                        {e.nome}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={importing}
              onClick={() => {
                setImportOpen(false);
                resetImport();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!parsed?.rows.length || importing}
              onClick={handleConfirmImport}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando…
                </>
              ) : (
                `Importar ${parsed?.rows.length || 0}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!excluindo}
        onOpenChange={(o) => {
          if (!o) setExcluindo(null);
        }}
        title="Excluir paciente?"
        itemName={excluindo?.nome}
        description="O cadastro e os vínculos deste paciente serão removidos. Esta ação não pode ser desfeita."
        onConfirm={async (reason) => {
          if (!excluindo) return;
          try {
            await deletePaciente.mutateAsync({ id: excluindo.id, reason });
            toast.success("Paciente excluído");
            setExcluindo(null);
          } catch (err: any) {
            toast.error(err.message || "Não foi possível excluir");
            throw err;
          }
        }}
      />
    </div>
  );
};

export default Pacientes;
