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

// ==========================================
// PESTAÑA 1: CALIBRACION
// ==========================================
export interface CalibracionRecord {
  id: string;
  mes: string; // FEBRERO, MARZO, etc.
  fechaRaw: string;
  fechaIso: string;
  fechaFormatted: string;
  semana: string;
  placa: string;
  placaLower: string;
  taller: string;
  tallerLower: string;
  fotoEvidenciaUrl: string;
  estado: 'COMPLETADO' | 'PENDIENTE' | string;
  cd: 'GALAPA' | 'LA ARENOSA' | string;
  contratista: string;
  contratistaLower: string;
}

export interface CalibracionSummary {
  total: number;
  completados: number;
  pendientes: number;
  pctCompletado: number;
  pctPendiente: number;
  byMes: { mes: string; completados: number; pendientes: number; total: number }[];
  byCd: { cd: string; completados: number; pendientes: number; total: number; pctCompletado: number }[];
  byTaller: { taller: string; completados: number; pendientes: number; total: number }[];
}

// ==========================================
// PESTAÑA 2: UTILIZACION
// ==========================================
export interface UtilizacionRecord {
  id: string;
  fechaRaw: string;
  fechaIso: string;
  fechaFormatted: string;
  cantidadViajes: number;
  cantidadFlota: number;
  utilizacion: number; // Decimal (e.g. 0.92 = 92%)
  utilizacionPct: number; // Percentage (e.g. 92)
  isAnomaly: boolean; // > 100% (e.g. 1.7)
}

export interface UtilizacionSummary {
  promedioPct: number;
  promedioViajes: number;
  totalViajes: number;
  promedioFlota: number;
  maxDia: { fechaFormatted: string; fechaIso: string; utilizacionPct: number; viajes: number } | null;
  minDia: { fechaFormatted: string; fechaIso: string; utilizacionPct: number; viajes: number } | null;
  anomaliasCount: number;
  anomalias: UtilizacionRecord[];
}

// ==========================================
// PESTAÑA 3: DISPONIBILIDAD
// ==========================================
export interface DisponibilidadRecord {
  id: string;
  fechaRaw: string;
  fechaIso: string;
  fechaFormatted: string;
  cd: string;
  contratista: string;
  vhIndisponibles: number;
  vhsDisponibles: number;
  totalVh: number;
  promedio: number; // Decimal (e.g. 0.909)
  promedioPct: number; // 90.9
  semana: number;
}

export interface DisponibilidadSummary {
  promedioDisponibilidad: number;
  promedioIndisponibles: number;
  promedioDisponibles: number;
  totalFlotaPromedio: number;
  mejorSemana: { semana: number; promedioPct: number } | null;
  peorSemana: { semana: number; promedioPct: number } | null;
  bySemana: { semana: number; promedioPct: number; disponiblesAvg: number; indisponiblesAvg: number; totalAvg: number }[];
}

// ==========================================
// PESTAÑA 4: VEHICULOS (FLOTA MAESTRA)
// ==========================================
export interface VehiculoRecord {
  placa: string;
  cd: string;
  contratista: string;
}

// ==========================================
// PESTAÑA 5: LAVADOS
// ==========================================
export interface LavadoRecord {
  id: string; // ID_Reporte
  mes: string;
  semana: string;
  fechaRaw: string;
  fechaIso: string;
  fechaFormatted: string;
  placa: string;
  placaLower: string;
  evidenciaInicialUrl: string;
  mapaTallerUrl: string;
  taller: string; // Normalized with trim
  tallerLower: string;
  llave: string;
  contratista: string;
}

export interface LavadosSummary {
  totalLavados: number;
  mesActualLavados: number;
  tallerMasUsado: { taller: string; count: number } | null;
  byMes: { mes: string; count: number }[];
  byTaller: { taller: string; count: number; pct: number }[];
}

// ==========================================
// CRUCE MAESTRO DE COBERTURA DE FLOTA (BASE VEHICULOS)
// ==========================================
export interface MonthProgressData {
  mes: string;
  // Del mes (foto mensual de la flota base)
  delMesEjecutados: number;
  delMesPendientes: number;
  delMesPctEjecutado: number;
  delMesPctPendiente: number;
  delMesPlacasEjecutadas: string[];
  delMesPlacasPendientes: string[];
  // Acumulado (unión acumulada hasta ese mes de la flota base)
  acumuladoHechos: number;
  acumuladoFaltan: number;
  acumuladoPctHechos: number;
  acumuladoPctFaltan: number;
  acumuladoPlacasHechos: string[];
  acumuladoPlacasFaltan: string[];
}

export interface MonthlyProgressSummary {
  totalFleet: number;
  allFleetPlacas: string[];
  months: MonthProgressData[];
  byMes: Record<string, MonthProgressData>;
}

export interface ProcessCoverage {
  totalFleet: number;
  ejecutados: number;
  pendientes: number;
  pctEjecutado: number;
  pctPendiente: number;
  placasEjecutadas: string[];
  placasPendientes: string[];
}

export interface UnmatchedRecordInfo {
  placa: string;
  count: number;
  cd?: string;
  contratista?: string;
  taller?: string;
  sourceSheet: string;
}

export interface VehicleComplianceStatus {
  placa: string;
  cd: string;
  contratista: string;
  calibracion: {
    status: 'COMPLETADO' | 'PENDIENTE' | 'NO_REGISTRO';
    isCompliant: boolean;
    count: number;
    lastDate?: string;
    lastTaller?: string;
    fotoUrl?: string;
    mes?: string;
  };
  lavado: {
    isCompliant: boolean;
    count: number;
    lastDate?: string;
    lastTaller?: string;
    fotoUrl?: string;
    mes?: string;
  };
  checkList: {
    isCompliant: boolean;
    totalCount: number;
    salidaCount: number;
    retornoCount: number;
    lastDate?: string;
    hasAlerts: boolean;
  };
  complianceScore: number; // 0 to 3
  compliancePct: number; // 0 to 100%
  isFullyCompliant: boolean;
  hasAnyPending: boolean;
}

export interface FleetMasterSummary {
  totalVehiculos: number;
  fullyCompliantCount: number;
  fullyCompliantPct: number;
  withPendingCount: number;
  withPendingPct: number;
  calibracionCoverage: ProcessCoverage;
  lavadosCoverage: ProcessCoverage;
  checkListCoverage: ProcessCoverage;
  vehicleStatuses: VehicleComplianceStatus[];
  unmatchedCalibracion: {
    count: number;
    uniquePlacas: number;
    items: UnmatchedRecordInfo[];
  };
  unmatchedLavados: {
    count: number;
    uniquePlacas: number;
    items: UnmatchedRecordInfo[];
  };
  unmatchedCheckList: {
    count: number;
    uniquePlacas: number;
    items: UnmatchedRecordInfo[];
  };
}

