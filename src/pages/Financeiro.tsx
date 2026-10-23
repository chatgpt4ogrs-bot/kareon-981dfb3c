import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Wallet, Banknote, Receipt } from "lucide-react";
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
import {
  useCashClose,
  useCreateInvoice,
  useFinanceDashboard,
  useInvoices,
  usePayInvoice,
  usePayments,
} from "@/hooks/use-finance";
import { usePacientes } from "@/hooks/use-pacientes";
import { useServices, useInsurancePlans } from "@/hooks/use-clinic-ops";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Financeiro() {
  const { profile } = useAuth();
  const { data: dash } = useFinanceDashboard();
  const [statusFilter, setStatusFilter] = useState("aberta");
  const { data: invoices = [], isLoading } = useInvoices({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: payments = [] } = usePayments(today);
  const { data: pacientes = [] } = usePacientes();
  const { data: services = [] } = useServices();
  const { data: plans = [] } = useInsurancePlans();
  const createInv = useCreateInvoice();
  const payInv = usePayInvoice();
  const cashClose = useCashClose();

  const [openNew, setOpenNew] = useState(false);
  const [openPay, setOpenPay] = useState<any>(null);
  const [form, setForm] = useState({
    patient_id: "",
    service_id: "",
    insurance_id: "",
    descricao: "",
    valor: "",
    desconto: "0",
    tipo_pagamento: "particular",
  });
  const [payForm, setPayForm] = useState({ valor: "", forma: "pix" });

  const stats = useMemo(
    () => [
      { label: "Em aberto", value: money(Number(dash?.valor_aberto || 0)), icon: Wallet },
      { label: "Contas abertas", value: String(dash?.abertas ?? 0), icon: Receipt },
      { label: "Recebido hoje", value: money(Number(dash?.valor_hoje || 0)), icon: Banknote },
    ],
    [dash]
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const svc = services.find((s) => s.id === form.service_id);
      await createInv.mutateAsync({
        unit_id: profile?.clinica_id,
        patient_id: form.patient_id,
        service_id: form.service_id || null,
        insurance_id: form.insurance_id || null,
        descricao: form.descricao || svc?.nome || "Atendimento",
        valor: Number(form.valor || svc?.valor || 0),
        desconto: Number(form.desconto) || 0,
        tipo_pagamento: form.tipo_pagamento,
      });
      toast.success("Conta criada");
      setOpenNew(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!openPay) return;
    try {
      const res: any = await payInv.mutateAsync({
        id: openPay.id,
        valor: Number(payForm.valor),
        forma: payForm.forma,
      });
      toast.success(`Pagamento registrado · recibo ${res.recibo_numero}`);
      setOpenPay(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contas a receber, recebimentos e fechamento de caixa
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await cashClose.mutateAsync({
                  unit_id: profile?.clinica_id,
                  data_ref: today,
                });
                toast.success("Caixa fechado");
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          >
            Fechar caixa do dia
          </Button>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova conta
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </div>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aberta">Abertas</SelectItem>
            <SelectItem value="parcial">Parciais</SelectItem>
            <SelectItem value="paga">Pagas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-soft">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Carregando…
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">Nenhuma conta</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Nº</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const restante = Number(inv.valor_final) - Number(inv.pago_total || 0);
                return (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{inv.numero}</td>
                    <td className="px-4 py-3">{inv.patient_nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.descricao}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {money(Number(inv.valor_final))}
                      {restante > 0 && restante < Number(inv.valor_final) && (
                        <div className="text-xs text-muted-foreground">
                          Restante {money(restante)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {["aberta", "parcial"].includes(inv.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOpenPay(inv);
                            setPayForm({ valor: String(restante.toFixed(2)), forma: "pix" });
                          }}
                        >
                          Receber
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-soft">
        <h2 className="font-semibold mb-3">Recebimentos de hoje</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum recebimento hoje</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-border/60 py-2">
                <span>
                  {p.patient_nome} · {p.forma} · {p.recibo_numero}
                </span>
                <span className="font-medium">{money(Number(p.valor))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta a receber</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select
                value={form.patient_id}
                onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select
                value={form.service_id || "none"}
                onValueChange={(v) => {
                  const svc = services.find((s) => s.id === v);
                  setForm((f) => ({
                    ...f,
                    service_id: v === "none" ? "" : v,
                    descricao: svc?.nome || f.descricao,
                    valor: svc ? String(svc.valor ?? 0) : f.valor,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} · {money(Number(s.valor || 0))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Desconto</Label>
                <Input
                  value={form.desconto}
                  onChange={(e) => setForm((f) => ({ ...f, desconto: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo_pagamento}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo_pagamento: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">Particular</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                    <SelectItem value="cortesia">Cortesia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Convênio</Label>
                <Select
                  value={form.insurance_id || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, insurance_id: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createInv.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openPay} onOpenChange={(o) => !o && setOpenPay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {openPay?.patient_nome} · {openPay?.descricao}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input
                  value={payForm.valor}
                  onChange={(e) => setPayForm((f) => ({ ...f, valor: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma</Label>
                <Select
                  value={payForm.forma}
                  onValueChange={(v) => setPayForm((f) => ({ ...f, forma: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenPay(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={payInv.isPending}>
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
