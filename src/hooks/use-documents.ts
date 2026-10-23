import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDocumentTemplates() {
  return useQuery({
    queryKey: ["document-templates"],
    queryFn: () => api<any[]>("/documents/templates"),
    staleTime: 60_000,
  });
}

export function useDocuments(filters?: { patient_id?: string; tipo?: string }) {
  const qs = new URLSearchParams();
  if (filters?.patient_id) qs.set("patient_id", filters.patient_id);
  if (filters?.tipo) qs.set("tipo", filters.tipo);
  const q = qs.toString();
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: () => api<any[]>(`/documents${q ? `?${q}` : ""}`),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api("/documents", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}
