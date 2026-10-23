import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured } from "../middleware/auth.js";
import { clinicScope } from "../lib/scope.js";

const router = Router();

async function gestorIds(req) {
  if (req.profile.role !== "supervisor_plataforma") return [];
  const { rows } = await query(
    `SELECT clinic_id FROM gestor_clinicas WHERE profile_id = $1`,
    [req.profile.id]
  );
  return rows.map((r) => r.clinic_id);
}

/** Painel público TV — sem autenticação (só unit_id) */
router.get("/public", requireConfigured, async (req, res) => {
  try {
    const unitId = req.query.unit_id;
    if (!unitId) return res.status(400).json({ error: "unit_id obrigatório" });

    const { rows } = await query(
      `SELECT w.senha,
              CASE
                WHEN length(p.nome) > 3 THEN left(p.nome, 1) || '***' || right(p.nome, 1)
                ELSE '***'
              END AS patient_mask,
              r.nome AS room_nome,
              w.status,
              w.chamado_at,
              pr.name AS professional_nome
       FROM waiting_queue w
       JOIN pacientes p ON p.id = w.patient_id
       LEFT JOIN rooms r ON r.id = w.room_id
       LEFT JOIN profiles pr ON pr.id = w.professional_profile_id
       WHERE w.unit_id = $1
         AND w.status IN ('chamado','em_atendimento','aguardando_atendimento')
       ORDER BY
         CASE w.status WHEN 'chamado' THEN 0 WHEN 'em_atendimento' THEN 1 ELSE 2 END,
         w.chamado_at DESC NULLS LAST,
         w.prioridade DESC
       LIMIT 30`,
      [unitId]
    );
    res.json({ unit_id: unitId, items: rows, updated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use(requireConfigured, requireAuth);

router.get("/", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    if (scope && scope.length === 0) return res.json([]);

    const params = [];
    const where = [
      `w.status IN ('aguardando_atendimento','chamado','em_atendimento')`,
    ];
    if (scope !== null) {
      params.push(scope);
      where.push(`w.unit_id = ANY($${params.length}::uuid[])`);
    }
    if (req.query.unit_id) {
      params.push(req.query.unit_id);
      where.push(`w.unit_id = $${params.length}`);
    }
    if (req.query.professional_id) {
      params.push(req.query.professional_id);
      where.push(`w.professional_profile_id = $${params.length}`);
    }

    const { rows } = await query(
      `SELECT w.*,
         p.nome AS patient_nome, p.codigo AS patient_codigo,
         pr.name AS professional_nome,
         r.nome AS room_nome,
         a.inicio AS horario_agendado,
         a.modalidade,
         EXTRACT(EPOCH FROM (now() - w.checkin_at))/60.0 AS espera_minutos
       FROM waiting_queue w
       JOIN pacientes p ON p.id = w.patient_id
       JOIN appointments a ON a.id = w.appointment_id
       LEFT JOIN profiles pr ON pr.id = w.professional_profile_id
       LEFT JOIN rooms r ON r.id = w.room_id
       WHERE ${where.join(" AND ")}
       ORDER BY w.prioridade DESC, w.checkin_at ASC NULLS LAST`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/call-next", async (req, res) => {
  try {
    const { professional_profile_id, room_id, unit_id } = req.body || {};
    const unit = unit_id || req.profile.clinic_id;
    if (!unit) return res.status(400).json({ error: "Unidade obrigatória" });

    const params = [unit];
    let filter = `w.unit_id = $1 AND w.status = 'aguardando_atendimento'`;
    if (professional_profile_id) {
      params.push(professional_profile_id);
      filter += ` AND (w.professional_profile_id = $${params.length} OR w.professional_profile_id IS NULL)`;
    }

    const next = await query(
      `SELECT w.* FROM waiting_queue w
       WHERE ${filter}
       ORDER BY w.prioridade DESC, w.checkin_at ASC
       LIMIT 1`,
      params
    );
    if (!next.rows[0]) return res.status(404).json({ error: "Nenhum paciente aguardando" });

    const id = next.rows[0].appointment_id;
    await query(
      `UPDATE appointments SET status = 'chamado', chamado_at = now(),
         room_id = COALESCE($2, room_id),
         professional_profile_id = COALESCE($3, professional_profile_id),
         updated_at = now()
       WHERE id = $1`,
      [id, room_id || null, professional_profile_id || req.profile.id]
    );
    await query(
      `UPDATE waiting_queue SET status = 'chamado', chamado_at = now(),
         room_id = COALESCE($2, room_id),
         professional_profile_id = COALESCE($3, professional_profile_id),
         updated_at = now()
       WHERE appointment_id = $1`,
      [id, room_id || null, professional_profile_id || req.profile.id]
    );
    await query(
      `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, reason, changed_by)
       VALUES ($1,'aguardando_atendimento','chamado','Chamada da fila',$2)`,
      [id, req.profile.id]
    );

    const { rows } = await query(
      `SELECT w.*, p.nome AS patient_nome, r.nome AS room_nome
       FROM waiting_queue w
       JOIN pacientes p ON p.id = w.patient_id
       LEFT JOIN rooms r ON r.id = w.room_id
       WHERE w.appointment_id = $1`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
