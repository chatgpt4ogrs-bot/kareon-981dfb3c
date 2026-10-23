import { Router } from "express";
import { isConfigured, writeDbConfig, readDbConfig } from "../config.js";
import { setupDatabase, testConnection } from "../db/migrate.js";
import { resetPool } from "../db/pool.js";

const router = Router();

router.get("/status", (_req, res) => {
  const configured = isConfigured();
  res.json({
    configured,
    hasAdminHint: configured,
  });
});

router.post("/test", async (req, res) => {
  try {
    const { host, port, user, password, ssl } = req.body || {};
    if (!host || !user) {
      return res.status(400).json({ error: "Informe IP/host e usuário do banco" });
    }
    await testConnection({
      host,
      port: Number(port) || 5432,
      user,
      password: password ?? "",
      ssl: Boolean(ssl),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Falha ao conectar no PostgreSQL" });
  }
});

router.post("/configure", async (req, res) => {
  try {
    if (isConfigured()) {
      return res.status(409).json({ error: "Sistema já configurado" });
    }

    const {
      host,
      port,
      database,
      user,
      password,
      ssl,
      adminEmail,
      adminPassword,
      adminName,
    } = req.body || {};

    if (!host || !user) {
      return res.status(400).json({ error: "IP/host e usuário são obrigatórios" });
    }

    const draft = {
      host: String(host).trim(),
      port: Number(port) || 5432,
      database: String(database || "kareon").trim() || "kareon",
      user: String(user).trim(),
      password: String(password ?? ""),
      ssl: Boolean(ssl),
    };

    await testConnection(draft);
    const result = await setupDatabase(draft, {
      adminEmail,
      adminPassword,
      adminName,
    });

    writeDbConfig(draft);
    await resetPool();

    res.json({
      ok: true,
      message: "Banco configurado e tabelas criadas com sucesso",
      adminEmail: result.adminEmail,
      defaultPasswordHint: adminPassword ? null : "Admin@123",
    });
  } catch (err) {
    console.error("[setup]", err);
    res.status(400).json({ error: err.message || "Falha na configuração" });
  }
});

router.get("/info", (_req, res) => {
  const cfg = readDbConfig();
  if (!cfg) return res.status(503).json({ error: "Não configurado" });
  res.json({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    configuredAt: cfg.configuredAt,
  });
});

export default router;
