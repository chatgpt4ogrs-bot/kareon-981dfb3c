import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Specialty {
  id: string;
  nome: string;
  area: string;
  area_label?: string;
  codigo: string | null;
  descricao: string | null;
  ativo: boolean;
}

export interface SpecialtyArea {
  id: string;
  label: string;
}

export function useSpecialties(filters?: { area?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (filters?.area) qs.set("area", filters.area);
  if (filters?.q) qs.set("q", filters.q);
  const q = qs.toString();

  return useQuery({
    queryKey: ["specialties", filters],
    queryFn: () => api<Specialty[]>(`/specialties${q ? `?${q}` : ""}`),
    staleTime: 60_000,
  });
}

export function useSpecialtyAreas() {
  return useQuery({
    queryKey: ["specialty-areas"],
    queryFn: () => api<SpecialtyArea[]>("/specialties/areas"),
    staleTime: 300_000,
  });
}
