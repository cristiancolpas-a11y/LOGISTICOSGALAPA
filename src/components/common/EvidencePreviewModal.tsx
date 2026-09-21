import React, { useState, useEffect } from 'react';
import {
  Images,
  Image as ImageIcon,
  ExternalLink,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Check,
  Maximize2,
  FileText,
  AlertTriangle,
  Loader2,
  Share2
} from 'lucide-react';
import { SafetyNovedadRecord } from '../../types';

export interface EvidencePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  type?: 'reporte' | 'corregida';
  record?: SafetyNovedadRecord | null;
}

/**
 * Extrae el identificador único de archivo de Google Drive a partir de distintas estructuras de URL
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Caso 1: /file/d/FILE_ID/...
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Caso 2: ?id=FILE_ID o &id=FILE_ID
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Caso 3: /thumbnail?id=FILE_ID o /uc?id=FILE_ID
  const matchUc = trimmed.match(/\/(?:thumbnail|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  if (matchUc && matchUc[1]) return matchUc[1];

  return null;
}

/**
 * Validador que determina si una celda contiene un enlace o referencia válida a evidencia
 */
export function hasEvidenceLink(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = String(url).trim();
  if (trimmed.length < 4) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower === '-' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'n/a' ||
    lower === 'sin evidencia' ||
    lower === 'ninguna' ||
    lower === 'no' ||
    lower === 'false'
  ) {
    return false;
  }
  return true;
}

export const EvidencePreviewModal: React.FC<EvidencePreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  url,
  type,
  record
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);
  // viewMode: 'image' (renderizado directo de foto/collage) o 'iframe' (visor nativo de Google Drive)
  const [viewMode, setViewMode] = useState<'image' | 'iframe'>('image');

  const fileId = extractDriveFileId(url);
  const isDriveUrl = !!fileId || url.includes('drive.google.com') || url.includes('docs.google.com');

  // Enlaces calculados para Google Drive
  const driveEmbedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  const driveThumbnailUrl = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600` : null;
  const driveLh3Url = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : null;

  // URL principal a renderizar en la etiqueta <img>
  const computedImageUrl = isDriveUrl
    ? (driveLh3Url || driveThumbnailUrl || url)
    : url;

  // Reset de estados cuando cambia la URL o se abre la ventana
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setCopied(false);
      setImgLoading(true);
      setImgError(false);
      setViewMode('image');
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silencioso
    }
  };

  const isReporte = type === 'reporte' || title.toLowerCase().includes('reporte');

  return (
    <div
      id="evidence-preview-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="evidence-preview-card"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden"
      >
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isReporte
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <Images className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white truncate">{title}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isReporte
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isReporte ? 'EVIDENCIA REPORTE (COLUMNA D)' : 'EVIDENCIA CORREGIDA (COLUMNA E)'}
                </span>
              </div>
              {record && (
                <p className="text-[11px] text-slate-400 truncate">
                  Placa: <strong className="text-white font-mono">{record.placa}</strong> • Fila #{record.fila} • {record.categoria}
                </p>
              )}
            </div>
          </div>

          <button
            id="close-evidence-preview-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Cerrar visor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE HERRAMIENTAS / CONTROLES */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Selector de modo si es Drive */}
          <div className="flex items-center gap-1.5">
            {isDriveUrl && driveEmbedUrl && (
              <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 flex items-center text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('image')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === 'image'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Foto / Collage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('iframe')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === 'iframe'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Visor Drive Integrado</span>
                </button>
              </div>
            )}

            {/* Controles de Zoom para vista de imagen */}
            {viewMode === 'image' && !imgError && (
              <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/60 text-slate-300">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white disabled:opacity-40"
                  disabled={zoom <= 0.5}
                  title="Alejar (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-1.5 py-0.5 text-[10px] font-mono hover:bg-slate-700 rounded text-slate-300"
                  title="Restablecer zoom al 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white disabled:opacity-40"
                  disabled={zoom >= 3}
                  title="Acercar (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white border-l border-slate-700 pl-1.5 ml-0.5"
                  title="Girar 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Acciones secundarias (Copiar link, Abrir en Google Drive) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium inline-flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Copiar enlace de la evidencia"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar enlace'}</span>
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] font-bold inline-flex items-center gap-1 border border-blue-500/30 transition-colors"
              title="Abrir en pestaña nueva"
            >
              <span>{isDriveUrl ? 'Abrir en Drive' : 'Abrir original'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL DEL VISOR (DENTRO DE LA APP) */}
        <div className="relative flex-1 min-h-[380px] max-h-[65vh] bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-auto select-none">
          {/* MODO 1: FOTO / COLLAGE DIRECTO */}
          {viewMode === 'image' && (
            <>
              {/* Indicador de carga */}
              {imgLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 gap-2 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <span className="text-xs font-medium">Cargando previsualización dentro de la app...</span>
                </div>
              )}

              {/* Si falla la carga directa por imagen, mostramos opción o pasamos al visor embed */}
              {imgError ? (
                <div className="text-center p-6 max-w-md space-y-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Visualización protegida o enlace restringido
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      El archivo se encuentra en Google Drive. Puedes abrir el visor integrado directamente en esta ventana o abrirlo en Google Drive.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {driveEmbedUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setImgError(false);
                          setViewMode('iframe');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Abrir Visor Integrado</span>
                      </button>
                    )}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-700"
                    >
                      <span>Abrir en Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center w-full h-full transition-transform duration-150 ease-out"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`
                  }}
                >
                  <img
                    src={computedImageUrl}
                    alt={title}
                    className="max-h-[56vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800/80"
                    referrerPolicy="no-referrer"
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgLoading(false);
                      // Si falla el primer CDN de Drive (lh3), probamos el thumbnail o pasamos a iframe
                      if (isDriveUrl && computedImageUrl === driveLh3Url && driveThumbnailUrl) {
                        // Reintenta con thumbnail
                        const img = new Image();
                        img.onload = () => {
                          // Si thumbnail funciona se actualiza
                          setImgLoading(false);
                        };
                        img.onerror = () => {
                          setImgError(true);
                        };
                        img.src = driveThumbnailUrl;
                      } else {
                        setImgError(true);
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* MODO 2: VISOR INTEGRADO NATIVO DE GOOGLE DRIVE (IFRAME DENTRO DE LA APP) */}
          {viewMode === 'iframe' && driveEmbedUrl && (
            <div className="w-full h-full min-h-[460px] flex flex-col">
              <iframe
                src={driveEmbedUrl}
                title={title}
                className="w-full flex-1 rounded-xl border border-slate-800 min-h-[460px] bg-slate-900"
                allow="autoplay; fullscreen"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA CON ENLACE CONFIRMADO */}
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate min-w-0 text-slate-400">
            <span className="font-semibold text-slate-300 shrink-0">Enlace celda:</span>
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-md select-all">
              {url}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors text-xs"
            >
              Cerrar visor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
