import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured, mapProfile } from "../middleware/auth.js";
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

// —— Profiles / usuários ——
router.get("/profiles", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    if (scope && scope.length === 0) return res.json([]);

    let sql = `SELECT * FROM profiles`;
    const params = [];
    if (scope !== null) {
      params.push(scope);
      sql += ` WHERE clinic_id = ANY($1::uuid[])`;
    }
    sql += ` ORDER BY name`;
    const { rows } = await query(sql, params);
    res.json(rows.map(mapProfile));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/profiles", async (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || "").toLowerCase().trim();
    const password = String(b.password || "Trocar@123");
    if (!email || !b.nome) return res.status(400).json({ error: "Nome e e-mail obrigatórios" });

    const exists = await query(`SELECT id FROM users WHERE lower(email) = $1`, [email]);
    if (exists.rowCount) return res.status(409).json({ error: "E-mail já existe" });

    const hash = await bcrypt.hash(password, 10);
    const userRes = await query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [email, hash]
    );
    const profileRes = await query(
      `INSERT INTO profiles (user_id, name, email, role, clinic_id, status, telefone, must_change_password, permissions, perfil_id)
       VALUES ($1,$2,$3,COALESCE($4,'terapeuta'),$5,COALESCE($6,'ativo'),$7,true,$8,$9)
       RETURNING *`,
      [
        userRes.rows[0].id,
        b.nome,
        email,
        b.role,
        b.clinic_id || b.clinica_id || null,
        b.status,
        b.telefone || null,
        b.permissions || null,
        b.perfil_id || null,
      ]
    );
    res.status(201).json(mapProfile(profileRes.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/profiles/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const { rows } = await query(
      `UPDATE profiles SET
         name = COALESCE($2, name),
         role = COALESCE($3, role),
         clinic_id = COALESCE($4, clinic_id),
         status = COALESCE($5, status),
         telefone = COALESCE($6, telefone),
         permissions = COALESCE($7, permissions),
         perfil_id = COALESCE($8, perfil_id),
         must_change_password = COALESCE($9, must_change_password),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.nome || b.name,
        b.role,
        b.clinic_id ?? b.clinica_id,
        b.status,
        b.telefone,
        b.permissions,
        b.perfil_id,
        b.must_change_password,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
    res.json(mapProfile(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/profiles/:id", async (req, res) => {
  try {
    if (req.params.id === req.profile.id) {
      return res.status(400).json({ error: "Você não pode excluir a si mesmo" });
    }
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 3) return res.status(400).json({ error: "Motivo obrigatório" });

    const existing = await query(`SELECT * FROM profiles WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });

    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('delete', 'usuario', $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        existing.rows[0].id,
        existing.rows[0].name,
        existing.rows[0].clinic_id,
        reason,
        JSON.stringify(existing.rows[0]),
        req.profile.id,
        req.profile.nome,
        req.profile.email,
        req.profile.role,
      ]
    );

    if (existing.rows[0].user_id) {
      await query(`DELETE FROM users WHERE id = $1`, [existing.rows[0].user_id]);
    } else {
      await query(`DELETE FROM profiles WHERE id = $1`, [req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// —— Sessões / objetivos ——
router.get("/sessoes", async (req, res) => {
  const pacienteId = req.query.paciente_id;
  const params = [];
  let sql = `SELECT * FROM sessoes`;
  if (pacienteId) {
    params.push(pacienteId);
    sql += ` WHERE paciente_id = $1`;
  }
  sql += ` ORDER BY data_hora DESC`;
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.post("/sessoes", async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `INSERT INTO sessoes (paciente_id, terapeuta_id, data_hora, objetivo_ids, atividades, comportamentos, engajamento, progresso_observado, observacoes)
     VALUES ($1,$2,COALESCE($3,now()),$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      b.paciente_id,
      b.terapeuta_id || req.profile.id,
      b.data_hora,
      b.objetivo_ids || [],
      b.atividades || [],
      b.comportamentos || [],
      b.engajamento || "medio",
      b.progresso_observado || "manteve",
      b.observacoes || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.get("/objetivos", async (req, res) => {
  const pacienteId = req.query.paciente_id;
  const params = [];
  let sql = `SELECT * FROM objetivos`;
  if (pacienteId) {
    params.push(pacienteId);
    sql += ` WHERE paciente_id = $1`;
  }
  sql += ` ORDER BY created_at DESC`;
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.post("/objetivos", async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `INSERT INTO objetivos (id, paciente_id, titulo, descricao, status, progresso)
     VALUES (COALESCE($1::uuid, gen_random_uuid()),$2,$3,$4,COALESCE($5,'nao_iniciado'),COALESCE($6,0))
     RETURNING *`,
    [b.id || null, b.paciente_id, b.titulo || null, b.descricao || "", b.status, b.progresso]
  );
  res.status(201).json(rows[0]);
});

router.put("/objetivos/:id", async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `UPDATE objetivos SET
       titulo = COALESCE($2, titulo),
       descricao = COALESCE($3, descricao),
       status = COALESCE($4, status),
       progresso = COALESCE($5, progresso),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, b.titulo, b.descricao, b.status, b.progresso]
  );
  if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
  res.json(rows[0]);
});

router.delete("/objetivos/:id", async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 3) return res.status(400).json({ error: "Motivo obrigatório" });
  const existing = await query(`SELECT * FROM objetivos WHERE id = $1`, [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });
  await query(
    `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
     VALUES ('delete', 'objetivo', $1, $2, $3, $4::jsonb, $5, $6, $7, $8)`,
    [
      existing.rows[0].id,
      existing.rows[0].titulo || existing.rows[0].descricao,
      reason,
      JSON.stringify(existing.rows[0]),
      req.profile.id,
      req.profile.nome,
      req.profile.email,
      req.profile.role,
    ]
  );
  await query(`DELETE FROM objetivos WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// —— Estoque ——
router.get("/estoque", async (req, res) => {
  const gids = await gestorIds(req);
  const scope = clinicScope(req.profile, gids);
  if (scope && scope.length === 0) return res.json([]);
  if (scope === null) {
    const { rows } = await query(`SELECT * FROM estoque_itens ORDER BY nome`);
    return res.json(rows);
  }
  const { rows } = await query(
    `SELECT * FROM estoque_itens WHERE clinica_id = ANY($1::uuid[]) ORDER BY nome`,
    [scope]
  );
  res.json(rows);
});

router.post("/estoque", async (req, res) => {
  const b = req.body || {};
  const clinicaId = b.clinica_id || req.profile.clinic_id;
  const { rows } = await query(
    `INSERT INTO estoque_itens (clinica_id, nome, categoria, unidade, quantidade, estoque_minimo, custo, observacoes)
     VALUES ($1,$2,$3,$4,COALESCE($5,0),COALESCE($6,0),$7,$8) RETURNING *`,
    [
      clinicaId,
      b.nome,
      b.categoria || null,
      b.unidade || null,
      b.quantidade,
      b.estoque_minimo,
      b.custo || null,
      b.observacoes || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.put("/estoque/:id", async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `UPDATE estoque_itens SET
       nome = COALESCE($2, nome),
       categoria = COALESCE($3, categoria),
       unidade = COALESCE($4, unidade),
       quantidade = COALESCE($5, quantidade),
       estoque_minimo = COALESCE($6, estoque_minimo),
       custo = COALESCE($7, custo),
       observacoes = COALESCE($8, observacoes),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, b.nome, b.categoria, b.unidade, b.quantidade, b.estoque_minimo, b.custo, b.observacoes]
  );
  res.json(rows[0]);
});

router.delete("/estoque/:id", async (req, res) => {
  const reason = String(req.body?.reason || "Exclusão estoque").trim();
  const existing = await query(`SELECT * FROM estoque_itens WHERE id = $1`, [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });
  await query(
    `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
     VALUES ('delete', 'produto_estoque', $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
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
  await query(`DELETE FROM estoque_itens WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// —— Perfis de acesso / auditoria ——
router.get("/perfis-acesso", async (_req, res) => {
  const { rows } = await query(`SELECT * FROM perfis_acesso ORDER BY ordem, nome`);
  res.json(rows);
});

router.get("/audit-logs", async (req, res) => {
  if (req.profile.role !== "admin") {
    return res.status(403).json({ error: "Somente Admin Master" });
  }
  const { rows } = await query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`);
  res.json(rows);
});

router.get("/convenios", async (req, res) => {
  const clinicaId = req.query.clinica_id || req.profile.clinic_id;
  const { rows } = await query(
    `SELECT * FROM convenios WHERE ($1::uuid IS NULL OR clinica_id = $1) AND ativo = true ORDER BY nome`,
    [clinicaId || null]
  );
  res.json(rows);
});

router.get("/procedimentos", async (req, res) => {
  const clinicaId = req.query.clinica_id || req.profile.clinic_id;
  const { rows } = await query(
    `SELECT * FROM procedimentos WHERE ($1::uuid IS NULL OR clinica_id = $1) AND ativo = true ORDER BY nome`,
    [clinicaId || null]
  );
  res.json(rows);
});

export default router;
