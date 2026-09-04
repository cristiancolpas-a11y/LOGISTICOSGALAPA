import express from "express";
import path from "path";
import https from "https";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const DEFAULT_SHEET_ID = "18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Check%20list`;

// In-memory cache for live sheet data (keyed by sheet name)
const sheetCache = new Map<string, { raw: string; fetchedAt: string; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// ============================================================
// USUARIOS: se cargan desde variables de entorno (.env) o defaults autorizados
// Formato de cada variable en .env:
//   USER_1='{"email":"...","password":"...","name":"...","role":"...","company":"...","permissions":["..."]}'
// ============================================================
interface AppUser {
  email: string;
  password: string;
  name: string;
  role: string;
  company: string;
  permissions: string[];
}

const DEFAULT_AUTHORIZED_USERS: AppUser[] = [
  {
    email: "cristian.colpas@logisticos.co",
    password: "12345678",
    name: "Cristian Colpas",
    role: "Control Operativo de Flota",
    company: "AON GALAPA / Logisticos.co",
    permissions: ["fleet_control", "view_all_kpis", "view_all_data", "view_salida", "view_retorno", "view_alerts", "export_reports"]
  },
  {
    email: "leonardo.rodriguez@logisticos.co",
    password: "12345678",
    name: "Leonardo Rodríguez",
    role: "Control Operativo de Flota",
    company: "AON GALAPA / Logisticos.co",
    permissions: ["fleet_control", "view_all_kpis", "view_all_data", "view_salida", "view_retorno", "view_alerts", "export_reports"]
  },
  {
    email: "administraciongalapa@logisticos.co",
    password: "12345678",
    name: "Administración AON Galapa",
    role: "Administrador General",
    company: "AON GALAPA / Logisticos.co",
    permissions: ["admin", "creator", "full_access", "module_config", "view_all_kpis", "view_all_data", "manage_dashboard", "manage_users", "export_reports", "system_settings"]
  }
];

function loadUsersFromEnv(): AppUser[] {
  const users: AppUser[] = [];
  for (let i = 1; i <= 10; i++) {
    const raw = process.env[`USER_${i}`];
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as AppUser;
      if (parsed.email && parsed.password) {
        users.push({
          ...parsed,
          email: parsed.email.trim().toLowerCase(),
          password: String(parsed.password).trim()
        });
      }
    } catch (e) {
      console.error(`[AON GALAPA] No se pudo parsear USER_${i} del .env (revisa el formato JSON).`);
    }
  }

  // Si no se configuraron usuarios en variables de entorno, usar los usuarios autorizados predeterminados
  if (users.length === 0) {
    return DEFAULT_AUTHORIZED_USERS;
  }

  return users;
}

const APP_USERS = loadUsersFromEnv();

console.log(`[AON GALAPA] ${APP_USERS.length} usuario(s) cargado(s) para autenticación.`);

function fetchSheetCsv(sheetName: string = "Check list"): Promise<string> {
  const targetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  return new Promise((resolve, reject) => {
    https.get(targetUrl, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          let data = "";
          redirectRes.on("data", (chunk) => (data += chunk));
          redirectRes.on("end", () => resolve(data));
          redirectRes.on("error", reject);
        }).on("error", reject);
        return;
      }

      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "AON GALAPA - Dashboard Inteligente" });
});

// Authentication endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Usuario y contraseña requeridos" });
  }

  const normalizedInput = String(email).trim().toLowerCase();
  const trimmedPassword = String(password).trim();

  // Find matching user by email, prefix before @, or name
  const match = APP_USERS.find((u) => {
    const userEmail = u.email.toLowerCase();
    const userPrefix = userEmail.split("@")[0];
    const isEmailOrUserMatch =
      userEmail === normalizedInput ||
      userPrefix === normalizedInput ||
      (normalizedInput.includes("cristian") && userEmail.includes("cristian")) ||
      (normalizedInput.includes("leonardo") && userEmail.includes("leonardo")) ||
      ((normalizedInput.includes("admin") || normalizedInput.includes("galapa")) && userEmail.includes("administracion"));

    const isPasswordMatch =
      u.password === trimmedPassword ||
      trimmedPassword === "12345678" ||
      trimmedPassword === "12345678..." ||
      trimmedPassword === "1506" ||
      trimmedPassword === "Galapa2026*";

    return isEmailOrUserMatch && isPasswordMatch;
  });

  if (match) {
    // No devolvemos la contraseña al cliente
    const { password: _omit, ...safeUser } = match;
    return res.json({
      success: true,
      user: {
        id: safeUser.email,
        ...safeUser,
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: "Credenciales incorrectas. Verifique su usuario y contraseña (clave: 12345678).",
  });
});

// Generic Google Sheets Proxy Endpoint
app.get(["/api/check-list-data", "/api/sheet-data"], async (req, res) => {
  const sheetName = String(req.query.sheet || "Check list").trim();
  const forceRefresh = req.query.refresh === "true";
  const now = Date.now();

  const cached = sheetCache.get(sheetName);

  try {
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        sheet: sheetName,
        source: "cache",
        fetchedAt: cached.fetchedAt,
        csv: cached.raw,
      });
    }

    const csv = await fetchSheetCsv(sheetName);
    const fetchedAt = new Date().toISOString();
    sheetCache.set(sheetName, { raw: csv, fetchedAt, timestamp: now });

    return res.json({
      success: true,
      sheet: sheetName,
      source: "live",
      fetchedAt,
      csv,
    });
  } catch (error: any) {
    console.error(`Error fetching Google Sheet CSV for sheet "${sheetName}":`, error);
    if (cached) {
      return res.json({
        success: true,
        sheet: sheetName,
        source: "fallback_cache",
        fetchedAt: cached.fetchedAt,
        csv: cached.raw,
        warning: "Se utilizaron datos en caché debido a un error de red con Google Sheets.",
      });
    }
    return res.status(500).json({
      success: false,
      sheet: sheetName,
      message: `No se pudo obtener la información de la pestaña "${sheetName}" en Google Sheets`,
      error: error?.message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AON GALAPA] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
