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
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp
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
  Cell,
  Legend,
  LabelList
} from 'recharts';
import {
  LavadoRecord,
  LavadosSummary,
  ProcessCoverage,
  UnmatchedRecordInfo,
  VehiculoRecord
} from '../../types';
import { calculateMonthlyFleetProgress } from '../../utils/dataProcessor';

interface LavadosViewProps {
  records: LavadoRecord[];
  summary: LavadosSummary;
  fleetRecords?: VehiculoRecord[];
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
  fleetRecords = [],
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
  const [pendingTab, setPendingTab] = useState<'delMes' | 'acumulado'>('acumulado');
  const itemsPerPage = 15;

  // Compute month-by-month and cumulative progression against the dynamic Master Fleet Base (VEHICULOS)
  const monthlyProgress = useMemo(() => {
    return calculateMonthlyFleetProgress(fleetRecords, records);
  }, [fleetRecords, records]);

  // Selected month for detailed monthly snapshot vs cumulative progress KPI card
  const [activeSelectedMonth, setActiveSelectedMonth] = useState<string>('');

  // Synchronize active month if not set or changed
  const currentActiveMonth = useMemo(() => {
    if (activeSelectedMonth && monthlyProgress.months.some((m) => m.mes === activeSelectedMonth)) {
      return activeSelectedMonth;
    }
    if (monthlyProgress.months.length > 0) {
      return monthlyProgress.months[monthlyProgress.months.length - 1].mes;
    }
    return '';
  }, [activeSelectedMonth, monthlyProgress.months]);

  const activeMonthData = useMemo(() => {
    return (
      monthlyProgress.months.find((m) => m.mes === currentActiveMonth) ||
      monthlyProgress.months[0] || {
        mes: 'N/A',
        totalFleet: monthlyProgress.totalFleet || 50,
        delMesEjecutados: 0,
        delMesPendientes: monthlyProgress.totalFleet || 50,
        delMesPctEjecutado: 0,
        delMesPctPendiente: 100,
        acumuladoHechos: 0,
        acumuladoFaltan: monthlyProgress.totalFleet || 50,
        acumuladoPctHechos: 0,
        acumuladoPctFaltan: 100,
        placasEjecutadasMes: [],
        placasPendientesMes: [],
        placasHechasAcumulado: [],
        placasFaltanAcumulado: []
      }
    );
  }, [currentActiveMonth, monthlyProgress]);

  // Fast lookup map for fleet metadata (CD, Contratista) by normalized plate
  const fleetMap = useMemo(() => {
    const map = new Map<string, VehiculoRecord>();
    fleetRecords.forEach((v) => {
      const p = (v.placa || '').trim().toUpperCase();
      if (p) map.set(p, v);
    });
    return map;
  }, [fleetRecords]);

  // Master Fleet set for filtering
  const fleetPlacasSet = useMemo(() => {
    const set = new Set<string>();
    fleetRecords.forEach((v) => {
      const p = (v.placa || '').trim().toUpperCase();
      if (p) set.add(p);
    });
    if (set.size === 0 && fleetCoverage) {
      [...fleetCoverage.placasEjecutadas, ...fleetCoverage.placasPendientes].forEach((p) =>
        set.add(p.trim().toUpperCase())
      );
    }
    return set;
  }, [fleetRecords, fleetCoverage]);

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
      if (
        showOnlyFleetBase &&
        fleetPlacasSet.size > 0 &&
        !fleetPlacasSet.has(r.placa.trim().toUpperCase())
      ) {
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

  const pendingPlacasList = useMemo(() => {
    if (pendingTab === 'delMes') {
      return activeMonthData.placasPendientesMes || [];
    }
    return activeMonthData.placasFaltanAcumulado || [];
  }, [pendingTab, activeMonthData]);

  // Chart data for monthly comparison: Ejecutados vs Pendientes
  const monthlyChartData = useMemo(() => {
    if (monthlyProgress.months.length > 0) {
      return monthlyProgress.months.map((m) => ({
        mes: m.mes,
        ejecutados: m.delMesEjecutados,
        pendientes: m.delMesPendientes,
        delMesPctEjecutado: m.delMesPctEjecutado,
        acumuladoHechos: m.acumuladoHechos,
        acumuladoFaltan: m.acumuladoFaltan,
        acumuladoPctHechos: m.acumuladoPctHechos
      }));
    }
    return summary.byMes.map((m) => ({
      mes: m.mes,
      ejecutados: m.count,
      pendientes: Math.max(0, (monthlyProgress.totalFleet || 50) - m.count),
      delMesPctEjecutado: Math.round((m.count / (monthlyProgress.totalFleet || 50)) * 100),
      acumuladoHechos: m.count,
      acumuladoFaltan: Math.max(0, (monthlyProgress.totalFleet || 50) - m.count),
      acumuladoPctHechos: Math.round((m.count / (monthlyProgress.totalFleet || 50)) * 100)
    }));
  }, [monthlyProgress, summary.byMes]);

  const handleResetFilters = () => {
    setSearchPlaca('');
    setSelectedMes('all');
    setSelectedTaller('all');
    setShowOnlyFleetBase(false);
    setCurrentPage(1);
  };

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

      {/* Monthly & Cumulative Execution Progress on Master Fleet Base (VEHICULOS) */}
      <div
        className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/40 shadow-xl space-y-4"
        id="lavados-monthly-fleet-progress"
      >
        {/* Header with Month Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Cumplimiento de Lavados por Mes (Flota Base {monthlyProgress.totalFleet} Vehículos)
              </h3>
              <p className="text-xs text-slate-400">
                Métricas dinámicas del mes seleccionado vs avance acumulado sobre el catálogo maestro VEHICULOS.
              </p>
            </div>
          </div>

          {/* Month Selector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {monthlyProgress.months.map((m) => (
              <button
                key={m.mes}
                onClick={() => setActiveSelectedMonth(m.mes)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentActiveMonth === m.mes
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {m.mes}
              </button>
            ))}
          </div>
        </div>

        {/* 2 Comparison KPI Panels: DEL MES vs ACUMULADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel 1: DEL MES (Foto del Mes) */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Del Mes ({activeMonthData.mes})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Foto de actividad mensual</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Ejecutados del Mes
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-cyan-300">
                    {activeMonthData.delMesEjecutados}
                  </span>
                  <span className="text-xs text-slate-400">/ {monthlyProgress.totalFleet}</span>
                </div>
                <span className="text-[11px] font-bold text-cyan-400 block mt-0.5">
                  {activeMonthData.delMesPctEjecutado}% de la flota
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sin Lavado este Mes
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-slate-300">
                    {activeMonthData.delMesPendientes}
                  </span>
                  <span className="text-xs text-slate-400">/ {monthlyProgress.totalFleet}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
                  {activeMonthData.delMesPctPendiente}% sin registro
                </span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${activeMonthData.delMesPctEjecutado}%` }}
              />
              <div
                className="bg-slate-700 h-full transition-all duration-300"
                style={{ width: `${activeMonthData.delMesPctPendiente}%` }}
              />
            </div>
          </div>

          {/* Panel 2: ACUMULADO (Hasta ese Mes) */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-blue-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Acumulado (Hasta {activeMonthData.mes})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Avance real de cobertura</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  Hechos Acumulados
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-blue-300">
                    {activeMonthData.acumuladoHechos}
                  </span>
                  <span className="text-xs text-slate-400">/ {monthlyProgress.totalFleet}</span>
                </div>
                <span className="text-[11px] font-bold text-blue-400 block mt-0.5">
                  {activeMonthData.acumuladoPctHechos}% flota cubierta
                </span>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  Faltan por Lavar
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-amber-400">
                    {activeMonthData.acumuladoFaltan}
                  </span>
                  <span className="text-xs text-slate-400">/ {monthlyProgress.totalFleet}</span>
                </div>
                <span className="text-[11px] font-bold text-amber-300 block mt-0.5">
                  {activeMonthData.acumuladoPctFaltan}% por gestionar
                </span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${activeMonthData.acumuladoPctHechos}%` }}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${activeMonthData.acumuladoPctFaltan}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section: Pending Fleet Vehicles Table for this Cut */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white">
                Vehículos de la Flota Base Pendientes ({pendingPlacasList.length} unidades)
              </h4>
            </div>

            {/* Toggle Between Acumulado Faltan vs Del Mes Pendientes */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                onClick={() => setPendingTab('acumulado')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  pendingTab === 'acumulado'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Faltan Acumulado ({activeMonthData.acumuladoFaltan})
              </button>
              <button
                onClick={() => setPendingTab('delMes')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  pendingTab === 'delMes'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sin Lavado en el Mes ({activeMonthData.delMesPendientes})
              </button>
            </div>
          </div>

          {/* Pending Plates Grid / Table */}
          {pendingPlacasList.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center text-xs text-emerald-300">
              ✓ Toda la flota oficial ({monthlyProgress.totalFleet} vehículos) se encuentra al día con sus lavados para este corte.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-56 rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700 uppercase tracking-wider text-[10px] sticky top-0">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Placa Base</th>
                    <th className="py-2 px-3">Centro (CD)</th>
                    <th className="py-2 px-3">Contratista</th>
                    <th className="py-2 px-3">Estado de Lavado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-normal text-slate-300">
                  {pendingPlacasList.map((placa, idx) => {
                    const vehInfo = fleetMap.get(placa);
                    return (
                      <tr key={placa} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-1.5 px-3 font-mono text-slate-500 text-[10px]">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono font-bold text-amber-300">{placa}</td>
                        <td className="py-1.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                            {vehInfo?.cd || 'GALAPA'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-400 text-[11px]">
                          {vehInfo?.contratista || 'Logisticos.co'}
                        </td>
                        <td className="py-1.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            PENDIENTE LAVAR
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dirty Data Notice if any */}
      {unmatchedInfo && unmatchedInfo.uniquePlacas > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 shadow-md">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300">
              Aviso de Calidad de Datos: {unmatchedInfo.count} registros con placas fuera de la flota oficial ({unmatchedInfo.uniquePlacas} placas externas)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              La hoja de Lavados registra placas que no pertenecen a la flota base oficial. Para calcular la cobertura real se consideran exclusivamente las {monthlyProgress.totalFleet || 50} placas del catálogo maestro VEHICULOS.
            </p>
          </div>
        </div>
      )}

      {/* Top 3 KPI Cards */}
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
        {/* Chart 1: Lavados Completados vs Pendientes por Mes (7 cols) - Uses Master Fleet Base */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Vehículos Lavados vs Pendientes por Mes (Flota Base {monthlyProgress.totalFleet})
            </h3>
            <p className="text-xs text-slate-400">
              Evolución de cobertura del programa de lavado sobre la flota base oficial
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
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
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1.5">
                          <div className="font-bold text-white border-b border-slate-700 pb-1">
                            {label} (Flota: {monthlyProgress.totalFleet})
                          </div>
                          <div className="text-cyan-400">
                            <strong>Del mes:</strong> {data.ejecutados} lavados / {data.pendientes} pendientes ({data.delMesPctEjecutado}%)
                          </div>
                          <div className="text-blue-400">
                            <strong>Acumulado:</strong> {data.acumuladoHechos} hechos / {data.acumuladoFaltan} faltan ({data.acumuladoPctHechos}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
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
                  dataKey="ejecutados"
                  name="Lavados del Mes"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                >
                  <LabelList
                    dataKey="ejecutados"
                    position="top"
                    fill="#e2e8f0"
                    fontSize={11}
                    fontWeight={600}
                    formatter={(val: any) => (Number(val) > 0 ? val : '')}
                  />
                </Bar>
                <Bar
                  dataKey="pendientes"
                  name="Pendientes del Mes"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                >
                  <LabelList
                    dataKey="pendientes"
                    position="top"
                    fill="#fcd34d"
                    fontSize={11}
                    fontWeight={600}
                    formatter={(val: any) => (Number(val) > 0 ? val : '')}
                  />
                </Bar>
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

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.byTaller}
                  dataKey="count"
                  nameKey="taller"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={60}
                  paddingAngle={4}
                  label={({ cx, cy, midAngle, outerRadius, percent, count }: any) => {
                    if (!count || count === 0) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 14;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    const pct = Math.round((percent || 0) * 100);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#e2e8f0"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        fontSize={10}
                        fontWeight={600}
                      >
                        {`${count} (${pct}%)`}
                      </text>
                    );
                  }}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
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
            {/* Solo Flota Oficial Toggle */}
            <button
              onClick={() => {
                setShowOnlyFleetBase(!showOnlyFleetBase);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showOnlyFleetBase
                  ? 'bg-cyan-600 border-cyan-500 text-white shadow'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {showOnlyFleetBase ? `✓ Solo Flota Base (${monthlyProgress.totalFleet})` : 'Filtrar Flota Base'}
            </button>

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

            {/* Reset Filters */}
            {(searchPlaca || selectedMes !== 'all' || selectedTaller !== 'all' || showOnlyFleetBase) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1"
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
