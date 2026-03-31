export interface Responsavel {
  nome: string;
  telefone: string;
  email: string;
  parentesco: string;
}

export interface Paciente {
  id: string;
  nome: string;
  dataNascimento: string;
  diagnostico: string;
  tags: string[];
  responsavel: Responsavel;
  status: "ativo" | "inativo";
  terapeutaId?: string;
  criadoEm: string;
}

export interface ObjetivoTerapeutico {
  id: string;
  pacienteId: string;
  descricao: string;
  status: "nao_iniciado" | "em_andamento" | "concluido";
  progresso: number;
  criadoEm: string;
  atualizadoEm: string;
}

export type NivelEngajamento = "baixo" | "medio" | "alto";
export type ProgressoObservado = "regressao" | "manteve" | "progresso_leve" | "progresso_significativo";

export const TAGS_COMUNS = [
  "TEA",
  "TDAH",
  "Coordenação motora",
  "Integração sensorial",
  "Atraso motor",
  "Paralisia cerebral",
  "Síndrome de Down",
  "Dificuldade de aprendizagem",
  "Regulação emocional",
  "AVD",
] as const;

export const COMPORTAMENTOS = [
  "Colaborativo",
  "Resistente",
  "Ansioso",
  "Calmo",
  "Agitado",
  "Focado",
  "Disperso",
  "Irritado",
  "Motivado",
  "Sonolento",
] as const;

export const ATIVIDADES_COMUNS = [
  "Coordenação motora fina",
  "Coordenação motora grossa",
  "Integração sensorial",
  "AVD (atividades de vida diária)",
  "Grafismo",
  "Recorte e colagem",
  "Brincadeira dirigida",
  "Brincadeira livre",
  "Estimulação tátil",
  "Equilíbrio e propriocepção",
  "Planejamento motor",
  "Regulação emocional",
] as const;

export interface Sessao {
  id: string;
  pacienteId: string;
  dataHora: string;
  objetivoIds: string[];
  atividades: string[];
  comportamentos: string[];
  engajamento: NivelEngajamento;
  progressoObservado: ProgressoObservado;
  observacoes: string;
  criadoEm: string;
}

export interface EventoEvolucao {
  id: string;
  tipo: "sessao" | "objetivo_criado" | "objetivo_atualizado" | "objetivo_concluido";
  data: string;
  descricao: string;
  detalhes?: Record<string, unknown>;
}
