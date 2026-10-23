import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppRole } from "@/contexts/AuthContext";
import { ROLE_DEFAULT_TABS, sanitizeTabs, type AppTab } from "@/lib/permissions";

export interface PerfilAcesso {
  id: string;
  nome: string;
  descricao: string | null;
  base_role: AppRole;
  abas: AppTab[];
  is_system: boolean;
  ordem: number;
}

export const BASE_ROLES: AppRole[] = [
  "admin", "supervisor_plataforma", "clinica_admin", "responsavel_clinica", "terapeuta", "familiar",
];

/** Nome original de cada tipo de acesso (usado quando o perfil não tem nome próprio). */
export const BASE_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin Master",
  supervisor_plataforma: "Gestor",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Profissional",
  familiar: "Familiar",
};

export const BASE_ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Acesso total ao sistema, todas as clínicas.",
  supervisor_plataforma: "Dono de uma ou mais clínicas: faz a gestão apenas das clínicas vinculadas pelo Admin Master; invisível para os usuários das clínicas.",
  clinica_admin: "Gerencia configurações, usuários e dados da clínica.",
  responsavel_clinica: "Gestão operacional da clínica (pacientes, agenda, profissionais).",
  terapeuta: "Atende pacientes: médico, dentista, psicólogo, podólogo ou outro especialista.",
  familiar: "Visualiza apenas os pacientes vinculados a ele.",
};

const FALLBACK_PREFIX = "system:";

const FALLBACK_PERFIS: PerfilAcesso[] = BASE_ROLES.map((role, i) => ({
  id: `${FALLBACK_PREFIX}${role}`,
  nome: BASE_ROLE_LABELS[role],
  descricao: BASE_ROLE_DESCRIPTIONS[role],
  base_role: role,
  abas: ROLE_DEFAULT_TABS[role],
  is_system: true,
  ordem: i + 1,
}));

/** Perfis padrão usados enquanto a tabela perfis_acesso não existe não têm id no banco. */
export const isStoredPerfilId = (id: string | null | undefined): id is string =>
  !!id && !id.startsWith(FALLBACK_PREFIX);

export function usePerfis() {
  const query = useQuery({
    queryKey: ["perfis-acesso"],
    queryFn: async (): Promise<{ perfis: PerfilAcesso[]; missingTable: boolean }> => {
      try {
        const data = await api<any[]>("/perfis-acesso");
        const perfis = (data ?? []).map((p: any) => ({
          ...p,
          abas: sanitizeTabs(p.abas),
        })) as PerfilAcesso[];
        return { perfis: perfis.length ? perfis : FALLBACK_PERFIS, missingTable: perfis.length === 0 };
      } catch {
        return { perfis: FALLBACK_PERFIS, missingTable: true };
      }
    },
    staleTime: 60_000,
  });

  const perfis = query.data?.perfis ?? FALLBACK_PERFIS;

  /** Perfil do usuário: o escolhido no cadastro ou, se não houver, o pré-cadastrado do tipo dele. */
  const perfilDoUsuario = (perfilId: string | null | undefined, role: string | null | undefined) =>
    perfis.find((p) => p.id === perfilId)
    ?? perfis.find((p) => p.is_system && p.base_role === role)
    ?? null;

  const nomeDoPerfil = (perfilId: string | null | undefined, role: string | null | undefined) =>
    perfilDoUsuario(perfilId, role)?.nome
    ?? (role ? BASE_ROLE_LABELS[role as AppRole] ?? role : "Sem perfil");

  return {
    ...query,
    perfis,
    missingTable: query.data?.missingTable ?? false,
    perfilDoUsuario,
    nomeDoPerfil,
  };
}
