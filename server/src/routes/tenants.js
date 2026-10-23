import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured } from "../middleware/auth.js";

const router = Router();
router.use(requireConfigured, requireAuth);

function requireSuperadmin(req, res) {
  if (req.profile.role !== "admin") {
    res.status(403).json({ error: "Somente o Superadmin pode gerenciar tenants" });
    return false;
  }
  return true;
}

/** Lista clínicas como tenants com métricas */
router.get("/", async (req, res) => {
  if (!requireSuperadmin(req, res)) return;
  try {
    const { rows } = await query(
      `SELECT c.*,
         (SELECT COUNT(*)::int FROM pacientes p WHERE p.clinica_id = c.id) AS pacientes,
         (SELECT COUNT(*)::int FROM profiles pr WHERE pr.clinic_id = c.id AND pr.status = 'ativo') AS usuarios,
         (SELECT COUNT(*)::int FROM professionals pf
            JOIN profiles pr ON pr.id = pf.profile_id
            WHERE pr.clinic_id = c.id AND pf.ativo = true) AS profissionais,
         (SELECT COUNT(*)::int FROM appointments a
            WHERE a.unit_id = c.id AND a.inicio::date = CURRENT_DATE
              AND a.status NOT IN ('cancelado','faltou')) AS consultas_hoje
       FROM clinics c
       ORDER BY c.nome`
    );
    res.json(
      rows.map((r) => ({
        ...r,
        tenant_type: "clinica",
        active: (r.status || "ativa") === "ativa",
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Cria tenant (clínica) + admin da clínica */
router.post("/", async (req, res) => {
  if (!requireSuperadmin(req, res)) return;
  try {
    const b = req.body || {};
    const nome = String(b.nome || "").trim();
    if (nome.length < 2) return res.status(400).json({ error: "Nome da clínica obrigatório" });

    const adminName = String(b.admin_name || "Administrador").trim();
    const adminEmail = String(b.admin_email || "").trim().toLowerCase();
    const adminPassword = String(b.admin_password || "");
    if (!adminEmail || !adminPassword || adminPassword.length < 4) {
      return res.status(400).json({ error: "Informe e-mail e senha do administrador (mín. 4 caracteres)" });
    }

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: "Já existe um usuário com este e-mail" });
    }

    const clinic = await query(
      `INSERT INTO clinics (nome, cnpj, telefone, email, endereco, status)
       VALUES ($1,$2,$3,$4,$5,'ativa') RETURNING *`,
      [nome, b.cnpj || null, b.telefone || null, b.email || adminEmail, b.endereco || null]
    );

    const hash = await bcrypt.hash(adminPassword, 10);
    const user = await query(
      `INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id`,
      [adminEmail, hash]
    );
    const profile = await query(
      `INSERT INTO profiles (user_id, name, email, role, clinic_id, status, must_change_password, permissions)
       VALUES ($1,$2,$3,'clinica_admin',$4,'ativo',true,NULL) RETURNING *`,
      [user.rows[0].id, adminName, adminEmail, clinic.rows[0].id]
    );

    res.status(201).json({
      clinic: clinic.rows[0],
      admin: {
        id: profile.rows[0].id,
        email: adminEmail,
        name: adminName,
        must_change_password: true,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/status", async (req, res) => {
  if (!requireSuperadmin(req, res)) return;
  try {
    const active = !!req.body?.active;
    const { rows } = await query(
      `UPDATE clinics SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id, active ? "ativa" : "inativa"]
    );
    if (!rows[0]) return res.status(404).json({ error: "Tenant não encontrado" });
    res.json({ ...rows[0], active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  if (!requireSuperadmin(req, res)) return;
  try {
    const b = req.body || {};
    const { rows } = await query(
      `UPDATE clinics SET
         nome = COALESCE($2, nome),
         telefone = COALESCE($3, telefone),
         email = COALESCE($4, email),
         endereco = COALESCE($5, endereco),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, b.nome, b.telefone, b.email, b.endereco]
    );
    if (!rows[0]) return res.status(404).json({ error: "Tenant não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
