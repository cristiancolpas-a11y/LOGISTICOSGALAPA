import React, { useState } from 'react';
import {
  BrainCircuit,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Calendar,
  Truck,
  User,
  Building2,
  CheckCircle,
  Copy,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import { AutomatedInsight } from '../types';

interface ExecutiveSummaryCardProps {
  insights: AutomatedInsight;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  insights
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    let text = `ANÁLISIS OPERATIVO - AON GALAPA (CHECK LIST)\n\n`;
    text += `${insights.narrative}\n\n`;
    text += `INDICADORES CLAVE DE DIAGNÓSTICO:\n`;
    if (insights.worstDay) text += `- Día Menor Cumplimiento: ${insights.worstDay.label} (${insights.worstDay.rate}%)\n`;
    if (insights.bestDay) text += `- Día Mayor Cumplimiento: ${insights.bestDay.label} (${insights.bestDay.rate}%)\n`;
    if (insights.worstContractor) text += `- Contratista Crítico: ${insights.worstContractor.name} (${insights.worstContractor.rate}% - ${insights.worstContractor.nonCompliances} novedades)\n`;
    if (insights.worstVehicle) text += `- Vehículo con Mayor Incumplimiento: ${insights.worstVehicle.plate} (${insights.worstVehicle.nonCompliances} novedades)\n`;
    if (insights.worstDriver) text += `- Conductor con Mayor Incumplimiento: ${insights.worstDriver.name} (${insights.worstDriver.nonCompliances} novedades)\n`;
    text += `- Proceso más Crítico: ${insights.primaryWeakness} (brecha de ${insights.weaknessGap}%)\n`;
    text += `- Tendencia General: ${insights.trendDirection.toUpperCase()} (${insights.trendDelta >= 0 ? '+' : ''}${insights.trendDelta}%)\n\n`;
    text += `ACCIONES INMEDIATAS RECOMENDADAS:\n`;
    insights.recommendedActions.forEach((act, idx) => {
      text += `${idx + 1}. ${act}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTrendIcon = () => {
    if (insights.trendDirection === 'improving') {
      return (
        <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Tendencia Positiva (+{insights.trendDelta}%)</span>
        </div>
      );
    }
    if (insights.trendDirection === 'declining') {
      return (
        <div className="flex items-center gap-1 text-rose-400 font-bold text-xs bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Tendencia Negativa ({insights.trendDelta}%)</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-slate-300 font-bold text-xs bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
        <Minus className="w-3.5 h-3.5" />
        <span>Tendencia Estable</span>
      </div>
    );
  };

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mb-6 relative overflow-hidden"
      id="executive-ai-intelligence-card"
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                Análisis Inteligente y Diagnóstico Automático
              </h2>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/20">
                BI Motor
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Conclusiones ejecutivas generadas en tiempo real para AON GALAPA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            id="copy-executive-report-btn"
            title="Copiar reporte ejecutivo al portapapeles"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Informe</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Executive Narrative Paragraph */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
          {insights.narrative}
        </p>
      </div>

      {/* Diagnostic Key Factors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4">
        {/* Factor 1: Proceso Crítico */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Mayor Problema</span>
          </div>
          <p className="text-sm font-bold text-amber-300 truncate">
            {insights.primaryWeakness === 'Equilibrado' ? 'Equilibrado' : `Check List ${insights.primaryWeakness}`}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Brecha de <strong className="text-white">{insights.weaknessGap}%</strong>
          </p>
        </div>

        {/* Factor 2: Peor Día */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <Calendar className="w-3 h-3 text-rose-400" />
            <span>Día Menor Cumpl.</span>
          </div>
          <p className="text-sm font-bold text-rose-400 truncate">
            {insights.worstDay?.label || 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Cumplimiento: <strong className="text-rose-300">{insights.worstDay?.rate || 0}%</strong>
          </p>
        </div>

        {/* Factor 3: Mejor Día */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span>Día Mayor Cumpl.</span>
          </div>
          <p className="text-sm font-bold text-emerald-400 truncate">
            {insights.bestDay?.label || 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Cumplimiento: <strong className="text-emerald-300">{insights.bestDay?.rate || 0}%</strong>
          </p>
        </div>

        {/* Factor 4: Contratista Crítico */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <Building2 className="w-3 h-3 text-blue-400" />
            <span>Contratista Menor</span>
          </div>
          <p className="text-sm font-bold text-slate-200 truncate" title={insights.worstContractor?.name || 'N/A'}>
            {insights.worstContractor?.name || 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Cumpl: <strong className="text-blue-300">{insights.worstContractor?.rate || 0}%</strong>
          </p>
        </div>

        {/* Factor 5: Vehículo Crítico */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <Truck className="w-3 h-3 text-rose-400" />
            <span>Vehículo Crítico</span>
          </div>
          <p className="text-sm font-bold text-rose-400 font-mono tracking-wider truncate">
            {insights.worstVehicle?.plate || 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            <strong className="text-rose-300">{insights.worstVehicle?.nonCompliances || 0}</strong> novedades
          </p>
        </div>

        {/* Factor 6: Conductor Crítico */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <User className="w-3 h-3 text-purple-400" />
            <span>Conductor Crítico</span>
          </div>
          <p className="text-xs font-bold text-slate-200 truncate" title={insights.worstDriver?.name || 'N/A'}>
            {insights.worstDriver?.name || 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            <strong className="text-purple-300">{insights.worstDriver?.nonCompliances || 0}</strong> novedades
          </p>
        </div>
      </div>

      {/* Immediate Recommended Actions */}
      {insights.recommendedActions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Acciones Inmediatas de Mitigación Operativa</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {insights.recommendedActions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/70"
              >
                <span className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-snug">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
