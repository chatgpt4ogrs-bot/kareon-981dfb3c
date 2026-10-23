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
    if (scope && scope.length === 0) return res.json([]);
    const params = [];
    const where = [`w.status = COALESCE($1, w.status)`];
    params.push(req.query.status || "ativa");
    if (scope !== null) {
      params.push(scope);
      where.push(`w.unit_id = ANY($${params.length}::uuid[])`);
    }
    const { rows } = await query(
      `SELECT w.*,
              p.nome AS patient_nome, p.responsavel_telefone AS patient_telefone,
              sp.nome AS specialty_nome,
              pr.name AS professional_nome
       FROM waitlist w
       JOIN pacientes p ON p.id = w.patient_id
       LEFT JOIN specialties sp ON sp.id = w.specialty_id
       LEFT JOIN profiles pr ON pr.id = w.professional_profile_id
       WHERE ${where.join(" AND ")}
       ORDER BY w.prioridade DESC, w.created_at ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const unitId = b.unit_id || req.profile.clinic_id;
    if (!unitId || !b.patient_id) {
      return res.status(400).json({ error: "Unidade e paciente obrigatórios" });
    }
    const { rows } = await query(
      `INSERT INTO waitlist (
         unit_id, patient_id, specialty_id, professional_profile_id,
         prioridade, preferencia_periodo, observacoes, created_by
       ) VALUES ($1,$2,$3,$4,COALESCE($5,0),COALESCE($6,'qualquer'),$7,$8)
       RETURNING *`,
      [
        unitId,
        b.patient_id,
        b.specialty_id || null,
        b.professional_profile_id || null,
        b.prioridade,
        b.preferencia_periodo,
        b.observacoes || null,
        req.profile.id,
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
      `UPDATE waitlist SET
         specialty_id = COALESCE($2, specialty_id),
         professional_profile_id = COALESCE($3, professional_profile_id),
         prioridade = COALESCE($4, prioridade),
         preferencia_periodo = COALESCE($5, preferencia_periodo),
         observacoes = COALESCE($6, observacoes),
         status = COALESCE($7, status),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.specialty_id,
        b.professional_profile_id,
        b.prioridade,
        b.preferencia_periodo,
        b.observacoes,
        b.status,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
