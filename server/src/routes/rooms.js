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
    let sql = `SELECT * FROM rooms WHERE ativo = true`;
    if (scope !== null) {
      params.push(scope);
      sql += ` AND unit_id = ANY($${params.length}::uuid[])`;
    }
    if (req.query.unit_id) {
      params.push(req.query.unit_id);
      sql += ` AND unit_id = $${params.length}`;
    }
    sql += ` ORDER BY nome`;
    const { rows } = await query(sql, params);
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
      `INSERT INTO rooms (unit_id, nome, codigo, tipo, capacidade)
       VALUES ($1,$2,$3,COALESCE($4,'consultorio'),COALESCE($5,1)) RETURNING *`,
      [unitId, b.nome, b.codigo || null, b.tipo, b.capacidade]
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
      `UPDATE rooms SET
         nome = COALESCE($2, nome),
         codigo = COALESCE($3, codigo),
         tipo = COALESCE($4, tipo),
         capacidade = COALESCE($5, capacidade),
         ativo = COALESCE($6, ativo),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, b.nome, b.codigo, b.tipo, b.capacidade, b.ativo]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
