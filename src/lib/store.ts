import { Paciente, ObjetivoTerapeutico, Sessao } from "@/types";

const KEYS = {
  pacientes: "terapia_pacientes",
  objetivos: "terapia_objetivos",
  sessoes: "terapia_sessoes",
  auth: "terapia_auth",
};

function get<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Auth
export function getAuth(): { nome: string; email: string } | null {
  const raw = localStorage.getItem(KEYS.auth);
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(data: { nome: string; email: string }) {
  localStorage.setItem(KEYS.auth, JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem(KEYS.auth);
}

// Pacientes
export function getPacientes(): Paciente[] {
  return get<Paciente>(KEYS.pacientes);
}

export function getPaciente(id: string): Paciente | undefined {
  return getPacientes().find((p) => p.id === id);
}

export function savePaciente(paciente: Paciente) {
  const list = getPacientes();
  const idx = list.findIndex((p) => p.id === paciente.id);
  if (idx >= 0) list[idx] = paciente;
  else list.push(paciente);
  set(KEYS.pacientes, list);
}

export function deletePaciente(id: string) {
  set(KEYS.pacientes, getPacientes().filter((p) => p.id !== id));
}

// Objetivos
export function getObjetivos(pacienteId?: string): ObjetivoTerapeutico[] {
  const all = get<ObjetivoTerapeutico>(KEYS.objetivos);
  return pacienteId ? all.filter((o) => o.pacienteId === pacienteId) : all;
}

export function saveObjetivo(objetivo: ObjetivoTerapeutico) {
  const list = get<ObjetivoTerapeutico>(KEYS.objetivos);
  const idx = list.findIndex((o) => o.id === objetivo.id);
  if (idx >= 0) list[idx] = objetivo;
  else list.push(objetivo);
  set(KEYS.objetivos, list);
}

export function deleteObjetivo(id: string) {
  set(KEYS.objetivos, get<ObjetivoTerapeutico>(KEYS.objetivos).filter((o) => o.id !== id));
}

// Sessões
export function getSessoes(pacienteId?: string): Sessao[] {
  const all = get<Sessao>(KEYS.sessoes);
  return pacienteId ? all.filter((s) => s.pacienteId === pacienteId) : all;
}

export function saveSessao(sessao: Sessao) {
  const list = get<Sessao>(KEYS.sessoes);
  const idx = list.findIndex((s) => s.id === sessao.id);
  if (idx >= 0) list[idx] = sessao;
  else list.push(sessao);
  set(KEYS.sessoes, list);
}

export function getUltimaSessao(pacienteId: string): Sessao | undefined {
  const sessoes = getSessoes(pacienteId);
  return sessoes.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())[0];
}
