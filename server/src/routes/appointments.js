import { Router } from "express";
import { randomUUID } from "crypto";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured } from "../middleware/auth.js";
import { clinicScope, resolveUnitId } from "../lib/scope.js";

const router = Router();
router.use(requireConfigured, requireAuth);

async function gestorIds(req) {
  if (req.profile.role !== "supervisor_plataforma") return [];
  const { rows } = await query(
    `SELECT clinic_id FROM gestor_clinicas WHERE profile_id = $1`,
    [req.profile.id]
  );
  return rows.map((r) => r.clinic_id);
}

async function logStatus(appointmentId, fromStatus, toStatus, reason, profileId) {
  await query(
    `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, reason, changed_by)
     VALUES ($1,$2,$3,$4,$5)`,
    [appointmentId, fromStatus, toStatus, reason || null, profileId]
  );
}

const SELECT_APPT = `
  SELECT a.*,
    p.nome AS patient_nome, p.codigo AS patient_codigo, p.responsavel_telefone AS patient_telefone,
    pr.name AS professional_nome,
    r.nome AS room_nome,
    s.nome AS service_nome,
    sp.nome AS specialty_nome
  FROM appointments a
  JOIN pacientes p ON p.id = a.patient_id
  LEFT JOIN profiles pr ON pr.id = a.professional_profile_id
  LEFT JOIN rooms r ON r.id = a.room_id
  LEFT JOIN services s ON s.id = a.service_id
  LEFT JOIN specialties sp ON sp.id = a.specialty_id
`;

router.get("/", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    // Sem clínica ativa: agenda não é global — cada clínica tem a sua
    if (scope === null) return res.json([]);
    if (scope.length === 0) return res.json([]);

    const { from, to, status, professional_id, unit_id, patient_id, specialty_id, area } = req.query;
    const params = [];
    const where = [];

    if (scope !== null) {
      params.push(scope);
      where.push(`a.unit_id = ANY($${params.length}::uuid[])`);
    }
    if (unit_id) {
      params.push(unit_id);
      where.push(`a.unit_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`a.inicio >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`a.inicio <= $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`a.status = $${params.length}`);
    }
    if (professional_id) {
      params.push(professional_id);
      where.push(`a.professional_profile_id = $${params.length}`);
    }
    if (patient_id) {
      params.push(patient_id);
      where.push(`a.patient_id = $${params.length}`);
    }
    if (specialty_id) {
      params.push(specialty_id);
      where.push(`a.specialty_id = $${params.length}`);
    }
    if (area) {
      params.push(area);
      where.push(`sp.area = $${params.length}`);
    }

    const { rows } = await query(
      `${SELECT_APPT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY a.inicio ASC LIMIT 1000`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    const emptyDash = {
      hoje_agendados: 0,
      presentes: 0,
      aguardando: 0,
      em_atendimento: 0,
      finalizados: 0,
      faltas_cancelamentos: 0,
      tempo_medio_espera_min: 0,
      pacientes_novos_mes: 0,
    };
    // Agenda operacional é sempre por clínica
    if (scope === null) return res.json(emptyDash);
    if (scope.length === 0) return res.json(emptyDash);

    const unitFilter = "AND unit_id = ANY($1::uuid[])";
    const params = [scope];

    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE inicio::date = CURRENT_DATE AND status NOT IN ('cancelado')) AS hoje_agendados,
         COUNT(*) FILTER (WHERE checkin_at IS NOT NULL AND inicio::date = CURRENT_DATE AND status NOT IN ('cancelado','finalizado','faltou','ausente')) AS presentes,
         COUNT(*) FILTER (WHERE status = 'aguardando_atendimento' AND inicio::date = CURRENT_DATE) AS aguardando,
         COUNT(*) FILTER (WHERE status = 'em_atendimento' AND inicio::date = CURRENT_DATE) AS em_atendimento,
         COUNT(*) FILTER (WHERE status = 'finalizado' AND inicio::date = CURRENT_DATE) AS finalizados,
         COUNT(*) FILTER (WHERE status IN ('cancelado','faltou','ausente') AND inicio::date = CURRENT_DATE) AS faltas_cancelamentos
       FROM appointments
       WHERE TRUE ${unitFilter}`,
      params
    );

    const wait = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(chamado_at, atendimento_inicio_at) - checkin_at))/60.0) AS avg_min
       FROM appointments
       WHERE checkin_at IS NOT NULL
         AND inicio::date = CURRENT_DATE
         ${unitFilter}`,
      params
    );

    const novos = await query(
      `SELECT COUNT(*)::int AS c FROM pacientes
       WHERE created_at >= date_trunc('month', CURRENT_DATE)
         ${scope === null ? "" : "AND clinica_id = ANY($1::uuid[])"}`,
      params
    );

    res.json({
      hoje_agendados: Number(rows[0].hoje_agendados),
      presentes: Number(rows[0].presentes),
      aguardando: Number(rows[0].aguardando),
      em_atendimento: Number(rows[0].em_atendimento),
      finalizados: Number(rows[0].finalizados),
      faltas_cancelamentos: Number(rows[0].faltas_cancelamentos),
      tempo_medio_espera_min: Math.round(Number(wait.rows[0]?.avg_min || 0)),
      pacientes_novos_mes: Number(novos.rows[0]?.c || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(`${SELECT_APPT} WHERE a.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Agendamento não encontrado" });
    const hist = await query(
      `SELECT * FROM appointment_status_history WHERE appointment_id = $1 ORDER BY created_at`,
      [req.params.id]
    );
    res.json({ ...rows[0], history: hist.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const unitId = resolveUnitId(req.profile, b.unit_id);
    if (!unitId) {
      return res.status(400).json({
        error: "Selecione a clínica (tenant) antes de agendar. Cada clínica tem sua própria agenda.",
      });
    }
    if (!b.patient_id || !b.inicio) {
      return res.status(400).json({ error: "Paciente e horário são obrigatórios" });
    }

    const patient = await query(`SELECT id, clinica_id FROM pacientes WHERE id = $1`, [b.patient_id]);
    if (!patient.rows[0]) return res.status(404).json({ error: "Paciente não encontrado" });
    if (patient.rows[0].clinica_id !== unitId) {
      return res.status(400).json({
        error: "Paciente pertence a outra clínica. A agenda é isolada por unidade.",
      });
    }

    const duracao = Number(b.duracao_minutos) || 30;
    const inicio = new Date(b.inicio);
    const fim = b.fim ? new Date(b.fim) : new Date(inicio.getTime() + duracao * 60000);

    let specialtyId = b.specialty_id || null;
    let professionalId = b.professional_id || null;
    if (b.professional_profile_id && (!specialtyId || !professionalId)) {
      const pr = await query(
        `SELECT id, specialty_id FROM professionals WHERE profile_id = $1 AND ativo = true LIMIT 1`,
        [b.professional_profile_id]
      );
      if (pr.rows[0]) {
        professionalId = professionalId || pr.rows[0].id;
        specialtyId = specialtyId || pr.rows[0].specialty_id;
      }
    }

    const recurWeeks = Math.min(Number(b.recurrence_weeks) || 0, 52);
    const groupId = recurWeeks > 0 ? randomUUID() : null;
    const created = [];

    for (let i = 0; i <= recurWeeks; i++) {
      const start = new Date(inicio.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(fim.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const { rows } = await query(
        `INSERT INTO appointments (
           unit_id, patient_id, professional_id, professional_profile_id, service_id, room_id, specialty_id,
           inicio, fim, duracao_minutos, status, modalidade, tipo_pagamento, notes, created_by, prioridade,
           recurrence_group_id, recurrence_rule, valor
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,'agendado'),COALESCE($12,'presencial'),
           COALESCE($13,'particular'),$14,$15,COALESCE($16,0),$17,$18,$19)
         RETURNING *`,
        [
          unitId,
          b.patient_id,
          professionalId,
          b.professional_profile_id || null,
          b.service_id || null,
          b.room_id || null,
          specialtyId,
          start.toISOString(),
          end.toISOString(),
          duracao,
          b.status || "agendado",
          b.modalidade || "presencial",
          b.tipo_pagamento || "particular",
          b.notes || null,
          req.profile.id,
          b.prioridade || 0,
          groupId,
          groupId ? `WEEKLY;COUNT=${recurWeeks + 1}` : null,
          b.valor != null ? Number(b.valor) : null,
        ]
      );
      await logStatus(rows[0].id, null, rows[0].status, i === 0 ? "Criação" : "Recorrência", req.profile.id);
      created.push(rows[0]);
    }

    const full = await query(`${SELECT_APPT} WHERE a.id = $1`, [created[0].id]);
    res.status(201).json({ ...full.rows[0], recurrence_count: created.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const current = await query(`SELECT * FROM appointments WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: "Não encontrado" });

    const duracao = b.duracao_minutos != null ? Number(b.duracao_minutos) : current.rows[0].duracao_minutos;
    let inicio = b.inicio ? new Date(b.inicio) : new Date(current.rows[0].inicio);
    let fim = b.fim
      ? new Date(b.fim)
      : b.inicio
      ? new Date(inicio.getTime() + duracao * 60000)
      : new Date(current.rows[0].fim);

    const { rows } = await query(
      `UPDATE appointments SET
         patient_id = COALESCE($2, patient_id),
         professional_profile_id = COALESCE($3, professional_profile_id),
         service_id = COALESCE($4, service_id),
         room_id = COALESCE($5, room_id),
         specialty_id = COALESCE($6, specialty_id),
         inicio = $7,
         fim = $8,
         duracao_minutos = $9,
         modalidade = COALESCE($10, modalidade),
         tipo_pagamento = COALESCE($11, tipo_pagamento),
         notes = COALESCE($12, notes),
         prioridade = COALESCE($13, prioridade),
         prioridade_justificativa = COALESCE($14, prioridade_justificativa),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.patient_id,
        b.professional_profile_id,
        b.service_id,
        b.room_id,
        b.specialty_id,
        inicio.toISOString(),
        fim.toISOString(),
        duracao,
        b.modalidade,
        b.tipo_pagamento,
        b.notes,
        b.prioridade,
        b.prioridade_justificativa,
      ]
    );
    const full = await query(`${SELECT_APPT} WHERE a.id = $1`, [rows[0].id]);
    res.json(full.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/status", async (req, res) => {
  try {
    const { status, reason } = req.body || {};
    if (!status) return res.status(400).json({ error: "Status obrigatório" });

    const current = await query(`SELECT * FROM appointments WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: "Não encontrado" });
    const prev = current.rows[0];

    if (status === "cancelado" && (!reason || String(reason).trim().length < 3)) {
      return res.status(400).json({ error: "Motivo do cancelamento obrigatório" });
    }

    const extras = {};
    if (status === "aguardando_atendimento" && !prev.checkin_at) extras.checkin_at = new Date().toISOString();
    if (status === "chamado") extras.chamado_at = new Date().toISOString();
    if (status === "em_atendimento") extras.atendimento_inicio_at = new Date().toISOString();
    if (status === "finalizado") extras.atendimento_fim_at = new Date().toISOString();

    const { rows } = await query(
      `UPDATE appointments SET
         status = $2,
         cancel_reason = CASE WHEN $2 = 'cancelado' THEN $3 ELSE cancel_reason END,
         checkin_at = COALESCE($4::timestamptz, checkin_at),
         chamado_at = COALESCE($5::timestamptz, chamado_at),
         atendimento_inicio_at = COALESCE($6::timestamptz, atendimento_inicio_at),
         atendimento_fim_at = COALESCE($7::timestamptz, atendimento_fim_at),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        status,
        reason || null,
        extras.checkin_at || null,
        extras.chamado_at || null,
        extras.atendimento_inicio_at || null,
        extras.atendimento_fim_at || null,
      ]
    );

    await logStatus(rows[0].id, prev.status, status, reason, req.profile.id);

    // Sincroniza fila
    if (["aguardando_atendimento", "chamado", "em_atendimento"].includes(status)) {
      await query(
        `INSERT INTO waiting_queue (appointment_id, unit_id, patient_id, professional_profile_id, room_id, status, senha, prioridade, checkin_at, chamado_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, now()),$10)
         ON CONFLICT (appointment_id) DO UPDATE SET
           status = EXCLUDED.status,
           room_id = COALESCE(EXCLUDED.room_id, waiting_queue.room_id),
           prioridade = EXCLUDED.prioridade,
           chamado_at = COALESCE(EXCLUDED.chamado_at, waiting_queue.chamado_at),
           updated_at = now()`,
        [
          rows[0].id,
          rows[0].unit_id,
          rows[0].patient_id,
          rows[0].professional_profile_id,
          rows[0].room_id,
          status,
          String(rows[0].id).slice(0, 4).toUpperCase(),
          rows[0].prioridade,
          rows[0].checkin_at,
          rows[0].chamado_at,
        ]
      );
    } else if (["finalizado", "cancelado", "faltou", "ausente"].includes(status)) {
      await query(
        `UPDATE waiting_queue SET status = $2, updated_at = now() WHERE appointment_id = $1`,
        [rows[0].id, status]
      );
    }

    const full = await query(`${SELECT_APPT} WHERE a.id = $1`, [rows[0].id]);
    res.json(full.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Check-in da recepção */
router.post("/:id/checkin", async (req, res) => {
  try {
    const reason = "Check-in recepção";
    const status = "aguardando_atendimento";
    const current = await query(`SELECT * FROM appointments WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: "Não encontrado" });
    const prev = current.rows[0];

    const { rows } = await query(
      `UPDATE appointments SET
         status = $2,
         checkin_at = COALESCE(checkin_at, now()),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, status]
    );
    await logStatus(rows[0].id, prev.status, status, reason, req.profile.id);

    await query(
      `INSERT INTO waiting_queue (appointment_id, unit_id, patient_id, professional_profile_id, room_id, status, senha, prioridade, checkin_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
       ON CONFLICT (appointment_id) DO UPDATE SET
         status = EXCLUDED.status,
         checkin_at = COALESCE(waiting_queue.checkin_at, now()),
         updated_at = now()`,
      [
        rows[0].id,
        rows[0].unit_id,
        rows[0].patient_id,
        rows[0].professional_profile_id,
        rows[0].room_id,
        status,
        String(rows[0].id).replace(/-/g, "").slice(0, 4).toUpperCase(),
        rows[0].prioridade,
      ]
    );

    const full = await query(`${SELECT_APPT} WHERE a.id = $1`, [rows[0].id]);
    res.json(full.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
