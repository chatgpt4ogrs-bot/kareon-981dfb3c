import type { AppRole } from "@/contexts/AuthContext";

export interface NavItem {
  to: string;
  icon: string;
  label: string;
  section?: "main" | "admin";
}

/** Routes each role can access */
const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ["*"], // access to everything
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
  if (roles.includes("admin")) return true;

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
  main: { to: string; icon: string; label: string }[];
  admin: { to: string; icon: string; label: string }[];
} {
  const isAdmin = roles.includes("admin");
  const isClinicaAdmin = roles.includes("clinica_admin");
  const isResponsavel = roles.includes("responsavel_clinica");
  const isTerapeuta = roles.includes("terapeuta");
  const isFamiliar = roles.includes("familiar");

  const main: { to: string; icon: string; label: string }[] = [];

  // Dashboard is always visible
  main.push({ to: "/", icon: "LayoutDashboard", label: "Início" });

  // Pacientes - visible to all except familiar (familiar has their own view)
  if (isAdmin || isClinicaAdmin || isResponsavel || isTerapeuta) {
    main.push({ to: "/pacientes", icon: "Users", label: "Pacientes" });
  }

  // Agenda - visible to all except familiar
  if (isAdmin || isClinicaAdmin || isResponsavel || isTerapeuta) {
    main.push({ to: "/agenda", icon: "CalendarDays", label: "Agenda" });
  }

  // Cameras - visible to admin, clinica_admin, responsavel
  if (isAdmin || isClinicaAdmin || isResponsavel) {
    main.push({ to: "/cameras", icon: "Camera", label: "Câmeras" });
  }

  const admin: { to: string; icon: string; label: string }[] = [];
  if (isAdmin) {
    admin.push({ to: "/admin/clinicas", icon: "Building2", label: "Clínicas" });
    admin.push({ to: "/admin/usuarios", icon: "Shield", label: "Usuários" });
  }
  if (isClinicaAdmin) {
    admin.push({ to: "/clinica/usuarios", icon: "Users", label: "Usuários da Clínica" });
  }

  return { main, admin };
}
