import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { LogIn, LogOut, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';
import { KpiSummary } from '../../types';

interface SalidaVsRetornoChartProps {
  kpis: KpiSummary;
}

export const SalidaVsRetornoChart: React.FC<SalidaVsRetornoChartProps> = ({ kpis }) => {
  const data = [
    {
      name: 'Salida',
      cumplido: kpis.departureCompleted,
      pendiente: kpis.departureMissing,
      porcentajeCumplido: kpis.departurePercentage,
      total: kpis.totalRecords
    },
    {
      name: 'Retorno',
      cumplido: kpis.returnCompleted,
      pendiente: kpis.returnMissing,
      porcentajeCumplido: kpis.returnPercentage,
      total: kpis.totalRecords
    }
  ];

  const mayorIncumplimiento =
    kpis.returnMissing > kpis.departureMissing
      ? 'Retorno'
      : kpis.departureMissing > kpis.returnMissing
      ? 'Salida'
      : 'Empatados';

  const diferencia = Math.abs(kpis.departurePercentage - kpis.returnPercentage).toFixed(1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isSalida = label === 'Salida';
      const pct = isSalida ? kpis.departurePercentage : kpis.returnPercentage;
      const cumplidoVal = payload.find((p: any) => p.dataKey === 'cumplido')?.value || 0;
      const pendienteVal = payload.find((p: any) => p.dataKey === 'pendiente')?.value || 0;

      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs">
          <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
            {isSalida ? <LogIn className="w-3.5 h-3.5 text-blue-400" /> : <LogOut className="w-3.5 h-3.5 text-purple-400" />}
            <span>Check List {label}</span>
          </p>
          <div className="space-y-1 text-slate-300">
            <p className="flex justify-between gap-4">
              <span className="text-emerald-400">● Cumplido:</span>
              <strong className="text-white">{cumplidoVal.toLocaleString()} ({pct}%)</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-rose-400">● Pendiente / Faltante:</span>
              <strong className="text-white">{pendienteVal.toLocaleString()} ({(100 - pct).toFixed(1)}%)</strong>
            </p>
            <p className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
              <span>Total Inspecciones:</span>
              <span>{kpis.totalRecords.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between" id="salida-vs-retorno-container">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>Check List de Salida vs Check List de Retorno</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Comparativa directa de volumen y tasa de cumplimiento operacional
          </p>
        </div>

        {/* Diagnosis Pill */}
        {mayorIncumplimiento !== 'Empatados' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Mayor Incumplimiento: <strong>Check List de {mayorIncumplimiento}</strong> ({diferencia}% brecha)</span>
          </div>
        )}
      </div>

      {/* Visual comparison summary cards */}
      <div className="grid grid-cols-2 gap-3 my-4">
        {/* Salida Summary */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 relative">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-400 mb-1">
            <span className="flex items-center gap-1">
              <LogIn className="w-3.5 h-3.5" /> Salida
            </span>
            <span className="text-white font-bold">{kpis.departurePercentage}%</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span className="text-emerald-400">✓ {kpis.departureCompleted.toLocaleString()}</span>
            <span className="text-rose-400">✗ {kpis.departureMissing.toLocaleString()} pendientes</span>
          </div>
        </div>

        {/* Retorno Summary */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 relative">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-400 mb-1">
            <span className="flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Retorno
            </span>
            <span className="text-white font-bold">{kpis.returnPercentage}%</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span className="text-emerald-400">✓ {kpis.returnCompleted.toLocaleString()}</span>
            <span className="text-rose-400">✗ {kpis.returnMissing.toLocaleString()} pendientes</span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            barSize={44}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => (
                <span className="text-slate-300 font-medium">
                  {value === 'cumplido' ? 'Inspección Cumplida' : 'Inspección Pendiente / No Realizada'}
                </span>
              )}
            />
            <Bar dataKey="cumplido" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" name="cumplido" />
            <Bar dataKey="pendiente" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" name="pendiente" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
