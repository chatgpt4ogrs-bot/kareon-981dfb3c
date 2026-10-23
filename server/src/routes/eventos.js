import { Router } from "express";
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

router.get("/", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    // Agenda de eventos também é por clínica — sem tenant = vazio
    if (scope === null) return res.json([]);
    if (scope.length === 0) return res.json([]);

    const { rows } = await query(
      `SELECT e.*,
        COALESCE(
          (SELECT json_agg(et.profile_id) FROM evento_terapeutas et WHERE et.evento_id = e.id),
          '[]'::json
        ) AS terapeuta_ids
       FROM eventos e
       WHERE e.clinica_id = ANY($1::uuid[])
       ORDER BY e.inicio DESC`,
      [scope]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const clinicaId = resolveUnitId(req.profile, b.clinica_id);
    if (!clinicaId) {
      return res.status(400).json({
        error: "Selecione a clínica (tenant) antes de agendar. Cada clínica tem sua própria agenda.",
      });
    }

    const { rows } = await query(
      `INSERT INTO eventos (clinica_id, paciente_id, titulo, descricao, inicio, fim, status, tipo)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'agendado'),COALESCE($8,'consulta'))
       RETURNING *`,
      [
        clinicaId,
        b.paciente_id || null,
        b.titulo,
        b.descricao || null,
        b.inicio,
        b.fim,
        b.status,
        b.tipo,
      ]
    );

    const terapeutaIds = Array.isArray(b.terapeuta_ids) ? b.terapeuta_ids : [];
    for (const pid of terapeutaIds) {
      await query(
        `INSERT INTO evento_terapeutas (evento_id, profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [rows[0].id, pid]
      );
    }
    res.status(201).json({ ...rows[0], terapeuta_ids: terapeutaIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const { rows } = await query(
      `UPDATE eventos SET
         titulo = COALESCE($2, titulo),
         descricao = COALESCE($3, descricao),
         inicio = COALESCE($4, inicio),
         fim = COALESCE($5, fim),
         status = COALESCE($6, status),
         tipo = COALESCE($7, tipo),
         paciente_id = COALESCE($8, paciente_id),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, b.titulo, b.descricao, b.inicio, b.fim, b.status, b.tipo, b.paciente_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });

    if (Array.isArray(b.terapeuta_ids)) {
      await query(`DELETE FROM evento_terapeutas WHERE evento_id = $1`, [req.params.id]);
      for (const pid of b.terapeuta_ids) {
        await query(
          `INSERT INTO evento_terapeutas (evento_id, profile_id) VALUES ($1, $2)`,
          [req.params.id, pid]
        );
      }
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 3) return res.status(400).json({ error: "Motivo obrigatório" });
    const existing = await query(`SELECT * FROM eventos WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });

    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('delete', 'evento', $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        existing.rows[0].id,
        existing.rows[0].titulo,
        existing.rows[0].clinica_id,
        reason,
        JSON.stringify(existing.rows[0]),
        req.profile.id,
        req.profile.nome,
        req.profile.email,
        req.profile.role,
      ]
    );
    await query(`DELETE FROM eventos WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
