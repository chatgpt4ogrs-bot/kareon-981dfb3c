import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

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
}

export type AppRole = "admin" | "clinica_admin" | "responsavel_clinica" | "terapeuta" | "familiar";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  rolesLoaded: boolean;
  isAdmin: boolean;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string, telefone?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const hasRole = (role: AppRole) => roles.includes(role);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, clinica_id, cargo, status, avatar_url, telefone, must_change_password")
      .eq("user_id", userId)
      .single();
    setProfile(data);

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const userRoles = (rolesData?.map((r: any) => r.role) || []) as AppRole[];
    setRoles(userRoles);
    setIsAdmin(userRoles.includes("admin"));
    setRolesLoaded(true);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setRolesLoaded(false);
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setRoles([]);
          setRolesLoaded(true);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
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
    return message;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(translateAuthError(error.message)) : null };
  };

  const signUp = async (email: string, password: string, nome: string, telefone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, telefone: telefone || null },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error ? new Error(translateAuthError(error.message)) : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setRoles([]);
    setRolesLoaded(true);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, rolesLoaded, isAdmin, roles, hasRole, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
