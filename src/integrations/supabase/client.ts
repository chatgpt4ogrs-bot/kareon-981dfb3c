/**
 * Supabase foi substituído por API local + PostgreSQL.
 * Este stub evita imports quebrados em arquivos ainda não migrados.
 */
const notAvailable = () => {
  throw new Error(
    "Supabase desativado. Use a API local (src/lib/api.ts) e o backend em server/."
  );
};

export const supabase = {
  from: () => ({
    select: () => ({ eq: notAvailable, in: notAvailable, order: notAvailable, maybeSingle: notAvailable, single: notAvailable }),
    insert: notAvailable,
    update: () => ({ eq: notAvailable }),
    delete: () => ({ eq: notAvailable }),
    upsert: notAvailable,
  }),
  auth: {
    getUser: notAvailable,
    getSession: notAvailable,
    signInWithPassword: notAvailable,
    signUp: notAvailable,
    signOut: notAvailable,
    updateUser: notAvailable,
    resetPasswordForEmail: notAvailable,
    verifyOtp: notAvailable,
    signInWithOAuth: notAvailable,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
  },
} as any;
