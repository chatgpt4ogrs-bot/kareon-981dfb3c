import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: () => api<any[]>("/rooms"),
  });
}

export function useSaveRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      payload.id
        ? api(`/rooms/${payload.id}`, { method: "PUT", json: payload })
        : api("/rooms", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useServices(filters?: { specialty_id?: string }) {
  const qs = new URLSearchParams();
  if (filters?.specialty_id) qs.set("specialty_id", filters.specialty_id);
  const q = qs.toString();
  return useQuery({
    queryKey: ["services", filters],
    queryFn: () => api<any[]>(`/services${q ? `?${q}` : ""}`),
  });
}

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      payload.id
        ? api(`/services/${payload.id}`, { method: "PUT", json: payload })
        : api("/services", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useInsurancePlans() {
  return useQuery({
    queryKey: ["insurance"],
    queryFn: () => api<any[]>("/insurance"),
  });
}

export function useSaveInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      payload.id
        ? api(`/insurance/${payload.id}`, { method: "PUT", json: payload })
        : api("/insurance", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insurance"] }),
  });
}

export function useWaitlist(status = "ativa") {
  return useQuery({
    queryKey: ["waitlist", status],
    queryFn: () => api<any[]>(`/waitlist?status=${status}`),
    refetchInterval: 20_000,
  });
}

export function useSaveWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      payload.id
        ? api(`/waitlist/${payload.id}`, { method: "PUT", json: payload })
        : api("/waitlist", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["waitlist"] }),
  });
}

export function useSchedules(professionalId?: string) {
  return useQuery({
    queryKey: ["schedules", professionalId],
    queryFn: () => api<any[]>(`/schedules?professional_id=${professionalId}`),
    enabled: !!professionalId,
  });
}

export function useSaveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api("/schedules", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useScheduleBlocks(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const q = qs.toString();
  return useQuery({
    queryKey: ["schedule-blocks", from, to],
    queryFn: () => api<any[]>(`/schedules/blocks${q ? `?${q}` : ""}`),
  });
}

export function useSaveBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api("/schedules/blocks", { method: "POST", json: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule-blocks"] }),
  });
}
