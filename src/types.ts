export interface RawCheckListRow {
  llave?: string;
  Fecha?: string | number;
  vehiculo?: string;
  Salida?: string | number;
  Retorno?: string | number;
  contar2?: string | number;
  Estado?: string;
  CONTRATISTA?: string;
  CONDUCTOR?: string;
  [key: string]: any;
}

export type ComplianceStatus = 'CUMPLIO' | 'LE FALTO' | '0';
export type SeverityLevel = 'CRITICO' | 'ALTO' | 'CUMPLIDO';
export type SemaphoreColor = 'green' | 'yellow' | 'red';

export interface NormalizedCheckListRecord {
  id: string;
  rawDate: string;
  dateIso: string; // YYYY-MM-DD
  dateFormatted: string; // DD/MM/YYYY
  dateTimestamp: number;
  year: number;
  month: number; // 1-12
  monthName: string;
  weekNumber: number;
  dayOfWeek: string;
  vehicle: string;
  vehicleLower: string;
  salida: 0 | 1;
  retorno: 0 | 1;
  contar2: number; // 0, 1, 2
  estado: ComplianceStatus;
  contratista: string;
  contratistaLower: string;
  conductor: string;
  conductorLower: string;
  severity: SeverityLevel;
  isComplete: boolean;
  isDepartureMissing: boolean;
  isReturnMissing: boolean;
}

export interface KpiSummary {
  totalRecords: number;
  completeRecords: number;
  compliancePercentage: number; // % Cumplimiento General (0-100)
  departureCompleted: number;
  departureMissing: number;
  departurePercentage: number; // % Salida (0-100)
  returnCompleted: number;
  returnMissing: number;
  returnPercentage: number; // % Retorno (0-100)
  totalNonCompliances: number; // LE FALTO + 0
  criticalCount: number; // 0 (both missing)
  highSeverityCount: number; // 1 (one missing)
  uniqueVehicles: number;
  uniqueDrivers: number;
  uniqueContractors: number;
}

export interface TrendDataPoint {
  periodKey: string; // Date label or week label or month label
  label: string;
  dateSort: number;
  total: number;
  departurePassed: number;
  departureRate: number;
  returnPassed: number;
  returnRate: number;
  generalPassed: number;
  generalRate: number;
  nonCompliances: number;
}

export interface ContractorStat {
  name: string;
  totalInspections: number;
  departurePassed: number;
  departureRate: number;
  returnPassed: number;
  returnRate: number;
  generalPassed: number;
  generalRate: number;
  nonCompliances: number;
}

export interface VehicleRanking {
  plate: string;
  contractor: string;
  totalInspections: number;
  departurePassed: number;
  departureRate: number;
  returnPassed: number;
  returnRate: number;
  nonCompliances: number;
  generalPassed: number;
  generalRate: number;
  severityRating: SemaphoreColor;
  primaryDrivers: string[];
}

export interface DriverRanking {
  driverName: string;
  associatedVehicles: string[];
  totalInspections: number;
  departurePassed: number;
  departureRate: number;
  returnPassed: number;
  returnRate: number;
  nonCompliances: number;
  generalPassed: number;
  generalRate: number;
  reincidenceLevel: 'Alta' | 'Media' | 'Baja' | 'Sin Incumplimientos';
  severityRating: SemaphoreColor;
}

export interface FilterState {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  presetRange: 'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';
  trendGrouping: 'day' | 'week' | 'month';
  contractor: string;
  vehicle: string;
  driver: string;
  estado: string; // 'all' | 'CUMPLIO' | 'LE FALTO' | '0'
  salidaFilter: string; // 'all' | '1' | '0'
  retornoFilter: string; // 'all' | '1' | '0'
  severityFilter: string; // 'all' | 'CRITICO' | 'ALTO' | 'CUMPLIDO'
  searchQuery: string;
}

export interface AutomatedInsight {
  narrative: string;
  worstDay: { label: string; rate: number } | null;
  bestDay: { label: string; rate: number } | null;
  worstContractor: { name: string; rate: number; nonCompliances: number } | null;
  worstVehicle: { plate: string; nonCompliances: number; rate: number } | null;
  worstDriver: { name: string; nonCompliances: number; rate: number } | null;
  primaryWeakness: 'Retorno' | 'Salida' | 'Equilibrado';
  weaknessGap: number; // percentage difference
  trendDirection: 'improving' | 'declining' | 'stable';
  trendDelta: number;
  criticalVehiclesCount: number;
  recommendedActions: string[];
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string;
  permissions: string[];
  authenticatedAt: string;
}
