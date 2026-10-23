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

function fillTemplate(corpo, vars) {
  return corpo.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null && vars[key] !== "" ? String(vars[key]) : "____"
  );
}

function dataExtenso(d = new Date()) {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

router.get("/templates", async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM document_templates WHERE ativo = true ORDER BY tipo, nome`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    if (scope && scope.length === 0) return res.json([]);
    const params = [];
    const where = [];
    if (scope !== null) {
      params.push(scope);
      where.push(`d.unit_id = ANY($${params.length}::uuid[])`);
    }
    if (req.query.patient_id) {
      params.push(req.query.patient_id);
      where.push(`d.patient_id = $${params.length}`);
    }
    if (req.query.tipo) {
      params.push(req.query.tipo);
      where.push(`d.tipo = $${params.length}`);
    }
    const { rows } = await query(
      `SELECT d.*, p.nome AS patient_nome, pr.name AS created_by_nome
       FROM documents d
       JOIN pacientes p ON p.id = d.patient_id
       LEFT JOIN profiles pr ON pr.id = d.created_by
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY d.created_at DESC
       LIMIT 300`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.*, p.nome AS patient_nome, p.cpf AS patient_cpf,
              pr.name AS created_by_nome
       FROM documents d
       JOIN pacientes p ON p.id = d.patient_id
       LEFT JOIN profiles pr ON pr.id = d.created_by
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const unitId = b.unit_id || req.profile.clinic_id;
    if (!unitId || !b.patient_id || !b.tipo) {
      return res.status(400).json({ error: "Unidade, paciente e tipo obrigatórios" });
    }

    const patient = await query(`SELECT * FROM pacientes WHERE id = $1`, [b.patient_id]);
    if (!patient.rows[0]) return res.status(404).json({ error: "Paciente não encontrado" });

    const prof = await query(
      `SELECT pr.*, p.name AS nome FROM professionals pr
       JOIN profiles p ON p.id = pr.profile_id
       WHERE pr.profile_id = $1 LIMIT 1`,
      [b.professional_profile_id || req.profile.id]
    );

    let template = null;
    if (b.template_id) {
      const t = await query(`SELECT * FROM document_templates WHERE id = $1`, [b.template_id]);
      template = t.rows[0];
    } else {
      const t = await query(
        `SELECT * FROM document_templates WHERE tipo = $1 AND ativo = true ORDER BY created_at LIMIT 1`,
        [b.tipo]
      );
      template = t.rows[0];
    }

    const hoje = new Date();
    const vars = {
      paciente_nome: patient.rows[0].nome,
      paciente_doc: patient.rows[0].cpf || "não informado",
      data: hoje.toLocaleDateString("pt-BR"),
      data_extenso: dataExtenso(hoje),
      data_inicio: b.data_inicio || hoje.toLocaleDateString("pt-BR"),
      dias: b.dias || "1",
      cid: b.cid || "",
      cidade: b.cidade || "Local",
      profissional_nome: prof.rows[0]?.titulo
        ? `${prof.rows[0].titulo} ${prof.rows[0].nome}`
        : prof.rows[0]?.nome || req.profile.name,
      conselho: prof.rows[0]?.conselho || "",
      registro: prof.rows[0]?.registro_profissional || "",
      prescricao: b.prescricao || "",
      orientacoes: b.orientacoes || "",
      especialidade_destino: b.especialidade_destino || "",
      motivo: b.motivo || "",
      observacoes: b.observacoes || "",
      exames: b.exames || "",
      indicacao: b.indicacao || "",
      ...(b.vars || {}),
    };

    const titulo =
      b.titulo ||
      template?.nome ||
      ({
        atestado: "Atestado",
        receita: "Receita",
        encaminhamento: "Encaminhamento",
        pedido_exame: "Pedido de exame",
      }[b.tipo] || b.tipo);

    const conteudo = b.conteudo || (template ? fillTemplate(template.corpo, vars) : "");
    const numero = `DOC-${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, "0")}-${Math.floor(
      Math.random() * 9000 + 1000
    )}`;

    const { rows } = await query(
      `INSERT INTO documents (unit_id, patient_id, encounter_id, tipo, titulo, conteudo, numero, metadata, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'emitido') RETURNING *`,
      [
        unitId,
        b.patient_id,
        b.encounter_id || null,
        b.tipo,
        titulo,
        conteudo,
        numero,
        JSON.stringify({ vars, template_id: template?.id || null }),
        req.profile.id,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
