import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const CONFIG_PATH = path.join(DATA_DIR, "db-config.json");

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function isConfigured() {
  return fs.existsSync(CONFIG_PATH);
}

export function readDbConfig() {
  if (!isConfigured()) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

export function writeDbConfig(config) {
  ensureDataDir();
  const payload = {
    host: String(config.host || "").trim(),
    port: Number(config.port) || 5432,
    database: String(config.database || "kareon").trim() || "kareon",
    user: String(config.user || "").trim(),
    password: String(config.password ?? ""),
    ssl: Boolean(config.ssl),
    jwtSecret: config.jwtSecret || cryptoRandom(),
    configuredAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function cryptoRandom() {
  return randomBytes(32).toString("hex");
}

export { DATA_DIR, CONFIG_PATH };
