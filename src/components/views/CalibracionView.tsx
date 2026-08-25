import React, { useState, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { CalibracionRecord, CalibracionSummary } from '../../types';

interface CalibracionViewProps {
  records: CalibracionRecord[];
  summary: CalibracionSummary;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
}

const CD_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export const CalibracionView: React.FC<CalibracionViewProps> = ({
  records,
  summary,
  isLoading = false,
  onRefresh,
  lastUpdated
}) => {
  const [searchPlaca, setSearchPlaca] = useState('');
  const [selectedMes, setSelectedMes] = useState('all');
  const [selectedEstado, setSelectedEstado] = useState('all');
  const [selectedCd, setSelectedCd] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Options for filter selects
  const mesOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.mes) set.add(r.mes);
    });
    return Array.from(set);
  }, [records]);

  const cdOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.cd) set.add(r.cd);
    });
    return Array.from(set);
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchPlaca.trim() && !r.placaLower.includes(searchPlaca.trim().toLowerCase())) {
        return false;
      }
      if (selectedMes !== 'all' && r.mes !== selectedMes) {
        return false;
      }
      if (selectedEstado !== 'all' && r.estado !== selectedEstado) {
        return false;
      }
      if (selectedCd !== 'all' && r.cd !== selectedCd) {
        return false;
      }
      return true;
    });
  }, [records, searchPlaca, selectedMes, selectedEstado, selectedCd]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleResetFilters = () => {
    setSearchPlaca('');
    setSelectedMes('all');
    setSelectedEstado('all');
    setSelectedCd('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="calibracion-view">
      {/* Header Banner with actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Control de Calibración de Vehículos en Taller
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Seguimiento de calibraciones mecánicas, estado de avance por Centro de Distribución y evidencia fotográfica en Drive.
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

      {/* Critical Alert Notice if high pending count */}
      {summary.pendientes > summary.completados && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 shadow-md">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300">
              Alerta Operativa de Taller: {summary.pendientes} Calibraciones Pendientes ({summary.pctPendiente}%)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Existe una brecha significativa con solo {summary.completados} calibraciones completadas ({summary.pctCompletado}%). Se recomienda priorizar el ingreso a taller de la flota asignada a Galapa y La Arenosa.
            </p>
          </div>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="calibracion-kpis">
        {/* KPI 1: TOTAL */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              TOTAL REGISTROS
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-white">
              {summary.total.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">calibraciones</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Período: Feb 2026 – Jul 2026
          </div>
        </div>

        {/* KPI 2: % COMPLETADO */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              % COMPLETADO
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-emerald-400">
              {summary.pctCompletado}%
            </span>
            <span className="text-xs text-emerald-300/80 font-medium">
              ({summary.completados} de {summary.total})
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${summary.pctCompletado}%` }}
            />
          </div>
        </div>

        {/* KPI 3: PENDIENTES (CRITICO) */}
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-900 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
              CANTIDAD PENDIENTE
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-amber-400">
              {summary.pendientes.toLocaleString()}
            </span>
            <span className="text-xs text-amber-300/80 font-semibold">
              ({summary.pctPendiente}%)
            </span>
          </div>
          <div className="text-[11px] text-amber-300/90 pt-2 border-t border-slate-800/80 flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Requiere programación en taller
          </div>
        </div>

        {/* KPI 4: COMPLETADOS */}
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
              CALIBRADOS EFECTIVOS
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-blue-400">
              {summary.completados.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">con evidencia</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            Fotos disponibles en Drive
          </div>
        </div>
      </div>

      {/* Visual Charts: Mes Comparison & CD Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Completadas vs Pendientes por MES (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Calibraciones Completadas vs Pendientes por Mes
              </h3>
              <p className="text-xs text-slate-400">
                Evolución del plan de calibración de vehículos por mensualidad
              </p>
            </div>
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
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                />
                <Bar
                  dataKey="completados"
                  name="Completado"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  dataKey="pendientes"
                  name="Pendiente"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribución por CD (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight mb-1">
              Distribución por Centro (CD)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Carga total de calibraciones: Galapa vs La Arenosa
            </p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.byCd}
                  dataKey="total"
                  nameKey="cd"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {summary.byCd.map((_entry, index) => (
                    <Cell key={`cd-${index}`} fill={CD_COLORS[index % CD_COLORS.length]} />
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

          {/* CD Details summary list */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            {summary.byCd.map((cdItem, idx) => (
              <div key={cdItem.cd} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CD_COLORS[idx % CD_COLORS.length] }}
                  />
                  <span className="font-semibold text-slate-200">{cdItem.cd}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-mono">
                  <span>{cdItem.total} reg.</span>
                  <span className="text-emerald-400 font-semibold font-sans">
                    ({cdItem.pctCompletado}% comp.)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filterable Table Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        {/* Table Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              Listado de Calibraciones ({filteredRecords.length} encontrados)
            </h3>
          </div>

          {/* Quick Filters */}
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

            {/* Estado Filter */}
            <select
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="COMPLETADO">Completado</option>
              <option value="PENDIENTE">Pendiente</option>
            </select>

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

            {/* Clear filters */}
            {(searchPlaca || selectedMes !== 'all' || selectedEstado !== 'all' || selectedCd !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-3">CD</th>
                <th className="py-2.5 px-3">Mes / Semana</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Taller Asignado</th>
                <th className="py-2.5 px-3">Contratista</th>
                <th className="py-2.5 px-3 text-center">Evidencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-normal text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No se encontraron calibraciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const isCompleted = item.estado === 'COMPLETADO';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Estado Semáforo */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          {item.estado}
                        </span>
                      </td>

                      {/* Placa */}
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {item.placa}
                      </td>

                      {/* CD */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                          {item.cd}
                        </span>
                      </td>

                      {/* Mes / Semana */}
                      <td className="py-2.5 px-3 text-slate-300">
                        <span className="font-semibold text-white">{item.mes}</span>
                        {item.semana && item.semana !== 'N/A' && (
                          <span className="text-slate-500 ml-1 text-[10px]">
                            (Sem {item.semana})
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {item.fechaFormatted || item.fechaRaw || 'N/A'}
                      </td>

                      {/* Taller */}
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {item.taller}
                      </td>

                      {/* Contratista */}
                      <td className="py-2.5 px-3 text-slate-400">
                        {item.contratista}
                      </td>

                      {/* Foto Evidencia Link */}
                      <td className="py-2.5 px-3 text-center">
                        {item.fotoEvidenciaUrl && item.fotoEvidenciaUrl.startsWith('http') ? (
                          <a
                            href={item.fotoEvidenciaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border border-blue-500/30 transition-colors text-[11px] font-semibold"
                            title="Abrir foto de evidencia en Google Drive"
                          >
                            <span>Ver Foto</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">
                            Sin URL
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

        {/* Pagination controls */}
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
            de <span className="font-bold text-white">{filteredRecords.length}</span> calibraciones
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
