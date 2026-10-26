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
    // Com tenant ativo (X-Clinic-Id), isola usuários daquela clínica
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

/** Cadastros em modo visita / pendentes de aprovação */
router.get("/profiles/pending", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente Admin Master" });
    }
    const { rows } = await query(
      `SELECT p.*, u.created_at AS user_created_at
       FROM profiles p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE lower(COALESCE(p.status, '')) NOT IN ('ativo', 'active', 'inativo', 'inactive')
         AND lower(COALESCE(p.role, '')) NOT IN ('admin', 'supervisor_plataforma')
       ORDER BY COALESCE(p.created_at, u.created_at) DESC NULLS LAST`
    );
    res.json({
      pending: rows.map((r) => ({
        ...mapProfile(r),
        name: r.name,
        provider: "email",
        email_confirmed: true,
        has_profile: true,
        created_at: r.created_at || r.user_created_at || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/profiles/:id", async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM profiles WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
    res.json(mapProfile(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/profiles/:id/approve", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente Admin Master" });
    }
    const b = req.body || {};
    const role = Array.isArray(b.roles) ? b.roles[0] : b.role;
    const isGestor = role === "supervisor_plataforma";
    const clinicId = isGestor ? null : b.clinica_id || b.clinic_id || null;
    const { rows } = await query(
      `UPDATE profiles SET
         status = 'ativo',
         role = COALESCE($2, role),
         clinic_id = $3,
         permissions = COALESCE($4, permissions),
         perfil_id = COALESCE($5, perfil_id),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, role || null, clinicId, b.permissions || null, b.perfil_id || null]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });

    if (isGestor && Array.isArray(b.clinica_ids)) {
      await query(`DELETE FROM gestor_clinicas WHERE profile_id = $1`, [req.params.id]);
      for (const cid of b.clinica_ids) {
        if (!cid) continue;
        await query(
          `INSERT INTO gestor_clinicas (profile_id, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [req.params.id, cid]
        );
      }
    }
    res.json(mapProfile(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/profiles/:id/reject", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente Admin Master" });
    }
    const reason = String(req.body?.reason || "Cadastro recusado").trim();
    const existing = await query(`SELECT * FROM profiles WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });

    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('reject', 'usuario', $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
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

router.get("/profiles/:id/gestor-clinicas", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT clinic_id FROM gestor_clinicas WHERE profile_id = $1`,
      [req.params.id]
    );
    res.json(rows.map((r) => r.clinic_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/profiles/:id/gestor-clinicas", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente Admin Master" });
    }
    const ids = Array.isArray(req.body?.clinica_ids) ? req.body.clinica_ids : [];
    await query(`DELETE FROM gestor_clinicas WHERE profile_id = $1`, [req.params.id]);
    for (const cid of ids) {
      await query(
        `INSERT INTO gestor_clinicas (profile_id, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.params.id, cid]
      );
    }
    res.json({ ok: true, clinica_ids: ids });
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
    const role = b.role || (Array.isArray(b.roles) ? b.roles[0] : null) || "terapeuta";
    const clinicId =
      role === "supervisor_plataforma" ? null : b.clinic_id || b.clinica_id || null;
    const profileRes = await query(
      `INSERT INTO profiles (user_id, name, email, role, clinic_id, status, telefone, must_change_password, permissions, perfil_id)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'ativo'),$7,true,$8,$9)
       RETURNING *`,
      [
        userRes.rows[0].id,
        b.nome,
        email,
        role,
        clinicId,
        b.status,
        b.telefone || null,
        b.permissions || null,
        b.perfil_id || null,
      ]
    );

    // Gestor: vincular clínicas (clinica_ids)
    if (role === "supervisor_plataforma" && Array.isArray(b.clinica_ids)) {
      for (const cid of b.clinica_ids) {
        if (!cid) continue;
        await query(
          `INSERT INTO gestor_clinicas (profile_id, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [profileRes.rows[0].id, cid]
        );
      }
    }

    res.status(201).json(mapProfile(profileRes.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/profiles/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const role = Array.isArray(b.roles) ? b.roles[0] : b.role;
    const clinicId =
      b.clinic_id !== undefined
        ? b.clinic_id
        : b.clinica_id !== undefined
          ? b.clinica_id === "none"
            ? null
            : b.clinica_id
          : undefined;

    const { rows } = await query(
      `UPDATE profiles SET
         name = COALESCE($2, name),
         role = COALESCE($3, role),
         clinic_id = CASE WHEN $4::boolean THEN $5::uuid ELSE clinic_id END,
         status = COALESCE($6, status),
         telefone = COALESCE($7, telefone),
         permissions = COALESCE($8, permissions),
         perfil_id = COALESCE($9, perfil_id),
         must_change_password = COALESCE($10, must_change_password),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.nome || b.name || null,
        role || null,
        clinicId !== undefined,
        clinicId ?? null,
        b.status || null,
        b.telefone !== undefined ? b.telefone : null,
        b.permissions !== undefined ? b.permissions : null,
        b.perfil_id || null,
        b.must_change_password !== undefined ? b.must_change_password : null,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });

    if (req.profile.role === "admin") {
      if (role && role !== "supervisor_plataforma") {
        await query(`DELETE FROM gestor_clinicas WHERE profile_id = $1`, [req.params.id]);
      } else if (Array.isArray(b.clinica_ids)) {
        await query(`DELETE FROM gestor_clinicas WHERE profile_id = $1`, [req.params.id]);
        for (const cid of b.clinica_ids) {
          if (!cid) continue;
          await query(
            `INSERT INTO gestor_clinicas (profile_id, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [req.params.id, cid]
          );
        }
      }
      if (role === "supervisor_plataforma") {
        await query(`UPDATE profiles SET clinic_id = NULL WHERE id = $1`, [req.params.id]);
        rows[0].clinic_id = null;
      }
    }

    if (b.email && (req.params.id === req.profile.id || req.profile.role === "admin")) {
      const newEmail = String(b.email).toLowerCase().trim();
      if (newEmail && newEmail !== rows[0].email) {
        const clash = await query(
          `SELECT id FROM users WHERE lower(email) = $1 AND id <> $2`,
          [newEmail, rows[0].user_id]
        );
        if (clash.rowCount) {
          return res.status(409).json({ error: "E-mail já em uso" });
        }
        await query(`UPDATE users SET email = $2, updated_at = now() WHERE id = $1`, [
          rows[0].user_id,
          newEmail,
        ]);
        await query(`UPDATE profiles SET email = $2 WHERE id = $1`, [req.params.id, newEmail]);
        rows[0].email = newEmail;
      }
    }

    if (b.password) {
      const hash = await bcrypt.hash(String(b.password), 10);
      await query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [
        rows[0].user_id,
        hash,
      ]);
    }

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

router.post("/perfis-acesso", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente Admin Master" });
    }
    const b = req.body || {};
    const nome = String(b.nome || "").trim();
    const baseRole = String(b.base_role || "").trim();
    if (nome.length < 2) return res.status(400).json({ error: "Informe o nome do perfil" });
    if (!baseRole) return res.status(400).json({ error: "Escolha o tipo de acesso" });

    const { rows } = await query(
      `INSERT INTO perfis_acesso (nome, descricao, base_role, abas, is_system, ordem)
       VALUES ($1, $2, $3, $4::text[], false, COALESCE((SELECT MAX(ordem) + 1 FROM perfis_acesso), 100))
       RETURNING *`,
      [nome, b.descricao || null, baseRole, b.abas || []]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/perfis-acesso/:id", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente Admin Master" });
    }
    const b = req.body || {};
    const { rows } = await query(
      `UPDATE perfis_acesso SET
         nome = COALESCE($2, nome),
         descricao = COALESCE($3, descricao),
         abas = COALESCE($4::text[], abas),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.nome ? String(b.nome).trim() : null,
        b.descricao !== undefined ? b.descricao : null,
        b.abas !== undefined ? b.abas : null,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/perfis-acesso/:id", async (req, res) => {
  try {
    if (req.profile.role !== "admin") {
      return res.status(403).json({ error: "Somente Admin Master" });
    }
    const reason = String(req.body?.reason || "Exclusão de perfil").trim();
    const existing = await query(`SELECT * FROM perfis_acesso WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Não encontrado" });
    if (existing.rows[0].is_system) {
      return res.status(400).json({ error: "Perfis pré-cadastrados não podem ser excluídos" });
    }
    const inUse = await query(`SELECT 1 FROM profiles WHERE perfil_id = $1 LIMIT 1`, [req.params.id]);
    if (inUse.rowCount) {
      return res.status(400).json({ error: "Perfil em uso por algum usuário" });
    }
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('delete', 'perfil', $1, $2, NULL, $3, $4::jsonb, $5, $6, $7, $8)`,
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
    await query(`DELETE FROM perfis_acesso WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
