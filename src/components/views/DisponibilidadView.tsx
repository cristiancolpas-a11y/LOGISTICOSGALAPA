import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Truck,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { DisponibilidadRecord, DisponibilidadSummary } from '../../types';

interface DisponibilidadViewProps {
  records: DisponibilidadRecord[];
  summary: DisponibilidadSummary;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
}

export const DisponibilidadView: React.FC<DisponibilidadViewProps> = ({
  records,
  summary,
  isLoading = false,
  onRefresh,
  lastUpdated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCd, setSelectedCd] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const cdOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.cd) set.add(r.cd);
    });
    return Array.from(set);
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (
          !r.contratista.toLowerCase().includes(query) &&
          !r.fechaFormatted.toLowerCase().includes(query) &&
          !r.fechaIso.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (selectedCd !== 'all' && r.cd !== selectedCd) {
        return false;
      }
      return true;
    });
  }, [records, searchQuery, selectedCd]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="disponibilidad-view">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Índice de Disponibilidad Operativa de Flota
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Seguimiento de vehículos activos vs indisponibles por semanas epidemiológicas y centros operativos.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="disponibilidad-kpis">
        {/* KPI 1: PROMEDIO DISPONIBILIDAD */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              DISPONIBILIDAD PROMEDIO
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-emerald-400">
              {summary.promedioDisponibilidad}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Flota activa: ~{summary.promedioDisponibles} vh/día
          </div>
        </div>

        {/* KPI 2: PROMEDIO INDISPONIBLES */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
              PROMEDIO INDISPONIBLES
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-amber-400">
              {summary.promedioIndisponibles}
            </span>
            <span className="text-xs text-slate-400 font-medium">vh en paro/taller</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Flota total evaluada: {summary.totalFlotaPromedio} vh
          </div>
        </div>

        {/* KPI 3: MEJOR SEMANA */}
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-blue-300 uppercase">
              MEJOR SEMANA
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl font-black tracking-tight text-white">
              Semana {summary.mejorSemana?.semana || 'N/A'}
            </span>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold pt-2 border-t border-slate-800/80">
            {summary.mejorSemana?.promedioPct}% de disponibilidad
          </div>
        </div>

        {/* KPI 4: PEOR SEMANA */}
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-rose-300 uppercase">
              SEMANA CON MENOR TASA
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl font-black tracking-tight text-white">
              Semana {summary.peorSemana?.semana || 'N/A'}
            </span>
          </div>
          <div className="text-[11px] text-rose-400 font-semibold pt-2 border-t border-slate-800/80">
            {summary.peorSemana?.promedioPct}% de disponibilidad
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Evolución por Semana (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              % Disponibilidad por Semana (Semana 1 a 42)
            </h3>
            <p className="text-xs text-slate-400">
              Tendencia temporal de disponibilidad porcentual de la flota
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.bySemana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="semana"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(s) => `S${s}`}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  domain={[50, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val}%`, 'Disponibilidad']}
                  labelFormatter={(s) => `Semana ${s}`}
                />
                <Line
                  type="monotone"
                  dataKey="promedioPct"
                  name="Disponibilidad %"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Disponibles vs Indisponibles (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Flota Disponible vs Indisponible
            </h3>
            <p className="text-xs text-slate-400">
              Distribución de unidades operativas vs en mantenimiento
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.bySemana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="semana"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(s) => `S${s}`}
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
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                />
                <Bar
                  dataKey="disponiblesAvg"
                  name="Disponibles"
                  stackId="flota"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="indisponiblesAvg"
                  name="Indisponibles"
                  stackId="flota"
                  fill="#f43f5e"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              Registros de Disponibilidad ({filteredRecords.length} encontrados)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Query */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar fecha, contratista..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-44 sm:w-52"
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
              {cdOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
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
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Semana</th>
                <th className="py-2.5 px-3">CD</th>
                <th className="py-2.5 px-3">Contratista</th>
                <th className="py-2.5 px-3 text-right">Disponibles</th>
                <th className="py-2.5 px-3 text-right">Indisponibles</th>
                <th className="py-2.5 px-3 text-right">Total Flota</th>
                <th className="py-2.5 px-3 text-right">% Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-normal text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-white">
                        {item.fechaFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        Sem {item.semana}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                          {item.cd}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {item.contratista}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                        {item.vhsDisponibles}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-400">
                        {item.vhIndisponibles}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                        {item.totalVh}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            item.promedioPct >= 90
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.promedioPct}%
                        </span>
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
