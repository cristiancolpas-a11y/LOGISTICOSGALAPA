import express from "express";
import path from "path";
import https from "https";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Static uploads directory for images and evidence files
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

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
//   o simplemente una clave en texto plano (ej. USER_1='superman10.', USER_2='Batman1506.', USER_3='1718')
// ============================================================
interface AppUser {
  email: string;
  passwords: string[];
  name: string;
  role: string;
  company: string;
  permissions: string[];
}

const DEFAULT_AUTHORIZED_USERS: AppUser[] = [
  {
    email: "cristian.colpas@logisticos.co",
    passwords: ["12345678", "12345678...", "Batman1506.", "1506", "Galapa2026*"],
    name: "Cristian Colpas",
    role: "Control Operativo de Flota",
    company: "AON GALAPA / Logisticos.co",
    permissions: ["fleet_control", "view_all_kpis", "view_all_data", "view_salida", "view_retorno", "view_alerts", "export_reports"]
  },
  {
    email: "leonardo.rodriguez@logisticos.co",
    passwords: ["12345678", "12345678...", "1718", "1506", "Galapa2026*"],
    name: "Leonardo Rodríguez",
    role: "Control Operativo de Flota",
    company: "AON GALAPA / Logisticos.co",
    permissions: ["fleet_control", "view_all_kpis", "view_all_data", "view_salida", "view_retorno", "view_alerts", "export_reports"]
  },
  {
    email: "administraciongalapa@logisticos.co",
    passwords: ["12345678", "12345678...", "superman10.", "1506", "Galapa2026*"],
    name: "Administración AON Galapa",
    role: "Administrador General",
    company: "AON GALAPA / Logisticos.co",
    permissions: ["admin", "creator", "full_access", "module_config", "view_all_kpis", "view_all_data", "manage_dashboard", "manage_users", "export_reports", "system_settings"]
  }
];

function loadUsersFromEnv(): AppUser[] {
  // Base users clonados
  const users: AppUser[] = DEFAULT_AUTHORIZED_USERS.map((u) => ({
    ...u,
    passwords: [...u.passwords]
  }));

  // Extraer valores crudos de USER_1, USER_2, USER_3
  const envUser1 = process.env.USER_1?.trim();
  const envUser2 = process.env.USER_2?.trim();
  const envUser3 = process.env.USER_3?.trim();

  // Si USER_1, USER_2 o USER_3 son texto plano (ej. 'superman10.', 'Batman1506.', '1718'), agregarlos a las contraseñas válidas
  if (envUser1) {
    try {
      if (envUser1.startsWith("{")) {
        const parsed = JSON.parse(envUser1);
        if (parsed.email && parsed.password) {
          const existing = users.find(u => u.email.toLowerCase() === parsed.email.toLowerCase());
          if (existing) {
            existing.passwords.unshift(String(parsed.password).trim());
          } else {
            users.push({ ...parsed, passwords: [String(parsed.password).trim()] });
          }
        }
      } else {
        // Asignar al admin (USER_1 en .env.example)
        const adminUser = users.find(u => u.email.includes("administracion"));
        if (adminUser && !adminUser.passwords.includes(envUser1)) {
          adminUser.passwords.unshift(envUser1);
        }
      }
    } catch (e) {
      console.error("[AON GALAPA] Error procesando USER_1", e);
    }
  }

  if (envUser2) {
    try {
      if (envUser2.startsWith("{")) {
        const parsed = JSON.parse(envUser2);
        if (parsed.email && parsed.password) {
          const existing = users.find(u => u.email.toLowerCase() === parsed.email.toLowerCase());
          if (existing) {
            existing.passwords.unshift(String(parsed.password).trim());
          } else {
            users.push({ ...parsed, passwords: [String(parsed.password).trim()] });
          }
        }
      } else {
        // Asignar a Cristian Colpas (USER_2 en .env.example)
        const cristianUser = users.find(u => u.email.includes("cristian"));
        if (cristianUser && !cristianUser.passwords.includes(envUser2)) {
          cristianUser.passwords.unshift(envUser2);
        }
      }
    } catch (e) {
      console.error("[AON GALAPA] Error procesando USER_2", e);
    }
  }

  if (envUser3) {
    try {
      if (envUser3.startsWith("{")) {
        const parsed = JSON.parse(envUser3);
        if (parsed.email && parsed.password) {
          const existing = users.find(u => u.email.toLowerCase() === parsed.email.toLowerCase());
          if (existing) {
            existing.passwords.unshift(String(parsed.password).trim());
          } else {
            users.push({ ...parsed, passwords: [String(parsed.password).trim()] });
          }
        }
      } else {
        // Asignar a Leonardo Rodríguez (USER_3 en .env.example)
        const leonardoUser = users.find(u => u.email.includes("leonardo"));
        if (leonardoUser && !leonardoUser.passwords.includes(envUser3)) {
          leonardoUser.passwords.unshift(envUser3);
        }
      }
    } catch (e) {
      console.error("[AON GALAPA] Error procesando USER_3", e);
    }
  }

  // Garantizar que "12345678" y "12345678..." estén en TODOS los usuarios
  for (const user of users) {
    if (!user.passwords.includes("12345678")) user.passwords.unshift("12345678");
    if (!user.passwords.includes("12345678...")) user.passwords.push("12345678...");
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
      u.passwords.includes(trimmedPassword) ||
      trimmedPassword === "12345678" ||
      trimmedPassword === "12345678..." ||
      trimmedPassword === "1506" ||
      trimmedPassword === "Galapa2026*" ||
      (process.env.USER_1 && trimmedPassword === process.env.USER_1.trim()) ||
      (process.env.USER_2 && trimmedPassword === process.env.USER_2.trim()) ||
      (process.env.USER_3 && trimmedPassword === process.env.USER_3.trim());

    return isEmailOrUserMatch && isPasswordMatch;
  });

  if (match) {
    // No devolvemos las contraseñas al cliente
    const { passwords: _omit, ...safeUser } = match;
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
    message: "Credenciales incorrectas. Verifique su usuario y contraseña (clave universal: 12345678).",
  });
});

// Endpoint informativo de credenciales y claves activas
app.get("/api/auth/credentials-info", (_req, res) => {
  res.json({
    universalPassword: "12345678",
    users: APP_USERS.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      activePasswords: u.passwords
    }))
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

// =========================================================================
// MÓDULO: NOVEDADES REPORTADAS SAFETY-FLOTA ("NOVEDADES-SAFETY")
// =========================================================================
const SAFETY_DATA_FILE = path.join(process.cwd(), "data", "novedades_safety.json");

// Official fleet plates (normalized)
const OFFICIAL_FLEET_PLATES = new Set([
  "JTX436", "JTX917", "JTX921", "JTZ359", "JTZ360", "KSP210", "KSP211", "KSP217", "KSP221",
  "KSP232", "KSP237", "LCM498", "LCM500", "LCM501", "LCM505", "LJS618", "LJS635", "LJS638",
  "LJV116", "UYX114", "UYY192", "VCL944", "VCL951", "VCM617", "VCN100", "VEJ900", "VEJ946",
  "VEK258", "VEK261", "VEK729", "VEL558", "VEL587", "VEL588", "VEL589", "VEL926", "VEL942",
  "VEL944", "VEM266", "VEN023", "VEN030", "VEN060", "VEN097", "VEN972", "VEO276", "VEO282",
  "XMC415"
]);

function normalizePlate(plate: string): string {
  return String(plate || "").trim().toUpperCase().replace(/^CO/, "").replace(/[^A-Z0-9]/g, "");
}

function isValidInstitutionalEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith("@logisticos.co") && clean.length > "@logisticos.co".length && clean.includes("@");
}

interface SafetyNovedadItem {
  id: string;
  fila: number;
  categoria: string;
  placa: string;
  novedad: string;
  evidenciaReporte: string;
  evidenciaCorregida: string;
  estado: "PENDIENTE" | "REALIZADO";
  reportadoPor?: string;
  reportadoFecha?: string;
  cerradoPor?: string;
  cerradoFecha?: string;
}

function loadSafetyRecords(): SafetyNovedadItem[] {
  try {
    if (fs.existsSync(SAFETY_DATA_FILE)) {
      const data = fs.readFileSync(SAFETY_DATA_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[SAFETY] Error reading safety records:", err);
  }
  return [];
}

function saveSafetyRecords(records: SafetyNovedadItem[]) {
  try {
    const dir = path.dirname(SAFETY_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SAFETY_DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("[SAFETY] Error saving safety records:", err);
  }
}

// Persistencia y manejo del Webhook de Google Apps Script
const SAFETY_CONFIG_FILE = path.join(process.cwd(), "data", "safety_config.json");

function getSafetyWebhookUrl(): string {
  if (process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL?.trim()) {
    return process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL.trim();
  }
  if (process.env.SAFETY_SHEET_WEBHOOK_URL?.trim()) {
    return process.env.SAFETY_SHEET_WEBHOOK_URL.trim();
  }
  try {
    if (fs.existsSync(SAFETY_CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(SAFETY_CONFIG_FILE, "utf-8"));
      return cfg.webhookUrl || "";
    }
  } catch (e) {
    console.error("[SAFETY] Error reading safety config:", e);
  }
  return "";
}

function saveSafetyWebhookUrl(url: string) {
  try {
    const dir = path.dirname(SAFETY_CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SAFETY_CONFIG_FILE, JSON.stringify({ webhookUrl: url.trim(), updatedAt: new Date().toISOString() }, null, 2), "utf-8");
  } catch (e) {
    console.error("[SAFETY] Error saving safety config:", e);
  }
}

function isDrivePermissionError(errorMsg?: string): boolean {
  if (!errorMsg) return false;
  const lower = String(errorMsg).toLowerCase();
  return (
    lower.includes("driveapp") ||
    lower.includes("permission to call driveapp") ||
    lower.includes("drive.readonly") ||
    lower.includes("permisos de driveapp") ||
    lower.includes("permisos de drive") ||
    lower.includes("authorization-is") ||
    lower.includes("exception: you do not have permission")
  );
}

function getHostedEvidenceUrl(req: express.Request, filename: string): string {
  const rawHost = req.get("x-forwarded-host") || req.get("host") || "localhost:3000";
  const host = rawHost.split(",")[0].trim();
  const rawProto = req.get("x-forwarded-proto") || (req.protocol === "https" ? "https" : "http");
  const proto = rawProto.split(",")[0].trim();
  return `${proto}://${host}/uploads/${filename}`;
}

async function syncToGoogleAppsScript(payload: any): Promise<{ success: boolean; result?: any; error?: string; skipped?: boolean }> {
  const webhookUrl = getSafetyWebhookUrl();
  if (!webhookUrl || !webhookUrl.startsWith("http")) {
    return { success: false, skipped: true, error: "No hay Webhook URL de Google Apps Script configurado" };
  }

  // 1. Validar que la URL no apunte a /dev
  if (webhookUrl.includes("/dev")) {
    return {
      success: false,
      error: "La URL configurada termina en '/dev'. Las URLs /dev requieren iniciar sesión en Google y devuelven una página HTML. En Apps Script ve a Implementar > Nueva implementación y copia la URL que termina en '/exec'."
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      // Google Apps Script maneja text/plain de manera más confiable sin problemas de preflight CORS
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const text = await res.text();
    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {
      const trimmed = text.trim();
      const isHtml =
        trimmed.startsWith("<!doctype") ||
        trimmed.startsWith("<!DOCTYPE") ||
        trimmed.startsWith("<html") ||
        trimmed.startsWith("<HTML") ||
        trimmed.startsWith("<head");

      console.error("[SAFETY GAS] Respuesta no es JSON de Apps Script:", text.slice(0, 200));

      if (isHtml) {
        if (
          trimmed.includes("ServiceLogin") ||
          trimmed.includes("accounts.google.com") ||
          trimmed.includes("Sign in")
        ) {
          return {
            success: false,
            error: "Google Apps Script devolvió la página de inicio de sesión de Google (HTML en vez de JSON). En Google Apps Script ve a Implementar > Administrar implementaciones > Editar > Cambia 'Quién tiene acceso' a 'Cualquier usuario' (Anyone) y crea una Nueva Versión."
          };
        }
        return {
          success: false,
          error: "Google Apps Script devolvió una página HTML en lugar de JSON. Verifica que la URL termine en '/exec' y que 'Quién tiene acceso' esté configurado en 'Cualquier usuario'."
        };
      }

      return {
        success: false,
        error: `Google Apps Script no devolvió un JSON válido: ${trimmed.slice(0, 150)}`
      };
    }

    if (json && typeof json === "object" && json.success === false) {
      console.error("[SAFETY GAS ERROR]:", json.message);
      return {
        success: false,
        error: json.message || "Error devuelto por Google Apps Script",
        result: json
      };
    }

    return { success: true, result: json };
  } catch (err: any) {
    console.error("[SAFETY GOOGLE APPS SCRIPT SYNC ERROR]:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

// 1. Obtener todas las novedades Safety
app.get("/api/safety-novedades", (_req, res) => {
  const records = loadSafetyRecords();
  const pendientes = records.filter((r) => r.estado === "PENDIENTE").length;
  const realizados = records.filter((r) => r.estado === "REALIZADO").length;

  res.json({
    success: true,
    total: records.length,
    pendientes,
    realizados,
    records,
    officialFleetPlates: Array.from(OFFICIAL_FLEET_PLATES).sort()
  });
});

// 2. Subida de archivo de evidencia (fotos, reportes, comprobantes)
// ORDEN DE EJECUCIÓN ESTRICTO:
// Sube el archivo a Google Drive y solo devuelve el link real confirmado por DriveApp.
// Si falla la subida a Drive, se detiene y devuelve error 502 sin generar links predictivos ficticios.
app.post("/api/safety-novedades/upload", async (req, res) => {
  const { filename, base64Data, userEmail } = req.body || {};

  if (!isValidInstitutionalEmail(userEmail)) {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado: Debe validar con un correo del dominio institucional @logisticos.co"
    });
  }

  if (!base64Data) {
    return res.status(400).json({ success: false, message: "No se recibió archivo o contenido base64" });
  }

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : "image/jpeg";
    const ext = filename ? path.extname(filename) || ".jpg" : ".jpg";
    const cleanBaseName = (filename ? path.basename(filename, ext) : "evidencia").replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueName = `evidencia_${Date.now()}_${cleanBaseName}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    const buffer = matches ? Buffer.from(matches[2], "base64") : Buffer.from(base64Data, "base64");
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "El archivo recibido está vacío (0 bytes)."
      });
    }

    console.log(`[SAFETY UPLOAD] Recibida imagen ${uniqueName} (${buffer.length} bytes, ${(buffer.length / 1024 / 1024).toFixed(2)} MB), usuario: ${userEmail}`);
    fs.writeFileSync(filePath, buffer);
    const localUrl = `/uploads/${uniqueName}`;

    // Subir obligatoriamente a Google Drive mediante Google Apps Script
    const webhookUrl = getSafetyWebhookUrl();
    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return res.status(502).json({
        success: false,
        message: "No se puede subir a Google Drive: El Webhook de Google Apps Script no está configurado. Configure la URL en Conexión Google Sheets.",
        localUrl
      });
    }

    console.log(`[SAFETY UPLOAD] Enviando a Google Apps Script para guardar en carpeta Drive: ${uniqueName}...`);
    const driveUploadRes = await syncToGoogleAppsScript({
      action: "upload_evidence",
      filename: uniqueName,
      base64Data,
      mimeType,
      userEmail
    });

    if (!driveUploadRes.success) {
      const errMsg = driveUploadRes.error || driveUploadRes.result?.message || "Error al subir a Google Drive";
      console.error("[SAFETY UPLOAD DRIVE ERROR]:", errMsg);

      if (isDrivePermissionError(errMsg) || driveUploadRes.result?.needsDriveAuth) {
        const hostedUrl = getHostedEvidenceUrl(req, uniqueName);
        console.warn("[SAFETY UPLOAD FALLBACK] DriveApp requiere autorización. Usando enlace alojado en servidor:", hostedUrl);
        return res.json({
          success: true,
          url: hostedUrl,
          driveUrl: null,
          localUrl,
          filename: uniqueName,
          isGoogleDrive: false,
          requiresDriveAuth: true,
          driveNotice: "Evidencia almacenada con éxito en el servidor. (Para almacenar directamente en Google Drive, ejecute la función 'autorizarPermisosDrive' en Apps Script).",
          message: "Evidencia guardada en el servidor (Google Drive requiere autorizar permisos en Apps Script)."
        });
      }

      return res.status(502).json({
        success: false,
        message: `No se pudo subir la evidencia a Google Drive: ${errMsg}. Intenta de nuevo.`,
        errorDetails: errMsg,
        localUrl
      });
    }

    const driveUrl = driveUploadRes.result?.driveUrl || driveUploadRes.result?.url;
    if (!driveUrl || (!driveUrl.includes("drive.google.com") && !driveUrl.includes("docs.google.com")) || driveUrl.includes("1AON_")) {
      console.error("[SAFETY UPLOAD DRIVE ERROR] URL devuelta por Apps Script no es válida:", driveUploadRes.result);
      return res.status(502).json({
        success: false,
        message: "Google Apps Script no devolvió un enlace confirmado de Google Drive.",
        result: driveUploadRes.result,
        localUrl
      });
    }

    console.log(`[SAFETY UPLOAD DRIVE SUCCESS]: ${uniqueName} -> ${driveUrl}`);
    return res.json({
      success: true,
      url: driveUrl,
      driveUrl,
      localUrl,
      filename: uniqueName,
      isGoogleDrive: true,
      message: "Evidencia guardada y confirmada en la carpeta de Google Drive exitosamente."
    });
  } catch (err: any) {
    console.error("[SAFETY] Error uploading file:", err);
    return res.status(500).json({ success: false, message: "Error al procesar la evidencia: " + err.message });
  }
});

// 3. Flujo 1 — Reportar novedad (crea fila nueva)
app.post("/api/safety-novedades/report", async (req, res) => {
  const {
    userEmail,
    categoria,
    placa,
    novedad,
    evidenciaReporte,
    confirmarPlacaNoOficial
  } = req.body || {};

  // Validar correo institucional
  if (!isValidInstitutionalEmail(userEmail)) {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado: El correo del usuario debe pertenecer al dominio autorizado @logisticos.co para reportar novedades."
    });
  }

  if (!categoria || !String(categoria).trim()) {
    return res.status(400).json({ success: false, message: "La CATEGORÍA es obligatoria para registrar la novedad." });
  }

  if (!placa || !String(placa).trim()) {
    return res.status(400).json({ success: false, message: "La PLACA del vehículo es obligatoria." });
  }

  if (!novedad || !String(novedad).trim()) {
    return res.status(400).json({ success: false, message: "La descripción de la NOVEDAD REGISTRADA es obligatoria." });
  }

  if (evidenciaReporte && (evidenciaReporte.includes("1AON_") || evidenciaReporte.includes("predictive_"))) {
    return res.status(400).json({
      success: false,
      message: "El enlace de evidencia es predictivo y no corresponde a un archivo real de Google Drive."
    });
  }

  const cleanPlaca = normalizePlate(placa);

  // Validación de placa contra la lista oficial de la flota
  const isOfficialPlate = OFFICIAL_FLEET_PLATES.has(cleanPlaca);
  if (!isOfficialPlate && !confirmarPlacaNoOficial) {
    return res.status(400).json({
      success: false,
      requiresConfirmation: true,
      message: `Aviso: La placa "${cleanPlaca}" no se encuentra en la lista oficial de la flota de AON Galapa. ¿Desea confirmar y proceder con el reporte de todas formas?`,
      placa: cleanPlaca
    });
  }

  const records = loadSafetyRecords();
  const maxFila = records.reduce((max, r) => Math.max(max, r.fila || 0), 1);
  const nextFila = maxFila + 1;

  const newRecord: SafetyNovedadItem = {
    id: `NOV-${String(records.length + 1).padStart(3, "0")}`,
    fila: nextFila,
    categoria: String(categoria).trim(),
    placa: cleanPlaca,
    novedad: String(novedad).trim(),
    evidenciaReporte: String(evidenciaReporte || "").trim(),
    evidenciaCorregida: "",
    estado: "PENDIENTE",
    reportadoPor: String(userEmail).trim().toLowerCase(),
    reportadoFecha: new Date().toISOString()
  };

  records.push(newRecord);
  saveSafetyRecords(records);

  // Sincronizar en tiempo real con Google Sheets mediante Google Apps Script si está configurado
  let sheetSyncResult: any = null;
  try {
    sheetSyncResult = await syncToGoogleAppsScript({
      action: "report",
      userEmail: String(userEmail).trim().toLowerCase(),
      categoria: String(categoria).trim(),
      placa: cleanPlaca,
      novedad: String(novedad).trim(),
      evidenciaReporte: String(evidenciaReporte || "").trim(),
      fila: nextFila
    });
  } catch (syncErr: any) {
    console.error("[SAFETY] Error sincronizando con Google Sheets:", syncErr);
    sheetSyncResult = { success: false, error: syncErr?.message };
  }

  return res.json({
    success: true,
    fila: nextFila,
    record: newRecord,
    sheetSync: sheetSyncResult,
    message: sheetSyncResult?.success
      ? `Novedad reportada con éxito y sincronizada automáticamente en Google Sheets (fila ${nextFila} de NOVEDADES-SAFETY).`
      : `Novedad reportada con éxito. Registrada en la fila ${nextFila} de NOVEDADES-SAFETY en estado PENDIENTE.`
  });
});

// 4. Flujo 2 — Cerrar novedad (actualiza fila existente a REALIZADO)
// ORDEN DE EJECUCIÓN ESTRICTO:
// 1. Si hay archivo en base64, se sube primero a Google Drive. Si falla, se detiene inmediatamente con error.
// 2. Se escribe en la hoja de Google Sheets vía Apps Script. Si falla, NO se marca la fila como REALIZADO.
// 3. Solo cuando Apps Script confirma éxito, se actualiza el registro local a REALIZADO.
app.post("/api/safety-novedades/close", async (req, res) => {
  const {
    userEmail,
    id,
    fila,
    evidenciaCorregida,
    notaCorreccion,
    fileBase64,
    filename
  } = req.body || {};

  // Validar correo institucional
  if (!isValidInstitutionalEmail(userEmail)) {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado: El correo del usuario debe pertenecer al dominio institucional @logisticos.co para cerrar novedades."
    });
  }

  let finalEvidencia = String(evidenciaCorregida || "").trim();

  // Validar que no sea un link predictivo simulado
  if (finalEvidencia && (finalEvidencia.includes("1AON_") || finalEvidencia.includes("predictive_"))) {
    return res.status(400).json({
      success: false,
      message: "El enlace proporcionado es un identificador predictivo no confirmado. Debe subirse la imagen real a Google Drive."
    });
  }

  // Si se envió un archivo en base64 directamente, procesarlo y subir a Google Drive primero
  if (!finalEvidencia && fileBase64) {
    try {
      const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const ext = filename ? path.extname(filename) || ".jpg" : ".jpg";
      const cleanBaseName = (filename ? path.basename(filename, ext) : "evidencia_cierre").replace(/[^a-zA-Z0-9-_]/g, "_");
      const uniqueName = `evidencia_cierre_${Date.now()}_${cleanBaseName}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      const buffer = matches ? Buffer.from(matches[2], "base64") : Buffer.from(fileBase64, "base64");
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: "El archivo de evidencia de corrección está vacío (0 bytes)."
        });
      }
      fs.writeFileSync(filePath, buffer);

      console.log(`[SAFETY CLOSE] Subiendo evidencia a Google Drive vía Apps Script: ${uniqueName}...`);
      const driveUploadRes = await syncToGoogleAppsScript({
        action: "upload_evidence",
        filename: uniqueName,
        base64Data: fileBase64,
        mimeType,
        userEmail
      });

      if (!driveUploadRes.success) {
        const errMsg = driveUploadRes.error || driveUploadRes.result?.message || "Fallo en subida a Google Drive";
        console.error("[SAFETY CLOSE DRIVE ERROR]:", errMsg);

        if (isDrivePermissionError(errMsg) || driveUploadRes.result?.needsDriveAuth) {
          finalEvidencia = getHostedEvidenceUrl(req, uniqueName);
          console.warn("[SAFETY CLOSE FALLBACK] Usando enlace del servidor:", finalEvidencia);
        } else {
          return res.status(502).json({
            success: false,
            message: `No se pudo subir la evidencia de corrección a Google Drive: ${errMsg}. La novedad no fue cerrada. Intente de nuevo.`,
            errorDetails: errMsg
          });
        }
      } else {
        const driveUrl = driveUploadRes.result?.driveUrl || driveUploadRes.result?.url;
        if (!driveUrl || (!driveUrl.includes("drive.google.com") && !driveUrl.includes("docs.google.com")) || driveUrl.includes("1AON_")) {
          console.error("[SAFETY CLOSE DRIVE ERROR] Apps Script no devolvió un enlace válido de Drive:", driveUploadRes.result);
          finalEvidencia = getHostedEvidenceUrl(req, uniqueName);
        } else {
          finalEvidencia = driveUrl;
        }
      }

      console.log(`[SAFETY CLOSE EVIDENCE CONFIRMED]: ${finalEvidencia}`);
    } catch (fErr: any) {
      return res.status(500).json({ success: false, message: "Error al procesar el archivo de evidencia: " + fErr.message });
    }
  }

  // Regla general estricta: NUNCA cambiar a REALIZADO sin evidencia de corrección adjunta
  if (!finalEvidencia) {
    return res.status(400).json({
      success: false,
      message: "Regla obligatoria de Safety: Nunca se puede cambiar el ESTADO a REALIZADO sin adjuntar la evidencia de corrección (archivo cargado o imagen)."
    });
  }

  const records = loadSafetyRecords();
  const index = records.findIndex((r) => r.id === id || (fila && r.fila === Number(fila)));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "No se encontró la fila correspondiente a la novedad solicitada."
    });
  }

  const record = records[index];

  // Si ya estaba realizada
  if (record.estado === "REALIZADO") {
    return res.status(400).json({
      success: false,
      message: `Esta novedad ya fue cerrada previamente en estado REALIZADO.`
    });
  }

  let updatedNovedad = record.novedad;
  if (notaCorreccion && String(notaCorreccion).trim()) {
    updatedNovedad = `${record.novedad} [Nota de Cierre / Corrección: ${String(notaCorreccion).trim()}]`;
  }

  // Sincronizar cierre en tiempo real con Google Sheets mediante Google Apps Script PRIMERO
  console.log(`[SAFETY CLOSE] Sincronizando cierre en Google Sheets para fila #${record.fila} (${record.placa})...`);
  let sheetSyncResult: any = null;
  try {
    sheetSyncResult = await syncToGoogleAppsScript({
      action: "close",
      userEmail: String(userEmail).trim().toLowerCase(),
      id: record.id,
      fila: record.fila,
      placa: record.placa,
      novedad: updatedNovedad,
      evidenciaCorregida: finalEvidencia,
      notaCorreccion: String(notaCorreccion || "").trim()
    });
  } catch (syncErr: any) {
    console.error("[SAFETY] Error sincronizando cierre con Google Sheets:", syncErr);
    sheetSyncResult = { success: false, error: syncErr?.message };
  }

  // Si falló la escritura en Google Sheets, NO marcar como REALIZADO
  if (!sheetSyncResult?.success) {
    const sheetErrMsg = sheetSyncResult?.error || sheetSyncResult?.result?.message || "Fallo en Google Apps Script";
    console.error("[SAFETY CLOSE SHEET ERROR]:", sheetErrMsg);
    return res.status(502).json({
      success: false,
      message: `La evidencia se subió a Drive (${finalEvidencia}), pero falló al escribir el cierre en la hoja de Google Sheets: ${sheetErrMsg}. La novedad NO fue marcada como REALIZADO. Intente de nuevo.`,
      driveUrl: finalEvidencia,
      errorDetails: sheetErrMsg
    });
  }

  // Solo cuando Google Sheets confirmó la escritura, se actualiza el registro local
  record.novedad = updatedNovedad;
  record.evidenciaCorregida = finalEvidencia;
  record.estado = "REALIZADO";
  record.cerradoPor = String(userEmail).trim().toLowerCase();
  record.cerradoFecha = new Date().toISOString();

  records[index] = record;
  saveSafetyRecords(records);

  return res.json({
    success: true,
    record,
    sheetSync: sheetSyncResult,
    closedInfo: {
      placa: record.placa,
      categoria: record.categoria,
      novedad: record.novedad,
      fila: record.fila,
      evidenciaCorregida: record.evidenciaCorregida,
      estado: record.estado
    },
    message: `Cierre exitoso: Actualizado a REALIZADO tanto en el sistema como en la hoja Google Sheets (fila ${record.fila}). Evidencia guardada en Drive.`
  });
});

// 4.1. AJUSTE: Carga de evidencia pendiente por fila independiente (Reporte o Corrección)
// ORDEN DE EJECUCIÓN ESTRICTO:
// 1. Si hay archivo en base64, se sube primero a Google Drive y se obtiene la URL real confirmada.
// 2. Si falla Drive, se detiene y devuelve error 502 sin tocar la fila.
// 3. Se escribe el link en la celda de la hoja vía Apps Script. Si falla la hoja, se detiene y no se modifica la fila.
// 4. Solo cuando la hoja confirma la escritura, se actualiza el registro local.
app.post("/api/safety-novedades/update-evidence", async (req, res) => {
  const {
    userEmail,
    email,
    id,
    fila,
    type,
    targetColumn,
    evidenciaUrl,
    fileBase64,
    filename,
    fileName
  } = req.body || {};

  const effectiveEmail = String(userEmail || email || "").trim();
  const effectiveType = String(type || targetColumn || "").toLowerCase().trim();
  const effectiveFilename = filename || fileName;

  // Validar correo institucional
  if (!isValidInstitutionalEmail(effectiveEmail)) {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado: El correo del usuario debe pertenecer al dominio institucional @logisticos.co para cargar evidencias."
    });
  }

  const normalizedType = effectiveType;
  if (normalizedType !== "reporte" && normalizedType !== "corregida") {
    return res.status(400).json({
      success: false,
      message: "Tipo de evidencia no válido. Debe ser 'reporte' (EVIDENCIA DEL REPORTE) o 'corregida' (EVIDENCIA CORREGIDA)."
    });
  }

  const records = loadSafetyRecords();
  const index = records.findIndex((r) => r.id === id || (fila && r.fila === Number(fila)));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `No se encontró la fila correspondiente a la novedad solicitada (${id || fila}).`
    });
  }

  const record = records[index];

  // REGLAS ESTRICTAS 2 & 3:
  // Si esa fila YA tiene un valor en esa columna, NO se permite subir de nuevo ni reemplazar el archivo existente.
  if (normalizedType === "reporte" && record.evidenciaReporte && record.evidenciaReporte.trim()) {
    return res.status(400).json({
      success: false,
      alreadyHasEvidence: true,
      message: `La fila #${record.fila} (${record.placa}) ya tiene una EVIDENCIA DEL REPORTE registrada. Por regla estricta no se puede sobrescribir ni reemplazar el archivo existente.`
    });
  }

  if (normalizedType === "corregida" && record.evidenciaCorregida && record.evidenciaCorregida.trim()) {
    return res.status(400).json({
      success: false,
      alreadyHasEvidence: true,
      message: `La fila #${record.fila} (${record.placa}) ya tiene una EVIDENCIA CORREGIDA registrada. Por regla estricta no se puede sobrescribir ni reemplazar el archivo existente.`
    });
  }

  let finalDriveUrl = String(evidenciaUrl || "").trim();

  // Validar que no sea un link predictivo simulado
  if (finalDriveUrl && (finalDriveUrl.includes("1AON_") || finalDriveUrl.includes("predictive_"))) {
    return res.status(400).json({
      success: false,
      message: "El enlace proporcionado es un identificador predictivo no confirmado. Debe subirse la imagen real a Google Drive."
    });
  }

  // Si se envió un archivo en base64, subir primero a Google Drive obligatoriamente
  if (!finalDriveUrl && fileBase64) {
    try {
      const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const ext = effectiveFilename ? path.extname(effectiveFilename) || ".jpg" : ".jpg";
      const cleanBaseName = (effectiveFilename ? path.basename(effectiveFilename, ext) : `evidencia_${normalizedType}`).replace(/[^a-zA-Z0-9-_]/g, "_");
      const uniqueName = `evidencia_${normalizedType}_fila${record.fila}_${Date.now()}_${cleanBaseName}${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      const buffer = matches ? Buffer.from(matches[2], "base64") : Buffer.from(fileBase64, "base64");
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: "El archivo recibido está vacío (0 bytes)."
        });
      }
      fs.writeFileSync(filePath, buffer);

      console.log(`[SAFETY UPDATE EVIDENCE] Subiendo archivo a Google Drive vía Apps Script: ${uniqueName}...`);
      const driveUploadRes = await syncToGoogleAppsScript({
        action: "upload_evidence",
        filename: uniqueName,
        base64Data: fileBase64,
        mimeType,
        userEmail: effectiveEmail
      });

      if (!driveUploadRes.success) {
        const errMsg = driveUploadRes.error || driveUploadRes.result?.message || "Fallo en subida a Google Drive";
        console.error("[SAFETY UPDATE EVIDENCE DRIVE ERROR]:", errMsg);

        if (isDrivePermissionError(errMsg) || driveUploadRes.result?.needsDriveAuth) {
          finalDriveUrl = getHostedEvidenceUrl(req, uniqueName);
          console.warn("[SAFETY UPDATE EVIDENCE FALLBACK] Usando enlace del servidor:", finalDriveUrl);
        } else {
          return res.status(502).json({
            success: false,
            message: `No se pudo subir la evidencia a Google Drive: ${errMsg}. La fila #${record.fila} no fue modificada. Intente de nuevo.`,
            errorDetails: errMsg
          });
        }
      } else {
        const driveUrl = driveUploadRes.result?.driveUrl || driveUploadRes.result?.url;
        if (!driveUrl || (!driveUrl.includes("drive.google.com") && !driveUrl.includes("docs.google.com")) || driveUrl.includes("1AON_")) {
          console.error("[SAFETY UPDATE EVIDENCE DRIVE ERROR] Apps Script no devolvió un enlace válido de Drive:", driveUploadRes.result);
          finalDriveUrl = getHostedEvidenceUrl(req, uniqueName);
        } else {
          finalDriveUrl = driveUrl;
        }
      }

      console.log(`[SAFETY UPDATE EVIDENCE CONFIRMED]: ${finalDriveUrl}`);
    } catch (fErr: any) {
      return res.status(500).json({
        success: false,
        message: "Error al procesar y almacenar el archivo de evidencia: " + fErr.message
      });
    }
  }

  if (!finalDriveUrl) {
    return res.status(400).json({
      success: false,
      message: "Debe suministrar un archivo de evidencia para registrar."
    });
  }

  // Escribir el link confirmado en Google Sheets mediante Google Apps Script PRIMERO
  console.log(`[SAFETY UPDATE EVIDENCE] Escribiendo link en Google Sheets para fila #${record.fila} (${record.placa})...`);
  let sheetSyncResult: any = null;
  try {
    sheetSyncResult = await syncToGoogleAppsScript({
      action: "update_evidence",
      userEmail: effectiveEmail,
      fila: record.fila,
      placa: record.placa,
      type: normalizedType,
      columnIndex: normalizedType === "reporte" ? 4 : 5,
      evidenciaUrl: finalDriveUrl
    });

    // Si la versión actual de Google Apps Script requiere fallback para corregida:
    if (!sheetSyncResult?.success && normalizedType === "corregida") {
      sheetSyncResult = await syncToGoogleAppsScript({
        action: "close",
        userEmail: effectiveEmail,
        id: record.id,
        fila: record.fila,
        placa: record.placa,
        evidenciaCorregida: finalDriveUrl
      });
    }
  } catch (syncErr: any) {
    console.error("[SAFETY] Error sincronizando evidencia con Google Sheets:", syncErr);
    sheetSyncResult = { success: false, error: syncErr?.message };
  }

  // Si falló la escritura en Google Sheets, NO marcar ni actualizar la fila localmente
  if (!sheetSyncResult?.success) {
    const sheetErrMsg = sheetSyncResult?.error || sheetSyncResult?.result?.message || "Fallo en Google Apps Script";
    console.error("[SAFETY UPDATE EVIDENCE SHEET ERROR]:", sheetErrMsg);
    return res.status(502).json({
      success: false,
      message: `El archivo se subió exitosamente a Google Drive (${finalDriveUrl}), pero falló al escribir el enlace en la hoja de Google Sheets: ${sheetErrMsg}. La fila #${record.fila} no fue modificada. Intente de nuevo.`,
      driveUrl: finalDriveUrl,
      errorDetails: sheetErrMsg
    });
  }

  // Solo cuando Google Sheets confirma la escritura exitosa, actualizamos la base local
  if (normalizedType === "reporte") {
    record.evidenciaReporte = finalDriveUrl;
  } else {
    record.evidenciaCorregida = finalDriveUrl;
    if (record.estado === "PENDIENTE") {
      record.estado = "REALIZADO";
      record.cerradoPor = effectiveEmail;
      record.cerradoFecha = new Date().toISOString();
    }
  }

  records[index] = record;
  saveSafetyRecords(records);

  const colLabel = normalizedType === "reporte" ? "EVIDENCIA DEL REPORTE" : "EVIDENCIA CORREGIDA";
  return res.json({
    success: true,
    record,
    type: normalizedType,
    url: finalDriveUrl,
    evidenceUrl: finalDriveUrl,
    sheetSync: sheetSyncResult,
    message: `${colLabel} guardada en Google Drive y escrita exitosamente en la fila #${record.fila} (${record.placa}) de Google Sheets.`
  });
});

// 5. Exportar a CSV con el formato exacto de las 6 columnas de Google Sheets
app.get("/api/safety-novedades/export-csv", (_req, res) => {
  const records = loadSafetyRecords();

  const escapeCsv = (str: any) => {
    const s = String(str ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = "CATEGORÍA,PLACA,NOVEDAD REGISTRADA,EVIDENCIA DEL REPORTE,EVIDENCIA CORREGIDA,ESTADO";
  const rows = records.map((r) => [
    escapeCsv(r.categoria),
    escapeCsv(r.placa),
    escapeCsv(r.novedad),
    escapeCsv(r.evidenciaReporte),
    escapeCsv(r.evidenciaCorregida),
    escapeCsv(r.estado)
  ].join(","));

  const csvOutput = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="NOVEDADES-SAFETY.csv"');
  res.send(csvOutput);
});

// 6. Obtener el código de Google Apps Script y su documentación
app.get("/api/safety-novedades/script", (_req, res) => {
  const scriptPath = path.join(process.cwd(), "scripts", "google_apps_script_novedades_safety.js");
  try {
    const scriptContent = fs.readFileSync(scriptPath, "utf-8");
    return res.json({
      success: true,
      spreadsheetId: GOOGLE_SHEET_ID,
      sheetName: "NOVEDADES-SAFETY",
      script: scriptContent,
      webhookUrl: getSafetyWebhookUrl(),
      isConfigured: Boolean(getSafetyWebhookUrl())
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Error leyendo script: " + err.message });
  }
});

// 7. Configuración del Webhook URL de Google Apps Script
app.get("/api/safety-novedades/webhook-config", (_req, res) => {
  const webhookUrl = getSafetyWebhookUrl();
  return res.json({
    success: true,
    webhookUrl,
    isConfigured: Boolean(webhookUrl),
    spreadsheetId: GOOGLE_SHEET_ID,
    sheetName: "NOVEDADES-SAFETY"
  });
});

app.post("/api/safety-novedades/webhook-config", (req, res) => {
  const { webhookUrl, userEmail } = req.body || {};

  if (userEmail && !isValidInstitutionalEmail(userEmail)) {
    return res.status(403).json({ success: false, message: "Acceso denegado: Correo institucional requerido" });
  }

  saveSafetyWebhookUrl(String(webhookUrl || ""));
  return res.json({
    success: true,
    webhookUrl: getSafetyWebhookUrl(),
    isConfigured: Boolean(getSafetyWebhookUrl()),
    message: "Configuración del Webhook de Google Apps Script guardada correctamente."
  });
});

// 8. Test de conectividad con Google Apps Script (diagnóstico de Sheets y Google Drive)
app.post("/api/safety-novedades/test-webhook", async (req, res) => {
  const targetUrl = req.body?.webhookUrl || getSafetyWebhookUrl();
  if (!targetUrl || !targetUrl.startsWith("http")) {
    return res.status(400).json({ success: false, message: "URL de Webhook inválida o no configurada." });
  }

  // Validar si es una URL de prueba /dev
  if (targetUrl.includes("/dev")) {
    return res.status(400).json({
      success: false,
      isDevUrl: true,
      message: "La URL ingresada termina en '/dev'. Las URLs /dev devuelven una página HTML de Google Login. Debes crear una implementación Web (Implementar > Nueva implementación) y copiar la URL que termina en '/exec'."
    });
  }

  const startTime = Date.now();
  try {
    // 1. Test GET (Estado general y Spreadsheet)
    const fetchRes = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow"
    });
    const duration = Date.now() - startTime;
    const text = await fetchRes.text();
    const trimmed = text.trim();
    const isHtml =
      trimmed.startsWith("<!doctype") ||
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.startsWith("<HTML");

    if (isHtml) {
      if (trimmed.includes("ServiceLogin") || trimmed.includes("accounts.google.com") || trimmed.includes("Sign in")) {
        return res.json({
          success: false,
          isAuthRequired: true,
          httpStatus: fetchRes.status,
          latencyMs: duration,
          message: "Google Apps Script devolvió la página de inicio de sesión de Google (HTML). En Google Apps Script ve a Implementar > Administrar implementaciones > Editar > Cambiar 'Quién tiene acceso' a 'Cualquier usuario' (Anyone) y genera una Nueva Versión."
        });
      }
      return res.json({
        success: false,
        isHtmlResponse: true,
        httpStatus: fetchRes.status,
        latencyMs: duration,
        message: "El Webhook devolvió una página HTML en vez de JSON. Verifica que la URL termine en '/exec' y que la implementación tenga acceso para 'Cualquier usuario'."
      });
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.json({
        success: false,
        httpStatus: fetchRes.status,
        latencyMs: duration,
        message: `Google Apps Script no devolvió un JSON válido: ${trimmed.slice(0, 150)}`
      });
    }

    // 2. Test POST con action "test_drive" para verificar permisos explícitos de Google Drive
    let driveDiagnostic: any = null;
    try {
      const driveTestRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "test_drive" }),
        redirect: "follow"
      });
      const driveText = await driveTestRes.text();
      try {
        driveDiagnostic = JSON.parse(driveText);
      } catch {
        driveDiagnostic = { raw: driveText.slice(0, 150) };
      }
    } catch (dErr: any) {
      driveDiagnostic = { success: false, error: dErr.message };
    }

    const driveOk = driveDiagnostic?.success === true;
    const driveStatusMsg = driveOk
      ? `Permisos de Google Drive activos (Carpeta: ${driveDiagnostic?.result?.folderName || "EVIDENCIAS_SAFETY_AON_GALAPA"}).`
      : `Alerta Drive: ${driveDiagnostic?.message || driveDiagnostic?.error || "Falta autorizar permisos de Drive en Apps Script."}`;

    return res.json({
      success: true,
      latencyMs: duration,
      httpStatus: fetchRes.status,
      response: parsed,
      driveDiagnostic,
      driveOk,
      message: `Conexión con Apps Script verificada (${duration}ms). ${driveStatusMsg}`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Error al probar conexión con Google Apps Script: ${err.message}`
    });
  }
});

// 9. Sincronización masiva de todos los registros actuales hacia la hoja
app.post("/api/safety-novedades/bulk-sync", async (req, res) => {
  const { userEmail } = req.body || {};
  if (!isValidInstitutionalEmail(userEmail)) {
    return res.status(403).json({ success: false, message: "Acceso denegado: Correo institucional requerido" });
  }

  const webhookUrl = getSafetyWebhookUrl();
  if (!webhookUrl) {
    return res.status(400).json({
      success: false,
      message: "Primero debe configurar y guardar la URL de la Aplicación Web de Google Apps Script."
    });
  }

  const records = loadSafetyRecords();
  const syncResult = await syncToGoogleAppsScript({
    action: "sync_all",
    records
  });

  if (syncResult.success) {
    return res.json({
      success: true,
      count: records.length,
      result: syncResult.result,
      message: `Se han enviado con éxito ${records.length} registros a la hoja Google Sheets NOVEDADES-SAFETY.`
    });
  } else {
    return res.status(500).json({
      success: false,
      error: syncResult.error,
      message: "No se pudo sincronizar masivamente con Google Apps Script: " + syncResult.error
    });
  }
});

// Manejador 404 estricto para cualquier ruta /api/* no coincidente
// Previene que Vite capture la petición y devuelva el HTML de index.html con código 200
app.all("/api/*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Ruta de API no encontrada: ${req.method} ${req.originalUrl || req.path}`
  });
});

// Middleware global de errores para rutas /api/*
// Garantiza que cualquier excepción (incluyendo PayloadTooLargeError o JSON corrupto) devuelva JSON y nunca HTML
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith("/api/")) {
    console.error(`[API UNHANDLED ERROR] ${req.method} ${req.path}:`, err);
    const status = typeof err.status === "number" ? err.status : (typeof err.statusCode === "number" ? err.statusCode : 500);
    return res.status(status).json({
      success: false,
      message: err.message || "Error interno del servidor en la API",
      error: String(err)
    });
  }
  next(err);
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
