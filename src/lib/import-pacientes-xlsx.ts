import * as XLSX from "xlsx";
import {
  fichaToAlertas,
  fichaToDiagnostico,
  fichaToTags,
  normalizeFichaPodologia,
  type FichaPodologia,
} from "@/lib/ficha-podologia";

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
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  alergias: string | null;
  alertas_clinicos: string | null;
  endereco_rua: string | null;
  ficha_podologia: FichaPodologia;
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

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
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

function mapFichaFromRow(row: Record<string, unknown>): FichaPodologia {
  return normalizeFichaPodologia({
    gestante: cell(row, "gestante"),
    hipertensao: cell(row, "hipertensao"),
    cirurgia_membros_inferiores: cell(row, "cirurgia_membros_inferiores"),
    cirurgia_membros_inferiores_qual: cell(row, "cirurgia_membros_inferiores_qual"),
    pratica_esporte: cell(row, "pratica_esporte"),
    pratica_esporte_qual: cell(row, "pratica_esporte_qual"),
    toma_medicamento: cell(row, "toma_medicamento"),
    toma_medicamento_qual: cell(row, "toma_medicamento_qual", "medicamentos"),
    alergias: cell(row, "alergias"),
    problemas_pes: cell(row, "problemas_pes"),
    observacoes_clinicas: cell(row, "observacoes_clinicas"),
    tipo_calcado: cell(row, "tipo_calcado"),
    tipo_meia: cell(row, "tipo_meia"),
    marca_passos_pinos: cell(row, "marca_passos_pinos"),
    problemas_cancerigenos: cell(row, "problemas_cancerigenos"),
    pressao_alta: cell(row, "pressao_alta"),
    diabetes: cell(row, "diabetes", "diabetes_condicao"),
    convulsoes: cell(row, "convulsoes"),
    problemas_circulatorios: cell(row, "problemas_circulatorios"),
    alergia: cell(row, "alergia"),
    observacoes_finais: cell(row, "observacoes_finais"),
  });
}

function mapExportRow(row: Record<string, unknown>): PacienteImportPayload | null {
  const nome = cell(row, "nome");
  if (!nome) return null;

  const telefoneRaw = cell(row, "telefone");
  const telefone = telefoneRaw ? formatPhone(telefoneRaw) : "";
  const email = cell(row, "email");
  const ficha = mapFichaFromRow(row);
  const alergiasTexto =
    ficha.alergias ||
    (ficha.alergia ? "Sim (sem detalhe)" : "");

  return {
    nome,
    data_nascimento: normalizeDate(cell(row, "data_nascimento", "dataNascimento")),
    diagnostico: fichaToDiagnostico(ficha),
    tags: fichaToTags(ficha),
    responsavel_nome: "",
    responsavel_telefone: telefone,
    responsavel_email: email,
    responsavel_parentesco: telefone || email ? "próprio" : "",
    status: "ativo",
    cpf: cell(row, "cpf") || null,
    telefone: telefone || null,
    email: email || null,
    observacoes: ficha.observacoes_finais || null,
    alergias: alergiasTexto || null,
    alertas_clinicos: fichaToAlertas(ficha),
    endereco_rua: cell(row, "endereco") || null,
    ficha_podologia: ficha,
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
    lower.includes("tipo_calcado") ||
    lower.includes("gestante");
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
