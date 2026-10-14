import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  estoqueMinimo: number;
  precoCusto: number | null;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProdutoInput = Omit<Produto, "id" | "createdAt" | "updatedAt">;

/** Persistência local por clínica até existir a tabela de estoque no Supabase. */
function storageKey(clinicaId: string | null) {
  return `kareon:estoque:${clinicaId ?? "sem-clinica"}`;
}

function load(key: string): Produto[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useEstoque() {
  const { profile } = useAuth();
  const key = storageKey(profile?.clinica_id ?? null);
  const [produtos, setProdutos] = useState<Produto[]>(() => load(key));

  useEffect(() => {
    setProdutos(load(key));
  }, [key]);

  const persist = useCallback(
    (updater: (prev: Produto[]) => Produto[]) => {
      setProdutos((prev) => {
        const next = updater(prev);
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  const criar = useCallback(
    (input: ProdutoInput) => {
      const now = new Date().toISOString();
      persist((prev) => [...prev, { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }]);
    },
    [persist],
  );

  const atualizar = useCallback(
    (id: string, input: ProdutoInput) => {
      const now = new Date().toISOString();
      persist((prev) => prev.map((p) => (p.id === id ? { ...p, ...input, updatedAt: now } : p)));
    },
    [persist],
  );

  const remover = useCallback(
    (id: string) => persist((prev) => prev.filter((p) => p.id !== id)),
    [persist],
  );

  return { produtos, criar, atualizar, remover };
}
