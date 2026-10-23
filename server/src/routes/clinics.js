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
    if (scope === null) {
      const { rows } = await query(`SELECT * FROM clinics ORDER BY nome`);
      return res.json(rows);
    }
    const { rows } = await query(
      `SELECT * FROM clinics WHERE id = ANY($1::uuid[]) ORDER BY nome`,
      [scope]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM clinics WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Clínica não encontrada" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente o suporte pode criar clínicas" });
    }
    const b = req.body || {};
    const { rows } = await query(
      `INSERT INTO clinics (nome, cnpj, telefone, email, endereco, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'ativa')) RETURNING *`,
      [b.nome, b.cnpj || null, b.telefone || null, b.email || null, b.endereco || null, b.status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const current = await query(`SELECT * FROM clinics WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: "Não encontrada" });

    if (b.cnpj != null && current.rows[0].cnpj && b.cnpj !== current.rows[0].cnpj) {
      return res.status(400).json({
        error: "O CNPJ da clínica não pode ser alterado. Para corrigir, entre em contato com o suporte",
      });
    }
    if (b.status != null && b.status !== current.rows[0].status && req.profile.role !== "admin") {
      return res.status(403).json({
        error: "Somente o suporte pode ativar ou desativar clínicas",
      });
    }

    const { rows } = await query(
      `UPDATE clinics SET
         nome = COALESCE($2, nome),
         cnpj = CASE WHEN cnpj IS NULL OR cnpj = '' THEN COALESCE($3, cnpj) ELSE cnpj END,
         telefone = COALESCE($4, telefone),
         email = COALESCE($5, email),
         endereco = COALESCE($6, endereco),
         status = COALESCE($7, status),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, b.nome, b.cnpj, b.telefone, b.email, b.endereco, b.status]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente o suporte pode excluir clínicas" });
    }
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 3) return res.status(400).json({ error: "Motivo obrigatório" });

    const existing = await query(`SELECT * FROM clinics WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrada" });

    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('delete', 'clinica', $1, $2, $1, $3, $4::jsonb, $5, $6, $7, $8)`,
      [
        existing.rows[0].id,
        existing.rows[0].nome,
        reason,
        JSON.stringify(existing.rows[0]),
        req.profile.id,
        req.profile.nome,
        req.profile.email,
        req.profile.role,
      ]
    );
    await query(`DELETE FROM clinics WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
