// Archivo con el código oficial de Google Apps Script (Versión Solo Link)
// Google Drive no interviene: escribe directamente los enlaces de Supabase Storage en las celdas.

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: NOVEDADES-SAFETY (AON GALAPA) - VERSIÓN SOLO LINK
 * Sin Google Drive. Solo escribe los enlaces (de Supabase) en las celdas.
 * =========================================================================
 * Columnas: A=CATEGORÍA, B=PLACA, C=NOVEDAD, D=EVIDENCIA REPORTE,
 *           E=EVIDENCIA CORREGIDA, F=ESTADO (PENDIENTE|REALIZADO)
 */

var CONFIG = {
  SPREADSHEET_ID: "18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk",
  SHEET_NAME: "NOVEDADES-SAFETY",
  HEADERS: ["CATEGORÍA","PLACA","NOVEDAD REGISTRADA","EVIDENCIA DEL REPORTE","EVIDENCIA CORREGIDA","ESTADO"],
  ALLOWED_DOMAIN: "@logisticos.co"
};

function getSheet() {
  var ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }
  catch (e) { ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(CONFIG.HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function normalizePlate(p) {
  if (!p) return "";
  return String(p).trim().toUpperCase().replace(/^CO/, "").replace(/[^A-Z0-9]/g, "");
}

function isInstitutionalEmail(email) {
  if (!email || typeof email !== "string") return false;
  return email.trim().toLowerCase().indexOf(CONFIG.ALLOWED_DOMAIN) !== -1;
}

function json(success, message, extra) {
  var out = { success: success, message: message };
  if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) out[k] = extra[k];
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = {};
    try { data = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
    catch (err) { data = (e && e.parameter) || {}; }

    var action = String(data.action || "report").toLowerCase();
    var sheet = getSheet();

    // ---- ESCRIBIR EVIDENCIA (solo link, sin Drive) ----
    if (action === "update_evidence" || action === "cargar_evidencia") {
      var fila = parseInt(data.fila || "0", 10);
      var type = String(data.type || data.columnType || "").toLowerCase();
      var link = String(data.evidenciaUrl || data.url || "").trim();
      var userEmail = String(data.userEmail || "").trim();

      if (userEmail && !isInstitutionalEmail(userEmail))
        return json(false, "Acceso denegado: correo no institucional.");
      if (!link) return json(false, "No se recibió el enlace de la evidencia.");

      var maxFilas = sheet.getLastRow();
      if (fila < 2 || fila > maxFilas) return json(false, "La fila #" + fila + " no existe.");

      var targetCol = 0, colNombre = "";
      if (type.indexOf("report") !== -1) { targetCol = 4; colNombre = "EVIDENCIA DEL REPORTE"; }
      else if (type.indexOf("correg") !== -1) { targetCol = 5; colNombre = "EVIDENCIA CORREGIDA"; }
      else return json(false, "Tipo inválido. Use 'reporte' o 'corregida'.");

      var existente = String(sheet.getRange(fila, targetCol).getValue() || "").trim();
      if (existente) return json(false, "La fila #" + fila + " ya tiene " + colNombre + " registrada.");

      sheet.getRange(fila, targetCol).setValue(link);

      var estado = String(sheet.getRange(fila, 6).getValue() || "").trim().toUpperCase();
      if (targetCol === 5 && estado === "PENDIENTE") {
        sheet.getRange(fila, 6).setValue("REALIZADO");
        estado = "REALIZADO";
      }
      return json(true, colNombre + " registrada en la fila #" + fila + ".", { fila: fila, url: link, estado: estado });
    }

    // ---- REPORTAR NOVEDAD ----
    if (action === "report" || action === "crear") {
      var categoria = String(data.categoria || "").trim();
      var placa = normalizePlate(data.placa || "");
      var novedad = String(data.novedad || "").trim();
      var evidenciaReporte = String(data.evidenciaReporte || "").trim();
      var email = String(data.userEmail || "").trim();

      if (!categoria) return json(false, "La CATEGORÍA es obligatoria.");
      if (!placa) return json(false, "La PLACA es obligatoria.");
      if (!novedad) return json(false, "La NOVEDAD es obligatoria.");
      if (email && !isInstitutionalEmail(email)) return json(false, "Correo no institucional.");

      sheet.appendRow([categoria, placa, novedad, evidenciaReporte, "", "PENDIENTE"]);
      var lastRow = sheet.getLastRow();
      return json(true, "Novedad de placa " + placa + " agregada en la fila " + lastRow + ".", { fila: lastRow, placa: placa, estado: "PENDIENTE" });
    }

    // ---- CERRAR NOVEDAD (con link de evidencia corregida) ----
    if (action === "close" || action === "cerrar") {
      var closePlaca = normalizePlate(data.placa || "");
      var filaParam = parseInt(data.fila || "0", 10);
      var evidenciaCorregida = String(data.evidenciaCorregida || data.evidenciaUrl || data.url || "").trim();
      var notaCorreccion = String(data.notaCorreccion || "").trim();
      var emailClose = String(data.userEmail || "").trim();

      if (!evidenciaCorregida) return json(false, "Regla: no se puede cerrar sin evidencia de corrección (enlace).");
      if (emailClose && !isInstitutionalEmail(emailClose)) return json(false, "Correo no institucional.");

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return json(false, "No hay novedades para cerrar.");

      var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
      var target = -1;
      if (filaParam >= 2 && filaParam <= lastRow) {
        var off = filaParam - 2;
        if (!closePlaca || normalizePlate(values[off][1]) === closePlaca) target = filaParam;
      }
      if (target === -1 && closePlaca) {
        for (var r = 0; r < values.length; r++) {
          if (normalizePlate(values[r][1]) === closePlaca && String(values[r][5]).toUpperCase() === "PENDIENTE") {
            target = r + 2; break;
          }
        }
      }
      if (target === -1) return json(false, "No se encontró novedad PENDIENTE para la placa " + closePlaca + ".");

      if (notaCorreccion) {
        var cur = sheet.getRange(target, 3).getValue();
        sheet.getRange(target, 3).setValue(cur + " [Nota de Cierre: " + notaCorreccion + "]");
      }
      sheet.getRange(target, 5).setValue(evidenciaCorregida);
      sheet.getRange(target, 6).setValue("REALIZADO");
      return json(true, "Novedad fila " + target + " (Placa " + closePlaca + ") cerrada como REALIZADO.", { fila: target, placa: closePlaca, estado: "REALIZADO" });
    }

    // ---- SINCRONIZACIÓN MASIVA ----
    if (action === "sync_all" && data.records && data.records.length) {
      if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
      var rows = data.records.map(function(it) {
        return [it.categoria || "", normalizePlate(it.placa || ""), it.novedad || "",
                it.evidenciaReporte || "", it.evidenciaCorregida || "", (it.estado || "PENDIENTE").toUpperCase()];
      });
      if (rows.length) sheet.getRange(2, 1, rows.length, 6).setValues(rows);
      return json(true, "Sincronización de " + rows.length + " filas completada.");
    }

    // ---- OBTENER REGISTROS ----
    if (action === "get_records" || action === "read_records" || action === "read") {
      var lr = sheet.getLastRow();
      if (lr < 2) return json(true, "Sin novedades.", { records: [] });
      var vals = sheet.getRange(2, 1, lr - 1, 6).getValues();
      var list = [];
      for (var i = 0; i < vals.length; i++) {
        list.push({
          fila: i + 2,
          id: "NOV-" + String(i + 1).padStart(3, "0"),
          categoria: String(vals[i][0] || "General"),
          placa: normalizePlate(vals[i][1] || ""),
          novedad: String(vals[i][2] || ""),
          evidenciaReporte: String(vals[i][3] || ""),
          evidenciaCorregida: String(vals[i][4] || ""),
          estado: String(vals[i][5] || "PENDIENTE").toUpperCase().indexOf("REALIZADO") !== -1 ? "REALIZADO" : "PENDIENTE"
        });
      }
      return json(true, "Novedades obtenidas.", { records: list });
    }

    return json(false, "Acción desconocida: " + action);
  } catch (err) {
    return json(false, "Error interno: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var sheet = getSheet();
    var lastRow = sheet.getLastRow();
    var stats = { total: 0, pendientes: 0, realizados: 0 };
    if (lastRow > 1) {
      var estados = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
      stats.total = estados.length;
      for (var i = 0; i < estados.length; i++) {
        if (String(estados[i][0]).trim().toUpperCase() === "REALIZADO") stats.realizados++;
        else stats.pendientes++;
      }
    }
    if (e && e.parameter && (e.parameter.action === "get_records" || e.parameter.action === "records")) {
      var recordsList = [];
      if (lastRow > 1) {
        var vals = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
        for (var k = 0; k < vals.length; k++) {
          recordsList.push({
            fila: k + 2,
            id: "NOV-" + String(k + 1).padStart(3, "0"),
            categoria: String(vals[k][0] || "General"),
            placa: normalizePlate(vals[k][1] || ""),
            novedad: String(vals[k][2] || ""),
            evidenciaReporte: String(vals[k][3] || ""),
            evidenciaCorregida: String(vals[k][4] || ""),
            estado: String(vals[k][5] || "PENDIENTE").toUpperCase().indexOf("REALIZADO") !== -1 ? "REALIZADO" : "PENDIENTE"
          });
        }
      }
      return json(true, "Registros obtenidos.", { records: recordsList });
    }
    return json(true, "Webhook activo y sincronizado con NOVEDADES-SAFETY.", {
      sheetName: sheet.getName(),
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      totalFilas: stats.total,
      pendientes: stats.pendientes,
      realizados: stats.realizados,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return json(false, "Error al consultar: " + err.toString());
  }
}
`;
