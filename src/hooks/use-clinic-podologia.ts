import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessionals } from "@/hooks/use-professionals";

function isPodologiaProfessional(p: {
  specialty_area?: string | null;
  specialty_nome?: string | null;
  specialties?: { area?: string; nome?: string }[];
}) {
  if (p.specialty_area === "podologia") return true;
  if (/podolog/i.test(p.specialty_nome || "")) return true;
  return (p.specialties || []).some(
    (s) => s.area === "podologia" || /podolog/i.test(s.nome || "")
  );
}

/** Clínica / usuário atual opera com podologia (ficha específica de paciente). */
export function useClinicPodologia() {
  const { profile } = useAuth();
  const { data: professionals = [], isLoading } = useProfessionals();

  const podologos = useMemo(
    () => professionals.filter(isPodologiaProfessional),
    [professionals]
  );

  const isPodologiaClinic = podologos.length > 0;

  const isCurrentUserPodologo = useMemo(() => {
    if (!profile?.id) return false;
    return podologos.some((p) => p.profile_id === profile.id);
  }, [podologos, profile?.id]);

  /** Ficha/anamnese podológica só para profissionais de podologia */
  const useFichaPodologia = isCurrentUserPodologo;

  return {
    isLoading,
    isPodologiaClinic,
    isCurrentUserPodologo,
    useFichaPodologia,
    podologos,
  };
}
