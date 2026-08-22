import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Truck,
  User
} from 'lucide-react';
import { NormalizedCheckListRecord, KpiSummary, SeverityLevel } from '../../types';

interface AlertsExceptionsViewProps {
  records: NormalizedCheckListRecord[];
  kpis: KpiSummary;
}

export const AlertsExceptionsView: React.FC<AlertsExceptionsViewProps> = ({
  records,
  kpis
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'ALL'>('CRITICO');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filtered = records.filter((r) => {
    if (selectedSeverity !== 'ALL' && r.severity !== selectedSeverity) return false;

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
    const headers = [
      'Fecha',
      'Placa',
      'Contratista',
      'Conductor',
      'Salida',
      'Retorno',
      'Estado',
      'Severidad',
      'Diagnóstico'
    ];

    const rows = filtered.map((r) => [
      `"${r.dateFormatted}"`,
      `"${r.vehicle}"`,
      `"${r.contratista}"`,
      `"${r.conductor}"`,
      r.salida,
      r.retorno,
      `"${r.estado}"`,
      `"${r.severity}"`,
      r.severity === 'CRITICO'
        ? '"CRÍTICO: No realizó salida ni retorno"'
        : r.severity === 'ALTO'
        ? `"${r.salida === 0 ? 'Falta Check List de Salida' : 'Falta Check List de Retorno'}"`
        : '"CUMPLIDO: Inspecciones completas"'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `alertas_excepciones_${selectedSeverity.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="alerts-exceptions-view">
      {/* Header and Severity Breakdown Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wide">
                  Gestión de Alertas y Excepciones
                </h2>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                  {kpis.totalNonCompliances} Casos con Novedad
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Clasificación automática de riesgo por omisión de inspecciones operacionales
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Exportar Informe de Alertas</span>
          </button>
        </div>

        {/* Severity 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {/* Card 1: 🔴 CRÍTICO */}
          <button
            onClick={() => {
              setSelectedSeverity('CRITICO');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              selectedSeverity === 'CRITICO'
                ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                🔴 Severidad Crítica
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-400">{kpis.criticalCount}</span>
              <span className="text-xs text-slate-400">casos</span>
            </div>
            <p className="text-[11px] text-rose-300/80 mt-1 font-medium">
              No realizó ni Salida ni Retorno (0/2). Máxima prioridad de control.
            </p>
          </button>

          {/* Card 2: 🟠 ALTO */}
          <button
            onClick={() => {
              setSelectedSeverity('ALTO');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              selectedSeverity === 'ALTO'
                ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                🟠 Severidad Alta
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400">{kpis.highSeverityCount}</span>
              <span className="text-xs text-slate-400">casos</span>
            </div>
            <p className="text-[11px] text-amber-300/80 mt-1 font-medium">
              Faltó uno de los dos Check List (1/2). Inspección incompleta.
            </p>
          </button>

          {/* Card 3: 🟢 CUMPLIDO */}
          <button
            onClick={() => {
              setSelectedSeverity('CUMPLIDO');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              selectedSeverity === 'CUMPLIDO'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                🟢 Cumplido Total
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">{kpis.completeRecords.toLocaleString()}</span>
              <span className="text-xs text-slate-400">casos</span>
            </div>
            <p className="text-[11px] text-emerald-300/80 mt-1 font-medium">
              Realizó Salida y Retorno (2/2). Operación conforme.
            </p>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Registros Clasificados: {selectedSeverity === 'ALL' ? 'Todos' : selectedSeverity}
            </h3>
            <span className="text-xs text-slate-400">({filtered.length} encontrados)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSeverity('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                selectedSeverity === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Ver Todas las Severidades
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar placa, conductor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 w-56"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse" id="alerts-table">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                <th className="py-3 px-3.5">Fecha</th>
                <th className="py-3 px-3.5">Placa</th>
                <th className="py-3 px-3.5">Contratista</th>
                <th className="py-3 px-3.5">Conductor</th>
                <th className="py-3 px-3.5 text-center">Salida</th>
                <th className="py-3 px-3.5 text-center">Retorno</th>
                <th className="py-3 px-3.5 text-center">Nivel Severidad</th>
                <th className="py-3 px-3.5 text-right">Diagnóstico de Falla</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No se encontraron excepciones para este filtro.
                  </td>
                </tr>
              ) : (
                paginated.map((rec) => {
                  const isCrit = rec.severity === 'CRITICO';
                  const isAlto = rec.severity === 'ALTO';

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCrit ? 'bg-rose-950/15' : isAlto ? 'bg-amber-950/10' : ''
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
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            rec.salida === 1
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {rec.salida === 1 ? '✓ 1' : '✗ 0'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            rec.retorno === 1
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {rec.retorno === 1 ? '✓ 1' : '✗ 0'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isCrit
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : isAlto
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCrit ? 'bg-rose-400 animate-ping' : isAlto ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          {rec.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-[11px]">
                        {isCrit && (
                          <span className="text-rose-400 font-bold">
                            Omisión Total (Sin Salida ni Retorno)
                          </span>
                        )}
                        {isAlto && rec.salida === 0 && (
                          <span className="text-amber-400">
                            Faltó Check List de Salida
                          </span>
                        )}
                        {isAlto && rec.retorno === 0 && (
                          <span className="text-purple-400">
                            Faltó Check List de Retorno
                          </span>
                        )}
                        {!isCrit && !isAlto && (
                          <span className="text-emerald-400">
                            Inspección Conforme
                          </span>
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
