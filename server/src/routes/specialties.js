import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured } from "../middleware/auth.js";

const router = Router();
router.use(requireConfigured, requireAuth);

const AREA_LABELS = {
  medicina: "Medicina",
  odontologia: "Odontologia",
  psicologia: "Psicologia",
  podologia: "Podologia",
  reabilitacao: "Reabilitação",
  saude: "Saúde",
  estetica: "Estética",
  integrativa: "Integrativa",
  geral: "Geral",
};

router.get("/", async (req, res) => {
  try {
    const { area, q } = req.query;
    const params = [];
    const where = [`ativo = true`];
    if (area) {
      params.push(area);
      where.push(`area = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(nome ILIKE $${params.length} OR codigo ILIKE $${params.length})`);
    }
    const { rows } = await query(
      `SELECT * FROM specialties WHERE ${where.join(" AND ")} ORDER BY area, nome`,
      params
    );
    res.json(
      rows.map((r) => ({
        ...r,
        area_label: AREA_LABELS[r.area] || r.area,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/areas", (_req, res) => {
  res.json(
    Object.entries(AREA_LABELS).map(([id, label]) => ({ id, label }))
  );
});

router.post("/", async (req, res) => {
  try {
    if (!["admin", "clinica_admin", "supervisor_plataforma"].includes(req.profile.role)) {
      return res.status(403).json({ error: "Sem permissão para criar especialidade" });
    }
    const { nome, area, codigo, descricao } = req.body || {};
    if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
    const { rows } = await query(
      `INSERT INTO specialties (nome, area, codigo, descricao, organization_id)
       VALUES ($1, COALESCE($2,'geral'), $3, $4, NULL) RETURNING *`,
      [nome, area || "geral", codigo || null, descricao || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
