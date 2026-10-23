import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessionals } from "@/hooks/use-professionals";
import { usePacientes } from "@/hooks/use-pacientes";

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
  const { data: pacientes = [] } = usePacientes();

  const podologos = useMemo(
    () => professionals.filter(isPodologiaProfessional),
    [professionals]
  );

  const isPodologiaClinic = podologos.length > 0;

  const hasImportedFicha = useMemo(
    () => pacientes.some((p) => !!p.fichaPodologia),
    [pacientes]
  );

  const isCurrentUserPodologo = useMemo(() => {
    if (!profile?.id) return false;
    return podologos.some((p) => p.profile_id === profile.id);
  }, [podologos, profile?.id]);

  /** Mostra ficha podológica ao criar/editar paciente nesta clínica */
  const useFichaPodologia = isPodologiaClinic || isCurrentUserPodologo || hasImportedFicha;

  return {
    isLoading,
    isPodologiaClinic,
    isCurrentUserPodologo,
    useFichaPodologia,
    podologos,
  };
}
