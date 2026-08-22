import React, { useState } from 'react';
import {
  LogIn,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Truck,
  Filter
} from 'lucide-react';
import { NormalizedCheckListRecord, KpiSummary } from '../../types';
import { getSemaphoreColor, getSemaphoreBadgeClasses } from '../../utils/dataProcessor';

interface SalidaTrackingViewProps {
  records: NormalizedCheckListRecord[];
  kpis: KpiSummary;
}

export const SalidaTrackingView: React.FC<SalidaTrackingViewProps> = ({
  records,
  kpis
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Pending vehicles & drivers
  const pendingRecords = records.filter((r) => r.salida === 0);
  const pendingVehicles = Array.from(new Set(pendingRecords.map((r) => r.vehicle)));
  const pendingDrivers = Array.from(
    new Set(pendingRecords.map((r) => r.conductor).filter((c) => c && c !== 'SIN DATOS'))
  );

  const filtered = records.filter((r) => {
    if (filterMode === 'pending' && r.salida !== 0) return false;
    if (filterMode === 'completed' && r.salida !== 1) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        r.vehicle.toLowerCase().includes(q) ||
        r.conductor.toLowerCase().includes(q) ||
        r.contratista.toLowerCase().includes(q) ||
        r.dateFormatted.includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCsv = () => {
    const headers = ['Fecha', 'Placa', 'Contratista', 'Conductor', 'Salida', 'Estado', 'Severidad'];
    const rows = filtered.map((r) => [
      `"${r.dateFormatted}"`,
      `"${r.vehicle}"`,
      `"${r.contratista}"`,
      `"${r.conductor}"`,
      r.salida === 1 ? 'REALIZADO' : 'PENDIENTE',
      `"${r.estado}"`,
      `"${r.severity}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seguimiento_salida_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const semColor = getSemaphoreColor(kpis.departurePercentage);
  const badge = getSemaphoreBadgeClasses(semColor);

  return (
    <div className="space-y-6" id="salida-tracking-view">
      {/* Header and KPIs Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <LogIn className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wide">
                  Seguimiento: Check List de Salida
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border}`}>
                  {kpis.departurePercentage}% Cumplimiento
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Control de inspecciones pre-operacionales antes del inicio de ruta
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Exportar Vista Salida</span>
          </button>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total Programados
            </span>
            <span className="text-2xl font-bold text-white">{kpis.totalRecords.toLocaleString()}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
              Total Realizados
            </span>
            <span className="text-2xl font-bold text-emerald-400">{kpis.departureCompleted.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{kpis.departurePercentage}% del total</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
              Total Pendientes
            </span>
            <span className="text-2xl font-bold text-rose-400">{kpis.departureMissing.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {(100 - kpis.departurePercentage).toFixed(1)}% sin inspección
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
              Vehículos con Omisión
            </span>
            <span className="text-2xl font-bold text-amber-400">{pendingVehicles.length}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">en período seleccionado</span>
          </div>
        </div>

        {/* Pending Vehicles quick alert banner */}
        {pendingVehicles.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Vehículos Pendientes de Salida ({pendingVehicles.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pendingVehicles.slice(0, 15).map((v) => (
                <span
                  key={v}
                  onClick={() => setSearchTerm(v)}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-rose-500/30 text-rose-200 font-mono text-[11px] hover:bg-slate-800 cursor-pointer"
                  title="Click para filtrar por este vehículo"
                >
                  {v}
                </span>
              ))}
              {pendingVehicles.length > 15 && (
                <span className="text-[11px] text-rose-400 self-center">
                  +{pendingVehicles.length - 15} vehículos más
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        {/* Table controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setFilterMode('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({records.length})
            </button>
            <button
              onClick={() => {
                setFilterMode('pending');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterMode === 'pending'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              Solo Pendientes ({kpis.departureMissing})
            </button>
            <button
              onClick={() => {
                setFilterMode('completed');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterMode === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              Solo Realizados ({kpis.departureCompleted})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar fecha, placa, conductor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse" id="salida-tracking-table">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                <th className="py-3 px-3.5">Fecha</th>
                <th className="py-3 px-3.5">Placa</th>
                <th className="py-3 px-3.5">Contratista</th>
                <th className="py-3 px-3.5">Conductor</th>
                <th className="py-3 px-3.5 text-center">Check List Salida</th>
                <th className="py-3 px-3.5 text-center">Estado General</th>
                <th className="py-3 px-3.5 text-right">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No se encontraron registros de salida para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                paginated.map((rec) => {
                  const isPassed = rec.salida === 1;

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        !isPassed ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 text-slate-300 font-mono">
                        {rec.dateFormatted}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {rec.vehicle}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {rec.contratista}
                      </td>
                      <td className="py-3 px-3.5 text-slate-200">
                        {rec.conductor}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Realizado (1)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                            <XCircle className="w-3.5 h-3.5" />
                            PENDIENTE (0)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            rec.estado === 'CUMPLIO'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : rec.estado === 'LE FALTO'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {rec.estado}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-[11px]">
                        {!isPassed ? (
                          <span className="text-rose-400 font-semibold">Requiere Verificación</span>
                        ) : (
                          <span className="text-slate-400">Validado en Patio</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Mostrando <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> -{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> de{' '}
            <strong>{filtered.length}</strong> registros
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
