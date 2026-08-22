import React, { useState } from 'react';
import {
  User,
  AlertCircle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { DriverRanking } from '../../types';
import { getSemaphoreBadgeClasses } from '../../utils/dataProcessor';

interface DriverRankingTableProps {
  rankings: DriverRanking[];
}

export const DriverRankingTable: React.FC<DriverRankingTableProps> = ({ rankings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hideSinDatos, setHideSinDatos] = useState(false);
  const itemsPerPage = 8;

  const filteredRankings = rankings.filter((d) => {
    if (hideSinDatos && d.driverName === 'SIN DATOS') return false;
    const term = searchTerm.toLowerCase();
    return (
      d.driverName.toLowerCase().includes(term) ||
      d.associatedVehicles.some((v) => v.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filteredRankings.length / itemsPerPage) || 1;
  const paginatedItems = filteredRankings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCsv = () => {
    const headers = [
      'Conductor',
      'Vehículos Asociados',
      'Total Inspecciones',
      'Salidas Cumplidas',
      '% Salida',
      'Retornos Cumplidos',
      '% Retorno',
      'Incumplimientos',
      '% Cumplimiento',
      'Reincidencia'
    ];

    const rows = filteredRankings.map((d) => [
      `"${d.driverName}"`,
      `"${d.associatedVehicles.join('; ')}"` ,
      d.totalInspections,
      d.departurePassed,
      `${d.departureRate}%`,
      d.returnPassed,
      `${d.returnRate}%`,
      d.nonCompliances,
      `${d.generalRate}%`,
      `"${d.reincidenceLevel}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ranking_conductores_aon_galapa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between" id="driver-ranking-container">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              <span>Conductores con Mayor Incumplimiento</span>
            </h3>
            <span className="text-[10px] bg-purple-500/10 text-purple-400 font-semibold px-2 py-0.5 rounded-full border border-purple-500/20">
              Control de Reincidencia
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Seguimiento individual de operadores y reincidencia de omisión en inspecciones
          </p>
        </div>

        {/* Search, Toggle & Export */}
        <div className="flex items-center gap-2">
          <label className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              checked={hideSinDatos}
              onChange={(e) => {
                setHideSinDatos(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded text-blue-500 bg-slate-800 border-slate-700"
            />
            <span>Ocultar "SIN DATOS"</span>
          </label>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar conductor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            title="Exportar ranking de conductores a CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left text-xs border-collapse" id="driver-rankings-table">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
              <th className="py-2.5 px-3">Pos</th>
              <th className="py-2.5 px-3">Conductor</th>
              <th className="py-2.5 px-3">Vehículos Asociados</th>
              <th className="py-2.5 px-3 text-center">Inspecciones</th>
              <th className="py-2.5 px-3 text-center">Salida</th>
              <th className="py-2.5 px-3 text-center">Retorno</th>
              <th className="py-2.5 px-3 text-center">Incumplimientos</th>
              <th className="py-2.5 px-3 text-center">% Cumplimiento</th>
              <th className="py-2.5 px-3 text-right">Reincidencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-500 text-xs">
                  No se encontraron conductores que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedItems.map((driver, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                const isSinDatos = driver.driverName === 'SIN DATOS';
                const badge = getSemaphoreBadgeClasses(driver.severityRating);

                return (
                  <tr
                    key={driver.driverName}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      driver.reincidenceLevel === 'Alta' && !isSinDatos ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      #{globalIndex}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            isSinDatos ? 'text-slate-400 italic' : 'text-white'
                          }`}
                        >
                          {driver.driverName}
                        </span>
                        {driver.reincidenceLevel === 'Alta' && !isSinDatos && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            title="Conductor Reincidente"
                          >
                            Reincidente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {driver.associatedVehicles.slice(0, 3).map((v) => (
                          <span
                            key={v}
                            className="bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700"
                          >
                            {v}
                          </span>
                        ))}
                        {driver.associatedVehicles.length > 3 && (
                          <span className="text-[10px] text-slate-400">
                            +{driver.associatedVehicles.length - 3} más
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-300">
                      {driver.totalInspections}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-blue-400 font-semibold">{driver.departureRate}%</span>
                      <span className="text-[10px] text-slate-500 block">({driver.departurePassed})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-purple-400 font-semibold">{driver.returnRate}%</span>
                      <span className="text-[10px] text-slate-500 block">({driver.returnPassed})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        {driver.nonCompliances}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-white">{driver.generalRate}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          driver.reincidenceLevel === 'Alta'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : driver.reincidenceLevel === 'Media'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {driver.reincidenceLevel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800 text-xs text-slate-400">
        <span>
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredRankings.length} conductores)
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
  );
};
