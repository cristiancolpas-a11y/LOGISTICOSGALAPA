import React, { useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Truck,
  AlertOctagon,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { UtilizacionRecord, UtilizacionSummary } from '../../types';

interface UtilizacionViewProps {
  records: UtilizacionRecord[];
  summary: UtilizacionSummary;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
}

export const UtilizacionView: React.FC<UtilizacionViewProps> = ({
  records,
  summary,
  isLoading = false,
  onRefresh,
  lastUpdated
}) => {
  const [searchDate, setSearchDate] = useState('');
  const [filterAnomalyOnly, setFilterAnomalyOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchDate.trim()) {
        const query = searchDate.trim().toLowerCase();
        if (
          !r.fechaFormatted.toLowerCase().includes(query) &&
          !r.fechaIso.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filterAnomalyOnly && !r.isAnomaly) {
        return false;
      }
      return true;
    });
  }, [records, searchDate, filterAnomalyOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="utilizacion-view">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Métricas de Utilización de Flota
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Monitoreo diario de capacidad operativa, ratio de viajes vs vehículos disponibles y detección de sobredemanda.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="utilizacion-kpis">
        {/* KPI 1: PROMEDIO UTILIZACION */}
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-slate-900 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-blue-300 uppercase">
              UTILIZACIÓN PROMEDIO
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-white">
              {summary.promedioPct}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Flota promedio: {summary.promedioFlota} vh/día
          </div>
        </div>

        {/* KPI 2: PROMEDIO VIAJES DIARIOS */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              VIAJES DIARIOS (PROMEDIO)
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-white">
              {summary.promedioViajes}
            </span>
            <span className="text-xs text-slate-400 font-medium">viajes/día</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Total acumulado: {summary.totalViajes.toLocaleString()} viajes
          </div>
        </div>

        {/* KPI 3: MAX DIA */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              DÍA DE MAYOR UTILIZACIÓN
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-emerald-400">
              {summary.maxDia?.utilizacionPct || 0}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({summary.maxDia?.viajes || 0} vjs)
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono pt-2 border-t border-slate-800/80">
            {summary.maxDia?.fechaFormatted || 'N/A'}
          </div>
        </div>

        {/* KPI 4: MIN DIA */}
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-rose-300 uppercase">
              DÍA DE MENOR UTILIZACIÓN
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-rose-400">
              {summary.minDia?.utilizacionPct || 0}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({summary.minDia?.viajes || 0} vjs)
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono pt-2 border-t border-slate-800/80">
            {summary.minDia?.fechaFormatted || 'N/A'}
          </div>
        </div>
      </div>

      {/* Main Chart: Temporal Trend of Daily Utilization */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Evolución Diaria de Utilización de Flota
            </h3>
            <p className="text-xs text-slate-400">
              Comportamiento porcentual diario con línea de referencia al 100% de capacidad
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              % Utilización
            </span>
            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold ml-2">
              <span className="w-2.5 h-0.5 bg-amber-400" />
              Meta 100%
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={records} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="utilGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="fechaFormatted"
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
                domain={[0, 'dataMax + 20']}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                formatter={(value: any) => [`${value}%`, 'Utilización']}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <ReferenceLine
                y={100}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: '100% Capacidad',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight'
                }}
              />
              <Area
                type="monotone"
                dataKey="utilizacionPct"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#utilGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anomalies Notice & Breakdown */}
      {summary.anomaliasCount > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2.5 text-amber-400">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold text-white">
              Anomalías de Sobredemanda Detectadas ({summary.anomaliasCount} días &gt; 100%)
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Se registraron días donde la cantidad de viajes superó la cantidad de vehículos base disponibles (utilización &gt; 100%, como 170%), lo cual ocurre cuando un mismo vehículo realiza múltiples recorridos o rotaciones en la misma jornada.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {summary.anomalias.map((anom) => (
              <div
                key={anom.id}
                className="bg-slate-900/80 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-xs text-slate-200 font-bold">
                    {anom.fechaFormatted}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {anom.cantidadViajes} viajes / {anom.cantidadFlota} vh
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                    {anom.utilizacionPct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              Detalle Cronológico de Utilización ({filteredRecords.length} registros)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Date */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar fecha..."
                value={searchDate}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-36 sm:w-44"
              />
            </div>

            {/* Toggle Anomaly */}
            <button
              onClick={() => {
                setFilterAnomalyOnly(!filterAnomalyOnly);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filterAnomalyOnly
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              Solo anomalías (&gt;100%)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3 text-right">Cantidad Viajes</th>
                <th className="py-2.5 px-3 text-right">Flota Asignada</th>
                <th className="py-2.5 px-3 text-right">% Utilización</th>
                <th className="py-2.5 px-3 text-center">Estado Operativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-normal text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No se encontraron registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-white">
                        {item.fechaFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                        {item.cantidadViajes}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {item.cantidadFlota}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={`${
                            item.isAnomaly
                              ? 'text-amber-400'
                              : item.utilizacionPct >= 80
                              ? 'text-emerald-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {item.utilizacionPct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.isAnomaly ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Sobredemanda (&gt;100%)
                          </span>
                        ) : item.utilizacionPct >= 85 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            Óptima
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                            Normal
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
            de <span className="font-bold text-white">{filteredRecords.length}</span> días
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
