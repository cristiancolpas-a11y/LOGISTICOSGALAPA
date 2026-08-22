import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Calendar, Filter } from 'lucide-react';
import { TrendDataPoint } from '../../types';

interface TrendChartProps {
  trendData: TrendDataPoint[];
  currentGrouping: 'day' | 'week' | 'month';
  onGroupingChange: (grouping: 'day' | 'week' | 'month') => void;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  trendData,
  currentGrouping,
  onGroupingChange
}) => {
  const [showGeneral, setShowGeneral] = useState(true);
  const [showSalida, setShowSalida] = useState(true);
  const [showRetorno, setShowRetorno] = useState(true);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: TrendDataPoint = payload[0]?.payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs">
          <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Período: {dataPoint.label} ({dataPoint.periodKey})</span>
          </p>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> % General:
              </span>
              <strong className="text-white">{dataPoint.generalRate}% ({dataPoint.generalPassed}/{dataPoint.total})</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" /> % Salida:
              </span>
              <strong className="text-white">{dataPoint.departureRate}% ({dataPoint.departurePassed}/{dataPoint.total})</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-purple-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> % Retorno:
              </span>
              <strong className="text-white">{dataPoint.returnRate}% ({dataPoint.returnPassed}/{dataPoint.total})</strong>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800 text-rose-400 font-medium">
              <span>Incumplimientos:</span>
              <span>{dataPoint.nonCompliances}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between" id="trend-chart-container">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>Tendencia de Cumplimiento Check List</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Evolución temporal de indicadores para detección temprana de caídas operacionales
          </p>
        </div>

        {/* Controls: Grouping selector & Series toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Week / Month selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => onGroupingChange('day')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentGrouping === 'day' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => onGroupingChange('week')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentGrouping === 'week' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => onGroupingChange('month')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentGrouping === 'month' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      {/* Series Filters */}
      <div className="flex items-center gap-4 py-2 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showGeneral}
            onChange={(e) => setShowGeneral(e.target.checked)}
            className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
          />
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> % Cumplimiento General
          </span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showSalida}
            onChange={(e) => setShowSalida(e.target.checked)}
            className="rounded text-blue-500 focus:ring-blue-500 bg-slate-800 border-slate-700"
          />
          <span className="flex items-center gap-1 text-blue-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> % Salida
          </span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showRetorno}
            onChange={(e) => setShowRetorno(e.target.checked)}
            className="rounded text-purple-500 focus:ring-purple-500 bg-slate-800 border-slate-700"
          />
          <span className="flex items-center gap-1 text-purple-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-400" /> % Retorno
          </span>
        </label>
      </div>

      {/* Chart container */}
      <div className="h-72 w-full mt-2">
        {trendData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No hay puntos de tendencia suficientes para el filtro seleccionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 90, 95, 100]}
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* SLA Target lines */}
              <ReferenceLine
                y={95}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: 'Meta SLA 95%',
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'right'
                }}
              />
              <ReferenceLine
                y={90}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: 'Alerta 90%',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'right'
                }}
              />

              {showGeneral && (
                <Line
                  type="monotone"
                  dataKey="generalRate"
                  name="% Cumplimiento General"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              )}

              {showSalida && (
                <Line
                  type="monotone"
                  dataKey="departureRate"
                  name="% Cumplimiento Salida"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#3b82f6' }}
                  activeDot={{ r: 5 }}
                />
              )}

              {showRetorno && (
                <Line
                  type="monotone"
                  dataKey="returnRate"
                  name="% Cumplimiento Retorno"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#a855f7' }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
