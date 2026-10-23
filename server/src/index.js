import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { isConfigured, ensureDataDir, readDbConfig } from "./config.js";
import { ensureMigrations } from "./db/migrate.js";
import setupRoutes from "./routes/setup.js";
import authRoutes from "./routes/auth.js";
import pacientesRoutes from "./routes/pacientes.js";
import atendimentosRoutes from "./routes/atendimentos.js";
import clinicsRoutes from "./routes/clinics.js";
import eventosRoutes from "./routes/eventos.js";
import resourcesRoutes from "./routes/resources.js";
import appointmentsRoutes from "./routes/appointments.js";
import waitingRoutes from "./routes/waiting.js";
import encountersRoutes from "./routes/encounters.js";
import roomsRoutes from "./routes/rooms.js";
import specialtiesRoutes from "./routes/specialties.js";
import professionalsRoutes from "./routes/professionals.js";
import servicesRoutes from "./routes/services.js";
import insuranceRoutes from "./routes/insurance.js";
import financeRoutes from "./routes/finance.js";
import documentsRoutes from "./routes/documents.js";
import waitlistRoutes from "./routes/waitlist.js";
import schedulesRoutes from "./routes/schedules.js";
import tenantsRoutes from "./routes/tenants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

ensureDataDir();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: isConfigured(),
    service: "kareon-clinic-os",
  });
});

app.use("/api/setup", setupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/atendimentos", atendimentosRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/waiting", waitingRoutes);
app.use("/api/encounters", encountersRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/specialties", specialtiesRoutes);
app.use("/api/professionals", professionalsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/insurance", insuranceRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/tenants", tenantsRoutes);
app.use("/api/clinics", clinicsRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api", resourcesRoutes);

const distPath = path.resolve(__dirname, "../../dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) next();
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Erro interno" });
});

async function boot() {
  if (isConfigured()) {
    try {
      await ensureMigrations(readDbConfig());
      console.log("  Schema PostgreSQL atualizado (v4 finance-docs-ops)");
    } catch (err) {
      console.error("  Falha ao aplicar migrations:", err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`\n  Kareon Clinic OS API em http://localhost:${PORT}`);
    console.log(
      isConfigured()
        ? "  Banco: configurado\n"
        : "  Banco: NÃO configurado — informe IP, porta, usuário e senha do PostgreSQL\n"
    );
  });
}

boot();
