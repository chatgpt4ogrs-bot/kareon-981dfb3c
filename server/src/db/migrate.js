import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Conecta no Postgres, cria o database se não existir, aplica schema e admin inicial.
 */
export async function setupDatabase(config, { adminEmail, adminPassword, adminName } = {}) {
  const adminClient = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: "postgres",
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  await adminClient.connect();
  try {
    const dbName = config.database.replace(/[^a-zA-Z0-9_]/g, "_");
    const exists = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (exists.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await adminClient.end();
  }

  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  try {
    await applySchemas(client);

    const email = (adminEmail || "admin@kareon.local").toLowerCase().trim();
    const password = adminPassword || "Admin@123";
    const name = adminName || "Admin Master";

    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(password, 10);
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [email, hash]
      );
      await client.query(
        `INSERT INTO profiles (user_id, name, email, role, status, must_change_password, permissions, perfil_id)
         VALUES ($1, $2, $3, 'admin', 'ativo', true, NULL, 'a0000000-0000-4000-8000-000000000001')`,
        [userRes.rows[0].id, name, email]
      );
    }

    return { adminEmail: email, mustChangePassword: true };
  } finally {
    await client.end();
  }
}

async function applySchemas(client) {
  const base = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const v2 = fs.readFileSync(path.join(__dirname, "schema-clinic-v2.sql"), "utf8");
  const v3 = fs.readFileSync(path.join(__dirname, "schema-multispecialty.sql"), "utf8");
  const v4 = fs.readFileSync(path.join(__dirname, "schema-clinic-v4.sql"), "utf8");
  const podologia = fs.readFileSync(path.join(__dirname, "schema-podologia.sql"), "utf8");
  await client.query(base);
  await client.query(v2);
  await client.query(v3);
  await client.query(v4);
  await client.query(podologia);
}

/** Reaplica schemas em banco já configurado (startup). */
export async function ensureMigrations(config) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    await applySchemas(client);
  } finally {
    await client.end();
  }
}

export async function testConnection(config) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: "postgres",
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  await client.query("SELECT 1");
  await client.end();
  return true;
}
