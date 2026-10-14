import type { AppRole } from "@/contexts/AuthContext";

export const SUPPORT_EMAIL = "suportekareon@gmail.com";

export interface NavItem {
  to: string;
  icon: string;
  label: string;
  section?: "main" | "admin";
  disabled?: boolean;
  badge?: string;
}

/** Abas do sistema que podem ser liberadas individualmente para cada usuário. */
export type AppTab =
  | "pacientes"
  | "agenda"
  | "estoque"
  | "cameras"
  | "clinica_usuarios"
  | "clinica_detalhes";

export interface AppTabDef {
  id: AppTab;
  label: string;
  description: string;
  route: string;
  icon: string;
  section: "main" | "admin";
}

export const APP_TABS: AppTabDef[] = [
  { id: "pacientes", label: "Pacientes", description: "Cadastro, prontuário, sessões e objetivos dos pacientes.", route: "/pacientes", icon: "Users", section: "main" },
  { id: "agenda", label: "Agenda", description: "Calendário de atendimentos da clínica.", route: "/agenda", icon: "CalendarDays", section: "main" },
  { id: "estoque", label: "Estoque", description: "Produtos, quantidades e estoque mínimo.", route: "/estoque", icon: "Package", section: "main" },
  { id: "cameras", label: "Câmeras", description: "Visualização das câmeras da clínica.", route: "/cameras", icon: "Camera", section: "main" },
  { id: "clinica_detalhes", label: "Dados da clínica", description: "Informações cadastrais da clínica.", route: "/clinica/detalhes", icon: "Building2", section: "admin" },
  { id: "clinica_usuarios", label: "Usuários da clínica", description: "Criar, editar e desativar usuários da clínica.", route: "/clinica/usuarios", icon: "Users", section: "admin" },
];

const TAB_IDS = new Set<string>(APP_TABS.map((t) => t.id));
const ALL_TAB_IDS = APP_TABS.map((t) => t.id);

/** Modelo de acessos sugerido ao escolher o perfil; quem cadastra pode ajustar livremente. */
export const ROLE_DEFAULT_TABS: Record<AppRole, AppTab[]> = {
  admin: ALL_TAB_IDS,
  supervisor_plataforma: ["pacientes", "agenda", "estoque", "cameras", "clinica_usuarios"],
  clinica_admin: ALL_TAB_IDS,
  responsavel_clinica: ["pacientes", "agenda", "estoque", "cameras"],
  terapeuta: ["pacientes", "agenda", "estoque"],
  familiar: ["cameras"],
};

export function sanitizeTabs(value: unknown): AppTab[] {
  if (!Array.isArray(value)) return [];
  return ALL_TAB_IDS.filter((id) => value.includes(id));
}

/**
 * Abas efetivas do usuário: Admin Master tem tudo; os demais usam a lista
 * salva no perfil ou, se nunca foi definida, o modelo do perfil.
 */
export function resolveTabs(roles: AppRole[], permissions: string[] | null | undefined): AppTab[] {
  if (roles.includes("admin")) return ALL_TAB_IDS;
  if (Array.isArray(permissions)) return sanitizeTabs(permissions);
  const role = roles[0];
  // role pode vir do banco com valor fora dos 6 tipos (ex.: "therapist")
  return (role && ROLE_DEFAULT_TABS[role]) || [];
}

export function isValidTab(id: string): id is AppTab {
  return TAB_IDS.has(id);
}

const BASE_ROUTES = ["/", "/alterar-senha", "/perfil"];

/** Rotas exploráveis no modo visita (sem dados clínicos reais) */
const VISITOR_ROUTES = [
  "/",
  "/pacientes",
  "/agenda",
  "/perfil",
  "/alterar-senha",
];

/** Paths de escrita bloqueados para visitantes */
const VISITOR_WRITE_PATH_RE = /\/(novo|editar|sessao|objetivo)(\/|$)/;

function pathAllowed(allowed: string[], path: string): boolean {
  return allowed.some((route) => {
    if (route === "/") return path === "/";
    return path === route || path.startsWith(route + "/");
  });
}

function allowedRoutes(roles: AppRole[], tabs: AppTab[]): string[] {
  const routes = [...BASE_ROUTES, ...APP_TABS.filter((t) => tabs.includes(t.id)).map((t) => t.route)];
  if (roles.includes("admin")) routes.push("/admin", "/admin/clinicas", "/admin/usuarios");
  if (roles.includes("supervisor_plataforma")) routes.push("/admin/clinicas");
  return routes;
}

export function canAccessRoute(roles: AppRole[], path: string, isVisitor = false, tabs: AppTab[] = []): boolean {
  if (isVisitor) {
    if (VISITOR_WRITE_PATH_RE.test(path)) return false;
    return pathAllowed(VISITOR_ROUTES, path);
  }
  if (roles.length === 0) return false;
  return pathAllowed(allowedRoutes(roles, tabs), path);
}

/** Get the default redirect route for a role */
export function getDefaultRoute(_roles: AppRole[]): string {
  return "/";
}

type NavEntry = {
  to: string;
  icon: string;
  label: string;
  disabled?: boolean;
  badge?: string;
  tooltip?: string;
};

const UNAVAILABLE_TABS = new Set<AppTab>(["cameras"]);

export function getNavItems(roles: AppRole[], isVisitor = false, tabs: AppTab[] = []): {
  main: NavEntry[];
  admin: NavEntry[];
} {
  if (isVisitor) {
    const visitTooltip = `Disponível no plano completo. Fale conosco: ${SUPPORT_EMAIL}`;
    return {
      main: [
        { to: "/", icon: "LayoutDashboard", label: "Início" },
        { to: "/pacientes", icon: "Users", label: "Pacientes" },
        { to: "/agenda", icon: "CalendarDays", label: "Agenda" },
        { to: "/estoque", icon: "Package", label: "Estoque", disabled: true, badge: "Visita", tooltip: visitTooltip },
        { to: "/cameras", icon: "Camera", label: "Câmeras", disabled: true, badge: "Visita", tooltip: visitTooltip },
      ],
      admin: [],
    };
  }

  const main: NavEntry[] = [{ to: "/", icon: "LayoutDashboard", label: "Início" }];
  const admin: NavEntry[] = [];

  const isAdmin = roles.includes("admin");
  const isGestor = roles.includes("supervisor_plataforma");

  for (const tab of APP_TABS) {
    if (!tabs.includes(tab.id)) continue;
    if (isAdmin && tab.section === "admin") continue;
    // Gestor não tem clínica própria: os dados de cada clínica ficam em "Minhas clínicas"
    if (isGestor && tab.id === "clinica_detalhes") continue;
    const entry: NavEntry = { to: tab.route, icon: tab.icon, label: tab.label };
    if (UNAVAILABLE_TABS.has(tab.id)) {
      entry.disabled = true;
      entry.badge = "Indisponível";
      entry.tooltip = "entre em contato com o suporte para saber mais";
    }
    (tab.section === "main" ? main : admin).push(entry);
  }

  if (isAdmin) {
    admin.unshift({ to: "/admin", icon: "Shield", label: "Painel administrativo" });
  } else if (roles.includes("supervisor_plataforma")) {
    admin.unshift({ to: "/admin/clinicas", icon: "Building2", label: "Minhas clínicas" });
  }

  return { main, admin };
}
