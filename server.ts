import express from "express";
import path from "path";
import https from "https";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

const GOOGLE_SHEET_ID = "18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk";
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk/gviz/tq?tqx=out:csv&sheet=Check%20list`;

// In-memory cache for live sheet data
let cachedCsvData: { raw: string; fetchedAt: string } | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

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
  
  // Verify administrator credentials
  if (normalizedEmail === "cristian.colpas@logisticos.co" && password === "Logisticos2026") {
    return res.json({
      success: true,
      user: {
        id: "admin-01",
        email: "cristian.colpas@logisticos.co",
        name: "Cristian Colpas",
        role: "Administrador & Creador",
        company: "AON GALAPA / Logisticos.co",
        permissions: [
          "admin",
          "creator",
          "full_access",
          "module_config",
          "view_all_kpis",
          "view_all_data",
          "manage_dashboard"
        ]
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: "Credenciales incorrectas. Verifique su usuario y contraseña."
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
        csv: cachedCsvData.raw
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
      csv
    });
  } catch (error: any) {
    console.error("Error fetching Google Sheet CSV:", error);
    if (cachedCsvData) {
      return res.json({
        success: true,
        source: "fallback_cache",
        fetchedAt: cachedCsvData.fetchedAt,
        csv: cachedCsvData.raw,
        warning: "Se utilizaron datos en caché debido a un error de red con Google Sheets."
      });
    }
    return res.status(500).json({
      success: false,
      message: "No se pudo obtener la información de Google Sheets",
      error: error?.message
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
