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

async function ensureDefaultAccount(unitId) {
  const existing = await query(
    `SELECT id FROM financial_accounts WHERE unit_id = $1 AND ativo = true LIMIT 1`,
    [unitId]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const { rows } = await query(
    `INSERT INTO financial_accounts (unit_id, nome, tipo) VALUES ($1,'Caixa principal','caixa') RETURNING id`,
    [unitId]
  );
  return rows[0].id;
}

function nextNumero() {
  const d = new Date();
  return `NF-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function nextRecibo() {
  return `RC-${Date.now().toString(36).toUpperCase()}`;
}

router.get("/dashboard", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    if (scope && scope.length === 0) {
      return res.json({ abertas: 0, pagas_hoje: 0, valor_aberto: 0, valor_hoje: 0 });
    }
    const params = [];
    let unitFilter = "";
    if (scope !== null) {
      params.push(scope);
      unitFilter = ` AND unit_id = ANY($${params.length}::uuid[])`;
    }
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('aberta','parcial'))::int AS abertas,
         COALESCE(SUM(valor_final) FILTER (WHERE status IN ('aberta','parcial')),0)::float AS valor_aberto,
         COUNT(*) FILTER (WHERE status = 'paga' AND updated_at::date = CURRENT_DATE)::int AS pagas_hoje
       FROM invoices WHERE 1=1 ${unitFilter}`,
      params
    );
    const payParams = [...params];
    const payFilter = unitFilter;
    const pay = await query(
      `SELECT COALESCE(SUM(valor),0)::float AS valor_hoje
       FROM payments WHERE pago_em::date = CURRENT_DATE ${payFilter}`,
      payParams
    );
    res.json({ ...rows[0], valor_hoje: pay.rows[0].valor_hoje });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/invoices", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    if (scope && scope.length === 0) return res.json([]);
    const params = [];
    const where = [];
    if (scope !== null) {
      params.push(scope);
      where.push(`i.unit_id = ANY($${params.length}::uuid[])`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`i.status = $${params.length}`);
    }
    if (req.query.patient_id) {
      params.push(req.query.patient_id);
      where.push(`i.patient_id = $${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      where.push(`i.competencia >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      where.push(`i.competencia <= $${params.length}`);
    }
    const { rows } = await query(
      `SELECT i.*,
              p.nome AS patient_nome,
              s.nome AS service_nome,
              ins.nome AS insurance_nome,
              COALESCE((SELECT SUM(valor) FROM payments pay WHERE pay.invoice_id = i.id),0)::float AS pago_total
       FROM invoices i
       JOIN pacientes p ON p.id = i.patient_id
       LEFT JOIN services s ON s.id = i.service_id
       LEFT JOIN insurance_plans ins ON ins.id = i.insurance_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY i.created_at DESC
       LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const b = req.body || {};
    const unitId = b.unit_id || req.profile.clinic_id;
    if (!unitId || !b.patient_id || !b.descricao) {
      return res.status(400).json({ error: "Unidade, paciente e descrição obrigatórios" });
    }
    const valor = Number(b.valor) || 0;
    const desconto = Number(b.desconto) || 0;
    const valorFinal = Math.max(0, valor - desconto);
    const { rows } = await query(
      `INSERT INTO invoices (
         unit_id, patient_id, appointment_id, encounter_id, service_id, insurance_id,
         numero, descricao, valor, desconto, valor_final, tipo_pagamento, status, vencimento, competencia, observacoes, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,'particular'),'aberta',$13,COALESCE($14,CURRENT_DATE),$15,$16)
       RETURNING *`,
      [
        unitId,
        b.patient_id,
        b.appointment_id || null,
        b.encounter_id || null,
        b.service_id || null,
        b.insurance_id || null,
        b.numero || nextNumero(),
        b.descricao,
        valor,
        desconto,
        valorFinal,
        b.tipo_pagamento,
        b.vencimento || null,
        b.competencia || null,
        b.observacoes || null,
        req.profile.id,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/invoices/:id/pay", async (req, res) => {
  try {
    const b = req.body || {};
    const inv = await query(`SELECT * FROM invoices WHERE id = $1`, [req.params.id]);
    if (!inv.rows[0]) return res.status(404).json({ error: "Conta não encontrada" });
    if (inv.rows[0].status === "cancelada") {
      return res.status(400).json({ error: "Conta cancelada" });
    }
    const pago = await query(
      `SELECT COALESCE(SUM(valor),0)::float AS total FROM payments WHERE invoice_id = $1`,
      [req.params.id]
    );
    const restante = Number(inv.rows[0].valor_final) - Number(pago.rows[0].total);
    const valor = Number(b.valor);
    if (!valor || valor <= 0) return res.status(400).json({ error: "Valor inválido" });
    if (valor > restante + 0.009) {
      return res.status(400).json({ error: `Valor excede o restante (${restante.toFixed(2)})` });
    }

    const accountId = b.account_id || (await ensureDefaultAccount(inv.rows[0].unit_id));
    const recibo = nextRecibo();
    const { rows: payRows } = await query(
      `INSERT INTO payments (invoice_id, unit_id, account_id, valor, forma, recibo_numero, observacoes, created_by)
       VALUES ($1,$2,$3,$4,COALESCE($5,'dinheiro'),$6,$7,$8) RETURNING *`,
      [
        req.params.id,
        inv.rows[0].unit_id,
        accountId,
        valor,
        b.forma,
        recibo,
        b.observacoes || null,
        req.profile.id,
      ]
    );

    const novoPago = Number(pago.rows[0].total) + valor;
    const status =
      novoPago >= Number(inv.rows[0].valor_final) - 0.009 ? "paga" : "parcial";
    await query(
      `UPDATE invoices SET status = $2, updated_at = now() WHERE id = $1`,
      [req.params.id, status]
    );
    if (inv.rows[0].appointment_id && status === "paga") {
      await query(`UPDATE appointments SET pago = true WHERE id = $1`, [
        inv.rows[0].appointment_id,
      ]);
    }

    res.status(201).json({ payment: payRows[0], status, recibo_numero: recibo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const gids = await gestorIds(req);
    const scope = clinicScope(req.profile, gids);
    if (scope && scope.length === 0) return res.json([]);
    const params = [];
    const where = [];
    if (scope !== null) {
      params.push(scope);
      where.push(`pay.unit_id = ANY($${params.length}::uuid[])`);
    }
    if (req.query.date) {
      params.push(req.query.date);
      where.push(`pay.pago_em::date = $${params.length}::date`);
    }
    const { rows } = await query(
      `SELECT pay.*, i.numero AS invoice_numero, i.descricao, p.nome AS patient_nome
       FROM payments pay
       JOIN invoices i ON i.id = pay.invoice_id
       JOIN pacientes p ON p.id = i.patient_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY pay.pago_em DESC
       LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/cash-close", async (req, res) => {
  try {
    const unitId = req.body?.unit_id || req.profile.clinic_id;
    if (!unitId) return res.status(400).json({ error: "Unidade obrigatória" });
    const dataRef = req.body?.data_ref || new Date().toISOString().slice(0, 10);
    const accountId = req.body?.account_id || (await ensureDefaultAccount(unitId));

    const detalhes = await query(
      `SELECT forma, SUM(valor)::float AS total, COUNT(*)::int AS qtd
       FROM payments WHERE unit_id = $1 AND pago_em::date = $2::date
       GROUP BY forma ORDER BY forma`,
      [unitId, dataRef]
    );
    const total = detalhes.rows.reduce((s, r) => s + Number(r.total), 0);

    const { rows } = await query(
      `INSERT INTO cash_closures (unit_id, account_id, data_ref, total_entradas, total_saidas, saldo, detalhes, closed_by)
       VALUES ($1,$2,$3::date,$4,0,$4,$5::jsonb,$6)
       ON CONFLICT (unit_id, data_ref, account_id) DO UPDATE SET
         total_entradas = EXCLUDED.total_entradas,
         saldo = EXCLUDED.saldo,
         detalhes = EXCLUDED.detalhes,
         closed_by = EXCLUDED.closed_by,
         closed_at = now()
       RETURNING *`,
      [unitId, accountId, dataRef, total, JSON.stringify(detalhes.rows), req.profile.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/invoices/:id/cancel", async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE invoices SET status = 'cancelada', updated_at = now() WHERE id = $1 AND status <> 'paga' RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(400).json({ error: "Não foi possível cancelar" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
