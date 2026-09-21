/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: SINCRONIZACIÓN BIDIRECCIONAL "NOVEDADES-SAFETY" (AON GALAPA)
 * =========================================================================================
 * Archivo: Código.gs
 * Hoja de Cálculo: AON Galapa - Flota
 * ID de la Hoja: 18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk
 * Pestaña Destino: NOVEDADES-SAFETY
 * 
 * Estructura Oficial de Columnas (6 columnas exactas):
 *   Columna A (1): CATEGORÍA
 *   Columna B (2): PLACA
 *   Columna C (3): NOVEDAD REGISTRADA
 *   Columna D (4): EVIDENCIA DEL REPORTE
 *   Columna E (5): EVIDENCIA CORREGIDA
 *   Columna F (6): ESTADO (PENDIENTE | REALIZADO)
 * 
 * REGLAS DE NEGOCIO ESTRICTAS:
 *   1. Solo usuarios institucionales (@logisticos.co) pueden registrar o cerrar novedades.
 *   2. NUNCA cambiar a REALIZADO sin evidencia de corrección adjunta.
 *   3. NUNCA eliminar filas ni sobrescribir evidencia previa; notas de cierre se concatenan.
 * =========================================================================================
 */

var CONFIG = {
  SPREADSHEET_ID: "18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk",
  SHEET_NAME: "NOVEDADES-SAFETY",
  EVIDENCIAS_FOLDER_NAME: "EVIDENCIAS_SAFETY_AON_GALAPA",
  EVIDENCIAS_FOLDER_ID: "", // Opcional: ID directo de la carpeta en Google Drive si se conoce
  HEADERS: [
    "CATEGORÍA",
    "PLACA",
    "NOVEDAD REGISTRADA",
    "EVIDENCIA DEL REPORTE",
    "EVIDENCIA CORREGIDA",
    "ESTADO"
  ],
  ALLOWED_DOMAIN: "@logisticos.co"
};

/**
 * FUNCIÓN PARA AUTORIZAR PERMISOS DE GOOGLE DRIVE:
 * Ejecute esta función una vez directamente desde el editor de Google Apps Script
 * seleccionando 'autorizarPermisosDrive' y pulsando 'Ejecutar'.
 * Google solicitará la ventana de autorización para Google Drive y Google Sheets.
 * Luego de autorizar, redespliegue una NUEVA VERSIÓN de la Aplicación Web.
 */
function autorizarPermisosDrive() {
  console.log("[AUTORIZACIÓN] Iniciando verificación de permisos de Google Drive...");
  var folder = getOrCreateEvidenciasFolder();
  console.log("[AUTORIZACIÓN] Carpeta localizada con éxito: " + folder.getName() + " (ID: " + folder.getId() + ")");
  
  // Crear archivo de prueba para comprobar permisos de escritura reales
  var testBlob = Utilities.newBlob("Verificación de permisos de Google Drive exitosa el " + new Date().toISOString(), "text/plain", "test_permisos_safety.txt");
  var testFile = folder.createFile(testBlob);
  var testUrl = testFile.getUrl();
  console.log("[AUTORIZACIÓN] Archivo de prueba creado en Drive con éxito: " + testUrl);
  
  // Eliminar archivo de prueba inmediatamente
  testFile.setTrashed(true);
  console.log("[AUTORIZACIÓN COMPLETADA] DriveApp tiene permisos 100% activos. Recuerde: Implementar -> Administrar implementaciones -> Editar -> Versión: Nueva versión -> Implementar.");
  return "OK: Permisos de Drive activos. URL de carpeta: " + folder.getUrl();
}

/**
 * Obtiene la pestaña "NOVEDADES-SAFETY" o la crea con el encabezado oficial si no existe.
 */
function getOrCreateSafetySheet() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    }
  } catch (e) {
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }

  // Buscar por nombre exacto o variantes
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      var name = allSheets[i].getName().trim().toUpperCase();
      if (name === "NOVEDADES-SAFETY" || name === "NOVEDADES SAFETY" || name === "SAFETY NOVEDADES") {
        sheet = allSheets[i];
        break;
      }
    }
  }

  // Si no existe, crear la hoja con encabezado
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(CONFIG.HEADERS);
    formatSafetySheet(sheet);
  }

  return sheet;
}

/**
 * Da formato profesional e institucional a la hoja
 */
function formatSafetySheet(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
  headerRange.setBackground("#0f172a"); // Slate 900
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Segoe UI");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);

  // Ancho de columnas óptimo
  sheet.setColumnWidth(1, 180); // CATEGORÍA
  sheet.setColumnWidth(2, 100); // PLACA
  sheet.setColumnWidth(3, 340); // NOVEDAD REGISTRADA
  sheet.setColumnWidth(4, 250); // EVIDENCIA DEL REPORTE
  sheet.setColumnWidth(5, 250); // EVIDENCIA CORREGIDA
  sheet.setColumnWidth(6, 130); // ESTADO

  // Validación de datos para la columna ESTADO (F: PENDIENTE / REALIZADO)
  var estadoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["PENDIENTE", "REALIZADO"], true)
    .setAllowInvalid(false)
    .setHelpText("El estado solo puede ser PENDIENTE o REALIZADO")
    .build();
  sheet.getRange("F2:F1000").setDataValidation(estadoRule);

  // Reglas de formato condicional (Verde para REALIZADO, Ámbar para PENDIENTE)
  var rangeEstado = sheet.getRange("F2:F1000");
  var ruleRealizado = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("REALIZADO")
    .setBackground("#d1fae5") // Emerald 100
    .setFontColor("#065f46") // Emerald 800
    .setRanges([rangeEstado])
    .build();

  var rulePendiente = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("PENDIENTE")
    .setBackground("#fef3c7") // Amber 100
    .setFontColor("#92400e") // Amber 800
    .setRanges([rangeEstado])
    .build();

  sheet.setConditionalFormatRules([ruleRealizado, rulePendiente]);
}

/**
 * Normaliza la placa eliminando prefijos y caracteres especiales
 */
function normalizePlate(plate) {
  if (!plate) return "";
  return String(plate).trim().toUpperCase().replace(/^CO/, "").replace(/[^A-Z0-9]/g, "");
}

/**
 * Valida el correo institucional del usuario
 */
function isInstitutionalEmail(email) {
  if (!email || typeof email !== "string") return false;
  var clean = email.trim().toLowerCase();
  return clean.indexOf(CONFIG.ALLOWED_DOMAIN) !== -1;
}

/**
 * Carpeta oficial en Google Drive para almacenamiento de evidencias
 */
function getOrCreateEvidenciasFolder() {
  var folderName = CONFIG.EVIDENCIAS_FOLDER_NAME || "EVIDENCIAS_SAFETY_AON_GALAPA";

  // 1. Si se configuró un ID explícito, probarlo primero
  if (CONFIG.EVIDENCIAS_FOLDER_ID && String(CONFIG.EVIDENCIAS_FOLDER_ID).trim()) {
    try {
      var folderById = DriveApp.getFolderById(String(CONFIG.EVIDENCIAS_FOLDER_ID).trim());
      if (folderById) {
        console.log("[DRIVE] Carpeta obtenida por ID (" + CONFIG.EVIDENCIAS_FOLDER_ID + "): " + folderById.getName());
        return folderById;
      }
    } catch (e) {
      console.warn("[DRIVE] No se pudo abrir la carpeta por ID: " + e.toString());
    }
  }

  // 2. Buscar por nombre exacto en Drive
  try {
    var folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      var existingFolder = folders.next();
      console.log("[DRIVE] Carpeta localizada por nombre: " + existingFolder.getName() + " [ID: " + existingFolder.getId() + "]");
      return existingFolder;
    }
  } catch (searchErr) {
    console.warn("[DRIVE] Estado de acceso a DriveApp: " + searchErr.toString());
    throw new Error("Error al acceder a Google Drive (verifique permisos de DriveApp): " + searchErr.toString());
  }

  // 3. Si no existe, crear la carpeta
  try {
    var newFolder = DriveApp.createFolder(folderName);
    try {
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      console.warn("[DRIVE] Permisos de compartir la carpeta en modo público: " + shareErr.toString());
    }
    console.log("[DRIVE] Nueva carpeta creada: " + newFolder.getName() + " [ID: " + newFolder.getId() + "]");
    return newFolder;
  } catch (createErr) {
    console.error("[DRIVE] Error al crear la carpeta '" + folderName + "': " + createErr.toString());
    throw new Error("No se pudo crear la carpeta '" + folderName + "' en Drive: " + createErr.toString());
  }
}

/**
 * Guarda un archivo base64 en Google Drive y genera automáticamente su enlace público
 */
function uploadFileToGoogleDrive(filename, base64Data, mimeType) {
  if (!base64Data) {
    throw new Error("No se recibió contenido base64 para subir a Google Drive.");
  }
  var cleanBase64 = String(base64Data).trim();
  var detectedMime = mimeType || "image/jpeg";
  if (cleanBase64.indexOf(",") !== -1) {
    var parts = cleanBase64.split(",");
    var mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch && mimeMatch[1]) {
      detectedMime = mimeMatch[1];
    }
    cleanBase64 = parts[1];
  }

  console.log("[DRIVE UPLOAD] Decodificando base64 para archivo: " + filename + " (MIME: " + detectedMime + ")...");
  var decodedBytes = Utilities.base64Decode(cleanBase64);
  if (!decodedBytes || decodedBytes.length === 0) {
    throw new Error("El archivo base64 decodificado tiene 0 bytes.");
  }
  console.log("[DRIVE UPLOAD] Bytes decodificados: " + decodedBytes.length + " bytes (" + (decodedBytes.length / 1024 / 1024).toFixed(2) + " MB)");

  var cleanName = (filename || ("evidencia_safety_" + new Date().getTime() + ".jpg")).replace(/[^a-zA-Z0-9._-]/g, "_");
  var blob = Utilities.newBlob(decodedBytes, detectedMime, cleanName);
  var folder = getOrCreateEvidenciasFolder();

  console.log("[DRIVE UPLOAD] Creando archivo '" + cleanName + "' en la carpeta '" + folder.getName() + "'...");
  var file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareFileErr) {
    console.warn("[DRIVE] Permiso de enlace público para el archivo: " + shareFileErr.toString());
  }

  var fileUrl = file.getUrl();
  var fileId = file.getId();
  if (!fileUrl && fileId) {
    fileUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
  }

  console.log("[DRIVE UPLOAD COMPLETADO CON ÉXITO] Archivo: " + cleanName + " | ID: " + fileId + " | URL: " + fileUrl);
  return fileUrl;
}

/**
 * =========================================================================
 * ENDPOINT PRINCIPAL POST: Recibe las novedades desde el Dashboard o Formulario
 * =========================================================================
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Esperar hasta 10 segundos para evitar colisiones de concurrencia
    lock.waitLock(10000);

    var rawContent = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = {};
    try {
      data = JSON.parse(rawContent);
    } catch (parseErr) {
      data = e.parameter || {};
    }

    var action = (data.action || e.parameter.action || "report").toLowerCase();
    var sheet = getOrCreateSafetySheet();

    // -----------------------------------------------------------------
    // ACCIÓN -1: VERIFICACIÓN DE PERMISOS DE GOOGLE DRIVE
    // -----------------------------------------------------------------
    if (action === "test_drive" || action === "check_drive" || action === "check_permissions") {
      console.log("[SAFETY APPS SCRIPT] Verificando permisos de Drive...");
      try {
        var testFolder = getOrCreateEvidenciasFolder();
        return createJsonResponse(true, "Permisos de Google Drive activos correctamente. Carpeta verificada.", {
          folderName: testFolder.getName(),
          folderId: testFolder.getId(),
          folderUrl: testFolder.getUrl()
        });
      } catch (permErr) {
        console.error("[SAFETY APPS SCRIPT PERMISSION ERROR]: " + permErr.toString());
        return createJsonResponse(false, "Fallo de permisos en Google Drive: " + permErr.toString(), {
          needsAuthorization: true,
          error: permErr.toString()
        });
      }
    }

    // -----------------------------------------------------------------
    // ACCIÓN 0: SUBIR ARCHIVO A GOOGLE DRIVE Y OBTENER LINK CONFIRMADO
    // -----------------------------------------------------------------
    if (action === "upload_evidence" || action === "upload_drive_file" || action === "upload") {
      var uploadBase64 = data.base64Data || data.fileBase64 || data.base64 || e.parameter.base64Data;
      var uploadFilename = String(data.filename || e.parameter.filename || ("evidencia_" + new Date().getTime() + ".jpg")).trim();
      var uploadMime = String(data.mimeType || e.parameter.mimeType || "image/jpeg").trim();

      if (!uploadBase64) {
        return createJsonResponse(false, "No se recibió archivo o base64 para subir a Google Drive.");
      }

      try {
        var driveUrl = uploadFileToGoogleDrive(uploadFilename, uploadBase64, uploadMime);
        return createJsonResponse(true, "Archivo subido correctamente a Google Drive.", {
          driveUrl: driveUrl,
          url: driveUrl,
          filename: uploadFilename
        });
      } catch (upErr) {
        var errStr = upErr.toString();
        var isDrivePermError = errStr.indexOf("DriveApp") !== -1 || errStr.indexOf("permission") !== -1 || errStr.indexOf("drive.readonly") !== -1 || errStr.indexOf("auth") !== -1;
        if (isDrivePermError) {
          console.warn("[SAFETY APPS SCRIPT UPLOAD NOTICE]: DriveApp requiere autorización.");
        } else {
          console.error("[SAFETY APPS SCRIPT UPLOAD ERROR]: " + errStr);
        }
        return createJsonResponse(false, "Error al guardar en Google Drive: " + errStr, {
          error: errStr,
          needsDriveAuth: isDrivePermError,
          instructions: isDrivePermError ? "Ejecute la función 'autorizarPermisosDrive' en el editor de Apps Script para autorizar DriveApp." : ""
        });
      }
    }

    // -----------------------------------------------------------------
    // ACCIÓN NUEVA: CARGAR EVIDENCIA POR FILA INDEPENDIENTE (Reporte o Corrección)
    // Escribe únicamente en la celda correspondiente sin tocar las demás columnas.
    // Si la celda ya tiene valor, no permite sobrescribir ni reemplazar.
    // -----------------------------------------------------------------
    if (action === "update_evidence" || action === "cargar_evidencia" || action === "subir_evidencia_fila") {
      var filaEvidencia = parseInt(data.fila || e.parameter.fila || "0", 10);
      var typeEvidencia = String(data.type || data.columnType || e.parameter.type || "").toLowerCase();
      var colIndexParam = parseInt(data.columnIndex || e.parameter.columnIndex || "0", 10);
      var linkEvidencia = String(data.evidenciaUrl || data.url || e.parameter.evidenciaUrl || "").trim();
      var userEmailEvidencia = String(data.userEmail || e.parameter.userEmail || "").trim();

      // Validar correo institucional
      if (userEmailEvidencia && !isInstitutionalEmail(userEmailEvidencia)) {
        return createJsonResponse(false, "Acceso denegado: El correo debe pertenecer al dominio institucional @logisticos.co.");
      }

      // Si se envió archivo base64 en lugar de URL directa, subir primero a Google Drive
      var rawBase64 = data.fileBase64 || data.base64Data || data.base64;
      if (!linkEvidencia && rawBase64) {
        try {
          var uploadName = String(data.filename || ("evidencia_" + typeEvidencia + "_" + new Date().getTime() + ".jpg")).trim();
          var uploadMime = String(data.mimeType || "image/jpeg").trim();
          linkEvidencia = uploadFileToGoogleDrive(uploadName, rawBase64, uploadMime);
        } catch (upErr) {
          return createJsonResponse(false, "Error al subir la evidencia a Google Drive: " + upErr.toString());
        }
      }

      if (!linkEvidencia) {
        return createJsonResponse(false, "No se proporcionó archivo ni enlace para registrar la evidencia.");
      }

      var maxFilas = sheet.getLastRow();
      if (filaEvidencia < 2 || filaEvidencia > maxFilas) {
        return createJsonResponse(false, "El número de fila especificado (#" + filaEvidencia + ") no existe en la hoja.");
      }

      // Determinar columna destino oficial:
      // Columna D (4): EVIDENCIA DEL REPORTE
      // Columna E (5): EVIDENCIA CORREGIDA
      var targetCol = 0;
      var colNombre = "";
      if (typeEvidencia.indexOf("report") !== -1 || colIndexParam === 4 || colIndexParam === 3) {
        targetCol = 4; // Columna D
        colNombre = "EVIDENCIA DEL REPORTE";
      } else if (typeEvidencia.indexOf("correg") !== -1 || colIndexParam === 5 || colIndexParam === 4) {
        targetCol = 5; // Columna E
        colNombre = "EVIDENCIA CORREGIDA";
      } else {
        return createJsonResponse(false, "Tipo de evidencia inválido. Debe ser 'reporte' o 'corregida'.");
      }

      // Regla estricta: Si ya tiene valor, NO permitir sobrescribir ni reemplazar
      var valorExistente = String(sheet.getRange(filaEvidencia, targetCol).getValue() || "").trim();
      if (valorExistente) {
        return createJsonResponse(false, "La fila #" + filaEvidencia + " ya cuenta con " + colNombre + " registrada (" + valorExistente + "). Por regla estricta no se permite sobrescribir ni reemplazar.");
      }

      // Escribir el enlace resultante en la celda específica, sin tocar las demás columnas
      sheet.getRange(filaEvidencia, targetCol).setValue(linkEvidencia);

      // Si se cargó la evidencia corregida en una fila PENDIENTE, actualizar estado a REALIZADO
      var estadoActual = String(sheet.getRange(filaEvidencia, 6).getValue() || "").trim().toUpperCase();
      var estadoFinal = estadoActual;
      if (targetCol === 5 && estadoActual === "PENDIENTE") {
        sheet.getRange(filaEvidencia, 6).setValue("REALIZADO");
        estadoFinal = "REALIZADO";
      }

      return createJsonResponse(true, colNombre + " registrada con éxito en la fila #" + filaEvidencia + ".", {
        fila: filaEvidencia,
        columna: colNombre,
        colIndex: targetCol,
        url: linkEvidencia,
        estado: estadoFinal
      });
    }

    // -----------------------------------------------------------------
    // ACCIÓN 1: REPORTAR NOVEDAD (Crea una nueva fila al final)
    // -----------------------------------------------------------------
    if (action === "report" || action === "crear") {
      var categoria = String(data.categoria || e.parameter.categoria || "").trim();
      var placa = normalizePlate(data.placa || e.parameter.placa || "");
      var novedad = String(data.novedad || e.parameter.novedad || "").trim();
      var evidenciaReporte = String(data.evidenciaReporte || e.parameter.evidenciaReporte || "").trim();
      var userEmail = String(data.userEmail || e.parameter.userEmail || "").trim();

      if (!categoria) {
        return createJsonResponse(false, "La CATEGORÍA es obligatoria para reportar la novedad.");
      }
      if (!placa) {
        return createJsonResponse(false, "La PLACA del vehículo es obligatoria.");
      }
      if (!novedad) {
        return createJsonResponse(false, "La descripción de la NOVEDAD REGISTRADA es obligatoria.");
      }

      // Validar correo institucional si fue enviado
      if (userEmail && !isInstitutionalEmail(userEmail)) {
        return createJsonResponse(false, "Acceso denegado: El correo debe pertenecer al dominio institucional @logisticos.co.");
      }

      var newRow = [
        categoria,
        placa,
        novedad,
        evidenciaReporte,
        "", // EVIDENCIA CORREGIDA inicia vacía
        "PENDIENTE" // ESTADO inicial
      ];

      sheet.appendRow(newRow);
      var lastRow = sheet.getLastRow();

      // Formato de texto para la nueva fila
      var rowRange = sheet.getRange(lastRow, 1, 1, 6);
      rowRange.setFontFamily("Segoe UI");
      rowRange.setFontSize(9);
      rowRange.setVerticalAlignment("middle");
      sheet.getRange(lastRow, 2).setHorizontalAlignment("center").setFontWeight("bold"); // Placa
      sheet.getRange(lastRow, 6).setHorizontalAlignment("center").setFontWeight("bold"); // Estado

      return createJsonResponse(true, "Novedad de placa " + placa + " agregada con éxito en la fila " + lastRow + " de NOVEDADES-SAFETY.", {
        fila: lastRow,
        categoria: categoria,
        placa: placa,
        estado: "PENDIENTE"
      });
    }

    // -----------------------------------------------------------------
    // ACCIÓN 2: CERRAR NOVEDAD (Actualiza fila a REALIZADO con evidencia)
    // -----------------------------------------------------------------
    if (action === "close" || action === "cerrar") {
      var closePlaca = normalizePlate(data.placa || e.parameter.placa || "");
      var filaParam = parseInt(data.fila || e.parameter.fila || "0", 10);
      var evidenciaCorregida = String(data.evidenciaCorregida || e.parameter.evidenciaCorregida || "").trim();
      var notaCorreccion = String(data.notaCorreccion || e.parameter.notaCorreccion || "").trim();
      var userEmailClose = String(data.userEmail || e.parameter.userEmail || "").trim();
      var novedadQuery = String(data.novedad || e.parameter.novedad || "").trim().toLowerCase();

      // Si se envió archivo en base64 en lugar de link previo, subir automáticamente a Google Drive
      var fileBase64 = data.fileBase64 || data.base64Data || data.base64;
      if (!evidenciaCorregida && fileBase64) {
        try {
          var uploadFilename = String(data.filename || ("evidencia_cierre_" + closePlaca + "_" + new Date().getTime() + ".jpg")).trim();
          var uploadMime = String(data.mimeType || "image/jpeg").trim();
          evidenciaCorregida = uploadFileToGoogleDrive(uploadFilename, fileBase64, uploadMime);
        } catch (uploadErr) {
          return createJsonResponse(false, "Error al subir la evidencia a Google Drive: " + uploadErr.toString());
        }
      }

      // Regla de Oro: NUNCA REALIZADO sin evidencia de corrección
      if (!evidenciaCorregida) {
        return createJsonResponse(false, "Regla obligatoria: Nunca se puede cambiar a REALIZADO sin adjuntar la evidencia de corrección (enlace o foto).");
      }

      if (userEmailClose && !isInstitutionalEmail(userEmailClose)) {
        return createJsonResponse(false, "Acceso denegado: Debe autenticarse con correo institucional @logisticos.co.");
      }

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return createJsonResponse(false, "No hay novedades registradas en la hoja para cerrar.");
      }

      var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
      var targetRowIndex = -1;

      // Opción A: Buscar por número exacto de fila si coincide con la placa
      if (filaParam >= 2 && filaParam <= lastRow) {
        var rowOffset = filaParam - 2;
        var rowPlaca = normalizePlate(values[rowOffset][1]);
        if (!closePlaca || rowPlaca === closePlaca) {
          targetRowIndex = filaParam;
        }
      }

      // Opción B: Si no se dio fila o no coincidió, buscar la primera novedad PENDIENTE de esa placa
      if (targetRowIndex === -1 && closePlaca) {
        for (var r = 0; r < values.length; r++) {
          var rowPlacaNorm = normalizePlate(values[r][1]);
          var rowEstado = String(values[r][5]).trim().toUpperCase();
          var rowNovedad = String(values[r][2]).trim().toLowerCase();

          if (rowPlacaNorm === closePlaca && rowEstado === "PENDIENTE") {
            if (!novedadQuery || rowNovedad.indexOf(novedadQuery) !== -1 || noveltyMatches(rowNovedad, novedadQuery)) {
              targetRowIndex = r + 2; // +2 porque el índice 0 corresponde a la fila 2 de la hoja
              break;
            }
          }
        }
      }

      if (targetRowIndex === -1) {
        return createJsonResponse(false, "No se encontró una novedad PENDIENTE para la placa " + closePlaca + " en la hoja.");
      }

      // Regla estricta: NUNCA eliminar filas ni borrar novedades originales.
      // Si se incluye nota, se anexa al texto original en la Columna C
      var currentNovedad = sheet.getRange(targetRowIndex, 3).getValue();
      if (notaCorreccion) {
        var updatedNovedad = currentNovedad + " [Nota de Cierre / Corrección: " + notaCorreccion + "]";
        sheet.getRange(targetRowIndex, 3).setValue(updatedNovedad);
      }

      // Actualizar Columna E (Evidencia Corregida) y Columna F (Estado = REALIZADO)
      sheet.getRange(targetRowIndex, 5).setValue(evidenciaCorregida);
      sheet.getRange(targetRowIndex, 6).setValue("REALIZADO");

      return createJsonResponse(true, "Novedad en la fila " + targetRowIndex + " (Placa " + closePlaca + ") cerrada con éxito en estado REALIZADO.", {
        fila: targetRowIndex,
        placa: closePlaca,
        estado: "REALIZADO",
        evidenciaCorregida: evidenciaCorregida
      });
    }

    // -----------------------------------------------------------------
    // ACCIÓN 3: SINCRONIZACIÓN MASIVA (Bulk Sync)
    // -----------------------------------------------------------------
    if (action === "sync_all" && data.records && Array.isArray(data.records)) {
      var records = data.records;
      // Mantener encabezado y limpiar contenido previo
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
      }

      var rowsToAdd = records.map(function(item) {
        return [
          item.categoria || "",
          normalizePlate(item.placa || ""),
          item.novedad || "",
          item.evidenciaReporte || "",
          item.evidenciaCorregida || "",
          (item.estado || "PENDIENTE").toUpperCase()
        ];
      });

      if (rowsToAdd.length > 0) {
        sheet.getRange(2, 1, rowsToAdd.length, 6).setValues(rowsToAdd);
      }
      formatSafetySheet(sheet);

      return createJsonResponse(true, "Sincronización masiva de " + rowsToAdd.length + " filas completada con éxito.");
    }

    return createJsonResponse(false, "Acción desconocida: " + action + ". Use 'report', 'close' o 'sync_all'.");

  } catch (err) {
    return createJsonResponse(false, "Error interno en Google Apps Script: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * Comparador flexible de novedad para búsquedas aproximadas
 */
function noveltyMatches(strA, strB) {
  if (!strA || !strB) return false;
  var cleanA = strA.toLowerCase().replace(/[^a-z0-9]/g, "");
  var cleanB = strB.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleanA.indexOf(cleanB) !== -1 || cleanB.indexOf(cleanA) !== -1;
}

/**
 * =========================================================================
 * ENDPOINT GET: Diagnóstico y consulta de datos en tiempo real
 * =========================================================================
 */
function doGet(e) {
  try {
    var sheet = getOrCreateSafetySheet();
    var lastRow = sheet.getLastRow();
    
    var stats = {
      total: 0,
      pendientes: 0,
      realizados: 0
    };

    if (lastRow > 1) {
      var estados = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
      stats.total = estados.length;
      for (var i = 0; i < estados.length; i++) {
        var est = String(estados[i][0]).trim().toUpperCase();
        if (est === "REALIZADO") stats.realizados++;
        else stats.pendientes++;
      }
    }

    // Comprobar estado de acceso a Google Drive
    var driveStatus = { ready: false, message: "" };
    try {
      var folder = getOrCreateEvidenciasFolder();
      driveStatus = {
        ready: true,
        folderName: folder.getName(),
        folderId: folder.getId(),
        message: "Google Drive conectado y carpeta '" + folder.getName() + "' verificada."
      };
    } catch (dErr) {
      driveStatus = {
        ready: false,
        message: "Google Drive requiere autorización de permisos en Apps Script: " + dErr.toString()
      };
    }

    return createJsonResponse(true, "Webhook de Google Apps Script activo y sincronizado con NOVEDADES-SAFETY.", {
      sheetName: sheet.getName(),
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      totalFilas: stats.total,
      pendientes: stats.pendientes,
      realizados: stats.realizados,
      drive: driveStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse(false, "Error al consultar la hoja: " + err.toString());
  }
}

/**
 * Genera respuesta HTTP JSON válida para Web Apps de Apps Script
 */
function createJsonResponse(success, message, extra) {
  var output = {
    success: success,
    message: message
  };
  if (extra) {
    for (var key in extra) {
      if (extra.hasOwnProperty(key)) {
        output[key] = extra[key];
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * =========================================================================
 * MENÚ PERSONALIZADO EN GOOGLE SHEETS
 * Permite a los supervisores ejecutar acciones directamente desde la interfaz
 * =========================================================================
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🛡️ AON Safety Flota")
    .addItem("✨ Dar Formato y Colores Oficiales", "menuFormatSheet")
    .addItem("📊 Resumen de Pendientes vs Realizados", "menuShowSummary")
    .addSeparator()
    .addItem("🔒 Validar Reglas y Columnas", "menuValidateData")
    .addToUi();
}

function menuFormatSheet() {
  var sheet = getOrCreateSafetySheet();
  formatSafetySheet(sheet);
  SpreadsheetApp.getActiveSpreadsheet().toast("Formato oficial aplicado a NOVEDADES-SAFETY.", "AON Galapa");
}

function menuShowSummary() {
  var sheet = getOrCreateSafetySheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No hay novedades registradas.");
    return;
  }
  var estados = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
  var p = 0, r = 0;
  for (var i = 0; i < estados.length; i++) {
    if (String(estados[i][0]).toUpperCase() === "REALIZADO") r++;
    else p++;
  }
  var tasa = estados.length > 0 ? Math.round((r / estados.length) * 100) : 0;
  SpreadsheetApp.getUi().alert(
    "📊 RESUMEN DE NOVEDADES SAFETY\n\n" +
    "• Total Novedades: " + estados.length + "\n" +
    "• Pendientes: " + p + "\n" +
    "• Realizados: " + r + "\n" +
    "• Eficacia de Cierre: " + tasa + "%"
  );
}

function menuValidateData() {
  var sheet = getOrCreateSafetySheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("La hoja no contiene datos.");
    return;
  }
  var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var issues = [];

  for (var i = 0; i < values.length; i++) {
    var fila = i + 2;
    var placa = values[i][1];
    var estado = String(values[i][5]).toUpperCase();
    var evidenciaCorregida = String(values[i][4]).trim();

    if (!placa) {
      issues.push("Fila " + fila + ": Falta la placa del vehículo.");
    }
    if (estado === "REALIZADO" && !evidenciaCorregida) {
      issues.push("Fila " + fila + " (" + placa + "): Marcado como REALIZADO pero no tiene evidencia de corrección.");
    }
  }

  if (issues.length === 0) {
    SpreadsheetApp.getUi().alert("✅ Validación Exitosa: Todas las filas cumplen las reglas institucionales.");
  } else {
    SpreadsheetApp.getUi().alert("⚠️ Alertas Encontradas (" + issues.length + "):\n\n" + issues.slice(0, 10).join("\n") + (issues.length > 10 ? "\n... y más." : ""));
  }
}
