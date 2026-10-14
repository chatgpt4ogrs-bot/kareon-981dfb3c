import { supabase } from "@/integrations/supabase/client";

/** Manter igual a FN_VERSION em supabase/functions/manage-clinic-user/index.ts */
export const EXPECTED_FN_VERSION = "2026-10-09.familiar-sem-vinculo";

const OUTDATED_HINT =
  'A Edge Function "manage-clinic-user" publicada no Supabase está desatualizada. Publique a versão atual (supabase functions deploy manage-clinic-user).';

/**
 * Chama a Edge Function manage-clinic-user e lança um Error com a mensagem real
 * devolvida pela função (o supabase-js só expõe "non-2xx status code").
 */
export async function invokeManageUser<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-clinic-user", { body });

  if (error) {
    let message = error.message;
    let version: string | undefined;
    const response = (error as any).context;
    if (response && typeof response.json === "function") {
      try {
        const payload = await response.clone().json();
        version = payload?.fn_version;
        if (payload?.error) message = payload.error;
      } catch {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch { /* mantém a mensagem original */ }
      }
    }
    if (/failed to send a request/i.test(message)) {
      message = `${message} — verifique se a Edge Function "manage-clinic-user" está publicada.`;
    } else if (version !== EXPECTED_FN_VERSION) {
      message = `${message}\n\n${OUTDATED_HINT}`;
    }
    throw new Error(message);
  }

  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}
