import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Camera,
  ClipboardPaste,
  X,
  RefreshCw,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles
} from 'lucide-react';
import {
  CollageImageItem,
  CollageResult,
  generateEvidenceCollage
} from '../../utils/collageGenerator';

interface EvidenceCollageUploaderProps {
  label?: string;
  helperText?: string;
  targetType?: 'reporte' | 'corregida';
  initialUrl?: string;
  onCollageChange: (result: CollageResult | null) => void;
  disabled?: boolean;
}

export const EvidenceCollageUploader: React.FC<EvidenceCollageUploaderProps> = ({
  label,
  helperText,
  targetType = 'reporte',
  onCollageChange,
  disabled = false
}) => {
  const [selectedItems, setSelectedItems] = useState<CollageImageItem[]>([]);
  const [collageResult, setCollageResult] = useState<CollageResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewZoomOpen, setPreviewZoomOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Mantener referencia estable al callback onCollageChange para evitar bucles infinitos de re-renderizado
  const onCollageChangeRef = useRef(onCollageChange);
  useEffect(() => {
    onCollageChangeRef.current = onCollageChange;
  }, [onCollageChange]);

  // Convert File to dataUrl
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Add files to selection (up to 4)
  const addFiles = useCallback(async (files: File[]) => {
    setErrorMessage(null);
    const validImageFiles = files.filter((f) => f.type.startsWith('image/'));

    if (validImageFiles.length === 0) {
      setErrorMessage('Por favor seleccione únicamente archivos de imagen (JPG, PNG, WEBP, etc.).');
      return;
    }

    const availableSlots = 4 - selectedItems.length;
    if (availableSlots <= 0) {
      setErrorMessage('Ya has alcanzado el límite máximo de 4 fotos por evidencia.');
      return;
    }

    const filesToAdd = validImageFiles.slice(0, availableSlots);
    if (validImageFiles.length > availableSlots) {
      setErrorMessage(`Se agregaron las primeras ${availableSlots} fotos (máximo permitido: 4 por collage).`);
    }

    try {
      const newItems: CollageImageItem[] = [];
      for (let i = 0; i < filesToAdd.length; i++) {
        const file = filesToAdd[i];
        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`El archivo ${file.name} supera el límite de 25MB.`);
        }
        const dataUrl = await fileToDataUrl(file);
        newItems.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`,
          file,
          dataUrl,
          name: file.name,
          sizeBytes: file.size
        });
      }

      setSelectedItems((prev) => [...prev, ...newItems].slice(0, 4));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar las imágenes.';
      setErrorMessage(msg);
    }
  }, [selectedItems.length]);

  // Remove one photo
  const removePhoto = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all photos
  const resetSelection = () => {
    setSelectedItems([]);
    setCollageResult(null);
    setErrorMessage(null);
    setIsGenerating(false);
    onCollageChangeRef.current?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      addFiles(filesArray);
    }
  };

  // Clipboard Paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const pastedFiles = Array.from(e.clipboardData.files).filter((f) =>
          f.type.startsWith('image/')
        );
        if (pastedFiles.length > 0) {
          e.preventDefault();
          addFiles(pastedFiles);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFiles, disabled]);

  // Generar collage cuando cambie la firma de las fotos seleccionadas
  const itemsSignature = useMemo(
    () => selectedItems.map((item) => `${item.id}_${item.sizeBytes}`).join('|'),
    [selectedItems]
  );

  useEffect(() => {
    let isCancelled = false;

    if (selectedItems.length === 0) {
      setCollageResult(null);
      setIsGenerating(false);
      onCollageChangeRef.current?.(null);
      return;
    }

    const runGeneration = async () => {
      setIsGenerating(true);
      setErrorMessage(null);
      try {
        const result = await generateEvidenceCollage(selectedItems);
        if (!isCancelled) {
          setCollageResult(result);
          onCollageChangeRef.current?.(result);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Error al generar collage.';
          setErrorMessage(msg);
          setCollageResult(null);
          onCollageChangeRef.current?.(null);
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    runGeneration();

    return () => {
      isCancelled = true;
    };
  }, [itemsSignature]);

  const count = selectedItems.length;
  const isReporte = targetType === 'reporte';

  return (
    <div className="space-y-3">
      {/* Label and counter header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-semibold text-slate-200">
            {label || (isReporte ? 'Fotos de Evidencia del Reporte' : 'Fotos de Evidencia de Corrección')}
          </label>
          {helperText && (
            <p className="text-[11px] text-slate-400 mt-0.5">{helperText}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              count === 0
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : count < 4
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 font-bold'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-bold'
            }`}
          >
            {count} / 4 fotos
          </span>

          {count > 0 && (
            <button
              type="button"
              onClick={resetSelection}
              disabled={disabled || isGenerating}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
              title="Rehacer selección de fotos"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Rehacer</span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden file & camera inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
          }
          // Reset value so selecting the same file again triggers change
          e.target.value = '';
        }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
          }
          e.target.value = '';
        }}
      />

      {/* Dropzone / Upload Action Area (if less than 4 selected) */}
      {count < 4 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
              : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs font-semibold text-white">
                {count === 0
                  ? 'Arrastra hasta 4 fotos aquí, o usa los botones'
                  : `Arrastra más fotos (${4 - count} restante${4 - count > 1 ? 's' : ''})`}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Archivos JPG, PNG o capturas de pantalla sin compresión destructiva
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors active:scale-95 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Seleccionar {count === 0 ? 'fotos (1 a 4)' : 'otra foto'}</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tomar con cámara</span>
              </button>

              <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 text-[11px] inline-flex items-center gap-1">
                <ClipboardPaste className="w-3 h-3 text-amber-400" />
                <span>Pega con <kbd className="px-1 rounded bg-slate-800 font-mono text-[10px] text-white">Ctrl+V</kbd></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Photos Strip */}
      {count > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Fotos seleccionadas ({count}):</span>
            <span className="text-slate-500 text-[10px]">
              Haz clic en la 'X' para remover alguna
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {selectedItems.map((item, idx) => (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-800/80 aspect-video flex items-center justify-center p-1"
              >
                {item.dataUrl ? (
                  <img
                    src={item.dataUrl}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-contain rounded"
                  />
                ) : null}

                {/* Badge Number */}
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[10px] font-bold">
                  #{idx + 1}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removePhoto(item.id)}
                  disabled={disabled}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                  title="Quitar esta foto"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* File name hint */}
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-1.5 py-0.5 text-[9px] text-slate-300 truncate">
                  {item.name}
                </div>
              </div>
            ))}

            {/* Add more placeholder if count < 4 */}
            {count < 4 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/40 hover:bg-blue-500/5 aspect-video flex flex-col items-center justify-center text-slate-400 hover:text-blue-400 transition-colors"
              >
                <Upload className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-semibold">+ Agregar</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* COLLAGE PREVIEW SECTION */}
      {isGenerating && (
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center gap-2 text-xs text-blue-300">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Generando previsualización del collage a máxima resolución...</span>
        </div>
      )}

      {collageResult && !isGenerating && (
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
          {/* Header of Preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                Previsualización del Collage Final
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                {collageResult.width} × {collageResult.height} px
              </span>
              <button
                type="button"
                onClick={() => setPreviewZoomOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20"
                title="Ver tamaño completo"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Ampliar</span>
              </button>
            </div>
          </div>

          {/* Collage Image Display Container */}
          <div
            onClick={() => setPreviewZoomOpen(true)}
            className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center cursor-pointer group max-h-[320px]"
          >
            {collageResult.dataUrl ? (
              <img
                src={collageResult.dataUrl}
                alt="Collage de evidencia generado"
                className="max-h-[320px] w-auto max-w-full object-contain"
              />
            ) : null}

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
              <Eye className="w-4 h-4" />
              <span>Clic para ampliar previsualización</span>
            </div>
          </div>

          {/* Details footer */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
            <div className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{collageResult.layoutDescription}</span>
            </div>

            <div className="text-[10px] text-slate-400">
              {(collageResult.file.size / (1024 * 1024)).toFixed(2)} MB • Se guardará como 1 solo enlace
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ZOOM MODAL */}
      {previewZoomOpen && collageResult && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm">
                Collage de Evidencia ({collageResult.photoCount} {collageResult.photoCount === 1 ? 'foto' : 'fotos'})
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {collageResult.width} × {collageResult.height} px
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPreviewZoomOpen(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            {collageResult.dataUrl ? (
              <img
                src={collageResult.dataUrl}
                alt="Collage ampliado"
                className="max-h-full max-w-full object-contain rounded-lg border border-slate-700 shadow-2xl bg-white"
              />
            ) : null}
          </div>

          <div className="pt-2 text-center text-xs text-slate-400">
            Presiona Cerrar o la tecla Esc para volver al formulario
          </div>
        </div>
      )}
    </div>
  );
};
