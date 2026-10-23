import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Appointment {
  id: string;
  unit_id: string;
  patient_id: string;
  professional_profile_id: string | null;
  room_id: string | null;
  service_id: string | null;
  inicio: string;
  fim: string;
  duracao_minutos: number;
  status: string;
  modalidade: string;
  tipo_pagamento: string;
  notes: string | null;
  checkin_at: string | null;
  prioridade: number;
  patient_nome?: string;
  patient_codigo?: string;
  patient_telefone?: string;
  professional_nome?: string;
  room_nome?: string;
  service_nome?: string;
  specialty_nome?: string;
}

export function useAppointments(filters?: {
  from?: string;
  to?: string;
  status?: string;
  professional_id?: string;
  specialty_id?: string;
  area?: string;
  unit_id?: string;
}) {
  const qs = new URLSearchParams();
  if (filters?.from) qs.set("from", filters.from);
  if (filters?.to) qs.set("to", filters.to);
  if (filters?.status) qs.set("status", filters.status);
  if (filters?.professional_id) qs.set("professional_id", filters.professional_id);
  if (filters?.specialty_id) qs.set("specialty_id", filters.specialty_id);
  if (filters?.area) qs.set("area", filters.area);
  if (filters?.unit_id) qs.set("unit_id", filters.unit_id);
  const q = qs.toString();

  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: () => api<Appointment[]>(`/appointments${q ? `?${q}` : ""}`),
    refetchInterval: 30_000,
    // Sem unit_id o backend devolve vazio (agenda isolada por clínica)
    enabled: filters?.unit_id !== undefined ? !!filters.unit_id : true,
  });
}

export function useDashboardOps() {
  return useQuery({
    queryKey: ["appointments-dashboard"],
    queryFn: () =>
      api<{
        hoje_agendados: number;
        presentes: number;
        aguardando: number;
        em_atendimento: number;
        finalizados: number;
        faltas_cancelamentos: number;
        tempo_medio_espera_min: number;
        pacientes_novos_mes: number;
      }>("/appointments/dashboard"),
    refetchInterval: 20_000,
  });
}

export function useSaveAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Appointment> & { id?: string }) => {
      if (payload.id) {
        return api<Appointment>(`/appointments/${payload.id}`, { method: "PUT", json: payload });
      }
      return api<Appointment>("/appointments", { method: "POST", json: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointments-dashboard"] });
      qc.invalidateQueries({ queryKey: ["waiting"] });
    },
  });
}

export function useAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => api<Appointment>(`/appointments/${id}/status`, { method: "POST", json: { status, reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointments-dashboard"] });
      qc.invalidateQueries({ queryKey: ["waiting"] });
    },
  });
}

export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      api<Appointment>(`/appointments/${id}/checkin`, { method: "POST", json: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointments-dashboard"] });
      qc.invalidateQueries({ queryKey: ["waiting"] });
    },
  });
}

export function useWaitingQueue() {
  return useQuery({
    queryKey: ["waiting"],
    queryFn: () => api<any[]>("/waiting"),
    refetchInterval: 8_000,
  });
}

export function useCallNext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      professional_profile_id?: string;
      room_id?: string;
      unit_id?: string;
    }) => api("/waiting/call-next", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waiting"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
