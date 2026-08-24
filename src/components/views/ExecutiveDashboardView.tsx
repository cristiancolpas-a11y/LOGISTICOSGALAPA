import React from 'react';
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
  AutomatedInsight
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
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  kpis,
  trendData,
  contractorStats,
  vehicleRankings,
  driverRankings,
  currentGrouping,
  onGroupingChange
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="executive-dashboard-view">
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
