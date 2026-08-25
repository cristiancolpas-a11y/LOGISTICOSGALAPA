import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Building2,
  Calendar,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { LavadoRecord, LavadosSummary, ProcessCoverage, UnmatchedRecordInfo } from '../../types';

interface LavadosViewProps {
  records: LavadoRecord[];
  summary: LavadosSummary;
  fleetCoverage?: ProcessCoverage;
  unmatchedInfo?: {
    count: number;
    uniquePlacas: number;
    items: UnmatchedRecordInfo[];
  };
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
}

const TALLER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const LavadosView: React.FC<LavadosViewProps> = ({
  records,
  summary,
  fleetCoverage,
  unmatchedInfo,
  isLoading = false,
  onRefresh,
  lastUpdated
}) => {
  const [searchPlaca, setSearchPlaca] = useState('');
  const [selectedMes, setSelectedMes] = useState('all');
  const [selectedTaller, setSelectedTaller] = useState('all');
  const [showOnlyFleetBase, setShowOnlyFleetBase] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fleetPlacasSet = useMemo(() => {
    if (!fleetCoverage) return null;
    return new Set([...fleetCoverage.placasEjecutadas, ...fleetCoverage.placasPendientes]);
  }, [fleetCoverage]);

  const mesOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.mes) set.add(r.mes);
    });
    return Array.from(set);
  }, [records]);

  const tallerOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.taller) set.add(r.taller);
    });
    return Array.from(set);
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (showOnlyFleetBase && fleetPlacasSet && !fleetPlacasSet.has(r.placa.trim().toUpperCase())) {
        return false;
      }
      if (searchPlaca.trim() && !r.placaLower.includes(searchPlaca.trim().toLowerCase())) {
        return false;
      }
      if (selectedMes !== 'all' && r.mes !== selectedMes) {
        return false;
      }
      if (selectedTaller !== 'all' && r.taller !== selectedTaller) {
        return false;
      }
      return true;
    });
  }, [records, searchPlaca, selectedMes, selectedTaller, showOnlyFleetBase, fleetPlacasSet]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="lavados-view">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Control y Registro de Lavados de Flota
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Control higiénico y mantenimiento estético de vehículos, talleres autorizados y evidencias fotográficas.
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

      {/* Fleet Master Base Coverage Card for Lavados */}
      {fleetCoverage && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Cobertura de Lavados sobre Flota Base Oficial ({fleetCoverage.totalFleet} Vehículos)
                </h3>
                <p className="text-xs text-slate-400">
                  Unidades de la base VEHICULOS que cuentan con registro de lavado en el período.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <div className="text-right">
                <span className="text-2xl font-black text-cyan-400">
                  {fleetCoverage.ejecutados} <span className="text-xs text-slate-400 font-normal">/ {fleetCoverage.totalFleet}</span>
                </span>
                <span className="block text-[11px] text-cyan-300 font-bold">
                  {fleetCoverage.pctEjecutado}% de la flota con lavado
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-cyan-500 h-full transition-all duration-500"
                style={{ width: `${fleetCoverage.pctEjecutado}%` }}
              />
              <div
                className="bg-slate-700 h-full transition-all duration-500"
                style={{ width: `${fleetCoverage.pctPendiente}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-300">
                  <strong className="text-white">{fleetCoverage.ejecutados}</strong> Vehículos Lavados ({fleetCoverage.pctEjecutado}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-300">
                  <strong className="text-white">{fleetCoverage.pendientes}</strong> Sin Lavado ({fleetCoverage.pctPendiente}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="lavados-kpis">
        {/* KPI 1: Total Lavados */}
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
              TOTAL LAVADOS REALIZADOS
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-white">
              {summary.totalLavados.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">servicios</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Registro acumulado 2026
          </div>
        </div>

        {/* KPI 2: Lavados Mes Actual */}
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-blue-300 uppercase">
              LAVADOS ÚLTIMO MES
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-blue-400">
              {summary.mesActualLavados}
            </span>
            <span className="text-xs text-slate-400 font-medium">en el último período</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Promedio de mantenimiento periódico
          </div>
        </div>

        {/* KPI 3: Taller más Usado */}
        <div className="p-4 rounded-2xl border border-purple-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-purple-300 uppercase">
              TALLER PRINCIPAL
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black tracking-tight text-purple-400 truncate max-w-full">
              {summary.tallerMasUsado?.taller || 'N/A'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {summary.tallerMasUsado?.count || 0} lavados ejecutados ({summary.tallerMasUsado ? ((summary.tallerMasUsado.count / (summary.totalLavados || 1)) * 100).toFixed(0) : 0}%)
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Lavados por Mes (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Lavados por Mes
            </h3>
            <p className="text-xs text-slate-400">
              Volumen mensual de servicios de lavado en la flota
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.byMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="mes"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                  formatter={(val: any) => [`${val} lavados`, 'Cantidad']}
                />
                <Bar
                  dataKey="count"
                  name="Lavados"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribución por Taller (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight mb-1">
              Distribución por Taller
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Concentración de servicios en centros de lavado autorizados
            </p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.byTaller}
                  dataKey="count"
                  nameKey="taller"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {summary.byTaller.map((_entry, index) => (
                    <Cell
                      key={`taller-${index}`}
                      fill={TALLER_COLORS[index % TALLER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800">
            {summary.byTaller.slice(0, 4).map((tItem, idx) => (
              <div key={tItem.taller} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: TALLER_COLORS[idx % TALLER_COLORS.length] }}
                  />
                  <span className="font-semibold text-slate-200 truncate max-w-[140px]">
                    {tItem.taller}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-mono">
                  <span>{tItem.count} lavados</span>
                  <span className="text-cyan-400 font-semibold font-sans">
                    ({tItem.pct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Historial de Lavados ({filteredRecords.length} registrados)
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

            {/* Mes Filter */}
            <select
              value={selectedMes}
              onChange={(e) => {
                setSelectedMes(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los Meses</option>
              {mesOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Taller Filter */}
            <select
              value={selectedTaller}
              onChange={(e) => {
                setSelectedTaller(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los Talleres</option>
              {tallerOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">ID Reporte</th>
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-3">Fecha / Mes</th>
                <th className="py-2.5 px-3">Taller</th>
                <th className="py-2.5 px-3">Contratista</th>
                <th className="py-2.5 px-3 text-center">Evidencia</th>
                <th className="py-2.5 px-3 text-center">Mapa Taller</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-normal text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron lavados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {item.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {item.placa}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-white font-medium">{item.fechaFormatted || item.fechaRaw}</div>
                        <div className="text-slate-500 text-[10px]">{item.mes} (Sem {item.semana})</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-cyan-300">
                        {item.taller}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {item.contratista}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.evidenciaInicialUrl && item.evidenciaInicialUrl.startsWith('http') ? (
                          <a
                            href={item.evidenciaInicialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 hover:text-cyan-300 border border-cyan-500/30 transition-colors text-[11px] font-semibold"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Foto</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">Sin foto</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.mapaTallerUrl && item.mapaTallerUrl.startsWith('http') ? (
                          <a
                            href={item.mapaTallerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors text-[11px]"
                          >
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span>Mapa</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
            de <span className="font-bold text-white">{filteredRecords.length}</span> registros
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
