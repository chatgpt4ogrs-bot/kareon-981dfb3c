import * as XLSX from "xlsx";

/** Payload pronto para POST /pacientes */
export interface PacienteImportPayload {
  nome: string;
  data_nascimento: string | null;
  diagnostico: string;
  tags: string[];
  responsavel_nome: string;
  responsavel_telefone: string;
  responsavel_email: string;
  responsavel_parentesco: string;
  status: "ativo" | "inativo";
  cpf: string | null;
  observacoes: string | null;
  alergias: string | null;
  alertas_clinicos: string | null;
  endereco_rua: string | null;
  /** id original da planilha (só referência / dedupe) */
  external_id?: string;
}

export interface ParsePacientesResult {
  format: "pacientes_export" | "generic";
  rows: PacienteImportPayload[];
  sheetName: string;
  warnings: string[];
}

const REQUIRED_HINTS = ["nome"];

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.trim().toLowerCase() === key.toLowerCase());
    if (found != null && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
}

function isYes(value: unknown): boolean {
  const s = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return s === "sim" || s === "s" || s === "true" || s === "1" || s === "yes";
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  // Excel serial date already converted by sheet_to_json with raw:false often as "YYYY-MM-DD" or locale
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    return `${br[3]}-${m}-${d}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw.trim();
}

function buildTags(row: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const flags: [string, string][] = [
    ["diabetes", "Diabetes"],
    ["diabetes_condicao", "Diabetes"],
    ["hipertensao", "Hipertensão"],
    ["pressao_alta", "Hipertensão"],
    ["gestante", "Gestante"],
    ["convulsoes", "Convulsões"],
    ["problemas_circulatorios", "Problemas circulatórios"],
    ["problemas_cancerigenos", "Problemas cancerígenos"],
    ["marca_passos_pinos", "Marca-passos / pinos"],
  ];
  for (const [key, label] of flags) {
    const v = cell(row, key);
    if (isYes(v) && !tags.includes(label)) tags.push(label);
  }
  return tags;
}

function buildAlertas(row: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (isYes(cell(row, "diabetes", "diabetes_condicao"))) parts.push("Diabetes");
  if (isYes(cell(row, "hipertensao", "pressao_alta"))) parts.push("Hipertensão / pressão alta");
  if (isYes(cell(row, "gestante"))) parts.push("Gestante");
  if (isYes(cell(row, "convulsoes"))) parts.push("Convulsões");
  if (isYes(cell(row, "problemas_circulatorios"))) parts.push("Problemas circulatórios");
  if (isYes(cell(row, "problemas_cancerigenos"))) parts.push("Problemas cancerígenos");
  if (isYes(cell(row, "marca_passos_pinos"))) parts.push("Marca-passos / pinos");
  return parts.length ? parts.join("; ") : null;
}

function buildObservacoes(row: Record<string, unknown>): string | null {
  const blocks: string[] = [];

  const finais = cell(row, "observacoes_finais");
  if (finais) blocks.push(finais);

  const meds = cell(row, "medicamentos", "toma_medicamento_qual");
  if (meds && meds.toLowerCase() !== "não" && meds.toLowerCase() !== "nao") {
    blocks.push(`Medicamentos: ${meds}`);
  } else if (isYes(cell(row, "toma_medicamento")) && meds) {
    blocks.push(`Medicamentos: ${meds}`);
  }

  if (isYes(cell(row, "cirurgia_membros_inferiores"))) {
    const qual = cell(row, "cirurgia_membros_inferiores_qual");
    blocks.push(qual ? `Cirurgia MMII: ${qual}` : "Cirurgia de membros inferiores");
  }

  if (isYes(cell(row, "pratica_esporte"))) {
    const qual = cell(row, "pratica_esporte_qual");
    blocks.push(qual ? `Esporte: ${qual}` : "Pratica esporte");
  }

  const calcado = cell(row, "tipo_calcado");
  const meia = cell(row, "tipo_meia");
  if (calcado || meia) {
    blocks.push(
      ["Calçado: " + (calcado || "—"), "Meia: " + (meia || "—")].join(" · ")
    );
  }

  return blocks.length ? blocks.join("\n") : null;
}

function buildDiagnostico(row: Record<string, unknown>): string {
  const parts = [
    cell(row, "problemas_pes"),
    cell(row, "observacoes_clinicas"),
  ].filter(Boolean);
  // dedupe if identical
  const unique = [...new Set(parts)];
  return unique.join(" — ");
}

function mapExportRow(row: Record<string, unknown>): PacienteImportPayload | null {
  const nome = cell(row, "nome");
  if (!nome) return null;

  const telefone = cell(row, "telefone");
  const email = cell(row, "email");
  const alergias =
    cell(row, "alergias", "alergia") ||
    (isYes(cell(row, "alergia")) ? "Sim (sem detalhe)" : "");

  return {
    nome,
    data_nascimento: normalizeDate(cell(row, "data_nascimento", "dataNascimento")),
    diagnostico: buildDiagnostico(row),
    tags: buildTags(row),
    responsavel_nome: "",
    responsavel_telefone: telefone ? formatPhone(telefone) : "",
    responsavel_email: email,
    responsavel_parentesco: telefone || email ? "próprio" : "",
    status: "ativo",
    cpf: cell(row, "cpf") || null,
    observacoes: buildObservacoes(row),
    alergias: alergias || null,
    alertas_clinicos: buildAlertas(row),
    endereco_rua: cell(row, "endereco") || null,
    external_id: cell(row, "id") || undefined,
  };
}

/** Detecta export `pacientes_export_*.xlsx` (aba PACIENTES / colunas típicas). */
export function isPacientesExportSheet(headers: string[]): boolean {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const hasNome = lower.includes("nome");
  const hasClinical =
    lower.includes("problemas_pes") ||
    lower.includes("observacoes_clinicas") ||
    lower.includes("observacoes_finais") ||
    lower.includes("tipo_calcado");
  return hasNome && (hasClinical || lower.includes("data_nascimento"));
}

export async function parsePacientesXlsx(file: File): Promise<ParsePacientesResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings: string[] = [];

  const preferred =
    workbook.SheetNames.find((n) => n.trim().toUpperCase() === "PACIENTES") ||
    workbook.SheetNames[0];

  if (!preferred) {
    throw new Error("Planilha sem abas");
  }

  const sheet = workbook.Sheets[preferred];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (!json.length) {
    throw new Error("Planilha vazia — nenhuma linha de paciente encontrada");
  }

  const headers = Object.keys(json[0] || {});
  if (!REQUIRED_HINTS.every((h) => headers.some((k) => k.trim().toLowerCase() === h))) {
    throw new Error(
      'Formato não reconhecido. A planilha precisa ter a coluna "nome" (export pacientes_export).'
    );
  }

  const format = isPacientesExportSheet(headers) ? "pacientes_export" : "generic";
  if (format === "generic") {
    warnings.push(
      "Colunas clínicas típicas não encontradas; importando campos básicos (nome, data, contato)."
    );
  }

  const rows: PacienteImportPayload[] = [];
  for (const raw of json) {
    const mapped = mapExportRow(raw);
    if (mapped) rows.push(mapped);
  }

  if (!rows.length) {
    throw new Error("Nenhum paciente válido encontrado (todas as linhas sem nome)");
  }

  return { format, rows, sheetName: preferred, warnings };
}
