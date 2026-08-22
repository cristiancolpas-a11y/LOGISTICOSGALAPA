import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { Building2, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { ContractorStat, SemaphoreColor } from '../../types';
import { getSemaphoreColor } from '../../utils/dataProcessor';

interface ContractorChartProps {
  contractorStats: ContractorStat[];
}

export const ContractorChart: React.FC<ContractorChartProps> = ({ contractorStats }) => {
  const [metric, setMetric] = useState<'general' | 'salida' | 'retorno'>('general');

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ContractorStat = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs">
          <p className="font-bold text-white mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{data.name}</span>
          </p>
          <div className="space-y-1 text-slate-300">
            <p className="flex justify-between gap-4">
              <span className="text-slate-400">Total Inspecciones:</span>
              <strong className="text-white">{data.totalInspections.toLocaleString()}</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-emerald-400 font-semibold">% Cumplimiento General:</span>
              <strong className="text-white">{data.generalRate}% ({data.generalPassed})</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-blue-400 font-semibold">% Salida:</span>
              <strong className="text-white">{data.departureRate}% ({data.departurePassed})</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-purple-400 font-semibold">% Retorno:</span>
              <strong className="text-white">{data.returnRate}% ({data.returnPassed})</strong>
            </p>
            <p className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-rose-400 font-medium">
              <span>Incumplimientos:</span>
              <span>{data.nonCompliances}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getDataKey = () => {
    switch (metric) {
      case 'salida':
        return 'departureRate';
      case 'retorno':
        return 'returnRate';
      case 'general':
      default:
        return 'generalRate';
    }
  };

  const getMetricTitle = () => {
    switch (metric) {
      case 'salida':
        return '% Cumplimiento Salida';
      case 'retorno':
        return '% Cumplimiento Retorno';
      case 'general':
      default:
        return '% Cumplimiento General';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between" id="contractor-chart-container">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Cumplimiento por Contratista</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Evaluación comparativa ordenada de mayor a menor desempeño
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setMetric('general')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              metric === 'general' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setMetric('salida')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              metric === 'salida' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Salida
          </button>
          <button
            onClick={() => setMetric('retorno')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              metric === 'retorno' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Retorno
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-64 w-full mt-3">
        {contractorStats.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No hay contratistas para mostrar con los filtros actuales.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={contractorStats}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#cbd5e1"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={getDataKey()}
                name={getMetricTitle()}
                radius={[0, 4, 4, 0]}
                barSize={24}
              >
                {contractorStats.map((entry, index) => {
                  const rate = metric === 'salida' ? entry.departureRate : metric === 'retorno' ? entry.returnRate : entry.generalRate;
                  const color: SemaphoreColor = getSemaphoreColor(rate);
                  const fillColor = color === 'green' ? '#10b981' : color === 'yellow' ? '#f59e0b' : '#f43f5e';
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Contractor mini-list summary */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2 text-xs">
        {contractorStats.slice(0, 3).map((c) => {
          const color = getSemaphoreColor(c.generalRate);
          return (
            <div
              key={c.name}
              className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  color === 'green' ? 'bg-emerald-500' : color === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-slate-200">{c.name}:</span>
              <span className="text-white font-bold">{c.generalRate}% General</span>
              <span className="text-slate-400">({c.totalInspections} reg)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
