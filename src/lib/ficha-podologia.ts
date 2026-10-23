/** Anamnese / hábitos / condições usados por profissionais de podologia */
export interface FichaPodologia {
  gestante: boolean | null;
  hipertensao: boolean | null;
  cirurgia_membros_inferiores: boolean | null;
  cirurgia_membros_inferiores_qual: string;
  pratica_esporte: boolean | null;
  pratica_esporte_qual: string;
  toma_medicamento: boolean | null;
  toma_medicamento_qual: string;
  alergias: string;
  problemas_pes: string;
  observacoes_clinicas: string;
  tipo_calcado: string;
  tipo_meia: string;
  marca_passos_pinos: boolean | null;
  problemas_cancerigenos: boolean | null;
  pressao_alta: boolean | null;
  diabetes: boolean | null;
  convulsoes: boolean | null;
  problemas_circulatorios: boolean | null;
  alergia: boolean | null;
  observacoes_finais: string;
}

export const EMPTY_FICHA_PODOLOGIA: FichaPodologia = {
  gestante: false,
  hipertensao: false,
  cirurgia_membros_inferiores: false,
  cirurgia_membros_inferiores_qual: "",
  pratica_esporte: false,
  pratica_esporte_qual: "",
  toma_medicamento: false,
  toma_medicamento_qual: "",
  alergias: "",
  problemas_pes: "",
  observacoes_clinicas: "",
  tipo_calcado: "",
  tipo_meia: "",
  marca_passos_pinos: false,
  problemas_cancerigenos: false,
  pressao_alta: false,
  diabetes: false,
  convulsoes: false,
  problemas_circulatorios: false,
  alergia: false,
  observacoes_finais: "",
};

export function normalizeFichaPodologia(raw: unknown): FichaPodologia {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const bool = (v: unknown, fallback: boolean | null = false): boolean | null => {
    if (v === true || v === false) return v;
    if (v == null || v === "") return fallback;
    const s = String(v)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    if (s === "sim" || s === "s" || s === "true" || s === "1" || s === "yes") return true;
    if (s === "nao" || s === "n" || s === "false" || s === "0" || s === "no") return false;
    return fallback;
  };
  const str = (v: unknown) => (v == null ? "" : String(v).trim());

  return {
    gestante: bool(src.gestante),
    hipertensao: bool(src.hipertensao),
    cirurgia_membros_inferiores: bool(src.cirurgia_membros_inferiores),
    cirurgia_membros_inferiores_qual: str(src.cirurgia_membros_inferiores_qual),
    pratica_esporte: bool(src.pratica_esporte),
    pratica_esporte_qual: str(src.pratica_esporte_qual),
    toma_medicamento: bool(src.toma_medicamento),
    toma_medicamento_qual: str(src.toma_medicamento_qual || src.medicamentos),
    alergias: str(src.alergias),
    problemas_pes: str(src.problemas_pes),
    observacoes_clinicas: str(src.observacoes_clinicas),
    tipo_calcado: str(src.tipo_calcado),
    tipo_meia: str(src.tipo_meia),
    marca_passos_pinos: bool(src.marca_passos_pinos),
    problemas_cancerigenos: bool(src.problemas_cancerigenos),
    pressao_alta: bool(src.pressao_alta),
    diabetes: bool(src.diabetes ?? src.diabetes_condicao),
    convulsoes: bool(src.convulsoes),
    problemas_circulatorios: bool(src.problemas_circulatorios),
    alergia: bool(src.alergia),
    observacoes_finais: str(src.observacoes_finais),
  };
}

export function fichaToAlertas(ficha: FichaPodologia): string | null {
  const parts: string[] = [];
  if (ficha.diabetes) parts.push("Diabetes");
  if (ficha.hipertensao || ficha.pressao_alta) parts.push("Hipertensão / pressão alta");
  if (ficha.gestante) parts.push("Gestante");
  if (ficha.convulsoes) parts.push("Convulsões");
  if (ficha.problemas_circulatorios) parts.push("Problemas circulatórios");
  if (ficha.problemas_cancerigenos) parts.push("Problemas cancerígenos");
  if (ficha.marca_passos_pinos) parts.push("Marca-passo / pinos");
  if (ficha.alergia) parts.push("Alergia");
  return parts.length ? parts.join("; ") : null;
}

export function fichaToTags(ficha: FichaPodologia): string[] {
  const tags: string[] = [];
  if (ficha.diabetes) tags.push("Diabetes");
  if (ficha.hipertensao || ficha.pressao_alta) tags.push("Hipertensão");
  if (ficha.gestante) tags.push("Gestante");
  if (ficha.convulsoes) tags.push("Convulsões");
  if (ficha.problemas_circulatorios) tags.push("Problemas circulatórios");
  if (ficha.problemas_cancerigenos) tags.push("Problemas cancerígenos");
  if (ficha.marca_passos_pinos) tags.push("Marca-passo / pinos");
  return tags;
}

export function fichaToDiagnostico(ficha: FichaPodologia): string {
  return [ficha.problemas_pes, ficha.observacoes_clinicas].filter(Boolean).join(" — ");
}
