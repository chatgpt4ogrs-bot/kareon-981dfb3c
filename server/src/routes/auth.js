import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured, mapProfile, signToken } from "../middleware/auth.js";

const router = Router();

router.post("/login", requireConfigured, async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }

    const { rows } = await query(
      `SELECT u.id AS user_id, u.password_hash, p.*
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE lower(u.email) = $1`,
      [email]
    );
    if (!rows[0]) return res.status(401).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

    const token = signToken(rows[0].user_id);
    const profile = mapProfile(rows[0]);

    let gestorClinicIds = [];
    if (profile.role === "supervisor_plataforma") {
      const links = await query(
        `SELECT clinic_id FROM gestor_clinicas WHERE profile_id = $1`,
        [profile.id]
      );
      gestorClinicIds = links.rows.map((r) => r.clinic_id);
    }

    res.json({ token, user: { id: rows[0].user_id, email }, profile, gestorClinicIds });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/register", requireConfigured, async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const password = String(req.body?.password || "");
    const nome = String(req.body?.nome || "").trim();
    const telefone = req.body?.telefone || null;

    if (!email || !password || !nome) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
    }

    const exists = await query(`SELECT id FROM users WHERE lower(email) = $1`, [email]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    const hash = await bcrypt.hash(password, 10);
    const userRes = await query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [email, hash]
    );
    const profileRes = await query(
      `INSERT INTO profiles (user_id, name, email, role, status, telefone, must_change_password)
       VALUES ($1, $2, $3, 'terapeuta', 'pendente', $4, false)
       RETURNING *`,
      [userRes.rows[0].id, nome, email, telefone]
    );

    const token = signToken(userRes.rows[0].id);
    res.status(201).json({
      token,
      user: { id: userRes.rows[0].id, email },
      profile: mapProfile(profileRes.rows[0]),
      gestorClinicIds: [],
    });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", requireConfigured, requireAuth, async (req, res) => {
  let gestorClinicIds = [];
  if (req.profile.role === "supervisor_plataforma") {
    const links = await query(
      `SELECT clinic_id FROM gestor_clinicas WHERE profile_id = $1`,
      [req.profile.id]
    );
    gestorClinicIds = links.rows.map((r) => r.clinic_id);
  }
  res.json({ user: req.user, profile: req.profile, gestorClinicIds });
});

router.post("/change-password", requireConfigured, requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "Nova senha deve ter ao menos 6 caracteres" });
    }

    const { rows } = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (currentPassword) {
      const ok = await bcrypt.compare(String(currentPassword), rows[0].password_hash);
      if (!ok) return res.status(400).json({ error: "Senha atual incorreta" });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      hash,
      req.user.id,
    ]);
    await query(
      `UPDATE profiles SET must_change_password = false, updated_at = now() WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/verify-password", requireConfigured, requireAuth, async (req, res) => {
  const password = String(req.body?.password || "");
  const { rows } = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "Senha incorreta" });
  res.json({ ok: true });
});

export default router;
