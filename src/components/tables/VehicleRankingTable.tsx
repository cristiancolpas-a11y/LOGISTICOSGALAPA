import React, { useState } from 'react';
import {
  Truck,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { VehicleRanking } from '../../types';
import { getSemaphoreBadgeClasses } from '../../utils/dataProcessor';

interface VehicleRankingTableProps {
  rankings: VehicleRanking[];
}

export const VehicleRankingTable: React.FC<VehicleRankingTableProps> = ({ rankings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredRankings = rankings.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.plate.toLowerCase().includes(term) ||
      v.contractor.toLowerCase().includes(term) ||
      v.primaryDrivers.some((d) => d.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filteredRankings.length / itemsPerPage) || 1;
  const paginatedItems = filteredRankings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCsv = () => {
    const headers = [
      'Placa',
      'Contratista',
      'Total Inspecciones',
      'Salidas Cumplidas',
      '% Salida',
      'Retornos Cumplidos',
      '% Retorno',
      'Incumplimientos',
      '% Cumplimiento General',
      'Conductores Asignados'
    ];

    const rows = filteredRankings.map((v) => [
      `"${v.plate}"`,
      `"${v.contractor}"`,
      v.totalInspections,
      v.departurePassed,
      `${v.departureRate}%`,
      v.returnPassed,
      `${v.returnRate}%`,
      v.nonCompliances,
      `${v.generalRate}%`,
      `"${v.primaryDrivers.join('; ')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ranking_vehiculos_aon_galapa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between" id="vehicle-ranking-container">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-400" />
              <span>Vehículos con Mayor Incumplimiento</span>
            </h3>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded-full border border-rose-500/20">
              Ranking Crítico
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ordenado de mayor a menor cantidad de inspecciones fallidas para auditoría de flota
          </p>
        </div>

        {/* Search and Export */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar placa..."
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
            title="Exportar ranking de vehículos a CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left text-xs border-collapse" id="vehicle-rankings-table">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
              <th className="py-2.5 px-3">Pos</th>
              <th className="py-2.5 px-3">Placa Vehículo</th>
              <th className="py-2.5 px-3">Contratista</th>
              <th className="py-2.5 px-3 text-center">Inspecciones</th>
              <th className="py-2.5 px-3 text-center">% Salida</th>
              <th className="py-2.5 px-3 text-center">% Retorno</th>
              <th className="py-2.5 px-3 text-center">Incumplimientos</th>
              <th className="py-2.5 px-3 text-center">% General</th>
              <th className="py-2.5 px-3 text-right">Semáforo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-500 text-xs">
                  No se encontraron vehículos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedItems.map((veh, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                const badge = getSemaphoreBadgeClasses(veh.severityRating);
                const isCritical = veh.nonCompliances >= 3;

                return (
                  <tr
                    key={veh.plate}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCritical ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      #{globalIndex}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {veh.plate}
                        </span>
                        {isCritical && (
                          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Vehículo Reincidente" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {veh.contractor}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-300">
                      {veh.totalInspections}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-blue-400 font-semibold">{veh.departureRate}%</span>
                      <span className="text-[10px] text-slate-500 block">({veh.departurePassed})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-purple-400 font-semibold">{veh.returnRate}%</span>
                      <span className="text-[10px] text-slate-500 block">({veh.returnPassed})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        {veh.nonCompliances}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-white">{veh.generalRate}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {veh.severityRating === 'green' ? '≥95%' : veh.severityRating === 'yellow' ? '90-94%' : '<90%'}
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
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredRankings.length} vehículos)
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
