import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

function mapRow(row: any): Produto {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria || "",
    unidade: row.unidade || "",
    quantidade: Number(row.quantidade) || 0,
    estoqueMinimo: Number(row.estoque_minimo) || 0,
    precoCusto: row.custo != null ? Number(row.custo) : null,
    observacoes: row.observacoes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useEstoque() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["estoque", profile?.clinica_id],
    queryFn: async () => {
      const rows = await api<any[]>("/estoque");
      return rows.map(mapRow);
    },
  });

  const produtos = query.data || [];

  const criar = useCallback(
    async (input: ProdutoInput) => {
      await api("/estoque", {
        method: "POST",
        json: {
          clinica_id: profile?.clinica_id,
          nome: input.nome,
          categoria: input.categoria,
          unidade: input.unidade,
          quantidade: input.quantidade,
          estoque_minimo: input.estoqueMinimo,
          custo: input.precoCusto,
          observacoes: input.observacoes,
        },
      });
      qc.invalidateQueries({ queryKey: ["estoque"] });
    },
    [profile?.clinica_id, qc]
  );

  const atualizar = useCallback(
    async (id: string, input: ProdutoInput) => {
      await api(`/estoque/${id}`, {
        method: "PUT",
        json: {
          nome: input.nome,
          categoria: input.categoria,
          unidade: input.unidade,
          quantidade: input.quantidade,
          estoque_minimo: input.estoqueMinimo,
          custo: input.precoCusto,
          observacoes: input.observacoes,
        },
      });
      qc.invalidateQueries({ queryKey: ["estoque"] });
    },
    [qc]
  );

  const remover = useCallback(
    async (id: string) => {
      await api(`/estoque/${id}`, { method: "DELETE", json: { reason: "Remoção de produto" } });
      qc.invalidateQueries({ queryKey: ["estoque"] });
    },
    [qc]
  );

  return { produtos, criar, atualizar, remover, isLoading: query.isLoading };
}
