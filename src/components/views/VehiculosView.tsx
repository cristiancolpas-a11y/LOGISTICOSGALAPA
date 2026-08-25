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
  Database,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  FileCheck2,
  Sparkles,
  Info,
  X,
  Eye,
  Check,
  LayoutGrid,
  Table as TableIcon
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
  VehiculoRecord,
  FleetMasterSummary,
  VehicleComplianceStatus,
  UnmatchedRecordInfo
} from '../../types';

interface VehiculosViewProps {
  records: VehiculoRecord[];
  fleetSummary: FleetMasterSummary;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
}

const CD_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
const DONUT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export const VehiculosView: React.FC<VehiculosViewProps> = ({
  records,
  fleetSummary,
  isLoading = false,
  onRefresh,
  lastUpdated
}) => {
  const [searchPlaca, setSearchPlaca] = useState('');
  const [selectedCd, setSelectedCd] = useState('all');
  const [selectedContratista, setSelectedContratista] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'all-compliant' | 'has-pending' | 'pending-calib' | 'pending-lavado' | 'pending-checklist'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState<VehicleComplianceStatus | null>(null);
  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Extract unique CD and Contratistas from master fleet
  const cdBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((v) => {
      const cd = v.cd || 'GALAPA';
      map.set(cd, (map.get(cd) || 0) + 1);
    });
    return Array.from(map.entries()).map(([cd, count]) => ({ cd, count }));
  }, [records]);

  const contratistaBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((v) => {
      const c = v.contratista || 'Logisticos.co';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).map(([contratista, count]) => ({ contratista, count }));
  }, [records]);

  // Chart data: Executed vs Pending by Process
  const processCoverageChartData = useMemo(() => {
    return [
      {
        proceso: 'Calibración',
        Ejecutados: fleetSummary.calibracionCoverage.ejecutados,
        Pendientes: fleetSummary.calibracionCoverage.pendientes,
        pct: fleetSummary.calibracionCoverage.pctEjecutado
      },
      {
        proceso: 'Lavados',
        Ejecutados: fleetSummary.lavadosCoverage.ejecutados,
        Pendientes: fleetSummary.lavadosCoverage.pendientes,
        pct: fleetSummary.lavadosCoverage.pctEjecutado
      },
      {
        proceso: 'Check List',
        Ejecutados: fleetSummary.checkListCoverage.ejecutados,
        Pendientes: fleetSummary.checkListCoverage.pendientes,
        pct: fleetSummary.checkListCoverage.pctEjecutado
      }
    ];
  }, [fleetSummary]);

  // Donut chart: Overall fleet compliance status distribution
  const complianceDistributionData = useMemo(() => {
    let perfect = 0;
    let partial = 0;
    let critical = 0;

    fleetSummary.vehicleStatuses.forEach((v) => {
      if (v.complianceScore === 3) perfect++;
      else if (v.complianceScore >= 1) partial++;
      else critical++;
    });

    return [
      { name: '100% Al Día (3/3)', value: perfect, color: '#10b981' },
      { name: 'Pendiente Parcial (1-2/3)', value: partial, color: '#f59e0b' },
      { name: 'Sin Procesos (0/3)', value: critical, color: '#ef4444' }
    ].filter((item) => item.value > 0);
  }, [fleetSummary]);

  // Filter 360 vehicle statuses based on user selections
  const filteredVehicles = useMemo(() => {
    return fleetSummary.vehicleStatuses.filter((v) => {
      // Search
      if (searchPlaca.trim() && !v.placa.toLowerCase().includes(searchPlaca.trim().toLowerCase())) {
        return false;
      }
      // CD
      if (selectedCd !== 'all' && v.cd !== selectedCd) {
        return false;
      }
      // Contratista
      if (selectedContratista !== 'all' && v.contratista !== selectedContratista) {
        return false;
      }
      // Quick Status Filter
      if (statusFilter === 'all-compliant' && !v.isFullyCompliant) {
        return false;
      }
      if (statusFilter === 'has-pending' && v.isFullyCompliant) {
        return false;
      }
      if (statusFilter === 'pending-calib' && v.calibracion.isCompliant) {
        return false;
      }
      if (statusFilter === 'pending-lavado' && v.lavado.isCompliant) {
        return false;
      }
      if (statusFilter === 'pending-checklist' && v.checkList.isCompliant) {
        return false;
      }

      return true;
    });
  }, [fleetSummary.vehicleStatuses, searchPlaca, selectedCd, selectedContratista, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / itemsPerPage));
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(start, start + itemsPerPage);
  }, [filteredVehicles, currentPage]);

  const totalUnmatchedCount =
    fleetSummary.unmatchedCalibracion.uniquePlacas +
    fleetSummary.unmatchedLavados.uniquePlacas;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="vehiculos-view">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Centro de Mando de Flota Oficial (Base VEHÍCULOS)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Fuente oficial de verdad para medir el cumplimiento de <span className="text-slate-200 font-semibold">Calibración</span>, <span className="text-slate-200 font-semibold">Lavados</span> y <span className="text-slate-200 font-semibold">Check List</span> contra el catálogo maestro de {fleetSummary.totalVehiculos} vehículos.
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
              <span>Actualizar Flota</span>
            </button>
          )}
        </div>
      </div>

      {/* Dirty Data / Unmatched Records Audit Banner */}
      {fleetSummary.unmatchedCalibracion.uniquePlacas > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <span>Auditoría de Datos: {fleetSummary.unmatchedCalibracion.uniquePlacas} placas registradas fuera del catálogo oficial</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                La hoja CALIBRACION contiene {fleetSummary.unmatchedCalibracion.count} registros con placas que no figuran en VEHICULOS (ej. LA ARENOSA o vehículos no empadronados). Se han <strong className="text-white">excluido</strong> del cálculo de cobertura para mantener la precisión sobre la flota base ({fleetSummary.totalVehiculos} unidades).
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowUnmatchedModal(true)}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center transition-all"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Ver Placas Externas ({fleetSummary.unmatchedCalibracion.uniquePlacas})</span>
          </button>
        </div>
      )}

      {/* Top 4 Fleet Coverage KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="fleet-coverage-kpis">
        {/* KPI 1: Total Flota Base */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              FLOTA BASE OFICIAL
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-black tracking-tight text-white">
              {fleetSummary.totalVehiculos}
            </span>
            <span className="text-xs text-slate-400 font-medium">unidades (100%)</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Denominador oficial</span>
            <span className="text-blue-400 font-semibold">{cdBreakdown.length} sedes</span>
          </div>
        </div>

        {/* KPI 2: Calibración Cobertura */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
              CALIBRACIÓN AL DÍA
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-amber-400">
              {fleetSummary.calibracionCoverage.ejecutados}
            </span>
            <span className="text-xs text-amber-300/80 font-bold">
              / {fleetSummary.totalVehiculos} ({fleetSummary.calibracionCoverage.pctEjecutado}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${fleetSummary.calibracionCoverage.pctEjecutado}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 pt-2 mt-1 border-t border-slate-800/80 flex justify-between">
            <span>Pendientes: <strong className="text-amber-400">{fleetSummary.calibracionCoverage.pendientes}</strong></span>
            <span>{fleetSummary.calibracionCoverage.pctPendiente}%</span>
          </div>
        </div>

        {/* KPI 3: Lavados Cobertura */}
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
              LAVADOS EJECUTADOS
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-cyan-400">
              {fleetSummary.lavadosCoverage.ejecutados}
            </span>
            <span className="text-xs text-cyan-300/80 font-bold">
              / {fleetSummary.totalVehiculos} ({fleetSummary.lavadosCoverage.pctEjecutado}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${fleetSummary.lavadosCoverage.pctEjecutado}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 pt-2 mt-1 border-t border-slate-800/80 flex justify-between">
            <span>Pendientes: <strong className="text-cyan-400">{fleetSummary.lavadosCoverage.pendientes}</strong></span>
            <span>{fleetSummary.lavadosCoverage.pctPendiente}%</span>
          </div>
        </div>

        {/* KPI 4: Flota 100% al Día */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              100% AL DÍA (TODOS LOS PROCESOS)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-emerald-400">
              {fleetSummary.fullyCompliantCount}
            </span>
            <span className="text-xs text-emerald-300/80 font-bold">
              / {fleetSummary.totalVehiculos} ({fleetSummary.fullyCompliantPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${fleetSummary.fullyCompliantPct}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 pt-2 mt-1 border-t border-slate-800/80 flex justify-between">
            <span>Con pendientes: <strong className="text-amber-400">{fleetSummary.withPendingCount}</strong></span>
            <span>{fleetSummary.withPendingPct}%</span>
          </div>
        </div>
      </div>

      {/* Visual Charts: Process Coverage & Compliance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Process Bar Chart */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-400" />
                <span>Cobertura de Procesos sobre Flota Base ({fleetSummary.totalVehiculos} Vehículos)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativa de unidades ejecutadas (completadas) vs pendientes por cada frente operativo.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processCoverageChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="proceso" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} domain={[0, fleetSummary.totalVehiculos]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} vehículos (${fleetSummary.totalVehiculos > 0 ? ((val / fleetSummary.totalVehiculos) * 100).toFixed(1) : 0}%)`,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Ejecutados" fill="#10b981" radius={[4, 4, 0, 0]} name="Ejecutados (Al Día)" />
                <Bar dataKey="Pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pendientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compliance Donut */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Salud Integral de la Flota</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Estado de cumplimiento integral (3 procesos simultáneos).
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {complianceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            {complianceDistributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-bold text-white font-mono">
                  {item.value} ({fleetSummary.totalVehiculos > 0 ? ((item.value / fleetSummary.totalVehiculos) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main 360 Vehicle Table & Grid Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        {/* Filter & View Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                Estado 360° de la Flota ({filteredVehicles.length} de {fleetSummary.totalVehiculos} unidades)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspecciona el estatus de Calibración, Lavado y Check List vehículo por vehículo.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 self-start md:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de Tabla Detallada"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de Tarjetas 360"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2">
          <button
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({fleetSummary.totalVehiculos})
          </button>
          <button
            onClick={() => { setStatusFilter('all-compliant'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              statusFilter === 'all-compliant'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% al Día ({fleetSummary.fullyCompliantCount})</span>
          </button>
          <button
            onClick={() => { setStatusFilter('has-pending'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              statusFilter === 'has-pending'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Con Pendientes ({fleetSummary.withPendingCount})</span>
          </button>
          <button
            onClick={() => { setStatusFilter('pending-calib'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'pending-calib'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Pendientes Calibración ({fleetSummary.calibracionCoverage.pendientes})
          </button>
          <button
            onClick={() => { setStatusFilter('pending-lavado'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'pending-lavado'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Pendientes Lavado ({fleetSummary.lavadosCoverage.pendientes})
          </button>
          <button
            onClick={() => { setStatusFilter('pending-checklist'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'pending-checklist'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Pendientes Check List ({fleetSummary.checkListCoverage.pendientes})
          </button>
        </div>

        {/* Search and Secondary Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Search Placa */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar placa en flota..."
              value={searchPlaca}
              onChange={(e) => {
                setSearchPlaca(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* CD Filter */}
          <select
            value={selectedCd}
            onChange={(e) => {
              setSelectedCd(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos los CD</option>
            {cdBreakdown.map((c) => (
              <option key={c.cd} value={c.cd}>
                {c.cd} ({c.count})
              </option>
            ))}
          </select>

          {/* Contratista Filter */}
          <select
            value={selectedContratista}
            onChange={(e) => {
              setSelectedContratista(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos los Contratistas</option>
            {contratistaBreakdown.map((c) => (
              <option key={c.contratista} value={c.contratista}>
                {c.contratista} ({c.count})
              </option>
            ))}
          </select>
        </div>

        {/* View Mode 1: Detailed Table */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5">Placa</th>
                  <th className="py-3 px-3">Sede (CD)</th>
                  <th className="py-3 px-3">Contratista</th>
                  <th className="py-3 px-3">Calibración</th>
                  <th className="py-3 px-3">Lavados</th>
                  <th className="py-3 px-3">Check List</th>
                  <th className="py-3 px-3 text-center">Salud Integral</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No se encontraron vehículos que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedVehicles.map((v) => (
                    <tr
                      key={v.placa}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedVehicleDetail(v)}
                    >
                      {/* Placa */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-black text-xs text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-700 shadow-sm group-hover:border-blue-500 transition-colors">
                          {v.placa}
                        </span>
                      </td>

                      {/* CD */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[10px]">
                          {v.cd}
                        </span>
                      </td>

                      {/* Contratista */}
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {v.contratista}
                      </td>

                      {/* Calibración */}
                      <td className="py-3 px-3">
                        {v.calibracion.isCompliant ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-bold text-[11px] block">COMPLETADO</span>
                              {v.calibracion.lastDate && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {v.calibracion.lastDate}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-400">
                            <Clock className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-bold text-[11px] block">PENDIENTE</span>
                              <span className="text-[10px] text-slate-500 block">Sin calibración</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Lavados */}
                      <td className="py-3 px-3">
                        {v.lavado.isCompliant ? (
                          <div className="flex items-center gap-1.5 text-cyan-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-bold text-[11px] block">
                                {v.lavado.count} {v.lavado.count === 1 ? 'LAVADO' : 'LAVADOS'}
                              </span>
                              {v.lavado.lastDate && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {v.lavado.lastDate}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-4 h-4 shrink-0 text-amber-400/80" />
                            <div>
                              <span className="font-bold text-[11px] text-amber-400/90 block">PENDIENTE</span>
                              <span className="text-[10px] text-slate-500 block">0 registros</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Check List */}
                      <td className="py-3 px-3">
                        {v.checkList.isCompliant ? (
                          <div className="flex items-center gap-1.5 text-blue-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-bold text-[11px] block">
                                {v.checkList.totalCount} REGS
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                S: {v.checkList.salidaCount} | R: {v.checkList.retornoCount}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-4 h-4 shrink-0 text-amber-400/80" />
                            <div>
                              <span className="font-bold text-[11px] text-amber-400/90 block">SIN REGISTRO</span>
                              <span className="text-[10px] text-slate-500 block">Inactivo</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Overall Compliance */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            v.complianceScore === 3
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : v.complianceScore === 2
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : v.complianceScore === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {v.complianceScore === 3 ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {v.complianceScore}/3 ({v.compliancePct}%)
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right" onClick={(e) => { e.stopPropagation(); setSelectedVehicleDetail(v); }}>
                        <button className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors">
                          Ver 360°
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode 2: Grid of 360 Vehicle Cards */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {paginatedVehicles.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No se encontraron vehículos con los filtros actuales.
              </div>
            ) : (
              paginatedVehicles.map((v) => (
                <div
                  key={v.placa}
                  onClick={() => setSelectedVehicleDetail(v)}
                  className="bg-slate-800/50 border border-slate-700/80 hover:border-blue-500 p-4 rounded-2xl transition-all shadow-sm flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  {/* Top: Plate & CD */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-black text-sm text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 shadow-sm group-hover:border-blue-500 transition-colors">
                        {v.placa}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        {v.contratista}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[10px]">
                        {v.cd}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.complianceScore === 3
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {v.complianceScore}/3 Procesos
                      </span>
                    </div>
                  </div>

                  {/* Process Status Bars */}
                  <div className="space-y-2 pt-2 border-t border-slate-700/60 text-xs">
                    {/* Calibracion */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Calibración:</span>
                      {v.calibracion.isCompliant ? (
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> COMPLETADO
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDIENTE
                        </span>
                      )}
                    </div>

                    {/* Lavados */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Lavados:</span>
                      {v.lavado.isCompliant ? (
                        <span className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {v.lavado.count} REALIZADO{v.lavado.count > 1 ? 'S' : ''}
                        </span>
                      ) : (
                        <span className="text-amber-400/90 font-bold text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDIENTE
                        </span>
                      )}
                    </div>

                    {/* Check List */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Check List:</span>
                      {v.checkList.isCompliant ? (
                        <span className="text-blue-400 font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {v.checkList.totalCount} REGS
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> SIN REGISTRO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer button */}
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {v.calibracion.lastTaller ? v.calibracion.lastTaller : 'Taller pendiente'}
                    </span>
                    <span className="text-blue-400 font-semibold group-hover:underline flex items-center gap-1">
                      Detalle 360° <Eye className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Mostrando{' '}
            <span className="font-bold text-white">
              {filteredVehicles.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="font-bold text-white">
              {Math.min(currentPage * itemsPerPage, filteredVehicles.length)}
            </span>{' '}
            de <span className="font-bold text-white">{filteredVehicles.length}</span> unidades
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

      {/* Modal 1: 360 Vehicle Detail */}
      {selectedVehicleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-black text-lg text-white bg-slate-950 px-3 py-1 rounded-lg border border-slate-700">
                    {selectedVehicleDetail.placa}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs">
                    {selectedVehicleDetail.cd}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Contratista: <span className="text-white font-medium">{selectedVehicleDetail.contratista}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedVehicleDetail(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                selectedVehicleDetail.complianceScore === 3
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {selectedVehicleDetail.complianceScore === 3 ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <h4 className="text-xs font-bold">
                    {selectedVehicleDetail.complianceScore === 3
                      ? 'Flota 100% al Día y Habilitada'
                      : `Tiene ${3 - selectedVehicleDetail.complianceScore} proceso(s) pendiente(s)`}
                  </h4>
                  <span className="text-[11px] text-slate-300">
                    Cumplimiento global: {selectedVehicleDetail.complianceScore}/3 ({selectedVehicleDetail.compliancePct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Process 1: Calibracion Details */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className={`w-4 h-4 ${selectedVehicleDetail.calibracion.isCompliant ? 'text-emerald-400' : 'text-amber-400'}`} />
                  Proceso 1: Calibración
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    selectedVehicleDetail.calibracion.isCompliant
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {selectedVehicleDetail.calibracion.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">Taller Asignado</span>
                  <span className="font-medium">{selectedVehicleDetail.calibracion.lastTaller || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Fecha Registro</span>
                  <span className="font-mono font-medium">{selectedVehicleDetail.calibracion.lastDate || 'Pendiente'}</span>
                </div>
              </div>
              {selectedVehicleDetail.calibracion.fotoUrl && (
                <div className="pt-2">
                  <a
                    href={selectedVehicleDetail.calibracion.fotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    <span>Ver Evidencia Fotográfica en Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Process 2: Lavados Details */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className={`w-4 h-4 ${selectedVehicleDetail.lavado.isCompliant ? 'text-cyan-400' : 'text-amber-400'}`} />
                  Proceso 2: Lavados
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    selectedVehicleDetail.lavado.isCompliant
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {selectedVehicleDetail.lavado.isCompliant ? `${selectedVehicleDetail.lavado.count} REGISTRADO(S)` : 'PENDIENTE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">Taller de Lavado</span>
                  <span className="font-medium">{selectedVehicleDetail.lavado.lastTaller || 'Sin registro'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Última Fecha</span>
                  <span className="font-mono font-medium">{selectedVehicleDetail.lavado.lastDate || 'Sin registro'}</span>
                </div>
              </div>
              {selectedVehicleDetail.lavado.fotoUrl && (
                <div className="pt-2">
                  <a
                    href={selectedVehicleDetail.lavado.fotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <span>Ver Evidencia Inicial de Lavado</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Process 3: Check List Details */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCheck2 className={`w-4 h-4 ${selectedVehicleDetail.checkList.isCompliant ? 'text-blue-400' : 'text-slate-500'}`} />
                  Proceso 3: Check List (Salidas y Retornos)
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    selectedVehicleDetail.checkList.isCompliant
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {selectedVehicleDetail.checkList.isCompliant ? `${selectedVehicleDetail.checkList.totalCount} INSPECCIONES` : 'SIN REGISTRO'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">Inspecciones Salida</span>
                  <span className="font-bold text-white">{selectedVehicleDetail.checkList.salidaCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Inspecciones Retorno</span>
                  <span className="font-bold text-white">{selectedVehicleDetail.checkList.retornoCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Estado Alertas</span>
                  <span className={`font-bold ${selectedVehicleDetail.checkList.hasAlerts ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedVehicleDetail.checkList.hasAlerts ? 'Con Alertas' : 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVehicleDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Unmatched Foreign Plates Audit */}
      {showUnmatchedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Auditoría de Placas Fuera del Catálogo ({fleetSummary.unmatchedCalibracion.uniquePlacas} detectadas)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Registros encontrados en la hoja CALIBRACION cuyas placas no coinciden con las {fleetSummary.totalVehiculos} unidades de la flota oficial de VEHICULOS.
                </p>
              </div>

              <button
                onClick={() => setShowUnmatchedModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Placa Externa</th>
                    <th className="py-2.5 px-3">Sede en Registro</th>
                    <th className="py-2.5 px-3">Contratista</th>
                    <th className="py-2.5 px-3">Taller</th>
                    <th className="py-2.5 px-3 text-right">Registros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {fleetSummary.unmatchedCalibracion.items.map((item, idx) => (
                    <tr key={`${item.placa}-${idx}`} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                        {item.placa}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{item.cd || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.contratista || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.taller || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <span>Total registros externos: {fleetSummary.unmatchedCalibracion.count}</span>
              <button
                onClick={() => setShowUnmatchedModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
