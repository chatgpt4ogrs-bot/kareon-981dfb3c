import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useFinanceDashboard() {
  return useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: () =>
      api<{ abertas: number; pagas_hoje: number; valor_aberto: number; valor_hoje: number }>(
        "/finance/dashboard"
      ),
    refetchInterval: 30_000,
  });
}

export function useInvoices(filters?: { status?: string; patient_id?: string }) {
  const qs = new URLSearchParams();
  if (filters?.status) qs.set("status", filters.status);
  if (filters?.patient_id) qs.set("patient_id", filters.patient_id);
  const q = qs.toString();
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => api<any[]>(`/finance/invoices${q ? `?${q}` : ""}`),
  });
}

export function usePayments(date?: string) {
  const qs = date ? `?date=${date}` : "";
  return useQuery({
    queryKey: ["payments", date],
    queryFn: () => api<any[]>(`/finance/payments${qs}`),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api("/finance/invoices", { method: "POST", json: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

export function usePayInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: any) =>
      api(`/finance/invoices/${id}/pay`, { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

export function useCashClose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api("/finance/cash-close", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-dashboard"] }),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/finance/invoices/${id}/cancel`, { method: "POST", json: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}
