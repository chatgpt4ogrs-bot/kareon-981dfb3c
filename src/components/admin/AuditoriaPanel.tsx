import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, ScrollText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AUDIT_ENTITY_LABELS } from "@/lib/audit";

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  clinic_id: string | null;
  reason: string;
  snapshot: Record<string, unknown> | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin Master",
  supervisor_plataforma: "Gestor",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Profissional",
  familiar: "Familiar",
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length ? value.map((v) => formatValue(v)).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return formatDateTime(value);
  }
  return String(value);
}

const AuditoriaPanel = () => {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("all");
  const [selecionado, setSelecionado] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => api<AuditLog[]>("/audit-logs"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["audit-clinicas"],
    queryFn: async () => api<{ id: string; nome: string }[]>("/clinics"),
  });

  const clinicNome = (log: AuditLog) => {
    if (!log.clinic_id) return "—";
    const atual = clinicas.find((c) => c.id === log.clinic_id)?.nome;
    if (atual) return atual;
    if (log.entity_type === "clinica") return log.entity_label || "Clínica excluída";
    return "Clínica excluída";
  };

  const tiposPresentes = useMemo(() => Array.from(new Set(logs.map((l) => l.entity_type))), [logs]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return logs.filter((l) => {
      if (tipo !== "all" && l.entity_type !== tipo) return false;
      if (!q) return true;
      return [l.entity_label, l.reason, l.actor_name, l.actor_email]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [logs, busca, tipo]);

  const tabelaAusente = error && /audit_logs/i.test((error as Error).message || "");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ScrollText className="w-5 h-5" /> Auditoria de exclusões
        </h2>
        <p className="text-sm text-muted-foreground">
          Tudo o que foi excluído no sistema, com motivo, autor e uma cópia completa do registro.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por item, motivo ou autor" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {tiposPresentes.map((t) => (
                <SelectItem key={t} value={t}>{AUDIT_ENTITY_LABELS[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              {tabelaAusente
                ? "A auditoria ainda não foi ativada no banco. Rode a migration 20261009130000_audit_logs.sql no Supabase."
                : `Não foi possível carregar a auditoria: ${(error as Error).message}`}
            </p>
          ) : filtrados.length === 0 ? (
            <p className="p-12 text-center text-muted-foreground">
              {logs.length === 0 ? "Nenhuma exclusão registrada até agora." : "Nenhum registro encontrado."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Item excluído</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Excluído por</TableHead>
                  <TableHead>Clínica</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelecionado(l)}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] whitespace-nowrap">{AUDIT_ENTITY_LABELS[l.entity_type] || l.entity_type}</Badge></TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{l.entity_label || "—"}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground" title={l.reason}>{l.reason}</TableCell>
                    <TableCell>
                      <p className="text-sm">{l.actor_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{l.actor_email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{clinicNome(l)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selecionado} onOpenChange={(o) => { if (!o) setSelecionado(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {AUDIT_ENTITY_LABELS[selecionado.entity_type] || selecionado.entity_type} excluído: {selecionado.entity_label || "—"}
                </DialogTitle>
                <DialogDescription>{formatDateTime(selecionado.created_at)}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Motivo da exclusão</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selecionado.reason}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Excluído por" value={selecionado.actor_name} />
                  <Info label="E-mail" value={selecionado.actor_email} />
                  <Info label="Perfil de quem excluiu" value={ROLE_LABELS[selecionado.actor_role || ""] || selecionado.actor_role} />
                  <Info label="Clínica" value={clinicNome(selecionado)} />
                  <Info label="Tipo de registro" value={AUDIT_ENTITY_LABELS[selecionado.entity_type] || selecionado.entity_type} />
                  <Info label="ID do registro" value={selecionado.entity_id} mono />
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Dados do registro no momento da exclusão</p>
                  {selecionado.snapshot && Object.keys(selecionado.snapshot).length > 0 ? (
                    <div className="rounded-lg border border-border divide-y divide-border">
                      {Object.entries(selecionado.snapshot).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[160px_1fr] gap-3 px-3 py-2 text-sm">
                          <span className="text-muted-foreground break-all">{k}</span>
                          <span className="text-foreground whitespace-pre-wrap break-all">{formatValue(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados registrados.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Info = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-medium text-foreground break-all ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
  </div>
);

export default AuditoriaPanel;
