import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { User, Session } from "@supabase/supabase-js";
import { resolveTabs, type AppTab } from "@/lib/permissions";

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
  /** Abas liberadas individualmente; null = usar o modelo do perfil */
  permissions: string[] | null;
  /** Perfil de acesso escolhido no cadastro (nome personalizável) */
  perfil_id: string | null;
}

export type AppRole =
  | "admin"
  | "supervisor_plataforma"
  | "clinica_admin"
  | "responsavel_clinica"
  | "terapeuta"
  | "familiar";

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

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  rolesLoaded: boolean;
  /** Somente Admin Master (role === "admin") */
  isAdmin: boolean;
  /** Supervisor de plataforma — vê tudo, invisível para clínicas */
  isPlatformSupervisor: boolean;
  /** Admin Master ou Gestor — acessam a área de Clínicas (o Gestor só vê as vinculadas) */
  canViewAllClinics: boolean;
  /** Clínicas vinculadas ao Gestor (tabela gestor_clinicas) */
  gestorClinicIds: string[];
  /**
   * Clínicas cujos dados o usuário pode ver: null = todas (Admin Master);
   * Gestor = as vinculadas; demais = a própria clínica (ou nenhuma).
   */
  clinicScope: string[] | null;
  isClinicaAdmin: boolean;
  /** Admin Master ou quem tem a aba "Usuários da clínica" liberada */
  canManageUsers: boolean;
  /** Abas do sistema liberadas para o usuário logado */
  tabs: AppTab[];
  hasTab: (tab: AppTab) => boolean;
  /** Conta externa ainda não aprovada — pode explorar o app em modo visita */
  isVisitor: boolean;
  /** Conta desativada */
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapProfileRow(data: Record<string, unknown>): Profile {
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

/** Creates a profiles row when the DB trigger did not run (e.g. OAuth edge cases). */
async function ensureProfile(authUser: User): Promise<boolean> {
  const meta = authUser.user_metadata ?? {};
  const name =
    (meta.name as string) ||
    (meta.full_name as string) ||
    (meta.nome as string) ||
    authUser.email?.split("@")[0] ||
    "Usuário";
  const avatar =
    (meta.avatar_url as string) ||
    (meta.picture as string) ||
    null;

  // Real remote schema: id, name, email, clinic_id, role, ...
  const { error } = await supabase.from("profiles").upsert(
    {
      id: authUser.id,
      name,
      email: authUser.email ?? "",
      telefone: (meta.telefone as string) || null,
      status: "pendente",
      avatar_url: avatar,
    } as never,
    { onConflict: "id" }
  );

  if (error) {
    console.warn("ensureProfile failed:", error.message);
    return false;
  }
  return true;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [gestorClinicIds, setGestorClinicIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isClinicaAdmin = hasRole("clinica_admin");
  const isPlatformSupervisor = hasRole("supervisor_plataforma");
  const canViewAllClinics = isAdmin || isPlatformSupervisor;
  const tabs = resolveTabs(roles, profile?.permissions);
  const hasTab = (tab: AppTab) => tabs.includes(tab);
  const canManageUsers = isAdmin || hasTab("clinica_usuarios");
  const { isVisitor, isBlocked } = resolveAccessFlags(profile, canViewAllClinics);
  const clinicScope: string[] | null = isAdmin
    ? null
    : isPlatformSupervisor
    ? gestorClinicIds
    : profile?.clinica_id
    ? [profile.clinica_id]
    : [];

  const fetchProfile = async (authUser: User) => {
    // "*" mantém o login funcionando mesmo antes da coluna permissions existir no banco
    const { data, error } = await (supabase
      .from("profiles") as any)
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    let row = (data ?? null) as Record<string, unknown> | null;

    if ((!row || error) && authUser) {
      const created = await ensureProfile(authUser);
      if (created) {
        const { data: again } = await (supabase
          .from("profiles") as any)
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();
        row = (again ?? null) as Record<string, unknown> | null;
      }
    }

    if (row) {
      const mapped = mapProfileRow(row);
      setProfile(mapped);
      const normalized = normalizeAppRole(mapped.cargo);
      const userRoles = normalized ? [normalized] : [];
      setRoles(userRoles);
      setIsAdmin(userRoles.includes("admin"));
      if (normalized === "supervisor_plataforma") {
        const { data: links } = await (supabase.from("gestor_clinicas" as any) as any)
          .select("clinic_id")
          .eq("profile_id", authUser.id);
        setGestorClinicIds(((links ?? []) as { clinic_id: string }[]).map((l) => l.clinic_id));
      } else {
        setGestorClinicIds([]);
      }
    } else {
      setProfile(null);
      setRoles([]);
      setIsAdmin(false);
      setGestorClinicIds([]);
    }
    setRolesLoaded(true);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user) {
          setRolesLoaded(false);
          setTimeout(() => fetchProfile(nextSession.user), 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setRoles([]);
          setRolesLoaded(true);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setUser(current?.user ?? null);
      if (current?.user) {
        fetchProfile(current.user);
      } else {
        setRolesLoaded(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const translateAuthError = (message: string): string => {
    if (message.includes("Invalid login credentials")) return "Email ou senha inválidos.";
    if (message.includes("Email not confirmed")) return "Email não confirmado.";
    if (message.includes("User already registered")) return "Este email já está cadastrado.";
    if (message.includes("Database error saving new user")) return "Erro ao criar conta. Tente novamente em instantes.";
    if (message.includes("Password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
    if (message.includes("Unable to validate email address")) return "Endereço de email inválido.";
    if (message.includes("Email rate limit exceeded")) return "Muitas tentativas. Aguarde alguns minutos.";
    if (message.includes("over_email_send_rate_limit")) return "Muitas tentativas. Aguarde alguns minutos.";
    if (message.includes("provider is not enabled")) return "Login com Google não está habilitado. Contate o suporte.";
    return message;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(translateAuthError(error.message)) : null };
  };

  const signUp = async (email: string, password: string, nome: string, telefone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, name: nome, telefone: telefone || null },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (!error && data.user) {
      // Fallback if trigger did not create the row yet
      await ensureProfile(data.user);
    }
    return { error: error ? new Error(translateAuthError(error.message)) : null };
  };

  const signInWithGoogle = async () => {
    const host = window.location.hostname;
    const onLovableHost =
      host.includes("lovable") ||
      host.endsWith("lovable.app") ||
      host.endsWith("lovableproject.com");

    // Em hosts Lovable: broker OAuth → tokens Supabase (auth.users + trigger → profiles)
    if (onLovableHost) {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/`,
      });

      if (result.redirected) {
        return { error: null, redirected: true };
      }

      if (result.error) {
        return {
          error: new Error(translateAuthError(result.error.message)),
          redirected: false,
        };
      }

      const { data: { user: oauthUser } } = await supabase.auth.getUser();
      if (oauthUser) {
        await ensureProfile(oauthUser);
        await fetchProfile(oauthUser);
      }
      return { error: null, redirected: false };
    }

    // Local / domínio próprio: Google via Supabase Auth (provider precisa estar habilitado)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });

    if (error) {
      return {
        error: new Error(translateAuthError(error.message)),
        redirected: false,
      };
    }

    return { error: null, redirected: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setRoles([]);
    setGestorClinicIds([]);
    setRolesLoaded(true);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, rolesLoaded, isAdmin, isPlatformSupervisor, canViewAllClinics, gestorClinicIds, clinicScope, isClinicaAdmin, canManageUsers, tabs, hasTab, isVisitor, isBlocked, roles, hasRole, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
