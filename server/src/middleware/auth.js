import jwt from "jsonwebtoken";
import { readDbConfig } from "../config.js";
import { query } from "../db/pool.js";

export function requireConfigured(req, res, next) {
  if (!readDbConfig()) {
    return res.status(503).json({ error: "Sistema não configurado", code: "NOT_CONFIGURED" });
  }
  next();
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    const cfg = readDbConfig();
    const payload = jwt.verify(token, cfg.jwtSecret);
    const { rows } = await query(
      `SELECT p.*, u.email AS user_email
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [payload.sub]
    );
    if (!rows[0]) return res.status(401).json({ error: "Perfil não encontrado" });

    const profile = mapProfile(rows[0]);

    // Contexto de tenant: Superadmin/Gestor opera dentro de uma clínica
    const headerClinic = String(
      req.headers["x-clinic-id"] || req.headers["x-unit-id"] || ""
    ).trim();
    if (headerClinic) {
      if (profile.role === "admin") {
        profile.active_clinic_id = headerClinic;
      } else if (profile.role === "supervisor_plataforma") {
        const link = await query(
          `SELECT 1 FROM gestor_clinicas WHERE profile_id = $1 AND clinic_id = $2`,
          [profile.id, headerClinic]
        );
        if (link.rowCount === 0) {
          return res.status(403).json({ error: "Sem acesso a esta clínica" });
        }
        profile.active_clinic_id = headerClinic;
      } else if (profile.clinic_id && profile.clinic_id !== headerClinic) {
        return res.status(403).json({ error: "Clínica diferente do seu vínculo" });
      } else if (profile.clinic_id) {
        profile.active_clinic_id = profile.clinic_id;
      }
    } else if (profile.clinic_id && profile.role !== "admin") {
      profile.active_clinic_id = profile.clinic_id;
    }

    req.user = { id: payload.sub, email: rows[0].user_email };
    req.profile = profile;
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada" });
  }
}

export function mapProfile(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    nome: row.name,
    name: row.name,
    email: row.email,
    role: row.role,
    cargo: row.role,
    clinica_id: row.clinic_id,
    clinic_id: row.clinic_id,
    status: row.status,
    telefone: row.telefone,
    avatar_url: row.avatar_url,
    must_change_password: row.must_change_password,
    permissions: row.permissions,
    perfil_id: row.perfil_id,
  };
}

export function signToken(userId) {
  const cfg = readDbConfig();
  return jwt.sign({ sub: userId }, cfg.jwtSecret, { expiresIn: "12h" });
}
