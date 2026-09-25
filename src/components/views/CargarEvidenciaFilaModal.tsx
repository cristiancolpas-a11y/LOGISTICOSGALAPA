import React, { useState } from 'react';
import {
  Upload,
  X,
  AlertTriangle,
  ShieldCheck,
  Images
} from 'lucide-react';
import { SafetyNovedadRecord } from '../../types';
import { EvidenceCollageUploader } from '../common/EvidenceCollageUploader';
import { EvidencePreviewModal, hasEvidenceLink } from '../common/EvidencePreviewModal';
import { CollageResult } from '../../utils/collageGenerator';
import { safeFetchJson, ApiError } from '../../utils/apiClient';

interface CargarEvidenciaFilaModalProps {
  record: SafetyNovedadRecord;
  targetColumn: 'reporte' | 'corregida';
  institutionalEmail: string;
  onClose: () => void;
  onSuccess: (updatedRecord: SafetyNovedadRecord, message: string) => void;
}

export const CargarEvidenciaFilaModal: React.FC<CargarEvidenciaFilaModalProps> = ({
  record,
  targetColumn,
  institutionalEmail,
  onClose,
  onSuccess
}) => {
  const [collageResult, setCollageResult] = useState<CollageResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const isReporte = targetColumn === 'reporte';
  const columnTitle = isReporte ? 'EVIDENCIA DEL REPORTE (Columna D)' : 'EVIDENCIA CORREGIDA (Columna E)';
  const existingEvidenceUrl = isReporte ? record.evidenciaReporte : record.evidenciaCorregida;
  const alreadyHasEvidence = hasEvidenceLink(existingEvidenceUrl);

  // Submit Handler: Sube el collage combinado a Google Drive y actualiza la celda en Sheets
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (alreadyHasEvidence) {
      setErrorMsg(
        `Esta fila ya cuenta con una ${isReporte ? 'evidencia de reporte' : 'evidencia de corrección'} registrada. Las evidencias no pueden ser sobrescritas ni reemplazadas.`
      );
      return;
    }

    if (!collageResult) {
      setErrorMsg('Debes seleccionar entre 1 y 4 fotos para generar el collage de evidencia.');
      return;
    }

    if (!institutionalEmail || !institutionalEmail.toLowerCase().trim().endsWith('@logisticos.co')) {
      setErrorMsg('Debes autenticarte con un correo institucional @logisticos.co autorizado para subir evidencias.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await safeFetchJson('/api/safety-novedades/update-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: record.placa,
          fila: record.fila,
          targetColumn,
          email: institutionalEmail,
          fileName: collageResult.file.name,
          fileMimeType: 'image/jpeg',
          fileBase64: collageResult.base64Data
        })
      });

      const data = res.data;

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Ocurrió un error al subir la evidencia a Google Sheets/Drive.');
      }

      const updatedRecord: SafetyNovedadRecord = data.record || {
        ...record,
        evidenciaReporte: isReporte ? data.evidenceUrl || data.url : record.evidenciaReporte,
        evidenciaCorregida: !isReporte ? data.evidenceUrl || data.url : record.evidenciaCorregida,
        estado: !isReporte && record.estado === 'PENDIENTE' ? 'REALIZADO' : record.estado
      };

      onSuccess(
        updatedRecord,
        data.message || `Collage de evidencia para la fila #${record.fila} (${record.placa}) guardado con éxito en Supabase y Sheets.`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        // En entorno estático sin backend activo, guardar evidencia como data URL local
        const localDataUrl = `data:image/jpeg;base64,${collageResult.base64Data}`;
        const updatedRecord: SafetyNovedadRecord = {
          ...record,
          evidenciaReporte: isReporte ? localDataUrl : record.evidenciaReporte,
          evidenciaCorregida: !isReporte ? localDataUrl : record.evidenciaCorregida,
          estado: !isReporte && record.estado === 'PENDIENTE' ? 'REALIZADO' : record.estado
        };
        onSuccess(
          updatedRecord,
          `Evidencia de collage guardada localmente para la fila #${record.fila} (${record.placa}) en modo resiliente.`
        );
        return;
      }
      const msg = err instanceof Error ? err.message : 'Error inesperado al cargar la evidencia.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-8">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-xl border ${
              isReporte
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Cargar {isReporte ? 'Evidencia del Reporte' : 'Evidencia de Corrección'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700 font-bold">
                {record.placa}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Fila #{record.fila}
              </span>
              <span className="text-[11px] text-slate-400">
                • {record.categoria}
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Destino de la carga:</span>
            <span className="font-semibold text-white">{columnTitle}</span>
          </div>
          <div className="text-slate-400 leading-relaxed text-[11px]">
            {isReporte ? (
              <span>
                Selecciona entre 1 y 4 fotos. Se generará un <strong>collage de alta fidelidad</strong> que se subirá a Supabase Storage y se vinculará en la columna <strong>EVIDENCIA DEL REPORTE</strong> (índice 3).
              </span>
            ) : (
              <span>
                Selecciona entre 1 y 4 fotos. Se generará un <strong>collage de alta fidelidad</strong> que se subirá a Supabase Storage y se vinculará en la columna <strong>EVIDENCIA CORREGIDA</strong> (índice 4).
              </span>
            )}
          </div>
          <div className="text-[10px] text-amber-400/90 flex items-center gap-1 font-medium pt-1 border-t border-slate-700/40">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Regla: Esta celda solo se puede llenar una sola vez y no podrá ser reemplazada posteriormente.</span>
          </div>
        </div>

        {/* Block if already filled */}
        {alreadyHasEvidence ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-3 mb-4">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Evidencia ya registrada para esta columna</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Esta fila ya cuenta con un archivo registrado en {columnTitle}. Por reglas de auditoría y trazabilidad de Safety, no está permitido sobrescribir ni reemplazar una evidencia existente.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="w-full sm:flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Images className="w-3.5 h-3.5" />
                <span>Ver en Galería (Previsualizar dentro de la app)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* EVIDENCE COLLAGE UPLOADER (1 to 4 photos, drag, drop, camera, clipboard, live collage preview) */}
            <EvidenceCollageUploader
              label={isReporte ? 'Fotos del Reporte (1 a 4 fotos)' : 'Fotos de la Corrección (1 a 4 fotos)'}
              helperText="Selecciona o arrastra entre 1 y 4 fotos. El sistema creará automáticamente el collage sin recortar las imágenes."
              targetType={targetColumn}
              disabled={isSubmitting}
              onCollageChange={(res) => {
                setCollageResult(res);
                if (res) setErrorMsg(null);
              }}
            />

            {/* Error banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Auditoría: {institutionalEmail}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !collageResult}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Subiendo Collage a Drive...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Guardar Evidencia ({collageResult ? `${collageResult.photoCount} ${collageResult.photoCount === 1 ? 'foto' : 'fotos'}` : 'Sin fotos'})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Visor de evidencia dentro de la app si se solicita */}
      {showPreview && existingEvidenceUrl && (
        <EvidencePreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={`Evidencia ${isReporte ? 'Reporte' : 'Corrección'} #${record.fila} (${record.placa})`}
          url={existingEvidenceUrl}
          type={targetColumn}
          record={record}
        />
      )}
    </div>
  );
};
