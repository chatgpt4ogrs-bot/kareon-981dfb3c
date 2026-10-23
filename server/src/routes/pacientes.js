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

    if (req.profile.role === "familiar") {
      const { rows } = await query(
        `SELECT p.* FROM pacientes p
         JOIN paciente_usuarios pu ON pu.paciente_id = p.id
         WHERE pu.profile_id = $1 AND pu.tipo = 'familiar'
         ORDER BY p.created_at DESC`,
        [req.profile.id]
      );
      return res.json(rows);
    }

    // Sem clínica ativa: não mistura pacientes de todas as unidades
    if (scope === null) return res.json([]);
    if (scope.length === 0) return res.json([]);

    const { rows } = await query(
      `SELECT * FROM pacientes WHERE clinica_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
      [scope]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM pacientes WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Paciente não encontrado" });

    if (req.profile.role === "familiar") {
      const link = await query(
        `SELECT 1 FROM paciente_usuarios WHERE paciente_id = $1 AND profile_id = $2 AND tipo = 'familiar'`,
        [req.params.id, req.profile.id]
      );
      if (!link.rowCount) return res.status(403).json({ error: "Paciente não vinculado" });
    }

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

    const { rows } = await query(
      `INSERT INTO pacientes (
         clinica_id, nome, data_nascimento, diagnostico, tags,
         responsavel_nome, responsavel_telefone, responsavel_email, responsavel_parentesco,
         status, terapeuta_id, cpf, convenio, observacoes,
         sexo, alergias, alertas_clinicos, convenio_plano, convenio_numero,
         emergencia_nome, emergencia_telefone, emergencia_parentesco,
         endereco_rua, endereco_cidade, endereco_uf, endereco_cep, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
       RETURNING *`,
      [
        clinicaId,
        body.nome,
        body.data_nascimento || null,
        body.diagnostico || "",
        body.tags || [],
        body.responsavel_nome || null,
        body.responsavel_telefone || null,
        body.responsavel_email || null,
        body.responsavel_parentesco || null,
        body.status || "ativo",
        body.terapeuta_id || null,
        body.cpf || null,
        body.convenio || null,
        body.observacoes || null,
        body.sexo || null,
        body.alergias || null,
        body.alertas_clinicos || null,
        body.convenio_plano || null,
        body.convenio_numero || null,
        body.emergencia_nome || null,
        body.emergencia_telefone || null,
        body.emergencia_parentesco || null,
        body.endereco_rua || null,
        body.endereco_cidade || null,
        body.endereco_uf || null,
        body.endereco_cep || null,
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
    const body = req.body || {};
    const { rows } = await query(
      `UPDATE pacientes SET
         nome = COALESCE($2, nome),
         data_nascimento = COALESCE($3, data_nascimento),
         diagnostico = COALESCE($4, diagnostico),
         tags = COALESCE($5, tags),
         responsavel_nome = COALESCE($6, responsavel_nome),
         responsavel_telefone = COALESCE($7, responsavel_telefone),
         responsavel_email = COALESCE($8, responsavel_email),
         responsavel_parentesco = COALESCE($9, responsavel_parentesco),
         status = COALESCE($10, status),
         terapeuta_id = COALESCE($11, terapeuta_id),
         cpf = COALESCE($12, cpf),
         convenio = COALESCE($13, convenio),
         observacoes = COALESCE($14, observacoes),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        body.nome,
        body.data_nascimento,
        body.diagnostico,
        body.tags,
        body.responsavel_nome,
        body.responsavel_telefone,
        body.responsavel_email,
        body.responsavel_parentesco,
        body.status,
        body.terapeuta_id,
        body.cpf,
        body.convenio,
        body.observacoes,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Paciente não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 3) return res.status(400).json({ error: "Motivo obrigatório" });

    const existing = await query(`SELECT * FROM pacientes WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });

    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('delete', 'paciente', $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        existing.rows[0].id,
        existing.rows[0].nome,
        existing.rows[0].clinica_id,
        reason,
        JSON.stringify(existing.rows[0]),
        req.profile.id,
        req.profile.nome,
        req.profile.email,
        req.profile.role,
      ]
    );
    await query(`DELETE FROM pacientes WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/vinculos", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM paciente_usuarios WHERE paciente_id = $1 ORDER BY created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/vinculos", async (req, res) => {
  try {
    const profileIds = Array.isArray(req.body?.profile_ids) ? req.body.profile_ids : [];
    const tipo = req.body?.tipo || "familiar";
    await query(`DELETE FROM paciente_usuarios WHERE paciente_id = $1 AND tipo = $2`, [
      req.params.id,
      tipo,
    ]);
    for (const pid of profileIds) {
      await query(
        `INSERT INTO paciente_usuarios (paciente_id, profile_id, tipo) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [req.params.id, pid, tipo]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
