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
    const where = ["s.ativo = true"];
    if (scope !== null) {
      params.push(scope);
      where.push(`s.unit_id = ANY($${params.length}::uuid[])`);
    }
    if (req.query.unit_id) {
      params.push(req.query.unit_id);
      where.push(`s.unit_id = $${params.length}`);
    }
    if (req.query.specialty_id) {
      params.push(req.query.specialty_id);
      where.push(`s.specialty_id = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT s.*, sp.nome AS specialty_nome
       FROM services s
       LEFT JOIN specialties sp ON sp.id = s.specialty_id
       WHERE ${where.join(" AND ")}
       ORDER BY s.nome`,
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
    if (!unitId || !b.nome) return res.status(400).json({ error: "Unidade e nome obrigatórios" });
    const { rows } = await query(
      `INSERT INTO services (unit_id, specialty_id, nome, codigo, duracao_minutos, valor, descricao, requer_sala)
       VALUES ($1,$2,$3,$4,COALESCE($5,30),COALESCE($6,0),$7,COALESCE($8,true)) RETURNING *`,
      [
        unitId,
        b.specialty_id || null,
        b.nome,
        b.codigo || null,
        b.duracao_minutos,
        b.valor,
        b.descricao || null,
        b.requer_sala,
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
      `UPDATE services SET
         nome = COALESCE($2, nome),
         codigo = COALESCE($3, codigo),
         specialty_id = COALESCE($4, specialty_id),
         duracao_minutos = COALESCE($5, duracao_minutos),
         valor = COALESCE($6, valor),
         descricao = COALESCE($7, descricao),
         requer_sala = COALESCE($8, requer_sala),
         ativo = COALESCE($9, ativo)
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.nome,
        b.codigo,
        b.specialty_id,
        b.duracao_minutos,
        b.valor,
        b.descricao,
        b.requer_sala,
        b.ativo,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
