import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireConfigured } from "../middleware/auth.js";

const router = Router();
router.use(requireConfigured, requireAuth);

const CLINICAL_ROLES = new Set([
  "admin",
  "supervisor_plataforma",
  "clinica_admin",
  "responsavel_clinica",
  "terapeuta",
]);

function assertClinical(req, res) {
  if (!CLINICAL_ROLES.has(req.profile.role)) {
    res.status(403).json({ error: "Sem permissão para acessar prontuário clínico" });
    return false;
  }
  return true;
}

router.get("/", async (req, res) => {
  if (!assertClinical(req, res)) return;
  try {
    const { patient_id, appointment_id } = req.query;
    const params = [];
    const where = [];
    if (patient_id) {
      params.push(patient_id);
      where.push(`e.patient_id = $${params.length}`);
    }
    if (appointment_id) {
      params.push(appointment_id);
      where.push(`e.appointment_id = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT e.*, p.nome AS patient_nome, pr.name AS professional_nome
       FROM encounters e
       JOIN pacientes p ON p.id = e.patient_id
       LEFT JOIN profiles pr ON pr.id = e.professional_profile_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY e.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  if (!assertClinical(req, res)) return;
  try {
    const { rows } = await query(
      `SELECT e.*, p.nome AS patient_nome, pr.name AS professional_nome
       FROM encounters e
       JOIN pacientes p ON p.id = e.patient_id
       LEFT JOIN profiles pr ON pr.id = e.professional_profile_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Atendimento não encontrado" });
    const addenda = await query(
      `SELECT * FROM clinical_addenda WHERE encounter_id = $1 ORDER BY created_at`,
      [req.params.id]
    );
    res.json({ ...rows[0], addenda: addenda.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  if (!assertClinical(req, res)) return;
  try {
    const b = req.body || {};
    const unitId = b.unit_id || req.profile.clinic_id;
    if (!unitId || !b.patient_id) {
      return res.status(400).json({ error: "Unidade e paciente obrigatórios" });
    }

    if (b.appointment_id) {
      const existing = await query(
        `SELECT id FROM encounters WHERE appointment_id = $1`,
        [b.appointment_id]
      );
      if (existing.rows[0]) {
        const full = await query(`SELECT * FROM encounters WHERE id = $1`, [existing.rows[0].id]);
        return res.json(full.rows[0]);
      }
      await query(
        `UPDATE appointments SET status = 'em_atendimento',
           atendimento_inicio_at = COALESCE(atendimento_inicio_at, now()),
           updated_at = now()
         WHERE id = $1`,
        [b.appointment_id]
      );
      await query(
        `UPDATE waiting_queue SET status = 'em_atendimento', updated_at = now()
         WHERE appointment_id = $1`,
        [b.appointment_id]
      );
    }

    const { rows } = await query(
      `INSERT INTO encounters (
         appointment_id, unit_id, patient_id, professional_profile_id, status,
         motivo_consulta, queixa_principal, anamnese, historico_medico, historico_familiar,
         alergias, medicamentos_uso, sinais_vitais, exame_fisico, avaliacao,
         hipoteses, diagnosticos, diagnostico_cid, conduta, plano_terapeutico,
         exames_solicitados, prescricoes, encaminhamentos, orientacoes, retorno_sugerido
       ) VALUES (
         $1,$2,$3,$4,COALESCE($5,'em_andamento'),
         $6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
       ) RETURNING *`,
      [
        b.appointment_id || null,
        unitId,
        b.patient_id,
        b.professional_profile_id || req.profile.id,
        b.status || "em_andamento",
        b.motivo_consulta || null,
        b.queixa_principal || null,
        b.anamnese || null,
        b.historico_medico || null,
        b.historico_familiar || null,
        b.alergias || null,
        b.medicamentos_uso || null,
        JSON.stringify(b.sinais_vitais || {}),
        b.exame_fisico || null,
        b.avaliacao || null,
        b.hipoteses || null,
        b.diagnosticos || null,
        b.diagnostico_cid || null,
        b.conduta || null,
        b.plano_terapeutico || null,
        b.exames_solicitados || null,
        b.prescricoes || null,
        b.encaminhamentos || null,
        b.orientacoes || null,
        b.retorno_sugerido || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  if (!assertClinical(req, res)) return;
  try {
    const current = await query(`SELECT * FROM encounters WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: "Não encontrado" });
    if (current.rows[0].status === "finalizado") {
      return res.status(400).json({
        error: "Atendimento finalizado. Use um adendo para correções.",
      });
    }

    const b = req.body || {};
    const { rows } = await query(
      `UPDATE encounters SET
         motivo_consulta = COALESCE($2, motivo_consulta),
         queixa_principal = COALESCE($3, queixa_principal),
         anamnese = COALESCE($4, anamnese),
         historico_medico = COALESCE($5, historico_medico),
         historico_familiar = COALESCE($6, historico_familiar),
         alergias = COALESCE($7, alergias),
         medicamentos_uso = COALESCE($8, medicamentos_uso),
         sinais_vitais = COALESCE($9::jsonb, sinais_vitais),
         exame_fisico = COALESCE($10, exame_fisico),
         avaliacao = COALESCE($11, avaliacao),
         hipoteses = COALESCE($12, hipoteses),
         diagnosticos = COALESCE($13, diagnosticos),
         diagnostico_cid = COALESCE($14, diagnostico_cid),
         conduta = COALESCE($15, conduta),
         plano_terapeutico = COALESCE($16, plano_terapeutico),
         exames_solicitados = COALESCE($17, exames_solicitados),
         prescricoes = COALESCE($18, prescricoes),
         encaminhamentos = COALESCE($19, encaminhamentos),
         orientacoes = COALESCE($20, orientacoes),
         retorno_sugerido = COALESCE($21, retorno_sugerido),
         status = COALESCE($22, status),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        b.motivo_consulta,
        b.queixa_principal,
        b.anamnese,
        b.historico_medico,
        b.historico_familiar,
        b.alergias,
        b.medicamentos_uso,
        b.sinais_vitais != null ? JSON.stringify(b.sinais_vitais) : null,
        b.exame_fisico,
        b.avaliacao,
        b.hipoteses,
        b.diagnosticos,
        b.diagnostico_cid,
        b.conduta,
        b.plano_terapeutico,
        b.exames_solicitados,
        b.prescricoes,
        b.encaminhamentos,
        b.orientacoes,
        b.retorno_sugerido,
        b.status,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/finalize", async (req, res) => {
  if (!assertClinical(req, res)) return;
  try {
    const current = await query(`SELECT * FROM encounters WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: "Não encontrado" });
    if (current.rows[0].status === "finalizado") {
      return res.status(400).json({ error: "Já finalizado" });
    }
    if (!current.rows[0].queixa_principal && !current.rows[0].motivo_consulta) {
      return res.status(400).json({ error: "Informe motivo ou queixa principal antes de finalizar" });
    }

    const { rows } = await query(
      `UPDATE encounters SET status = 'finalizado', finalized_at = now(), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (rows[0].appointment_id) {
      await query(
        `UPDATE appointments SET status = 'finalizado', atendimento_fim_at = now(), updated_at = now()
         WHERE id = $1`,
        [rows[0].appointment_id]
      );
      await query(
        `UPDATE waiting_queue SET status = 'finalizado', updated_at = now() WHERE appointment_id = $1`,
        [rows[0].appointment_id]
      );
      await query(
        `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, reason, changed_by)
         VALUES ($1,'em_atendimento','finalizado','Finalização do atendimento',$2)`,
        [rows[0].appointment_id, req.profile.id]
      );
    }

    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot, actor_id, actor_name, actor_email, actor_role)
       VALUES ('finalize','encounter',$1,$2,$3,'Finalização de prontuário',$4::jsonb,$5,$6,$7,$8)`,
      [
        rows[0].id,
        `Encounter ${rows[0].id}`,
        rows[0].unit_id,
        JSON.stringify({ id: rows[0].id, patient_id: rows[0].patient_id }),
        req.profile.id,
        req.profile.nome,
        req.profile.email,
        req.profile.role,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/addendum", async (req, res) => {
  if (!assertClinical(req, res)) return;
  try {
    const content = String(req.body?.content || "").trim();
    if (content.length < 3) return res.status(400).json({ error: "Conteúdo do adendo obrigatório" });
    const { rows } = await query(
      `INSERT INTO clinical_addenda (encounter_id, content, created_by) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, content, req.profile.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
