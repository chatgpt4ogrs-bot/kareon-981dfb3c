import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured } from "../middleware/auth.js";

const router = Router();
router.use(requireConfigured, requireAuth);

router.get("/", async (req, res) => {
  try {
    const { professional_id } = req.query;
    if (!professional_id) return res.status(400).json({ error: "professional_id obrigatório" });
    const { rows } = await query(
      `SELECT * FROM professional_schedules
       WHERE professional_id = $1 AND ativo = true
       ORDER BY weekday, hora_inicio`,
      [professional_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.professional_id || b.weekday == null || !b.hora_inicio || !b.hora_fim) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }
    const { rows } = await query(
      `INSERT INTO professional_schedules (professional_id, unit_id, weekday, hora_inicio, hora_fim)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.professional_id, b.unit_id || req.profile.clinic_id || null, b.weekday, b.hora_inicio, b.hora_fim]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await query(`UPDATE professional_schedules SET ativo = false WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/blocks", async (req, res) => {
  try {
    const { from, to, professional_id, unit_id } = req.query;
    const params = [];
    const where = [];
    if (from) {
      params.push(from);
      where.push(`inicio >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`fim <= $${params.length}`);
    }
    if (professional_id) {
      params.push(professional_id);
      where.push(`professional_id = $${params.length}`);
    }
    if (unit_id) {
      params.push(unit_id);
      where.push(`unit_id = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT * FROM schedule_blocks
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY inicio`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/blocks", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.inicio || !b.fim) return res.status(400).json({ error: "Início e fim obrigatórios" });
    const { rows } = await query(
      `INSERT INTO schedule_blocks (professional_id, room_id, unit_id, inicio, fim, motivo, tipo)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'bloqueio')) RETURNING *`,
      [
        b.professional_id || null,
        b.room_id || null,
        b.unit_id || req.profile.clinic_id || null,
        b.inicio,
        b.fim,
        b.motivo || null,
        b.tipo,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/blocks/:id", async (req, res) => {
  try {
    await query(`DELETE FROM schedule_blocks WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
