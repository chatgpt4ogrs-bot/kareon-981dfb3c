import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured } from "../middleware/auth.js";
import { clinicScope } from "../lib/scope.js";

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

router.get("/", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    const { status, paciente_id, from, to, q } = req.query;

    const params = [];
    const where = [];

    if (scope && scope.length === 0) return res.json([]);
    if (scope !== null) {
      params.push(scope);
      where.push(`a.clinica_id = ANY($${params.length}::uuid[])`);
    }
    if (status) {
      params.push(status);
      where.push(`a.status = $${params.length}`);
    }
    if (paciente_id) {
      params.push(paciente_id);
      where.push(`a.paciente_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`a.data_hora >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`a.data_hora <= $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(p.nome ILIKE $${params.length} OR a.diagnostico_cid ILIKE $${params.length} OR a.queixa_principal ILIKE $${params.length})`);
    }

    const sql = `
      SELECT a.*,
             p.nome AS paciente_nome,
             pr.name AS profissional_nome,
             c.nome AS convenio_nome,
             proc.nome AS procedimento_nome
      FROM atendimentos a
      JOIN pacientes p ON p.id = a.paciente_id
      LEFT JOIN profiles pr ON pr.id = a.profissional_id
      LEFT JOIN convenios c ON c.id = a.convenio_id
      LEFT JOIN procedimentos proc ON proc.id = a.procedimento_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY a.data_hora DESC
      LIMIT 500
    `;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT a.*,
              p.nome AS paciente_nome,
              pr.name AS profissional_nome
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       LEFT JOIN profiles pr ON pr.id = a.profissional_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Atendimento não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const clinicaId = body.clinica_id || req.profile.clinic_id;
    if (!clinicaId) return res.status(400).json({ error: "Sem clínica vinculada" });
    if (!body.paciente_id) return res.status(400).json({ error: "Paciente obrigatório" });

    const { rows } = await query(
      `INSERT INTO atendimentos (
         clinica_id, paciente_id, profissional_id, evento_id, data_hora, status, tipo,
         convenio_id, procedimento_id, queixa_principal, anamnese, exame_fisico,
         sinais_vitais, diagnostico_cid, diagnostico_descricao, conduta, evolucao,
         prescricao, exames_solicitados, atestado, observacoes
       ) VALUES (
         $1,$2,$3,$4,COALESCE($5, now()),COALESCE($6,'em_andamento'),COALESCE($7,'presencial'),
         $8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19,$20,$21
       ) RETURNING *`,
      [
        clinicaId,
        body.paciente_id,
        body.profissional_id || req.profile.id,
        body.evento_id || null,
        body.data_hora || null,
        body.status || "em_andamento",
        body.tipo || "presencial",
        body.convenio_id || null,
        body.procedimento_id || null,
        body.queixa_principal || null,
        body.anamnese || null,
        body.exame_fisico || null,
        JSON.stringify(body.sinais_vitais || {}),
        body.diagnostico_cid || null,
        body.diagnostico_descricao || null,
        body.conduta || null,
        body.evolucao || null,
        body.prescricao || null,
        body.exames_solicitados || null,
        body.atestado || null,
        body.observacoes || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const { rows } = await query(
      `UPDATE atendimentos SET
         status = COALESCE($2, status),
         tipo = COALESCE($3, tipo),
         data_hora = COALESCE($4, data_hora),
         profissional_id = COALESCE($5, profissional_id),
         convenio_id = COALESCE($6, convenio_id),
         procedimento_id = COALESCE($7, procedimento_id),
         queixa_principal = COALESCE($8, queixa_principal),
         anamnese = COALESCE($9, anamnese),
         exame_fisico = COALESCE($10, exame_fisico),
         sinais_vitais = COALESCE($11::jsonb, sinais_vitais),
         diagnostico_cid = COALESCE($12, diagnostico_cid),
         diagnostico_descricao = COALESCE($13, diagnostico_descricao),
         conduta = COALESCE($14, conduta),
         evolucao = COALESCE($15, evolucao),
         prescricao = COALESCE($16, prescricao),
         exames_solicitados = COALESCE($17, exames_solicitados),
         atestado = COALESCE($18, atestado),
         observacoes = COALESCE($19, observacoes),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        b.status,
        b.tipo,
        b.data_hora,
        b.profissional_id,
        b.convenio_id,
        b.procedimento_id,
        b.queixa_principal,
        b.anamnese,
        b.exame_fisico,
        b.sinais_vitais != null ? JSON.stringify(b.sinais_vitais) : null,
        b.diagnostico_cid,
        b.diagnostico_descricao,
        b.conduta,
        b.evolucao,
        b.prescricao,
        b.exames_solicitados,
        b.atestado,
        b.observacoes,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Atendimento não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const reason = String(req.body?.reason || "Exclusão de atendimento").trim();
    const existing = await query(`SELECT * FROM atendimentos WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });

    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('delete', 'atendimento', $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        existing.rows[0].id,
        `Atendimento ${existing.rows[0].id}`,
        existing.rows[0].clinica_id,
        reason,
        JSON.stringify(existing.rows[0]),
        req.profile.id,
        req.profile.nome,
        req.profile.email,
        req.profile.role,
      ]
    );
    await query(`DELETE FROM atendimentos WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
