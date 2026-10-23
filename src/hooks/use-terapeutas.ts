import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface Terapeuta {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
}

export function useTerapeutas() {
  const { clinicScope } = useAuth();
  return useQuery({
    queryKey: ["terapeutas", clinicScope],
    queryFn: async () => {
      if (clinicScope && clinicScope.length === 0) return [];
      const data = await api<any[]>("/profiles");
      return data.map((p: any) => ({
        id: p.id,
        nome: p.nome || p.name,
        email: p.email,
        cargo: p.role || p.cargo,
      })) as Terapeuta[];
    },
  });
}
