import React from 'react';
import {
  CheckCircle2,
  LogIn,
  LogOut,
  AlertOctagon
} from 'lucide-react';
import { KpiSummary, SemaphoreColor } from '../types';
import { getSemaphoreColor } from '../utils/dataProcessor';

interface KpiCardsProps {
  kpis: KpiSummary;
}

interface MiniDonutProps {
  percentage: number;
  color: SemaphoreColor;
  size?: number;
}

const MiniDonut: React.FC<MiniDonutProps> = ({ percentage, color, size = 64 }) => {
  const strokeWidth = 5.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

  const strokeColor =
    color === 'green'
      ? '#10b981' // emerald-500
      : color === 'yellow'
      ? '#f59e0b' // amber-500
      : '#f43f5e'; // rose-500

  const trackColor = '#1e293b'; // slate-800

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text inside donut */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-extrabold text-white tracking-tight leading-none">
          {safePercentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  const departureColor: SemaphoreColor = getSemaphoreColor(kpis.departurePercentage);
  const returnColor: SemaphoreColor = getSemaphoreColor(kpis.returnPercentage);

  const getSemaphoreBadge = (color: SemaphoreColor) => {
    switch (color) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Óptimo (≥95%)
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Alerta (90-94.9%)
          </span>
        );
      case 'red':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Crítico (&lt;90%)
          </span>
        );
    }
  };

  const getCardRingClass = (color: SemaphoreColor) => {
    switch (color) {
      case 'green':
        return 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900';
      case 'yellow':
        return 'border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900';
      case 'red':
      default:
        return 'border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="kpi-cards-grid">
      {/* KPI 1: % CUMPLIMIENTO SALIDA CON DONUT */}
      <div
        className={`p-4 rounded-2xl border ${getCardRingClass(departureColor)} relative overflow-hidden shadow-lg transition-all hover:translate-y-[-2px] flex flex-col justify-between`}
        id="kpi-card-salida"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
              % CUMPLIMIENTO SALIDA
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <LogIn className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 my-1">
            <div>
              <span className="text-3xl font-black tracking-tight text-white block">
                {kpis.departurePercentage}%
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {kpis.departureCompleted.toLocaleString()} de {kpis.totalRecords.toLocaleString()} reg.
              </span>
            </div>
            {/* Gráfica de Dona */}
            <MiniDonut percentage={kpis.departurePercentage} color={departureColor} size={62} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-medium">Check List Salida</span>
          {getSemaphoreBadge(departureColor)}
        </div>
      </div>

      {/* KPI 2: % CUMPLIMIENTO RETORNO CON DONUT */}
      <div
        className={`p-4 rounded-2xl border ${getCardRingClass(returnColor)} relative overflow-hidden shadow-lg transition-all hover:translate-y-[-2px] flex flex-col justify-between`}
        id="kpi-card-retorno"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
              % CUMPLIMIENTO RETORNO
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <LogOut className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 my-1">
            <div>
              <span className="text-3xl font-black tracking-tight text-white block">
                {kpis.returnPercentage}%
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {kpis.returnCompleted.toLocaleString()} de {kpis.totalRecords.toLocaleString()} reg.
              </span>
            </div>
            {/* Gráfica de Dona */}
            <MiniDonut percentage={kpis.returnPercentage} color={returnColor} size={62} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-medium">Check List Retorno</span>
          {getSemaphoreBadge(returnColor)}
        </div>
      </div>

      {/* KPI 3: TOTAL INCUMPLIMIENTOS */}
      <div
        className="p-4 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900 relative overflow-hidden shadow-lg transition-all hover:translate-y-[-2px] flex flex-col justify-between"
        id="kpi-card-incumplimientos"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-rose-300 uppercase">
              TOTAL INCUMPLIMIENTOS
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-rose-400">
              {kpis.totalNonCompliances.toLocaleString()}
            </span>
            <span className="text-xs text-rose-300/80 font-medium">
              ({kpis.totalRecords > 0 ? ((kpis.totalNonCompliances / kpis.totalRecords) * 100).toFixed(1) : 0}%)
            </span>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, kpis.totalRecords > 0 ? (kpis.totalNonCompliances / kpis.totalRecords) * 100 : 0))}%`
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[11px]">
          <span className="text-rose-400/90 font-medium">
            🔴 {kpis.criticalCount} Críticos
          </span>
          <span className="text-amber-400/90 font-medium">
            🟠 {kpis.highSeverityCount} Parciales
          </span>
        </div>
      </div>

      {/* KPI 4: REGISTROS COMPLETOS */}
      <div
        className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900 relative overflow-hidden shadow-lg transition-all hover:translate-y-[-2px] flex flex-col justify-between"
        id="kpi-card-completos"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              CHECK LIST COMPLETOS
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black tracking-tight text-emerald-400">
              {kpis.completeRecords.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {kpis.totalRecords.toLocaleString()}
            </span>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, kpis.compliancePercentage))}%`
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
          <span>Salida=1 & Retorno=1</span>
          <span className="text-emerald-400 font-bold">
            {kpis.totalRecords > 0 ? ((kpis.completeRecords / kpis.totalRecords) * 100).toFixed(1) : 0}% Total
          </span>
        </div>
      </div>
    </div>
  );
};
