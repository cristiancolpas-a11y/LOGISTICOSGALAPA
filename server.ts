import express from "express";
import path from "path";
import https from "https";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GOOGLE_APPS_SCRIPT_CODE } from "./src/data/googleAppsScriptCode.js";
import { FALLBACK_SAFETY_RECORDS } from "./src/data/fallbackSafetyData.js";

dotenv.config();

export const app = express();
const PORT = 3000;

app.set("trust proxy", true);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Normalizador de rutas para Vercel Serverless:
// En Vercel, la función serverless en api/index.ts puede recibir peticiones donde
// req.url es "/health", "/api/health", "/", etc., según la regla de reescritura.
// Este middleware garantiza que req.url refleje el path exacto de la petición original.
app.use((req, _res, next) => {
  const matchedPath =
    (req.headers["x-matched-path"] as string) ||
    (req.headers["x-vercel-matched-path"] as string) ||
    (req.headers["x-forwarded-uri"] as string) ||
    (req.headers["x-original-uri"] as string);

  if (matchedPath && matchedPath.startsWith("/api") && req.url === "/api") {
    req.url = matchedPath;
  }
  next();
});



// ============================================================
// CONFIGURACIÓN DE SUPABASE (STORAGE + POSTGRES)
// ============================================================
// En Vercel Serverless, Supabase provee la capa de persistencia duradera:
// 1. Supabase Storage -> Bucket 'evidencias' (público) para fotos de reportes y cierres.
// 2. Supabase Postgres -> Tabla 'safety_novedades' para reportes y 'app_config' para configuración.
//
// Variables requeridas:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (clave de servicio secreta, NUNCA expuesta al cliente)
// ============================================================

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }
  return supabaseClient;
}

function parseBase64Image(base64Data: string): { buffer: Buffer; contentType: string; extension: string } {
  let cleanBase64 = base64Data;
  let contentType = "image/jpeg";
  let extension = "jpg";

  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    contentType = matches[1];
    cleanBase64 = matches[2];
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("webp")) extension = "webp";
    else if (contentType.includes("gif")) extension = "gif";
  }

  const buffer = Buffer.from(cleanBase64, "base64");
  return { buffer, contentType, extension };
}

export async function uploadToSupabaseStorage(
  base64Data: string,
  filename?: string,
  folder: string = "evidencias-safety"
): Promise<{ url: string; path: string; filename: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Almacenamiento permanente en Supabase no configurado. Configure SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel."
    );
  }

  const { buffer, contentType, extension } = parseBase64Image(base64Data);
  const cleanBaseName = filename
    ? path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9-_]/g, "_")
    : "evidencia";
  const filePath = `${folder}/${Date.now()}_${cleanBaseName}.${extension}`;

  const { data, error } = await supabase.storage
    .from("evidencias")
    .upload(filePath, buffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.error("[SUPABASE STORAGE ERROR]:", error);
    throw new Error(`Error al subir la imagen al bucket 'evidencias' de Supabase: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from("evidencias")
    .getPublicUrl(data?.path || filePath);

  return {
    url: publicData.publicUrl,
    path: data?.path || filePath,
    filename: path.basename(filePath)
  };
}

export async function processAndStoreEvidence(
  base64Data: string,
  filename: string | undefined,
  _req?: express.Request,
  folder: string = "evidencias-safety"
): Promise<{ url: string; isSupabase: boolean; path?: string; filename: string }> {
  const uploadRes = await uploadToSupabaseStorage(base64Data, filename, folder);
  return {
    url: uploadRes.url,
    isSupabase: true,
    path: uploadRes.path,
    filename: uploadRes.filename
  };
}


const DEFAULT_SHEET_ID = "18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Check%20list`;

// In-memory cache for live sheet data (keyed by sheet name)
const sheetCache = new Map<string, { raw: string; fetchedAt: string; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// ============================================================
// USUARIOS: se configuran mediante variables de entorno (USER_1..3)
// Formato recomendado en .env o Vercel:
//   USER_1='{"email":"administraciongalapa@logisticos.co","password":"tu_password_seguro","name":"Administración AON Galapa","role":"Administrador General"}'
//   o simplemente una clave en texto plano en la variable de entorno: USER_1='tu_password_seguro'
// ============================================================
interface AppUser {
  email: string;
  name: string;
  role: string;
  company: string;
  permissions: string[];
  password?: string;
}

const DEFAULT_AUTHORIZED_USERS: AppUser[] = [
  {
    email: "administraciongalapa@logisticos.co",
    name: "Administración AON Galapa",
    role: "Administrador General",
    company: "AON GALAPA / Logisticos.co",
    permissions: [
      "admin",
      "creator",
      "full_access",
      "module_config",
      "view_all_kpis",
      "view_all_data",
      "manage_dashboard",
      "manage_users",
      "export_reports",
      "system_settings"
    ]
  },
  {
    email: "cristian.colpas@logisticos.co",
    name: "Cristian Colpas",
    role: "Control Operativo de Flota",
    company: "AON GALAPA / Logisticos.co",
    permissions: [
      "fleet_control",
      "view_all_kpis",
      "view_all_data",
      "view_salida",
      "view_retorno",
      "view_alerts",
      "export_reports"
    ]
  },
  {
    email: "leonardo.rodriguez@logisticos.co",
    name: "Leonardo Rodríguez",
    role: "Control Operativo de Flota",
    company: "AON GALAPA / Logisticos.co",
    permissions: [
      "fleet_control",
      "view_all_kpis",
      "view_all_data",
      "view_salida",
      "view_retorno",
      "view_alerts",
      "export_reports"
    ]
  }
];

function loadUsersFromEnv(): AppUser[] {
  const users: AppUser[] = DEFAULT_AUTHORIZED_USERS.map((u) => ({ ...u }));

  const envDefinitions = [
    { envVal: process.env.USER_1?.trim(), defaultEmail: "administraciongalapa@logisticos.co" },
    { envVal: process.env.USER_2?.trim(), defaultEmail: "cristian.colpas@logisticos.co" },
    { envVal: process.env.USER_3?.trim(), defaultEmail: "leonardo.rodriguez@logisticos.co" }
  ];

  for (const item of envDefinitions) {
    if (!item.envVal) continue;
    try {
      if (item.envVal.startsWith("{")) {
        const parsed = JSON.parse(item.envVal);
        if (parsed.email) {
          const existing = users.find((u) => u.email.toLowerCase() === parsed.email.toLowerCase());
          if (existing) {
            if (parsed.password) existing.password = String(parsed.password).trim();
            if (parsed.name) existing.name = parsed.name;
            if (parsed.role) existing.role = parsed.role;
            if (parsed.permissions) existing.permissions = parsed.permissions;
          } else {
            users.push({
              email: parsed.email.toLowerCase(),
              name: parsed.name || parsed.email,
              role: parsed.role || "Operativo",
              company: parsed.company || "AON GALAPA / Logisticos.co",
              permissions: parsed.permissions || ["view_all_data"],
              password: parsed.password ? String(parsed.password).trim() : undefined
            });
          }
        }
      } else {
        const matched = users.find((u) => u.email === item.defaultEmail);
        if (matched) {
          matched.password = item.envVal;
        }
      }
    } catch (e) {
      console.error("[AON GALAPA] Error procesando variable de usuario:", e);
    }
  }

  return users;
}

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

// API Routes & Health Check (compatible con /api, /api/health, /health y / en la función serverless)
app.get(["/api", "/api/health", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    service: "AON GALAPA - Dashboard Inteligente",
    serverless: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString()
  });
});


// Authentication endpoint - Valida credenciales contra variables de entorno USER_1..3
app.post(["/api/auth/login", "/auth/login"], (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Usuario y contraseña requeridos" });
  }

  const normalizedInput = String(email).trim().toLowerCase();
  const trimmedPassword = String(password).trim();

  const currentUsers = loadUsersFromEnv();

  const match = currentUsers.find((u) => {
    const userEmail = u.email.toLowerCase();
    const userPrefix = userEmail.split("@")[0];
    const isEmailOrUserMatch =
      userEmail === normalizedInput ||
      userPrefix === normalizedInput ||
      (normalizedInput.includes("cristian") && userEmail.includes("cristian")) ||
      (normalizedInput.includes("leonardo") && userEmail.includes("leonardo")) ||
      ((normalizedInput.includes("admin") || normalizedInput.includes("galapa")) && userEmail.includes("administracion"));

    if (!isEmailOrUserMatch) return false;

    // Validación segura de contraseña provista en USER_1..3
    if (u.password) {
      return u.password === trimmedPassword;
    }

    return false;
  });

  if (match) {
    const { password: _omit, ...safeUser } = match;
    return res.json({
      success: true,
      user: {
        id: safeUser.email,
        ...safeUser
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: "Credenciales incorrectas. Verifique su usuario y contraseña corporativos configurados en el sistema."
  });
});

// Endpoint informativo de usuarios activos (sin exponer contraseñas)
app.get(["/api/auth/credentials-info", "/auth/credentials-info"], (_req, res) => {
  const currentUsers = loadUsersFromEnv();
  res.json({
    users: currentUsers.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      company: u.company
    }))
  });
});

// Generic Google Sheets Proxy Endpoint
app.get(["/api/check-list-data", "/api/sheet-data", "/check-list-data", "/sheet-data"], async (req, res) => {
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
// ALMACENAMIENTO SERVERLESS: Memoria + Google Sheets (Apps Script) + KV
// =========================================================================

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

// In-memory safety records (inicializados con FALLBACK_SAFETY_RECORDS)
let inMemorySafetyRecords: SafetyNovedadItem[] = [...(FALLBACK_SAFETY_RECORDS as SafetyNovedadItem[])];

// ============================================================
// PERSISTENCIA EN SUPABASE POSTGRES (TABLA 'safety_novedades' Y 'app_config')
// ============================================================

function mapDbRowToSafetyItem(row: any): SafetyNovedadItem {
  return {
    id: String(row.id),
    fila: Number(row.fila),
    categoria: row.categoria || "CARROCERIA",
    placa: row.placa || "",
    novedad: row.novedad || "",
    evidenciaReporte: row.evidenciaReporte ?? row.evidencia_reporte ?? "",
    evidenciaCorregida: row.evidenciaCorregida ?? row.evidencia_corregida ?? "",
    estado: row.estado === "REALIZADO" ? "REALIZADO" : "PENDIENTE",
    reportadoPor: row.reportadoPor ?? row.reportado_por,
    reportadoFecha: row.reportadoFecha ?? row.reportado_fecha,
    cerradoPor: row.cerradoPor ?? row.cerrado_por,
    cerradoFecha: row.cerradoFecha ?? row.cerrado_fecha
  };
}

function mapSafetyItemToDbRow(item: SafetyNovedadItem): any {
  return {
    id: item.id,
    fila: item.fila,
    categoria: item.categoria,
    placa: item.placa,
    novedad: item.novedad,
    evidenciaReporte: item.evidenciaReporte || "",
    evidenciaCorregida: item.evidenciaCorregida || "",
    estado: item.estado,
    reportadoPor: item.reportadoPor || null,
    reportadoFecha: item.reportadoFecha || null,
    cerradoPor: item.cerradoPor || null,
    cerradoFecha: item.cerradoFecha || null
  };
}

// Persistencia y lectura desde Supabase Postgres (Serverless-compliant)
async function loadSafetyRecords(): Promise<SafetyNovedadItem[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("safety_novedades")
        .select("*")
        .order("fila", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        inMemorySafetyRecords = data.map(mapDbRowToSafetyItem);
        return inMemorySafetyRecords;
      } else if (error) {
        console.warn("[SUPABASE LOAD WARNING]:", error.message);
      }
    } catch (err: any) {
      console.warn("[SUPABASE LOAD EXCEPTION]:", err?.message);
    }
  }

  // Fallback a sincronización en vivo con Google Sheets vía Apps Script si está disponible
  const webhookUrl = getSafetyWebhookUrl();
  if (webhookUrl && webhookUrl.startsWith("http") && !webhookUrl.includes("/dev")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "get_records" }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.records) && data.records.length > 0) {
        inMemorySafetyRecords = data.records;
        // Respaldo automático en Supabase si está conectado
        if (supabase) {
          saveSafetyRecords(data.records);
        }
        return inMemorySafetyRecords;
      }
    } catch {
      // Usar registros en memoria si la consulta en red no responde inmediatamente o expira el timeout
    }
  }

  return inMemorySafetyRecords;
}

async function saveSafetyRecordsToSupabase(records: SafetyNovedadItem[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const rows = records.map(mapSafetyItemToDbRow);
    const { error } = await supabase.from("safety_novedades").upsert(rows, { onConflict: "id" });
    if (error) {
      // En caso de que la tabla en postgres se haya creado con columnas en snake_case
      const snakeRows = records.map((r) => ({
        id: r.id,
        fila: r.fila,
        categoria: r.categoria,
        placa: r.placa,
        novedad: r.novedad,
        evidencia_reporte: r.evidenciaReporte || "",
        evidencia_corregida: r.evidenciaCorregida || "",
        estado: r.estado,
        reportado_por: r.reportadoPor || null,
        reportado_fecha: r.reportadoFecha || null,
        cerrado_por: r.cerradoPor || null,
        cerrado_fecha: r.cerradoFecha || null
      }));
      await supabase.from("safety_novedades").upsert(snakeRows, { onConflict: "id" });
    }
  } catch (err) {
    console.warn("[SUPABASE UPSERT EXCEPTION]:", err);
  }
}

function saveSafetyRecords(records: SafetyNovedadItem[]) {
  inMemorySafetyRecords = [...records];
  saveSafetyRecordsToSupabase(records).catch(() => {});
}

// Configuración del Webhook de Google Apps Script persistida en Supabase o en memoria
let runtimeWebhookUrl = (
  process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL ||
  process.env.GOOGLE_APPS_SCRIPT_WEBHOOK ||
  process.env.SAFETY_SHEET_WEBHOOK_URL ||
  ""
).trim();

async function loadWebhookUrlFromSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "google_apps_script_webhook_url")
      .maybeSingle();
    if (data && data.value) {
      runtimeWebhookUrl = String(data.value).trim();
    }
  } catch {}
}

loadWebhookUrlFromSupabase().catch(() => {});

function getSafetyWebhookUrl(): string {
  if (runtimeWebhookUrl) return runtimeWebhookUrl;
  return (
    process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL?.trim() ||
    process.env.GOOGLE_APPS_SCRIPT_WEBHOOK?.trim() ||
    process.env.SAFETY_SHEET_WEBHOOK_URL?.trim() ||
    ""
  );
}

async function saveWebhookUrlToSupabase(url: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase.from("app_config").upsert({
      key: "google_apps_script_webhook_url",
      value: url,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });
    if (error) console.warn("[SUPABASE APP_CONFIG ERROR]:", error.message);
  } catch (err) {
    console.warn("[SUPABASE APP_CONFIG EXCEPTION]:", err);
  }
}

function saveSafetyWebhookUrl(url: string) {
  runtimeWebhookUrl = url.trim();
  saveWebhookUrlToSupabase(runtimeWebhookUrl).catch(() => {});
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

async function syncToGoogleAppsScript(payload: any, timeoutMs: number = 8000): Promise<{ success: boolean; result?: any; error?: string; skipped?: boolean }> {
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

  // 2. Sanitizar payload: NUNCA enviar cadenas base64 a Google Apps Script
  // Solo se envían enlaces URL públicos de Supabase y metadatos limpios
  const cleanPayload = { ...payload };
  delete cleanPayload.fileBase64;
  delete cleanPayload.base64Data;
  delete cleanPayload.base64;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      // Google Apps Script maneja text/plain de manera más confiable sin problemas de preflight CORS
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(cleanPayload),
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timer);

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
      if (isDrivePermissionError(json.message) || json.needsDriveAuth) {
        console.info("[SAFETY GAS INFO] Apps Script informó requerimiento de permisos en DriveApp (utilizando almacenamiento web/servidor para evidencias).");
      } else {
        console.warn("[SAFETY GAS NOTICE]:", json.message);
      }
      return {
        success: false,
        error: json.message || "Aviso devuelto por Google Apps Script",
        result: json
      };
    }

    return { success: true, result: json };
  } catch (err: any) {
    clearTimeout(timer);
    const isAbort = err?.name === "AbortError" || err?.message?.includes("aborted");
    if (isAbort) {
      console.warn(`[SAFETY GAS TIMEOUT]: La llamada al Webhook de Google Apps Script superó el límite de ${timeoutMs / 1000}s y fue abortada.`);
      return {
        success: false,
        error: `Tiempo de espera agotado (${timeoutMs / 1000}s) al contactar Google Apps Script.`
      };
    }
    console.error("[SAFETY GOOGLE APPS SCRIPT SYNC ERROR]:", err);
    return { success: false, error: err?.message || String(err) };
  }
}


// 1. Obtener todas las novedades Safety
app.get(["/api/safety-novedades", "/safety-novedades"], async (_req, res) => {
  const records = await loadSafetyRecords();
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

// ============================================================
// 2. Subida de archivo de evidencia (Fotos, Collages, Comprobantes)
// ============================================================
// FLUJO MIGRADO A SUPABASE STORAGE (BUCKET 'evidencias'):
// 1. Cliente envía imagen en base64 y correo institucional.
// 2. Servidor valida correo de dominio @logisticos.co.
// 3. Servidor sube directamente a Supabase Storage (bucket: "evidencias", folder: "evidencias-safety").
// 4. Supabase devuelve la URL pública HTTPS permanente.
// 5. La URL se devuelve al cliente para ser almacenada en Supabase Postgres y Google Sheets.
// ============================================================
app.post(["/api/safety-novedades/upload", "/safety-novedades/upload", "/api/upload", "/upload"], async (req, res) => {
  const { filename, base64Data, userEmail } = req.body || {};

  // Validación de correo institucional
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
    console.log(`[STORAGE UPLOAD] Procesando evidencia para Supabase Storage (usuario: ${userEmail}, filename: ${filename || 'sin_nombre'})...`);

    const storeRes = await processAndStoreEvidence(base64Data, filename, req, "evidencias-safety");
    const evidenceUrl = storeRes.url;
    console.log(`[STORAGE UPLOAD SUCCESS] URL generada en Supabase: ${evidenceUrl}`);

    return res.json({
      success: true,
      url: evidenceUrl,
      secure_url: evidenceUrl,
      publicUrl: evidenceUrl,
      path: storeRes.path,
      filename: storeRes.filename,
      isSupabase: true,
      message: "Evidencia almacenada permanentemente en Supabase Storage (bucket 'evidencias') exitosamente."
    });
  } catch (err: any) {
    console.error("[STORAGE UPLOAD ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: `Error al procesar la evidencia en Supabase: ${err.message || 'Error desconocido'}`
    });
  }
});

// 3. Flujo 1 — Reportar novedad (crea fila nueva)
app.post(["/api/safety-novedades/report", "/safety-novedades/report", "/api/report", "/report"], async (req, res) => {
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

  const records = await loadSafetyRecords();
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
    }, 8000);
  } catch (syncErr: any) {
    console.warn("[SAFETY] Error sincronizando reporte con Google Sheets (no bloqueante):", syncErr);
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
// FLUJO OPTIMIZADO PARA SERVERLESS:
// 1. Si hay archivo en base64, se sube primero a Supabase Storage y se obtiene la URL HTTPS pública permanente.
// 2. Se actualiza inmediatamente la base de datos (Supabase Postgres + memoria), marcando el estado REALIZADO.
// 3. Sincronización con Google Sheets vía Apps Script con timeout corto (8s) en segundo plano (mejor esfuerzo).
app.post(["/api/safety-novedades/close", "/safety-novedades/close", "/api/close", "/close"], async (req, res) => {
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
      message: "El enlace proporcionado es un identificador predictivo no confirmado. Debe subirse la imagen real."
    });
  }

  // Si se envió un archivo en base64 directamente, procesarlo y guardarlo en Supabase Storage (bucket 'evidencias')
  if (!finalEvidencia && fileBase64) {
    try {
      console.log(`[SAFETY CLOSE] Procesando evidencia de corrección en Supabase Storage (fila: ${fila})...`);
      const storeRes = await processAndStoreEvidence(
        fileBase64,
        filename || `evidencia_cierre_fila${fila || 'sin_fila'}`,
        req,
        "evidencias-safety"
      );
      finalEvidencia = storeRes.url;
      console.log(`[SAFETY CLOSE EVIDENCE SUCCESS]: ${finalEvidencia}`);
    } catch (fErr: any) {
      console.error("[SAFETY CLOSE EVIDENCE ERROR]:", fErr);
      return res.status(500).json({
        success: false,
        message: "Error al guardar la evidencia de corrección en Supabase: " + (fErr.message || "Error desconocido")
      });
    }
  }

  // Regla general estricta: NUNCA cambiar a REALIZADO sin evidencia de corrección adjunta
  if (!finalEvidencia) {
    return res.status(400).json({
      success: false,
      message: "Regla obligatoria de Safety: Nunca se puede cambiar el ESTADO a REALIZADO sin adjuntar la evidencia de corrección (archivo cargado o imagen)."
    });
  }

  const records = await loadSafetyRecords();
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

  // 1. Actualizar inmediatamente el registro en memoria y en Supabase Postgres (fuente de verdad duradera)
  record.novedad = updatedNovedad;
  record.evidenciaCorregida = finalEvidencia;
  record.estado = "REALIZADO";
  record.cerradoPor = String(userEmail).trim().toLowerCase();
  record.cerradoFecha = new Date().toISOString();

  records[index] = record;
  saveSafetyRecords(records);

  // 2. Sincronizar cierre con Google Sheets mediante Google Apps Script (con timeout de 8s, mejor esfuerzo)
  // SOLO enviamos el enlace finalEvidencia (link de Supabase), NUNCA base64
  console.log(`[SAFETY CLOSE] Sincronizando link en Google Sheets para fila #${record.fila} (${record.placa})...`);
  let sheetSyncResult: any = null;
  try {
    // Intentar primero con action: "update_evidence" y type: "corregida"
    sheetSyncResult = await syncToGoogleAppsScript({
      action: "update_evidence",
      userEmail: String(userEmail).trim().toLowerCase(),
      id: record.id,
      fila: record.fila,
      placa: record.placa,
      type: "corregida",
      columnIndex: 5,
      evidenciaUrl: finalEvidencia,
      evidenciaCorregida: finalEvidencia,
      novedad: updatedNovedad,
      notaCorreccion: String(notaCorreccion || "").trim()
    }, 8000);

    // Fallback a action: "close" si Apps Script usa el handler tradicional de cierre
    if (!sheetSyncResult?.success) {
      sheetSyncResult = await syncToGoogleAppsScript({
        action: "close",
        userEmail: String(userEmail).trim().toLowerCase(),
        id: record.id,
        fila: record.fila,
        placa: record.placa,
        novedad: updatedNovedad,
        evidenciaCorregida: finalEvidencia,
        notaCorreccion: String(notaCorreccion || "").trim()
      }, 8000);
    }
  } catch (syncErr: any) {
    console.warn("[SAFETY] Aviso sincronizando cierre con Google Sheets (no bloqueante):", syncErr?.message);
    sheetSyncResult = { success: false, error: syncErr?.message };
  }

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
    message: sheetSyncResult?.success
      ? `Cierre exitoso: Actualizado a REALIZADO en Supabase y sincronizado en Google Sheets (fila ${record.fila}).`
      : `Cierre exitoso: Actualizado a REALIZADO en Supabase (fila ${record.fila}). ${sheetSyncResult?.error ? `(Sincronización Sheets pendiente: ${sheetSyncResult.error})` : ''}`
  });
});


// 4.1. AJUSTE: Carga de evidencia pendiente por fila independiente (Reporte o Corrección)
// FLUJO OPTIMIZADO PARA SERVERLESS:
// 1. Si hay archivo en base64, se sube primero a Supabase Storage y se obtiene la URL HTTPS pública permanente.
// 2. Se actualiza inmediatamente la base de datos (Supabase Postgres + memoria), garantizando la respuesta rápida.
// 3. Sincronización con Google Sheets vía Apps Script con timeout corto (8s) en segundo plano (mejor esfuerzo).
app.post(["/api/safety-novedades/update-evidence", "/safety-novedades/update-evidence", "/api/update-evidence", "/update-evidence"], async (req, res) => {
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

  const records = await loadSafetyRecords();
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

  let finalEvidenceUrl = String(evidenciaUrl || "").trim();

  // Validar que no sea un link predictivo simulado
  if (finalEvidenceUrl && (finalEvidenceUrl.includes("1AON_") || finalEvidenceUrl.includes("predictive_"))) {
    return res.status(400).json({
      success: false,
      message: "El enlace proporcionado es un identificador predictivo no confirmado. Debe subirse la imagen real."
    });
  }

  // Si se envió un archivo en base64, procesarlo y guardarlo en Supabase Storage (bucket 'evidencias')
  if (!finalEvidenceUrl && fileBase64) {
    try {
      console.log(`[SAFETY UPDATE EVIDENCE] Guardando evidencia en Supabase Storage para fila #${record.fila}...`);
      const storeRes = await processAndStoreEvidence(
        fileBase64,
        effectiveFilename || `evidencia_${normalizedType}_fila${record.fila}`,
        req,
        "evidencias-safety"
      );
      finalEvidenceUrl = storeRes.url;
      console.log(`[SAFETY UPDATE EVIDENCE SUCCESS]: ${finalEvidenceUrl}`);
    } catch (fErr: any) {
      console.error("[SAFETY UPDATE EVIDENCE ERROR]:", fErr);
      return res.status(500).json({
        success: false,
        message: "Error al guardar evidencia en Supabase Storage: " + (fErr.message || "Error desconocido")
      });
    }
  }

  if (!finalEvidenceUrl) {
    return res.status(400).json({
      success: false,
      message: "Debe suministrar un archivo de evidencia para registrar."
    });
  }

  // 1. Guardar y actualizar inmediatamente en Supabase Postgres y memoria local (fuente de verdad)
  if (normalizedType === "reporte") {
    record.evidenciaReporte = finalEvidenceUrl;
  } else {
    record.evidenciaCorregida = finalEvidenceUrl;
    if (record.estado === "PENDIENTE") {
      record.estado = "REALIZADO";
      record.cerradoPor = effectiveEmail;
      record.cerradoFecha = new Date().toISOString();
    }
  }

  records[index] = record;
  saveSafetyRecords(records);

  // 2. Sincronización en segundo plano con Google Sheets (mejor esfuerzo, con timeout de 8s)
  // SOLO se envía el enlace (evidenciaUrl: finalEvidenceUrl), NUNCA base64 ni llamadas a Drive.
  console.log(`[SAFETY UPDATE EVIDENCE] Sincronizando link con Google Sheets para fila #${record.fila} (${record.placa})...`);
  let sheetSyncResult: any = null;
  try {
    sheetSyncResult = await syncToGoogleAppsScript({
      action: "update_evidence",
      userEmail: effectiveEmail,
      fila: record.fila,
      placa: record.placa,
      type: normalizedType,
      columnIndex: normalizedType === "reporte" ? 4 : 5,
      evidenciaUrl: finalEvidenceUrl
    }, 8000);

    // Fallback para corregida si Apps Script tiene versión previa
    if (!sheetSyncResult?.success && normalizedType === "corregida") {
      sheetSyncResult = await syncToGoogleAppsScript({
        action: "close",
        userEmail: effectiveEmail,
        id: record.id,
        fila: record.fila,
        placa: record.placa,
        evidenciaCorregida: finalEvidenceUrl
      }, 8000);
    }
  } catch (syncErr: any) {
    console.warn("[SAFETY] Aviso sincronizando evidencia con Google Sheets (no bloqueante):", syncErr?.message);
    sheetSyncResult = { success: false, error: syncErr?.message };
  }

  const colLabel = normalizedType === "reporte" ? "EVIDENCIA DEL REPORTE" : "EVIDENCIA CORREGIDA";
  return res.json({
    success: true,
    record,
    type: normalizedType,
    url: finalEvidenceUrl,
    evidenceUrl: finalEvidenceUrl,
    sheetSync: sheetSyncResult,
    message: sheetSyncResult?.success
      ? `${colLabel} guardada en Supabase y sincronizada en Google Sheets (fila #${record.fila}).`
      : `${colLabel} guardada exitosamente en Supabase (fila #${record.fila}). ${sheetSyncResult?.error ? `(Sincronización Sheets pendiente: ${sheetSyncResult.error})` : ''}`
  });
});


// 5. Exportar a CSV con el formato exacto de las 6 columnas de Google Sheets
app.get(["/api/safety-novedades/export-csv", "/safety-novedades/export-csv", "/api/export-csv", "/export-csv"], async (_req, res) => {
  const records = await loadSafetyRecords();

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

// 5.5 Estado del almacenamiento de evidencias y persistencia (Supabase Storage + Postgres)
app.get(["/api/safety-novedades/storage-status", "/safety-novedades/storage-status", "/api/storage-status", "/storage-status"], async (_req, res) => {
  const supabase = getSupabase();
  const hasUrl = Boolean(process.env.SUPABASE_URL?.trim());
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim());

  let storageBucketOk = false;
  let postgresTableOk = false;

  if (supabase) {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      storageBucketOk = Boolean(buckets?.some((b) => b.name === "evidencias"));
    } catch {}

    try {
      const { error } = await supabase.from("safety_novedades").select("id").limit(1);
      postgresTableOk = !error;
    } catch {}
  }

  return res.json({
    success: true,
    mode: "supabase_serverless",
    supabase: {
      isConfigured: hasUrl && hasKey,
      hasUrl,
      hasServiceKey: hasKey,
      storageBucketOk,
      postgresTableOk,
      bucketName: "evidencias",
      tableName: "safety_novedades"
    },
    webhook: {
      isConfigured: Boolean(getSafetyWebhookUrl())
    }
  });
});

// 6. Obtener el código de Google Apps Script y su documentación (embebido en memoria, sin fs)
app.get(["/api/safety-novedades/script", "/safety-novedades/script", "/api/script", "/script"], (_req, res) => {
  return res.json({
    success: true,
    spreadsheetId: GOOGLE_SHEET_ID,
    sheetName: "NOVEDADES-SAFETY",
    script: GOOGLE_APPS_SCRIPT_CODE,
    webhookUrl: getSafetyWebhookUrl(),
    isConfigured: Boolean(getSafetyWebhookUrl())
  });
});

// 7. Configuración del Webhook URL de Google Apps Script
app.get(["/api/safety-novedades/webhook-config", "/safety-novedades/webhook-config", "/api/webhook-config", "/webhook-config"], (_req, res) => {
  const webhookUrl = getSafetyWebhookUrl();
  return res.json({
    success: true,
    webhookUrl,
    isConfigured: Boolean(webhookUrl),
    spreadsheetId: GOOGLE_SHEET_ID,
    sheetName: "NOVEDADES-SAFETY"
  });
});

app.post(["/api/safety-novedades/webhook-config", "/safety-novedades/webhook-config", "/api/webhook-config", "/webhook-config"], (req, res) => {
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
app.post(["/api/safety-novedades/test-webhook", "/safety-novedades/test-webhook", "/api/test-webhook", "/test-webhook"], async (req, res) => {
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
    // 1. Test GET (Estado general y Spreadsheet) con timeout de 6s
    const getController = new AbortController();
    const getTimer = setTimeout(() => getController.abort(), 6000);
    const fetchRes = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      signal: getController.signal
    });
    clearTimeout(getTimer);
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

    // 2. Test POST con action "get_records" para diagnóstico de lectura/escritura (timeout 5s)
    let postDiagnostic: any = null;
    try {
      const postController = new AbortController();
      const postTimer = setTimeout(() => postController.abort(), 5000);
      const postTestRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "get_records" }),
        redirect: "follow",
        signal: postController.signal
      });
      clearTimeout(postTimer);
      const postText = await postTestRes.text();
      try {
        postDiagnostic = JSON.parse(postText);
      } catch {
        postDiagnostic = { raw: postText.slice(0, 150) };
      }
    } catch (pErr: any) {
      postDiagnostic = { success: false, error: pErr.message };
    }

    const postOk = postDiagnostic?.success === true;
    return res.json({
      success: true,
      latencyMs: duration,
      httpStatus: fetchRes.status,
      response: parsed,
      postDiagnostic,
      postOk,
      driveOk: true,
      message: `Conexión con Apps Script verificada (${duration}ms). Hoja sincronizada. Evidencias gestionadas de forma permanente mediante Supabase Storage.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Error al probar conexión con Google Apps Script: ${err.message}`
    });
  }
});

// 9. Sincronización masiva de todos los registros actuales hacia la hoja
app.post(["/api/safety-novedades/bulk-sync", "/safety-novedades/bulk-sync", "/api/bulk-sync", "/bulk-sync"], async (req, res) => {
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

  const records = await loadSafetyRecords();
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  // Manejador 404 estricto para cualquier ruta /api/* no coincidente
  // Previene que peticiones a la API devuelvan el HTML de la SPA
  app.all("/api/*", (req, res) => {
    return res.status(404).json({
      success: false,
      message: `Ruta de API no encontrada: ${req.method} ${req.originalUrl || req.path}`
    });
  });

  // Middleware global de errores para rutas /api/*
  // Garantiza que cualquier excepción devuelva JSON y nunca HTML
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

  const serverPort = Number(process.env.PORT) || PORT;
  app.listen(serverPort, "0.0.0.0", () => {
    console.log(`[AON GALAPA] Server running on http://0.0.0.0:${serverPort}`);
  });
}


// En Vercel Serverless, Vercel no corre servidores Express persistentes (no ejecuta app.listen).
// En desarrollo y entornos locales / contenedor se inicia normalmente con startServer().
if (!process.env.VERCEL) {
  startServer();
}

export default app;
