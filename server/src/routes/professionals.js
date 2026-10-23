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
    const { specialty_id, area } = req.query;

    const params = [];
    const where = [`pr.ativo = true`, `p.status = 'ativo'`];

    if (scope !== null) {
      if (scope.length === 0) return res.json([]);
      params.push(scope);
      where.push(
        `(p.clinic_id = ANY($${params.length}::uuid[]) OR EXISTS (
           SELECT 1 FROM professional_units pu
           WHERE pu.professional_id = pr.id AND pu.unit_id = ANY($${params.length}::uuid[])
         ))`
      );
    }
    if (specialty_id) {
      params.push(specialty_id);
      where.push(
        `(pr.specialty_id = $${params.length} OR EXISTS (
           SELECT 1 FROM professional_specialties ps
           WHERE ps.professional_id = pr.id AND ps.specialty_id = $${params.length}
         ))`
      );
    }
    if (area) {
      params.push(area);
      where.push(
        `EXISTS (
           SELECT 1 FROM specialties s
           LEFT JOIN professional_specialties ps ON ps.specialty_id = s.id
           WHERE s.area = $${params.length}
             AND (s.id = pr.specialty_id OR ps.professional_id = pr.id)
         )`
      );
    }

    const { rows } = await query(
      `SELECT pr.*,
              p.name AS nome, p.email, p.telefone, p.clinic_id, p.role,
              s.nome AS specialty_nome, s.area AS specialty_area,
              COALESCE(
                (SELECT json_agg(json_build_object(
                   'id', sp.id, 'nome', sp.nome, 'area', sp.area, 'principal', ps.principal
                 ) ORDER BY ps.principal DESC, sp.nome)
                 FROM professional_specialties ps
                 JOIN specialties sp ON sp.id = ps.specialty_id
                 WHERE ps.professional_id = pr.id),
                '[]'::json
              ) AS specialties
       FROM professionals pr
       JOIN profiles p ON p.id = pr.profile_id
       LEFT JOIN specialties s ON s.id = pr.specialty_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.profile_id) return res.status(400).json({ error: "profile_id obrigatório" });

    const { rows } = await query(
      `INSERT INTO professionals (profile_id, specialty_id, registro_profissional, conselho, titulo, duracao_padrao_minutos, bio)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,30),$7)
       ON CONFLICT (profile_id) DO UPDATE SET
         specialty_id = COALESCE(EXCLUDED.specialty_id, professionals.specialty_id),
         registro_profissional = COALESCE(EXCLUDED.registro_profissional, professionals.registro_profissional),
         conselho = COALESCE(EXCLUDED.conselho, professionals.conselho),
         titulo = COALESCE(EXCLUDED.titulo, professionals.titulo),
         duracao_padrao_minutos = COALESCE(EXCLUDED.duracao_padrao_minutos, professionals.duracao_padrao_minutos),
         bio = COALESCE(EXCLUDED.bio, professionals.bio),
         updated_at = now()
       RETURNING *`,
      [
        b.profile_id,
        b.specialty_id || null,
        b.registro_profissional || null,
        b.conselho || null,
        b.titulo || null,
        b.duracao_padrao_minutos,
        b.bio || null,
      ]
    );

    const specialtyIds = Array.isArray(b.specialty_ids)
      ? b.specialty_ids
      : b.specialty_id
      ? [b.specialty_id]
      : [];

    if (specialtyIds.length) {
      await query(`DELETE FROM professional_specialties WHERE professional_id = $1`, [rows[0].id]);
      for (let i = 0; i < specialtyIds.length; i++) {
        await query(
          `INSERT INTO professional_specialties (professional_id, specialty_id, principal)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [rows[0].id, specialtyIds[i], i === 0]
        );
      }
      if (!rows[0].specialty_id) {
        await query(`UPDATE professionals SET specialty_id = $2 WHERE id = $1`, [
          rows[0].id,
          specialtyIds[0],
        ]);
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const { rows } = await query(
      `UPDATE professionals SET
         specialty_id = COALESCE($2, specialty_id),
         registro_profissional = COALESCE($3, registro_profissional),
         conselho = COALESCE($4, conselho),
         titulo = COALESCE($5, titulo),
         duracao_padrao_minutos = COALESCE($6, duracao_padrao_minutos),
         bio = COALESCE($7, bio),
         ativo = COALESCE($8, ativo),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.specialty_id,
        b.registro_profissional,
        b.conselho,
        b.titulo,
        b.duracao_padrao_minutos,
        b.bio,
        b.ativo,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });

    if (Array.isArray(b.specialty_ids)) {
      await query(`DELETE FROM professional_specialties WHERE professional_id = $1`, [req.params.id]);
      for (let i = 0; i < b.specialty_ids.length; i++) {
        await query(
          `INSERT INTO professional_specialties (professional_id, specialty_id, principal)
           VALUES ($1,$2,$3)`,
          [req.params.id, b.specialty_ids[i], i === 0]
        );
      }
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
