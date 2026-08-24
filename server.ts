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

// In-memory cache for live sheet data
let cachedCsvData: { raw: string; fetchedAt: string } | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// ============================================================
// USUARIOS: se cargan desde variables de entorno (.env)
// Formato de cada variable en .env:
//   USER_1='{"email":"...","password":"...","name":"...","role":"...","company":"...","permissions":["..."]}'
// Se admiten hasta 10 usuarios (USER_1 a USER_10).
// ============================================================
interface AppUser {
  email: string;
  password: string;
  name: string;
  role: string;
  company: string;
  permissions: string[];
}

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
  return users;
}

const APP_USERS = loadUsersFromEnv();

if (APP_USERS.length === 0) {
  console.warn(
    "[AON GALAPA] AVISO DE CONFIGURACIÓN: No se detectaron usuarios en las variables de entorno USER_1..USER_10. Configure .env con los usuarios autorizados."
  );
} else {
  console.log(`[AON GALAPA] ${APP_USERS.length} usuario(s) cargado(s) desde variables de entorno.`);
}

function fetchSheetCsv(): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(GOOGLE_SHEET_CSV_URL, (res) => {
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
    return res.status(400).json({ success: false, message: "Email y contraseña requeridos" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedPassword = String(password).trim();

  // Find matching user by email and password
  const match = APP_USERS.find(
    (u) => u.email === normalizedEmail && u.password === trimmedPassword
  );

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
    message: "Credenciales incorrectas. Verifique su usuario y contraseña.",
  });
});

// Google Sheets Proxy Endpoint
app.get("/api/check-list-data", async (req, res) => {
  const forceRefresh = req.query.refresh === "true";
  const now = Date.now();

  try {
    if (!forceRefresh && cachedCsvData && (now - lastFetchTime < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        source: "cache",
        fetchedAt: cachedCsvData.fetchedAt,
        csv: cachedCsvData.raw,
      });
    }

    const csv = await fetchSheetCsv();
    const fetchedAt = new Date().toISOString();
    cachedCsvData = { raw: csv, fetchedAt };
    lastFetchTime = now;

    return res.json({
      success: true,
      source: "live",
      fetchedAt,
      csv,
    });
  } catch (error: any) {
    console.error("Error fetching Google Sheet CSV:", error);
    if (cachedCsvData) {
      return res.json({
        success: true,
        source: "fallback_cache",
        fetchedAt: cachedCsvData.fetchedAt,
        csv: cachedCsvData.raw,
        warning: "Se utilizaron datos en caché debido a un error de red con Google Sheets.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "No se pudo obtener la información de Google Sheets",
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
