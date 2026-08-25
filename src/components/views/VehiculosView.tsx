import React, { useState, useMemo } from 'react';
import {
  Truck,
  Building2,
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Layers,
  Database
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { VehiculoRecord } from '../../types';

interface VehiculosViewProps {
  records: VehiculoRecord[];
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
}

const CD_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export const VehiculosView: React.FC<VehiculosViewProps> = ({
  records,
  isLoading = false,
  onRefresh,
  lastUpdated
}) => {
  const [searchPlaca, setSearchPlaca] = useState('');
  const [selectedCd, setSelectedCd] = useState('all');
  const [selectedContratista, setSelectedContratista] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  // CD breakdown
  const cdBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((v) => {
      const cd = v.cd || 'GALAPA';
      map.set(cd, (map.get(cd) || 0) + 1);
    });
    return Array.from(map.entries()).map(([cd, count]) => ({ cd, count }));
  }, [records]);

  // Contratista breakdown
  const contratistaBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((v) => {
      const c = v.contratista || 'Logisticos.co';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).map(([contratista, count]) => ({ contratista, count }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((v) => {
      if (searchPlaca.trim() && !v.placa.toLowerCase().includes(searchPlaca.trim().toLowerCase())) {
        return false;
      }
      if (selectedCd !== 'all' && v.cd !== selectedCd) {
        return false;
      }
      if (selectedContratista !== 'all' && v.contratista !== selectedContratista) {
        return false;
      }
      return true;
    });
  }, [records, searchPlaca, selectedCd, selectedContratista]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="vehiculos-view">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Catálogo Maestro de Vehículos de la Flota
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Fuente única de verdad de la flota habilitada, centros de distribución asignados y contratistas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
              Sincronizado: {new Date(lastUpdated).toLocaleTimeString('es-CO')}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar Hoja</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="vehiculos-kpis">
        {/* Total Flota */}
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-slate-900 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-blue-300 uppercase">
              FLOTA TOTAL REGISTRADA
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-white">
              {records.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">unidades oficiales</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Base oficial de operación
          </div>
        </div>

        {/* Centros de Distribución */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              CENTROS DE DISTRIBUCIÓN
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-white">
              {cdBreakdown.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">sedes activas</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center gap-2">
            {cdBreakdown.map((c) => (
              <span key={c.cd} className="text-slate-300 font-medium">
                {c.cd}: <span className="text-blue-400 font-bold">{c.count}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Contratistas */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              CONTRATISTAS OPERADORES
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-white">
              {contratistaBreakdown.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">empresas</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {contratistaBreakdown.map((c) => c.contratista).join(', ')}
          </div>
        </div>
      </div>

      {/* Grid of Vehicles with Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              Vehículos Habilitados ({filteredRecords.length} de {records.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Placa */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar placa..."
                value={searchPlaca}
                onChange={(e) => {
                  setSearchPlaca(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-36 sm:w-44"
              />
            </div>

            {/* CD Filter */}
            <select
              value={selectedCd}
              onChange={(e) => {
                setSelectedCd(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los CD</option>
              {cdBreakdown.map((c) => (
                <option key={c.cd} value={c.cd}>
                  {c.cd} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {paginatedRecords.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              No se encontraron vehículos con los filtros actuales.
            </div>
          ) : (
            paginatedRecords.map((vehiculo, idx) => (
              <div
                key={`${vehiculo.placa}-${idx}`}
                className="bg-slate-800/60 border border-slate-700/80 hover:border-blue-500/50 p-3.5 rounded-xl transition-all shadow-sm flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-white tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      {vehiculo.placa}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-slate-500" />
                    <span>{vehiculo.contratista}</span>
                  </div>
                </div>

                <div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[10px] uppercase">
                    {vehiculo.cd}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <div>
            Mostrando{' '}
            <span className="font-bold text-white">
              {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="font-bold text-white">
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
            </span>{' '}
            de <span className="font-bold text-white">{filteredRecords.length}</span> unidades
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-mono text-slate-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
