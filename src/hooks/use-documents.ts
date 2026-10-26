import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDocumentTemplates(opts?: { all?: boolean }) {
  const all = !!opts?.all;
  return useQuery({
    queryKey: ["document-templates", all ? "all" : "active"],
    queryFn: () => api<any[]>(`/documents/templates${all ? "?all=1" : ""}`),
    staleTime: 60_000,
  });
}

export function useSaveDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      payload.id
        ? api(`/documents/templates/${payload.id}`, { method: "PUT", json: payload })
        : api("/documents/templates", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-templates"] }),
  });
}

export function useDeleteDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/documents/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-templates"] }),
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
