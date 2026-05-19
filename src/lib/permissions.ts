import type { AppRole } from "@/contexts/AuthContext";

export interface NavItem {
  to: string;
  icon: string;
  label: string;
  section?: "main" | "admin";
  disabled?: boolean;
  badge?: string;
}

/** Routes each role can access */
const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: [
    "/", "/agenda", "/cameras", "/alterar-senha", "/perfil", "/admin",
    "/admin/clinicas", "/admin/usuarios",
  ],
  clinica_admin: [
    "/", "/pacientes", "/agenda", "/cameras", "/alterar-senha", "/clinica/usuarios", "/perfil",
  ],
  responsavel_clinica: [
    "/", "/pacientes", "/agenda", "/cameras", "/alterar-senha", "/perfil",
  ],
  terapeuta: [
    "/", "/pacientes", "/agenda", "/alterar-senha", "/perfil",
  ],
  familiar: [
    "/", "/cameras", "/alterar-senha", "/perfil",
  ],
};

/** Check if a role set allows access to a given path */
export function canAccessRoute(roles: AppRole[], path: string): boolean {
  if (roles.length === 0) return false;

  return roles.some((role) => {
    const allowed = ROLE_ROUTES[role];
    if (!allowed) return false;
    if (allowed.includes("*")) return true;
    return allowed.some((route) => {
      if (route === "/") return path === "/";
      return path === route || path.startsWith(route + "/");
    });
  });
}

/** Get the default redirect route for a role */
export function getDefaultRoute(roles: AppRole[]): string {
  return "/";
}

/** Nav items visible per role */
export function getNavItems(roles: AppRole[]): {
  main: { to: string; icon: string; label: string; disabled?: boolean; badge?: string }[];
  admin: { to: string; icon: string; label: string; disabled?: boolean; badge?: string }[];
} {
  const isAdmin = roles.includes("admin");
  const isClinicaAdmin = roles.includes("clinica_admin");
  const isResponsavel = roles.includes("responsavel_clinica");
  const isTerapeuta = roles.includes("terapeuta");
  const isFamiliar = roles.includes("familiar");

  const main: { to: string; icon: string; label: string; disabled?: boolean; badge?: string }[] = [];

  // Dashboard is always visible
  main.push({ to: "/", icon: "LayoutDashboard", label: "Início" });

  // Pacientes - visible to all except familiar (familiar has their own view)
  if (isClinicaAdmin || isResponsavel || isTerapeuta) {
    main.push({ to: "/pacientes", icon: "Users", label: "Pacientes" });
  }

  // Agenda - visible to all except familiar
  if (isAdmin || isClinicaAdmin || isResponsavel || isTerapeuta) {
    main.push({ to: "/agenda", icon: "CalendarDays", label: "Agenda" });
  }

  // Cameras - visible to admin, clinica_admin, responsavel, familiar (em breve, desabilitado)
  if (isAdmin || isClinicaAdmin || isResponsavel || isFamiliar) {
    main.push({ to: "/cameras", icon: "Camera", label: "Câmeras", disabled: true, badge: "Em breve" });
  }

  const admin: { to: string; icon: string; label: string; disabled?: boolean; badge?: string }[] = [];
  if (isAdmin) {
    admin.push({ to: "/admin", icon: "Shield", label: "Painel administrativo" });
  }
  if (isClinicaAdmin) {
    admin.push({ to: "/clinica/usuarios", icon: "Users", label: "Usuários" });
  }
  return { main, admin };
}
