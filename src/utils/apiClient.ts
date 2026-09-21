/**
 * apiClient.ts
 * Utilidad segura para peticiones fetch hacia los endpoints de la API y Google Apps Script.
 * 
 * Previene completamente el error de sintaxis:
 * "Unexpected token '<', '<!doctype '... is not valid JSON"
 * 
 * Maneja los 5 puntos críticos:
 * 1. Detección de endpoints erróneos (404, rutas relativas).
 * 2. Detección de páginas de inicio de sesión de Google (falta de permiso "Cualquier usuario").
 * 3. Detección de URLs de Apps Script que terminan en /dev en vez de /exec.
 * 4. Manejo seguro de texto antes de parsear JSON.
 * 5. Reporte de diagnósticos comprensibles para el usuario.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new ApiError(
      `Error de conexión de red al llamar a ${url}: ${netErr?.message || 'Verifique su conexión a internet.'}`,
      0
    );
  }

  const rawText = await res.text();
  let parsedData: any = null;

  try {
    parsedData = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Si JSON.parse falla, analizar el texto devuelto (HTML o mensaje de error de Vercel/Cloud Run/Proxy)
    console.error(`[API CLIENT] Respuesta no-JSON de ${url} (HTTP ${res.status}):`, rawText.slice(0, 250));

    const trimmed = rawText.trim();
    const isHtml =
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML') ||
      trimmed.startsWith('<head') ||
      (res.headers.get('content-type')?.includes('text/html') ?? false);

    // 0. Caso: Servidor en proceso de inicio o reinicio en Cloud Run / Contenedor
    if (
      trimmed.includes('Starting Server') ||
      trimmed.includes('starting server') ||
      trimmed.includes('Please wait while your application starts')
    ) {
      const isRetry = Boolean((options?.headers as any)?.['x-retry-server-start']);
      if (!isRetry) {
        // Esperar 2 segundos y reintentar automáticamente una vez
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const retryHeaders = new Headers(options?.headers);
        retryHeaders.set('x-retry-server-start', '1');
        return safeFetchJson(url, { ...options, headers: retryHeaders });
      }
      throw new ApiError(
        'El servidor de la aplicación está iniciando o actualizándose en este momento. Por favor espera 3 segundos e intenta nuevamente.',
        503
      );
    }

    // 1. Caso: Error 404 (tanto en Cloud Run, Vercel "NOT_FOUND iad1::...", Nginx o proxies)
    if (
      res.status === 404 ||
      trimmed.includes('NOT_FOUND') ||
      trimmed.includes('The page could not be found') ||
      trimmed.toLowerCase().includes('not found')
    ) {
      throw new ApiError(
        `Ruta o servicio no encontrado en el servidor (HTTP 404: ${url}). Si estás usando despliegue estático, se activará el modo de respaldo local.`,
        404
      );
    }

    // 2. Caso: Pantalla de Login / Autenticación de Google Accounts
    if (
      trimmed.includes('ServiceLogin') ||
      trimmed.includes('accounts.google.com') ||
      trimmed.includes('Sign in - Google Accounts') ||
      trimmed.includes('Google Drive – Vínculo de acceso denegado')
    ) {
      throw new ApiError(
        'Google Apps Script devolvió una página de inicio de sesión de Google (HTML en vez de JSON). ' +
        'En Google Apps Script, ve a Implementar > Administrar implementaciones > Editar y asegúrate de que ' +
        '"Quién tiene acceso" esté en "Cualquier usuario" (Anyone). Luego crea una Nueva Versión.',
        401
      );
    }

    // 3. Caso: URL /dev en lugar de /exec
    if (url.includes('/dev') || trimmed.includes('dev-mode')) {
      throw new ApiError(
        'La URL configurada termina en "/dev". Las URLs de prueba /dev requieren sesión de Google y devuelven HTML. ' +
        'Debes usar la URL de la aplicación web que termina en "/exec".',
        400
      );
    }

    // 4. Caso: Error 502 / 504
    if (res.status === 502 || res.status === 504) {
      throw new ApiError(`El servicio no respondió a tiempo (HTTP ${res.status}). Intente de nuevo en unos segundos.`, res.status);
    }

    // 5. Caso: Error 413
    if (res.status === 413) {
      throw new ApiError('El tamaño de los archivos adjuntos excede el límite permitido por el servidor.', 413);
    }

    if (isHtml) {
      // Extracción de título HTML para contexto
      const titleMatch = rawText.match(/<title[^>]*>(.*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : '';
      const detail = pageTitle ? ` (${pageTitle})` : '';

      throw new ApiError(
        `El servidor devolvió una página HTML en vez de JSON${detail}. ` +
        `Verifica la configuración del Webhook en 'Conexión Google Sheets'.`,
        res.status || 500
      );
    }

    // Texto no HTML pero tampoco JSON válido
    throw new ApiError(
      `El servidor respondió con formato no esperado: ${trimmed.slice(0, 150)}`,
      res.status || 500
    );
  }

  // Si res.status >= 400 y el JSON tiene mensaje de error
  if (!res.ok) {
    const errorMsg = parsedData?.message || parsedData?.error || `Error HTTP ${res.status}`;
    throw new ApiError(errorMsg, res.status, parsedData);
  }

  return {
    ok: res.ok,
    status: res.status,
    data: parsedData as T
  };
}

/**
 * Valida si una URL de Google Apps Script es correcta y no usa /dev
 */
export function validateAppsScriptUrl(url: string): { isValid: boolean; error?: string; fixedUrl?: string } {
  const clean = String(url || '').trim();
  if (!clean) {
    return { isValid: false, error: 'La URL del Webhook no puede estar vacía.' };
  }

  if (!clean.startsWith('https://script.google.com/macros/s/')) {
    return {
      isValid: false,
      error: 'La URL debe ser de Google Apps Script y comenzar con "https://script.google.com/macros/s/"'
    };
  }

  if (clean.endsWith('/dev')) {
    const fixedUrl = clean.replace(/\/dev$/, '/exec');
    return {
      isValid: false,
      error: 'La URL termina en "/dev". Las URLs /dev devuelven páginas HTML de autenticación. Debes usar la que termina en "/exec".',
      fixedUrl
    };
  }

  if (!clean.endsWith('/exec')) {
    return {
      isValid: false,
      error: 'La URL debe terminar en "/exec" para poder responder peticiones web como JSON.'
    };
  }

  return { isValid: true };
}
