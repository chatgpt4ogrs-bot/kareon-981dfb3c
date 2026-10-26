import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { resolveTabs, type AppTab } from "@/lib/permissions";
import { authApi, getToken, setToken } from "@/lib/api";

interface Profile {
  id: string;
  nome: string;
  email: string;
  clinica_id: string | null;
  cargo: string | null;
  status: string;
  avatar_url?: string | null;
  telefone?: string | null;
  must_change_password?: boolean;
  permissions: string[] | null;
  perfil_id: string | null;
}

export type AppRole =
  | "admin"
  | "supervisor_plataforma"
  | "clinica_admin"
  | "responsavel_clinica"
  | "terapeuta"
  | "familiar";

interface AuthUser {
  id: string;
  email: string;
}

const KNOWN_ROLES = new Set<AppRole>([
  "admin",
  "supervisor_plataforma",
  "clinica_admin",
  "responsavel_clinica",
  "terapeuta",
  "familiar",
]);

function normalizeAppRole(raw: string | null | undefined): AppRole | null {
  if (!raw) return null;
  const value = raw.toLowerCase().trim() as AppRole;
  return KNOWN_ROLES.has(value) ? value : null;
}

const TENANT_KEY = "kareon:activeTenantId";
const TENANT_NAME_KEY = "kareon:activeTenantName";

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  session: { access_token: string } | null;
  loading: boolean;
  rolesLoaded: boolean;
  isAdmin: boolean;
  isPlatformSupervisor: boolean;
  canViewAllClinics: boolean;
  gestorClinicIds: string[];
  clinicScope: string[] | null;
  /** Tenant ativo quando o Superadmin “entra” numa clínica */
  activeTenantId: string | null;
  activeTenantName: string | null;
  enterTenant: (id: string, nome: string) => void;
  leaveTenant: () => void;
  isClinicaAdmin: boolean;
  canManageUsers: boolean;
  tabs: AppTab[];
  hasTab: (tab: AppTab) => boolean;
  isVisitor: boolean;
  isBlocked: boolean;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string, telefone?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null; redirected?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ACTIVE_STATUSES = new Set(["ativo", "active"]);
const BLOCKED_STATUSES = new Set(["inativo", "inactive"]);

function resolveAccessFlags(profile: Profile | null, isGlobalRole: boolean) {
  if (isGlobalRole) return { isVisitor: false, isBlocked: false };
  if (!profile) return { isVisitor: true, isBlocked: false };
  const status = (profile.status || "").toLowerCase();
  if (ACTIVE_STATUSES.has(status)) return { isVisitor: false, isBlocked: false };
  if (BLOCKED_STATUSES.has(status)) return { isVisitor: false, isBlocked: true };
  return { isVisitor: true, isBlocked: false };
}

function mapProfile(data: Record<string, unknown>): Profile {
  const role = normalizeAppRole(
    ((data.role as string) ?? (data.cargo as string) ?? null) as string | null
  );
  return {
    id: data.id as string,
    nome: ((data.name as string) ?? (data.nome as string) ?? ""),
    email: data.email as string,
    clinica_id: ((data.clinic_id as string) ?? (data.clinica_id as string)) || null,
    cargo: role,
    status: data.status as string,
    avatar_url: (data.avatar_url as string) || null,
    telefone: (data.telefone as string) || null,
    must_change_password: Boolean(data.must_change_password),
    permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : null,
    perfil_id: (data.perfil_id as string) || null,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [gestorClinicIds, setGestorClinicIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() =>
    localStorage.getItem(TENANT_KEY)
  );
  const [activeTenantName, setActiveTenantName] = useState<string | null>(() =>
    localStorage.getItem(TENANT_NAME_KEY)
  );

  const hasRole = (role: AppRole) => roles.includes(role);
  const isClinicaAdmin = hasRole("clinica_admin");
  const isPlatformSupervisor = hasRole("supervisor_plataforma");
  const canViewAllClinics = isAdmin || isPlatformSupervisor;
  const tabs = resolveTabs(roles, profile?.permissions);
  const hasTab = (tab: AppTab) => tabs.includes(tab);
  const canManageUsers = isAdmin || hasTab("clinica_usuarios");
  const { isVisitor, isBlocked } = resolveAccessFlags(profile, canViewAllClinics);

  const enterTenant = (id: string, nome: string) => {
    localStorage.setItem(TENANT_KEY, id);
    localStorage.setItem(TENANT_NAME_KEY, nome);
    setActiveTenantId(id);
    setActiveTenantName(nome);
  };
  const leaveTenant = () => {
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(TENANT_NAME_KEY);
    setActiveTenantId(null);
    setActiveTenantName(null);
  };

  /** Perfil efetivo: Admin/Gestor “dentro” de um tenant herda a clínica ativa */
  const effectiveProfile =
    profile && (isAdmin || isPlatformSupervisor) && activeTenantId
      ? { ...profile, clinica_id: activeTenantId }
      : profile;

  const clinicScope: string[] | null =
    (isAdmin || isPlatformSupervisor) && activeTenantId
      ? [activeTenantId]
      : isAdmin
      ? null
      : isPlatformSupervisor
      ? gestorClinicIds
      : profile?.clinica_id
      ? [profile.clinica_id]
      : [];

  const applyAuth = (payload: {
    token: string;
    user: AuthUser;
    profile: Record<string, unknown>;
    gestorClinicIds?: string[];
  }) => {
    setToken(payload.token);
    setSession({ access_token: payload.token });
    setUser(payload.user);
    const mapped = mapProfile(payload.profile);
    setProfile(mapped);
    const normalized = normalizeAppRole(mapped.cargo);
    const userRoles = normalized ? [normalized] : [];
    setRoles(userRoles);
    const adminNow = userRoles.includes("admin");
    const gestorNow = userRoles.includes("supervisor_plataforma");
    setIsAdmin(adminNow);
    const linked = payload.gestorClinicIds || [];
    setGestorClinicIds(linked);
    // Usuário de clínica não deve herdar X-Clinic-Id de sessão Admin no mesmo browser
    if (!adminNow && !gestorNow) {
      localStorage.removeItem(TENANT_KEY);
      localStorage.removeItem(TENANT_NAME_KEY);
      setActiveTenantId(null);
      setActiveTenantName(null);
    } else if (gestorNow) {
      const current = localStorage.getItem(TENANT_KEY);
      if (linked.length === 1) {
        const only = linked[0];
        localStorage.setItem(TENANT_KEY, only);
        if (!localStorage.getItem(TENANT_NAME_KEY)) {
          localStorage.setItem(TENANT_NAME_KEY, "Unidade atual");
        }
        setActiveTenantId(only);
        setActiveTenantName(localStorage.getItem(TENANT_NAME_KEY));
      } else if (current && linked.length > 0 && !linked.includes(current)) {
        localStorage.removeItem(TENANT_KEY);
        localStorage.removeItem(TENANT_NAME_KEY);
        setActiveTenantId(null);
        setActiveTenantName(null);
      }
    }
    setRolesLoaded(true);
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setRoles([]);
    setGestorClinicIds([]);
    setRolesLoaded(true);
  };

  const refreshProfile = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await authApi.me();
      applyAuth({
        token,
        user: data.user,
        profile: data.profile,
        gestorClinicIds: data.gestorClinicIds,
      });
    } catch {
      clearAuth();
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setRolesLoaded(true);
      return;
    }
    authApi
      .me()
      .then((data) => {
        applyAuth({
          token,
          user: data.user,
          profile: data.profile,
          gestorClinicIds: data.gestorClinicIds,
        });
      })
      .catch(() => clearAuth())
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);
      applyAuth(data);
      return { error: null };
    } catch (e: any) {
      return { error: new Error(e.message || "Falha no login") };
    }
  };

  const signUp = async (email: string, password: string, nome: string, telefone?: string) => {
    try {
      const data = await authApi.register(email, password, nome, telefone);
      applyAuth(data);
      return { error: null };
    } catch (e: any) {
      return { error: new Error(e.message || "Falha no cadastro") };
    }
  };

  const signInWithGoogle = async () => {
    return {
      error: new Error(
        "Login com Google não está disponível nesta instalação local. Use e-mail e senha."
      ),
      redirected: false,
    };
  };

  const signOut = async () => {
    leaveTenant();
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: effectiveProfile,
        session,
        loading,
        rolesLoaded,
        isAdmin,
        isPlatformSupervisor,
        canViewAllClinics,
        gestorClinicIds,
        clinicScope,
        activeTenantId,
        activeTenantName,
        enterTenant,
        leaveTenant,
        isClinicaAdmin,
        canManageUsers,
        tabs,
        hasTab,
        isVisitor,
        isBlocked,
        roles,
        hasRole,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
