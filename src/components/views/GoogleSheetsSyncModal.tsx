import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Code,
  Copy,
  Check,
  Download,
  Webhook,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Wrench
} from 'lucide-react';
import { safeFetchJson, validateAppsScriptUrl } from '../../utils/apiClient';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionalEmail: string;
  totalRecordsCount: number;
  onSyncCompleted?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  institutionalEmail,
  totalRecordsCount,
  onSyncCompleted
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'webhook' | 'bulksync'>('script');
  const [scriptCode, setScriptCode] = useState<string>('');
  const [spreadsheetId, setSpreadsheetId] = useState<string>('18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk');
  const [sheetName, setSheetName] = useState<string>('NOVEDADES-SAFETY');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoadingScript, setIsLoadingScript] = useState<boolean>(true);

  // Actions state
  const [copied, setCopied] = useState<boolean>(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number; details?: any; driveOk?: boolean; driveDiagnostic?: any } | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState<boolean>(false);
  const [bulkSyncResult, setBulkSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<any>(null);

  // Load script and webhook config on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingScript(true);
    setErrorMsg(null);

    Promise.all([
      safeFetchJson('/api/safety-novedades/script').then((r) => r.data),
      safeFetchJson('/api/safety-novedades/webhook-config').then((r) => r.data),
      safeFetchJson('/api/safety-novedades/storage-status').then((r) => r.data).catch(() => null)
    ])
      .then(([scriptData, webhookData, storageData]) => {
        if (!isMounted) return;

        if (scriptData?.success) {
          setScriptCode(scriptData.script || '');
          if (scriptData.spreadsheetId) setSpreadsheetId(scriptData.spreadsheetId);
          if (scriptData.sheetName) setSheetName(scriptData.sheetName);
        }
        if (webhookData?.success) {
          setWebhookUrl(webhookData.webhookUrl || '');
          setIsConfigured(Boolean(webhookData.isConfigured));
        }
        if (storageData?.success) {
          setStorageStatus(storageData);
        }
      })
      .catch((err) => {
        if (isMounted) setErrorMsg('Error al consultar configuración: ' + err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingScript(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = scriptCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadScript = () => {
    const blob = new Blob([scriptCode], { type: 'text/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Codigo_Apps_Script_Novedades_Safety.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveWebhook = async () => {
    const val = validateAppsScriptUrl(webhookUrl);
    if (!val.isValid) {
      setErrorMsg(val.error || 'URL inválida');
      return;
    }

    setIsSavingWebhook(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await safeFetchJson('/api/safety-novedades/webhook-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          userEmail: institutionalEmail
        })
      });
      const data = res.data;
      if (data.success) {
        setIsConfigured(data.isConfigured);
        setSuccessMsg('¡URL del Webhook de Google Apps Script guardada correctamente!');
      } else {
        throw new Error(data.message || 'No se pudo guardar la configuración');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar Webhook');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setErrorMsg('Primero ingrese la URL de la Aplicación Web de Google Apps Script');
      return;
    }

    const val = validateAppsScriptUrl(webhookUrl);
    if (!val.isValid) {
      setErrorMsg(val.error || 'URL inválida');
      return;
    }

    setIsTestingWebhook(true);
    setTestResult(null);
    setErrorMsg(null);

    try {
      const res = await safeFetchJson('/api/safety-novedades/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() })
      });
      const data = res.data;

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          latency: data.latencyMs,
          details: data.response,
          driveOk: data.driveOk,
          driveDiagnostic: data.driveDiagnostic
        });
        setIsConfigured(true);
      } else {
        setTestResult({
          success: false,
          message: data.message || 'La prueba de conexión con Google Apps Script no respondió satisfactoriamente.',
          driveOk: data.driveOk,
          driveDiagnostic: data.driveDiagnostic
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Fallo de conexión con Google Apps Script.'
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    setBulkSyncResult(null);
    setErrorMsg(null);

    try {
      const res = await safeFetchJson('/api/safety-novedades/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: institutionalEmail })
      });
      const data = res.data;

      if (data.success) {
        setBulkSyncResult({
          success: true,
          message: data.message || `Se enviaron ${totalRecordsCount} registros a la hoja Google Sheets.`
        });
        if (onSyncCompleted) onSyncCompleted();
      } else {
        throw new Error(data.message || 'Fallo en la sincronización masiva');
      }
    } catch (err: any) {
      setBulkSyncResult({
        success: false,
        message: err?.message || 'Error durante la sincronización masiva.'
      });
    } finally {
      setIsBulkSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Script de Sincronización con Google Sheets
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                    isConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {isConfigured ? 'Webhook Activo' : 'Sin Enlace Directo'}
                </span>
                <span
                  className={`hidden sm:flex px-2 py-0.5 rounded-full text-[10px] font-semibold items-center gap-1 ${
                    storageStatus?.cloudinary?.isConfigured
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-slate-700/60 text-slate-300 border border-slate-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${storageStatus?.cloudinary?.isConfigured ? 'bg-sky-400' : 'bg-slate-400'}`} />
                  {storageStatus?.cloudinary?.isConfigured ? 'Cloudinary Activo' : 'Servidor Local Activo'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pestaña destino: <strong className="text-slate-200 font-mono">NOVEDADES-SAFETY</strong> • ID:{' '}
                <span className="text-slate-400 font-mono text-[11px]">{spreadsheetId.slice(0, 16)}...</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'script'
                ? 'border-blue-500 text-blue-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>1. Código Apps Script</span>
          </button>

          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'webhook'
                ? 'border-purple-500 text-purple-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Webhook className="w-4 h-4" />
            <span>2. Conectar Webhook</span>
            {isConfigured && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('bulksync')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'bulksync'
                ? 'border-emerald-500 text-emerald-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>3. Volcado Masivo Inicial</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: EL CÓDIGO GOOGLE APPS SCRIPT */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              {/* Quick instructions banner */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Pasos para instalar en tu Google Spreadsheet ({spreadsheetId.slice(0, 12)}...)</span>
                </h3>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-5 leading-relaxed">
                  <li>
                    Abre tu hoja de cálculo en Google Sheets y ve al menú superior:{' '}
                    <strong className="text-white">Extensiones &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Borra cualquier código que aparezca en el editor y pega el script que tienes debajo (usa el botón{' '}
                    <strong className="text-blue-300">"Copiar Código"</strong>). Luego presiona <strong className="text-white">Guardar</strong> (ícono de disquete).
                  </li>
                  <li className="bg-amber-950/40 border border-amber-500/40 p-2 rounded-lg text-amber-200">
                    <strong className="text-amber-300">Paso Crítico para Google Drive:</strong> En la barra superior del editor de Apps Script, en el selector desplegable de funciones, selecciona <code className="bg-amber-900/60 px-1 py-0.5 rounded font-mono text-white">autorizarPermisosDrive</code> y presiona <strong className="text-white">Ejecutar</strong>. Google te solicitará autorizar acceso a Google Drive. Concede los permisos para que las fotos de evidencias lleguen a la carpeta <code className="font-mono text-amber-300">EVIDENCIAS_SAFETY_AON_GALAPA</code>.
                  </li>
                  <li>
                    Haz clic en el botón azul de arriba a la derecha:{' '}
                    <strong className="text-white">Implementar &gt; Nueva implementación</strong> (si ya tenías una, selecciona Administrar implementaciones &gt; Editar &gt; Nueva versión).
                  </li>
                  <li>
                    Selecciona tipo:{' '}
                    <strong className="text-emerald-300">Aplicación web</strong> (ícono de engranaje).
                    <ul className="list-disc pl-5 mt-1 text-[11px] text-slate-400 space-y-0.5">
                      <li>Descripción: <span className="font-mono text-slate-300">Webhook Novedades Safety AON</span></li>
                      <li>Ejecutar como: <strong className="text-white">Yo (tu correo de Google)</strong></li>
                      <li>Quién tiene acceso: <strong className="text-amber-300">Cualquier usuario (Anyone)</strong></li>
                    </ul>
                  </li>
                  <li>
                    Copia la <strong className="text-purple-300">URL de la aplicación web</strong> que te entregue Google y pégala en la pestaña{' '}
                    <button
                      onClick={() => setActiveTab('webhook')}
                      className="text-purple-400 underline font-semibold hover:text-purple-300"
                    >
                      "2. Conectar Webhook"
                    </button>.
                  </li>
                </ol>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">
                  <span>Código listo para usar con las 6 columnas exactas de </span>
                  <strong className="text-slate-200">NOVEDADES-SAFETY</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-300" />
                    <span>Descargar .js</span>
                  </button>

                  <button
                    onClick={handleCopyScript}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Código Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código Completo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code viewer box */}
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs overflow-hidden shadow-inner">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="font-semibold text-slate-300 ml-2">Código.gs</span>
                    <span className="text-slate-500 text-[10px]">(Google Apps Script)</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">6 Columnas: CATEGORÍA, PLACA, NOVEDAD, EVIDENCIA REPORTE, EVIDENCIA CORREGIDA, ESTADO</span>
                </div>

                <div className="p-4 max-h-[380px] overflow-y-auto text-slate-300 select-all leading-relaxed whitespace-pre font-mono text-[11px]">
                  {isLoadingScript ? (
                    <div className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                      <span>Cargando código del script...</span>
                    </div>
                  ) : (
                    scriptCode
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONECTAR WEBHOOK */}
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                <h3 className="text-xs font-bold text-purple-200 flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-purple-400" />
                  <span>Enlace en Tiempo Real: Cada Reporte o Cierre cae directamente a la Hoja</span>
                </h3>
                <p className="text-xs text-purple-300/80 leading-relaxed">
                  Al configurar la URL de la Aplicación Web generada en Google Apps Script, cada vez que un usuario con correo{' '}
                  <strong className="text-white">@logisticos.co</strong> presione <em>"Reportar Novedad"</em> o <em>"Cerrar Novedad"</em>,
                  el servidor insertará o actualizará automáticamente la fila en la pestaña{' '}
                  <strong className="text-white">NOVEDADES-SAFETY</strong> en tiempo real.
                </p>
              </div>

              {/* Form to enter Webhook URL */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <label className="block text-xs font-semibold text-white">
                  URL de la Aplicación Web de Google Apps Script:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveWebhook}
                      disabled={isSavingWebhook}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all"
                    >
                      {isSavingWebhook ? 'Guardando...' : 'Guardar Webhook'}
                    </button>
                    <button
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook || !webhookUrl.trim()}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Probar conexión con Google Apps Script"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin text-purple-400' : ''}`} />
                      <span>Probar Conexión</span>
                    </button>
                  </div>
                </div>
                {webhookUrl.trim().endsWith('/dev') && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        La URL termina en <strong>/dev</strong>. Las URLs /dev devuelven una página HTML de Google Login. Debes usar <strong>/exec</strong>.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWebhookUrl(webhookUrl.trim().replace(/\/dev$/, '/exec'))}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <Wrench className="w-3 h-3" />
                      Cambiar a /exec
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  Debe ser una URL de tipo <code className="text-slate-300 font-mono">https://script.google.com/macros/s/.../exec</code>.
                </p>
              </div>

              {/* Test result display */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{testResult.success ? 'Conexión Exitosa con Google Apps Script' : 'Fallo en la Conexión'}</span>
                    </div>
                    {testResult.latency !== undefined && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono">
                        Latencia: {testResult.latency} ms
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">{testResult.message}</p>
                  {testResult.details && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[10px] text-slate-300">
                      <div>Hoja detectada: <strong>{testResult.details.sheetName || 'NOVEDADES-SAFETY'}</strong></div>
                      <div>Total filas actuales: <strong>{testResult.details.totalFilas ?? 'Consultado'}</strong></div>
                      <div>Pendientes en la hoja: <strong>{testResult.details.pendientes ?? '-'}</strong></div>
                      <div>Realizados en la hoja: <strong>{testResult.details.realizados ?? '-'}</strong></div>
                    </div>
                  )}

                  {/* Diagnóstico específico de Google Drive */}
                  {testResult.driveOk !== undefined && (
                    <div className={`mt-2 p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                      testResult.driveOk
                        ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                    }`}>
                      {testResult.driveOk ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="block font-bold">
                          {testResult.driveOk ? 'Carpeta Google Drive Verificada:' : 'Atención: Permisos de Google Drive no confirmados'}
                        </strong>
                        <span>
                          {testResult.driveOk
                            ? `Acceso correcto a "${testResult.driveDiagnostic?.result?.folderName || 'EVIDENCIAS_SAFETY_AON_GALAPA'}". Las fotos y collages se guardarán directamente en esta carpeta.`
                            : `El script no pudo acceder a Drive: ${testResult.driveDiagnostic?.message || 'Falta ejecutar autorizarPermisosDrive() en Apps Script'}. Revisa el paso crítico en la pestaña "1. Código Apps Script".`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Architecture & Storage info */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3 text-xs text-slate-400">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Almacenamiento de Evidencias y Seguridad</span>
                </div>
                {storageStatus?.cloudinary && (
                  <div className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                    storageStatus.cloudinary.isConfigured
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : storageStatus.cloudinary.isSecretSameAsKey
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300'
                  }`}>
                    <div className="font-bold flex items-center justify-between">
                      <span>Almacenamiento permanente (Cloudinary):</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900">
                        {storageStatus.cloudinary.isConfigured ? 'ACTIVO' : 'RESPALDO LOCAL'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {storageStatus.cloudinary.statusMessage}
                    </p>
                  </div>
                )}
                <p className="text-[11px] leading-relaxed">
                  • <strong>Alta disponibilidad:</strong> Las fotos de reporte y cierre se guardan instantáneamente con respaldo seguro en el servidor local si Cloudinary está en proceso de configuración.
                  <br />
                  • <strong>Dominio Institucional:</strong> Solo peticiones originadas por cuentas autorizadas de <code className="text-white font-mono">@logisticos.co</code> son procesadas.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: VOLCADO MASIVO INICIAL */}
          {activeTab === 'bulksync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Volcar todas las novedades registradas a la hoja Google Sheets</span>
                </h3>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Esta acción enviará en bloque las <strong className="text-white">{totalRecordsCount} novedades</strong> registradas actualmente en el sistema hacia la pestaña <strong className="text-white font-mono">NOVEDADES-SAFETY</strong>, formateando encabezados, columnas de estado con lista desplegable y colores condicionales.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sincronización Masiva ({totalRecordsCount} registros)</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Requiere que el Webhook de Google Apps Script esté configurado en la pestaña anterior.
                  </p>
                </div>

                <button
                  onClick={handleBulkSync}
                  disabled={isBulkSyncing || !isConfigured}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 inline-flex items-center gap-2"
                >
                  {isBulkSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sincronizando con Google Sheets...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Sincronizar Todas las Novedades Ahora</span>
                    </>
                  )}
                </button>

                {!isConfigured && (
                  <p className="text-[11px] text-amber-400 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Primero pegue y guarde la URL de su Webhook en la pestaña "2. Conectar Webhook".</span>
                  </p>
                )}
              </div>

              {bulkSyncResult && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-fadeIn ${
                    bulkSyncResult.success
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  }`}
                >
                  {bulkSyncResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{bulkSyncResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>AON Galapa • Flota Operativa &amp; Safety</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
            >
              <span>Abrir Hoja de Google Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
