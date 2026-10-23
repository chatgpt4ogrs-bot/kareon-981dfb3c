import pg from "pg";
import { readDbConfig } from "../config.js";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    const cfg = readDbConfig();
    if (!cfg) throw new Error("Banco ainda não configurado");
    pool = new Pool({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      ssl: cfg.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
    });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function resetPool() {
  return closePool();
}

export async function query(text, params) {
  return getPool().query(text, params);
}
