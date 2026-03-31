import { Paciente, ObjetivoTerapeutico, Sessao } from "@/types";
import { subDays, subWeeks, addHours, format } from "date-fns";

const DEMO_EMAIL = "teste@clinica.com";
const DEMO_SENHA = "123456";

export function isDemoLogin(email: string, senha: string): boolean {
  return email === DEMO_EMAIL && senha === DEMO_SENHA;
}

export function loadDemoData() {
  const now = new Date();

  const pacientes: Paciente[] = [
    {
      id: "demo-p1",
      nome: "Lucas Silva",
      dataNascimento: "2019-03-15",
      diagnostico: "TEA - Transtorno do Espectro Autista",
      tags: ["TEA", "Integração sensorial", "Regulação emocional"],
      responsavel: { nome: "Ana Silva", telefone: "(11) 99999-1234", email: "ana.silva@email.com", parentesco: "mae" },
      status: "ativo",
      criadoEm: subWeeks(now, 8).toISOString(),
    },
    {
      id: "demo-p2",
      nome: "Maria Oliveira",
      dataNascimento: "2020-07-22",
      diagnostico: "Atraso no desenvolvimento motor",
      tags: ["Atraso motor", "Coordenação motora"],
      responsavel: { nome: "Carlos Oliveira", telefone: "(11) 98888-5678", email: "carlos.oliveira@email.com", parentesco: "pai" },
      status: "ativo",
      criadoEm: subWeeks(now, 6).toISOString(),
    },
    {
      id: "demo-p3",
      nome: "Pedro Santos",
      dataNascimento: "2018-11-08",
      diagnostico: "TDAH com dificuldade de coordenação motora",
      tags: ["TDAH", "Coordenação motora", "Dificuldade de aprendizagem"],
      responsavel: { nome: "Juliana Santos", telefone: "(11) 97777-9012", email: "juliana.santos@email.com", parentesco: "mae" },
      status: "ativo",
      criadoEm: subWeeks(now, 10).toISOString(),
    },
    {
      id: "demo-p4",
      nome: "Sofia Costa",
      dataNascimento: "2021-01-30",
      diagnostico: "Síndrome de Down",
      tags: ["Síndrome de Down", "AVD", "Coordenação motora"],
      responsavel: { nome: "Roberto Costa", telefone: "(11) 96666-3456", email: "roberto.costa@email.com", parentesco: "pai" },
      status: "ativo",
      criadoEm: subWeeks(now, 4).toISOString(),
    },
  ];

  const objetivos: ObjetivoTerapeutico[] = [
    { id: "demo-o1", pacienteId: "demo-p1", descricao: "Melhorar regulação sensorial durante atividades", status: "em_andamento", progresso: 45, criadoEm: subWeeks(now, 7).toISOString(), atualizadoEm: subDays(now, 3).toISOString() },
    { id: "demo-o2", pacienteId: "demo-p1", descricao: "Tolerar texturas variadas no tato", status: "em_andamento", progresso: 30, criadoEm: subWeeks(now, 6).toISOString(), atualizadoEm: subDays(now, 5).toISOString() },
    { id: "demo-o3", pacienteId: "demo-p1", descricao: "Manter contato visual por 10 segundos", status: "concluido", progresso: 100, criadoEm: subWeeks(now, 8).toISOString(), atualizadoEm: subDays(now, 10).toISOString() },
    { id: "demo-o4", pacienteId: "demo-p2", descricao: "Desenvolver preensão palmar funcional", status: "em_andamento", progresso: 60, criadoEm: subWeeks(now, 5).toISOString(), atualizadoEm: subDays(now, 2).toISOString() },
    { id: "demo-o5", pacienteId: "demo-p2", descricao: "Realizar grafismo com controle", status: "nao_iniciado", progresso: 0, criadoEm: subWeeks(now, 3).toISOString(), atualizadoEm: subWeeks(now, 3).toISOString() },
    { id: "demo-o6", pacienteId: "demo-p3", descricao: "Manter atenção em atividade por 15 minutos", status: "em_andamento", progresso: 55, criadoEm: subWeeks(now, 9).toISOString(), atualizadoEm: subDays(now, 1).toISOString() },
    { id: "demo-o7", pacienteId: "demo-p3", descricao: "Melhorar coordenação bilateral", status: "em_andamento", progresso: 40, criadoEm: subWeeks(now, 8).toISOString(), atualizadoEm: subDays(now, 4).toISOString() },
    { id: "demo-o8", pacienteId: "demo-p4", descricao: "Realizar atividades de vida diária com supervisão mínima", status: "em_andamento", progresso: 25, criadoEm: subWeeks(now, 3).toISOString(), atualizadoEm: subDays(now, 2).toISOString() },
  ];

  const sessoes: Sessao[] = [
    // Lucas - 6 sessions
    { id: "demo-s1", pacienteId: "demo-p1", dataHora: addHours(subDays(now, 2), 9).toISOString(), objetivoIds: ["demo-o1", "demo-o2"], atividades: ["Integração sensorial", "Estimulação tátil", "Brincadeira dirigida"], comportamentos: ["Colaborativo", "Ansioso"], engajamento: "medio", progressoObservado: "progresso_leve", observacoes: "Aceitou texturas novas com menos resistência. Manteve atenção na atividade sensorial.", criadoEm: subDays(now, 2).toISOString() },
    { id: "demo-s2", pacienteId: "demo-p1", dataHora: addHours(subDays(now, 9), 9).toISOString(), objetivoIds: ["demo-o1"], atividades: ["Integração sensorial", "Regulação emocional", "Brincadeira livre"], comportamentos: ["Agitado", "Motivado"], engajamento: "alto", progressoObservado: "progresso_significativo", observacoes: "Excelente resposta às atividades de balanço. Regulação melhorando.", criadoEm: subDays(now, 9).toISOString() },
    { id: "demo-s3", pacienteId: "demo-p1", dataHora: addHours(subDays(now, 16), 9).toISOString(), objetivoIds: ["demo-o1", "demo-o3"], atividades: ["Integração sensorial", "Estimulação tátil"], comportamentos: ["Resistente", "Ansioso"], engajamento: "baixo", progressoObservado: "manteve", observacoes: "Dia difícil, paciente chegou agitado. Foco em acolhimento.", criadoEm: subDays(now, 16).toISOString() },
    { id: "demo-s4", pacienteId: "demo-p1", dataHora: addHours(subDays(now, 23), 9).toISOString(), objetivoIds: ["demo-o3"], atividades: ["Brincadeira dirigida", "Regulação emocional"], comportamentos: ["Calmo", "Focado"], engajamento: "alto", progressoObservado: "progresso_leve", observacoes: "Contato visual sustentado por 8 segundos.", criadoEm: subDays(now, 23).toISOString() },
    // Maria - 4 sessions
    { id: "demo-s5", pacienteId: "demo-p2", dataHora: addHours(subDays(now, 1), 10).toISOString(), objetivoIds: ["demo-o4"], atividades: ["Coordenação motora fina", "Grafismo", "Recorte e colagem"], comportamentos: ["Colaborativo", "Motivado"], engajamento: "alto", progressoObservado: "progresso_significativo", observacoes: "Conseguiu segurar tesoura adaptada com funcionalidade. Grande evolução.", criadoEm: subDays(now, 1).toISOString() },
    { id: "demo-s6", pacienteId: "demo-p2", dataHora: addHours(subDays(now, 8), 10).toISOString(), objetivoIds: ["demo-o4"], atividades: ["Coordenação motora fina", "Recorte e colagem"], comportamentos: ["Colaborativo", "Calmo"], engajamento: "medio", progressoObservado: "progresso_leve", observacoes: "Preensão melhorando progressivamente.", criadoEm: subDays(now, 8).toISOString() },
    { id: "demo-s7", pacienteId: "demo-p2", dataHora: addHours(subDays(now, 15), 10).toISOString(), objetivoIds: ["demo-o4"], atividades: ["Coordenação motora fina", "Coordenação motora grossa"], comportamentos: ["Motivado", "Focado"], engajamento: "alto", progressoObservado: "progresso_leve", observacoes: "Atividades com massa de modelar — boa resposta.", criadoEm: subDays(now, 15).toISOString() },
    // Pedro - 5 sessions
    { id: "demo-s8", pacienteId: "demo-p3", dataHora: addHours(subDays(now, 3), 14).toISOString(), objetivoIds: ["demo-o6", "demo-o7"], atividades: ["Planejamento motor", "Coordenação motora grossa", "Brincadeira dirigida"], comportamentos: ["Agitado", "Disperso"], engajamento: "medio", progressoObservado: "manteve", observacoes: "Dificuldade para manter foco. Muitas pausas necessárias.", criadoEm: subDays(now, 3).toISOString() },
    { id: "demo-s9", pacienteId: "demo-p3", dataHora: addHours(subDays(now, 10), 14).toISOString(), objetivoIds: ["demo-o6"], atividades: ["Planejamento motor", "Regulação emocional"], comportamentos: ["Colaborativo", "Focado"], engajamento: "alto", progressoObservado: "progresso_significativo", observacoes: "Manteve atenção por 12 minutos na atividade de circuito. Melhor sessão.", criadoEm: subDays(now, 10).toISOString() },
    { id: "demo-s10", pacienteId: "demo-p3", dataHora: addHours(subDays(now, 17), 14).toISOString(), objetivoIds: ["demo-o7"], atividades: ["Coordenação motora grossa", "Equilíbrio e propriocepção"], comportamentos: ["Motivado", "Agitado"], engajamento: "medio", progressoObservado: "progresso_leve", observacoes: "Coordenação bilateral melhorando com exercícios de bola.", criadoEm: subDays(now, 17).toISOString() },
    // Sofia - 3 sessions
    { id: "demo-s11", pacienteId: "demo-p4", dataHora: addHours(subDays(now, 4), 11).toISOString(), objetivoIds: ["demo-o8"], atividades: ["AVD (atividades de vida diária)", "Coordenação motora fina"], comportamentos: ["Colaborativo", "Calmo", "Motivado"], engajamento: "alto", progressoObservado: "progresso_leve", observacoes: "Praticou vestir-se com ajuda mínima. Botões ainda difíceis.", criadoEm: subDays(now, 4).toISOString() },
    { id: "demo-s12", pacienteId: "demo-p4", dataHora: addHours(subDays(now, 11), 11).toISOString(), objetivoIds: ["demo-o8"], atividades: ["AVD (atividades de vida diária)", "Coordenação motora grossa"], comportamentos: ["Colaborativo", "Sonolento"], engajamento: "baixo", progressoObservado: "manteve", observacoes: "Paciente sonolenta hoje. Foco em atividades leves.", criadoEm: subDays(now, 11).toISOString() },
    // Future sessions for agenda
    { id: "demo-s13", pacienteId: "demo-p1", dataHora: addHours(subDays(now, -1), 9).toISOString(), objetivoIds: ["demo-o1"], atividades: [], comportamentos: [], engajamento: "medio", progressoObservado: "manteve", observacoes: "", criadoEm: now.toISOString() },
    { id: "demo-s14", pacienteId: "demo-p2", dataHora: addHours(subDays(now, -1), 10.5).toISOString(), objetivoIds: ["demo-o4"], atividades: [], comportamentos: [], engajamento: "medio", progressoObservado: "manteve", observacoes: "", criadoEm: now.toISOString() },
    { id: "demo-s15", pacienteId: "demo-p3", dataHora: addHours(subDays(now, -2), 14).toISOString(), objetivoIds: ["demo-o6"], atividades: [], comportamentos: [], engajamento: "medio", progressoObservado: "manteve", observacoes: "", criadoEm: now.toISOString() },
    { id: "demo-s16", pacienteId: "demo-p4", dataHora: addHours(subDays(now, -3), 11).toISOString(), objetivoIds: ["demo-o8"], atividades: [], comportamentos: [], engajamento: "medio", progressoObservado: "manteve", observacoes: "", criadoEm: now.toISOString() },
  ];

  localStorage.setItem("terapia_pacientes", JSON.stringify(pacientes));
  localStorage.setItem("terapia_objetivos", JSON.stringify(objetivos));
  localStorage.setItem("terapia_sessoes", JSON.stringify(sessoes));
}
