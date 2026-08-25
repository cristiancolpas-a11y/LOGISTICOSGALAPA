import React from 'react';
import {
  Truck,
  ShieldCheck,
  Wrench,
  Sparkles,
  FileCheck2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { KpiCards } from '../KpiCards';
import { SalidaVsRetornoChart } from '../charts/SalidaVsRetornoChart';
import { TrendChart } from '../charts/TrendChart';
import { ContractorChart } from '../charts/ContractorChart';
import { VehicleRankingTable } from '../tables/VehicleRankingTable';
import { DriverRankingTable } from '../tables/DriverRankingTable';
import {
  KpiSummary,
  TrendDataPoint,
  ContractorStat,
  VehicleRanking,
  DriverRanking,
  AutomatedInsight,
  FleetMasterSummary
} from '../../types';

interface ExecutiveDashboardViewProps {
  kpis: KpiSummary;
  automatedInsight?: AutomatedInsight;
  trendData: TrendDataPoint[];
  contractorStats: ContractorStat[];
  vehicleRankings: VehicleRanking[];
  driverRankings: DriverRanking[];
  currentGrouping: 'day' | 'week' | 'month';
  onGroupingChange: (grouping: 'day' | 'week' | 'month') => void;
  fleetSummary?: FleetMasterSummary;
  onNavigateToView?: (view: string) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  kpis,
  trendData,
  contractorStats,
  vehicleRankings,
  driverRankings,
  currentGrouping,
  onGroupingChange,
  fleetSummary,
  onNavigateToView
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="executive-dashboard-view">
      {/* Fleet Master Compliance Summary Row */}
      {fleetSummary && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Panorama Gerencial de Flota Base ({fleetSummary.totalVehiculos} Vehículos Oficiales)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Cumplimiento operacional integral de la flota contra la hoja oficial VEHICULOS.
                </p>
              </div>
            </div>

            {onNavigateToView && (
              <button
                onClick={() => onNavigateToView('vehiculos')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold self-start sm:self-center transition-colors"
              >
                <span>Centro de Mando 360°</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Calibracion */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" /> Calibración
                </span>
                <span className="text-amber-400 font-mono font-bold">
                  {fleetSummary.calibracionCoverage.pctEjecutado}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white">
                  {fleetSummary.calibracionCoverage.ejecutados}
                  <span className="text-xs text-slate-400 font-normal"> / {fleetSummary.totalVehiculos}</span>
                </span>
                <span className="text-[11px] text-amber-400 font-semibold">
                  {fleetSummary.calibracionCoverage.pendientes} pend.
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${fleetSummary.calibracionCoverage.pctEjecutado}%` }}
                />
              </div>
            </div>

            {/* Lavados */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Lavados
                </span>
                <span className="text-cyan-400 font-mono font-bold">
                  {fleetSummary.lavadosCoverage.pctEjecutado}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white">
                  {fleetSummary.lavadosCoverage.ejecutados}
                  <span className="text-xs text-slate-400 font-normal"> / {fleetSummary.totalVehiculos}</span>
                </span>
                <span className="text-[11px] text-cyan-400 font-semibold">
                  {fleetSummary.lavadosCoverage.pendientes} pend.
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full"
                  style={{ width: `${fleetSummary.lavadosCoverage.pctEjecutado}%` }}
                />
              </div>
            </div>

            {/* Check List */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-400" /> Check List
                </span>
                <span className="text-blue-400 font-mono font-bold">
                  {fleetSummary.checkListCoverage.pctEjecutado}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white">
                  {fleetSummary.checkListCoverage.ejecutados}
                  <span className="text-xs text-slate-400 font-normal"> / {fleetSummary.totalVehiculos}</span>
                </span>
                <span className="text-[11px] text-blue-400 font-semibold">
                  {fleetSummary.checkListCoverage.pendientes} pend.
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${fleetSummary.checkListCoverage.pctEjecutado}%` }}
                />
              </div>
            </div>

            {/* 100% al Día */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% al Día
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {fleetSummary.fullyCompliantPct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-emerald-400">
                  {fleetSummary.fullyCompliantCount}
                  <span className="text-xs text-slate-400 font-normal"> / {fleetSummary.totalVehiculos}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {fleetSummary.withPendingCount} con pendientes
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${fleetSummary.fullyCompliantPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top KPIs */}
      <KpiCards kpis={kpis} />

      {/* Chart Row 1: Salida vs Retorno & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <SalidaVsRetornoChart kpis={kpis} />
        </div>
        <div className="lg:col-span-7">
          <TrendChart
            trendData={trendData}
            currentGrouping={currentGrouping}
            onGroupingChange={onGroupingChange}
          />
        </div>
      </div>

      {/* Chart Row 2: Contractor Compliance */}
      <ContractorChart contractorStats={contractorStats} />

      {/* Tables: Vehicle & Driver Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleRankingTable rankings={vehicleRankings} />
        <DriverRankingTable rankings={driverRankings} />
      </div>
    </div>
  );
};
