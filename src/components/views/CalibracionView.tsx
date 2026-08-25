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
  ArrowUpDown,
  Calendar,
  Layers
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
import {
  CalibracionRecord,
  CalibracionSummary,
  VehiculoRecord,
  ProcessCoverage,
  UnmatchedRecordInfo,
  MonthProgressData
} from '../../types';
import { calculateMonthlyFleetProgress } from '../../utils/dataProcessor';

interface CalibracionViewProps {
  records: CalibracionRecord[];
  summary: CalibracionSummary;
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

const CD_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export const CalibracionView: React.FC<CalibracionViewProps> = ({
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
  const [selectedEstado, setSelectedEstado] = useState('all');
  const [selectedCd, setSelectedCd] = useState('all');
  const [showOnlyFleetBase, setShowOnlyFleetBase] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonthCut, setSelectedMonthCut] = useState<string>('JULIO');
  const [pendingTab, setPendingTab] = useState<'acumulado' | 'delMes'>('acumulado');
  const itemsPerPage = 15;

  // 1. Master Fleet lookup map
  const fleetMap = useMemo(() => {
    const map = new Map<string, VehiculoRecord>();
    fleetRecords.forEach((v) => {
      const p = (v.placa || '').trim().toUpperCase();
      if (p) map.set(p, v);
    });
    return map;
  }, [fleetRecords]);

  const fleetPlacasSet = useMemo(() => {
    if (fleetMap.size > 0) {
      return new Set(fleetMap.keys());
    }
    if (!fleetCoverage) return null;
    return new Set([...fleetCoverage.placasEjecutadas, ...fleetCoverage.placasPendientes]);
  }, [fleetMap, fleetCoverage]);

  // 2. Strict Monthly Snapshot & Cumulative Execution vs Master Fleet (VEHICULOS)
  const monthlyProgress = useMemo(() => {
    return calculateMonthlyFleetProgress<CalibracionRecord>(
      fleetRecords,
      records,
      (r: CalibracionRecord) => r.estado === 'COMPLETADO',
      ['FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO']
    );
  }, [fleetRecords, records]);

  // Determine active month for KPI cut
  const activeMonthData: MonthProgressData = useMemo(() => {
    if (selectedMes !== 'all' && monthlyProgress.byMes[selectedMes]) {
      return monthlyProgress.byMes[selectedMes];
    }
    if (monthlyProgress.byMes[selectedMonthCut]) {
      return monthlyProgress.byMes[selectedMonthCut];
    }
    return (
      monthlyProgress.months[monthlyProgress.months.length - 1] || {
        mes: 'JULIO',
        delMesEjecutados: 0,
        delMesPendientes: monthlyProgress.totalFleet,
        delMesPctEjecutado: 0,
        delMesPctPendiente: 100,
        delMesPlacasEjecutadas: [],
        delMesPlacasPendientes: monthlyProgress.allFleetPlacas,
        acumuladoHechos: 0,
        acumuladoFaltan: monthlyProgress.totalFleet,
        acumuladoPctHechos: 0,
        acumuladoPctFaltan: 100,
        acumuladoPlacasHechos: [],
        acumuladoPlacasFaltan: monthlyProgress.allFleetPlacas
      }
    );
  }, [monthlyProgress, selectedMes, selectedMonthCut]);

  // 3. Data for Monthly Progress Bar Chart
  const monthlyChartData = useMemo(() => {
    return monthlyProgress.months.map((m) => ({
      mes: m.mes,
      completados: m.delMesEjecutados,
      pendientes: m.delMesPendientes,
      total: m.delMesEjecutados + m.delMesPendientes,
      acumuladoHechos: m.acumuladoHechos,
      acumuladoFaltan: m.acumuladoFaltan,
      delMesPctEjecutado: m.delMesPctEjecutado,
      acumuladoPctHechos: m.acumuladoPctHechos
    }));
  }, [monthlyProgress]);

  // 4. Pending fleet vehicles to display in the management table
  const pendingPlacasList = useMemo(() => {
    if (pendingTab === 'acumulado') {
      return activeMonthData.acumuladoPlacasFaltan;
    }
    return activeMonthData.delMesPlacasPendientes;
  }, [activeMonthData, pendingTab]);

  // Options for filter selects
  const mesOptions = useMemo(() => {
    if (monthlyProgress.months.length > 0) {
      return monthlyProgress.months.map((m) => m.mes);
    }
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.mes) set.add(r.mes.trim().toUpperCase());
    });
    return Array.from(set);
  }, [monthlyProgress, records]);

  const cdOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.cd) set.add(r.cd);
    });
    fleetRecords.forEach((v) => {
      if (v.cd) set.add(v.cd);
    });
    return Array.from(set);
  }, [records, fleetRecords]);

  // Filtered records for general history table
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (showOnlyFleetBase && fleetPlacasSet && !fleetPlacasSet.has(r.placa.trim().toUpperCase())) {
        return false;
      }
      if (searchPlaca.trim() && !r.placaLower.includes(searchPlaca.trim().toLowerCase())) {
        return false;
      }
      if (selectedMes !== 'all' && r.mes.trim().toUpperCase() !== selectedMes.trim().toUpperCase()) {
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
  }, [records, searchPlaca, selectedMes, selectedEstado, selectedCd, showOnlyFleetBase, fleetPlacasSet]);

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
    setShowOnlyFleetBase(false);
    setCurrentPage(1);
  };

  const handleSelectMonthPill = (m: string) => {
    setSelectedMonthCut(m);
    if (selectedMes !== 'all') {
      setSelectedMes(m);
      setCurrentPage(1);
    }
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
            Seguimiento de calibraciones mecánicas, estado de avance por Centro de Distribución y cobertura real de flota.
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

      {/* Monthly Execution & Cumulative Progress Card (Base VEHICULOS) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/40 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Avance Mensual y Acumulado sobre Flota Base Oficial ({monthlyProgress.totalFleet} Vehículos)
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 uppercase">
                  Corte: {activeMonthData.mes}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Comparativo de actividad fotográfica mensual vs. avance acumulado de cobertura de flota.
              </p>
            </div>
          </div>

          {/* Month Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            {monthlyProgress.months.map((m) => {
              const isActive = (selectedMes !== 'all' ? selectedMes : selectedMonthCut) === m.mes;
              return (
                <button
                  key={m.mes}
                  onClick={() => handleSelectMonthPill(m.mes)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
                  }`}
                >
                  {m.mes.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 Big Pairs of KPIs: Del Mes & Acumulado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pair 1: Del Mes */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Foto del Mes ({activeMonthData.mes})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Actividad exclusiva del mes</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Ejecutados del Mes
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-emerald-300">
                    {activeMonthData.delMesEjecutados}
                  </span>
                  <span className="text-xs text-slate-400">/ {monthlyProgress.totalFleet}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 block mt-0.5">
                  {activeMonthData.delMesPctEjecutado}% de la flota
                </span>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Pendientes del Mes
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-amber-300">
                    {activeMonthData.delMesPendientes}
                  </span>
                  <span className="text-xs text-slate-400">/ {monthlyProgress.totalFleet}</span>
                </div>
                <span className="text-[11px] font-bold text-amber-400 block mt-0.5">
                  {activeMonthData.delMesPctPendiente}% sin calibrar
                </span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${activeMonthData.delMesPctEjecutado}%` }}
              />
              <div
                className="bg-amber-500/80 h-full transition-all duration-300"
                style={{ width: `${activeMonthData.delMesPctPendiente}%` }}
              />
            </div>
          </div>

          {/* Pair 2: Acumulado */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
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
                  Faltan por Calibrar
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
                Pendientes del Mes ({activeMonthData.delMesPendientes})
              </button>
            </div>
          </div>

          {/* Pending Plates Grid / Table */}
          {pendingPlacasList.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center text-xs text-emerald-300">
              ✓ Toda la flota oficial ({monthlyProgress.totalFleet} vehículos) se encuentra al día con su calibración para este corte.
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
                    <th className="py-2 px-3">Estado de Calibración</th>
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
                            PENDIENTE CALIBRAR
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

      {/* Dirty Data Notice */}
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
              La hoja de Calibración registra placas que no pertenecen a la flota base oficial (ej. sedes alternas o placas antiguas). Para calcular la cobertura real se consideran exclusivamente las {monthlyProgress.totalFleet || 50} placas del catálogo VEHICULOS.
            </p>
          </div>
        </div>
      )}

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
            {/* Solo Flota Oficial Toggle */}
            <button
              onClick={() => {
                setShowOnlyFleetBase(!showOnlyFleetBase);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showOnlyFleetBase
                  ? 'bg-blue-600 border-blue-500 text-white shadow'
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
