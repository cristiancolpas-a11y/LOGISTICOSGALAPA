import Papa from 'papaparse';
import {
  RawCheckListRow,
  NormalizedCheckListRecord,
  KpiSummary,
  TrendDataPoint,
  ContractorStat,
  VehicleRanking,
  DriverRanking,
  FilterState,
  AutomatedInsight,
  SemaphoreColor,
  SeverityLevel,
  ComplianceStatus,
  CalibracionRecord,
  CalibracionSummary,
  UtilizacionRecord,
  UtilizacionSummary,
  DisponibilidadRecord,
  DisponibilidadSummary,
  VehiculoRecord,
  LavadoRecord,
  LavadosSummary
} from '../types';
import {
  parseAnyDateToIso,
  getWeekNumber,
  getMonthNameEs,
  getDayOfWeekEs
} from './dateUtils';

/**
 * Parses raw CSV text into normalized Check List records
 */
export function parseCheckListCsv(csvText: string): NormalizedCheckListRecord[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const parsed = Papa.parse<RawCheckListRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().replace(/^"|"$/g, '')
  });

  const records: NormalizedCheckListRecord[] = [];

  parsed.data.forEach((row, idx) => {
    // Find fields regardless of slight capitalization differences
    const rawDate = row.Fecha || row.fecha || row.FECHA || '';
    const rawVehicle = String(row.vehiculo || row.Vehiculo || row.VEHICULO || row.placa || '').trim();
    if (!rawVehicle && !rawDate) return;

    const dateParsed = parseAnyDateToIso(rawDate);
    const [yStr, mStr] = dateParsed.iso.split('-');
    const year = Number(yStr) || new Date().getFullYear();
    const month = Number(mStr) || (new Date().getMonth() + 1);

    const rawSalida = String(row.Salida ?? row.salida ?? '').trim();
    const rawRetorno = String(row.Retorno ?? row.retorno ?? '').trim();

    const salida: 0 | 1 = (rawSalida === '1' || rawSalida.toLowerCase() === 'si' || rawSalida.toLowerCase() === 'true') ? 1 : 0;
    const retorno: 0 | 1 = (rawRetorno === '1' || rawRetorno.toLowerCase() === 'si' || rawRetorno.toLowerCase() === 'true') ? 1 : 0;
    const contar2 = salida + retorno;

    let estado: ComplianceStatus = '0';
    if (contar2 === 2) {
      estado = 'CUMPLIO';
    } else if (contar2 === 1) {
      estado = 'LE FALTO';
    } else {
      estado = '0';
    }

    let severity: SeverityLevel = 'CRITICO';
    if (contar2 === 2) {
      severity = 'CUMPLIDO';
    } else if (contar2 === 1) {
      severity = 'ALTO';
    } else {
      severity = 'CRITICO';
    }

    const rawContratista = String(row.CONTRATISTA || row.contratista || row.Contratista || 'Logisticos.co').trim();
    const contratista = rawContratista && rawContratista !== '#N/A' ? rawContratista : 'Logisticos.co';
    const contratistaLower = contratista.toLowerCase();

    const rawConductor = String(row.CONDUCTOR || row.conductor || row.Conductor || 'SIN DATOS').trim();
    const conductor = rawConductor && rawConductor !== '#N/A' && rawConductor !== '' ? rawConductor : 'SIN DATOS';
    const conductorLower = conductor.toLowerCase();

    const vehicle = rawVehicle.toUpperCase();
    const vehicleLower = vehicle.toLowerCase();

    const recordId = row.llave ? String(row.llave).trim() : `${dateParsed.iso}-${rawVehicle}-${idx}`;

    records.push({
      id: recordId,
      rawDate: String(rawDate),
      dateIso: dateParsed.iso,
      dateFormatted: dateParsed.formatted,
      dateTimestamp: dateParsed.timestamp,
      year,
      month,
      monthName: getMonthNameEs(month),
      weekNumber: getWeekNumber(dateParsed.iso),
      dayOfWeek: getDayOfWeekEs(dateParsed.iso),
      vehicle,
      vehicleLower,
      salida,
      retorno,
      contar2,
      estado,
      contratista,
      contratistaLower,
      conductor,
      conductorLower,
      severity,
      isComplete: contar2 === 2,
      isDepartureMissing: salida === 0,
      isReturnMissing: retorno === 0
    });
  });

  return records;
}

/**
 * Determines semaphore color according to rules:
 * >= 95% -> green
 * 90% - 94.99% -> yellow
 * < 90% -> red
 */
export function getSemaphoreColor(percentage: number): SemaphoreColor {
  if (percentage >= 95) return 'green';
  if (percentage >= 90) return 'yellow';
  return 'red';
}

export function getSemaphoreBadgeClasses(color: SemaphoreColor): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
} {
  switch (color) {
    case 'green':
      return {
        bg: 'bg-emerald-50 text-emerald-800',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Cumplimiento Óptimo (≥95%)'
      };
    case 'yellow':
      return {
        bg: 'bg-amber-50 text-amber-800',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        label: 'En Alerta (90% - 94.9%)'
      };
    case 'red':
    default:
      return {
        bg: 'bg-rose-50 text-rose-800',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        label: 'Crítico (<90%)'
      };
  }
}

/**
 * Filters the list of records based on the user-selected filter state
 */
export function applyFilters(records: NormalizedCheckListRecord[], filters: FilterState): NormalizedCheckListRecord[] {
  return records.filter((rec) => {
    // Date range
    if (filters.startDate && rec.dateIso < filters.startDate) return false;
    if (filters.endDate && rec.dateIso > filters.endDate) return false;

    // Contractor
    if (filters.contractor && filters.contractor !== 'all' && rec.contratista !== filters.contractor) {
      return false;
    }

    // Vehicle
    if (filters.vehicle && filters.vehicle !== 'all' && rec.vehicle !== filters.vehicle) {
      return false;
    }

    // Driver
    if (filters.driver && filters.driver !== 'all' && rec.conductor !== filters.driver) {
      return false;
    }

    // Estado
    if (filters.estado && filters.estado !== 'all') {
      if (filters.estado === '0') {
        if (rec.estado !== '0') return false;
      } else if (rec.estado !== filters.estado) {
        return false;
      }
    }

    // Salida filter
    if (filters.salidaFilter && filters.salidaFilter !== 'all') {
      if (String(rec.salida) !== filters.salidaFilter) return false;
    }

    // Retorno filter
    if (filters.retornoFilter && filters.retornoFilter !== 'all') {
      if (String(rec.retorno) !== filters.retornoFilter) return false;
    }

    // Severity filter
    if (filters.severityFilter && filters.severityFilter !== 'all') {
      if (rec.severity !== filters.severityFilter) return false;
    }

    // Search query (matches plate, driver, contractor, or date)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      const matchVehicle = rec.vehicleLower.includes(q);
      const matchDriver = rec.conductorLower.includes(q);
      const matchContractor = rec.contratistaLower.includes(q);
      const matchDate = rec.dateFormatted.includes(q) || rec.dateIso.includes(q);
      if (!matchVehicle && !matchDriver && !matchContractor && !matchDate) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculates the main 5 KPIs from a set of records
 */
export function calculateKpis(records: NormalizedCheckListRecord[]): KpiSummary {
  const totalRecords = records.length;
  if (totalRecords === 0) {
    return {
      totalRecords: 0,
      completeRecords: 0,
      compliancePercentage: 0,
      departureCompleted: 0,
      departureMissing: 0,
      departurePercentage: 0,
      returnCompleted: 0,
      returnMissing: 0,
      returnPercentage: 0,
      totalNonCompliances: 0,
      criticalCount: 0,
      highSeverityCount: 0,
      uniqueVehicles: 0,
      uniqueDrivers: 0,
      uniqueContractors: 0
    };
  }

  let completeRecords = 0;
  let departureCompleted = 0;
  let returnCompleted = 0;
  let criticalCount = 0;
  let highSeverityCount = 0;

  const vehiclesSet = new Set<string>();
  const driversSet = new Set<string>();
  const contractorsSet = new Set<string>();

  records.forEach((r) => {
    if (r.salida === 1 && r.retorno === 1) completeRecords++;
    if (r.salida === 1) departureCompleted++;
    if (r.retorno === 1) returnCompleted++;
    if (r.contar2 === 0) criticalCount++;
    if (r.contar2 === 1) highSeverityCount++;

    if (r.vehicle) vehiclesSet.add(r.vehicle);
    if (r.conductor && r.conductor !== 'SIN DATOS') driversSet.add(r.conductor);
    if (r.contratista) contractorsSet.add(r.contratista);
  });

  const departureMissing = totalRecords - departureCompleted;
  const returnMissing = totalRecords - returnCompleted;
  const totalNonCompliances = criticalCount + highSeverityCount;

  return {
    totalRecords,
    completeRecords,
    compliancePercentage: Number(((completeRecords / totalRecords) * 100).toFixed(1)),
    departureCompleted,
    departureMissing,
    departurePercentage: Number(((departureCompleted / totalRecords) * 100).toFixed(1)),
    returnCompleted,
    returnMissing,
    returnPercentage: Number(((returnCompleted / totalRecords) * 100).toFixed(1)),
    totalNonCompliances,
    criticalCount,
    highSeverityCount,
    uniqueVehicles: vehiclesSet.size,
    uniqueDrivers: driversSet.size,
    uniqueContractors: contractorsSet.size
  };
}

/**
 * Calculates trend data grouped by day, week, or month
 */
export function calculateTrendData(
  records: NormalizedCheckListRecord[],
  grouping: 'day' | 'week' | 'month'
): TrendDataPoint[] {
  if (records.length === 0) return [];

  const groups = new Map<string, {
    label: string;
    dateSort: number;
    total: number;
    departurePassed: number;
    returnPassed: number;
    generalPassed: number;
  }>();

  records.forEach((r) => {
    let key = '';
    let label = '';
    let dateSort = r.dateTimestamp;

    if (grouping === 'day') {
      key = r.dateIso;
      label = r.dateFormatted.slice(0, 5); // DD/MM
      dateSort = r.dateTimestamp;
    } else if (grouping === 'week') {
      key = `${r.year}-W${String(r.weekNumber).padStart(2, '0')}`;
      label = `Sem ${r.weekNumber}`;
      dateSort = r.year * 100 + r.weekNumber;
    } else {
      key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      label = `${r.monthName.slice(0, 3)} ${r.year}`;
      dateSort = r.year * 100 + r.month;
    }

    const current = groups.get(key) || {
      label,
      dateSort,
      total: 0,
      departurePassed: 0,
      returnPassed: 0,
      generalPassed: 0
    };

    current.total += 1;
    if (r.salida === 1) current.departurePassed += 1;
    if (r.retorno === 1) current.returnPassed += 1;
    if (r.isComplete) current.generalPassed += 1;

    groups.set(key, current);
  });

  const list: TrendDataPoint[] = [];

  groups.forEach((val, key) => {
    const depRate = val.total > 0 ? Number(((val.departurePassed / val.total) * 100).toFixed(1)) : 0;
    const retRate = val.total > 0 ? Number(((val.returnPassed / val.total) * 100).toFixed(1)) : 0;
    const genRate = val.total > 0 ? Number(((val.generalPassed / val.total) * 100).toFixed(1)) : 0;
    const nonCompliances = val.total - val.generalPassed;

    list.push({
      periodKey: key,
      label: val.label,
      dateSort: val.dateSort,
      total: val.total,
      departurePassed: val.departurePassed,
      departureRate: depRate,
      returnPassed: val.returnPassed,
      returnRate: retRate,
      generalPassed: val.generalPassed,
      generalRate: genRate,
      nonCompliances
    });
  });

  // Sort chronologically
  return list.sort((a, b) => a.dateSort - b.dateSort);
}

/**
 * Calculates contractor compliance breakdown sorted by general compliance rate desc
 */
export function calculateContractorStats(records: NormalizedCheckListRecord[]): ContractorStat[] {
  if (records.length === 0) return [];

  const map = new Map<string, {
    total: number;
    departure: number;
    return: number;
    general: number;
  }>();

  records.forEach((r) => {
    const key = r.contratista || 'Sin Contratista';
    const cur = map.get(key) || { total: 0, departure: 0, return: 0, general: 0 };
    cur.total += 1;
    if (r.salida === 1) cur.departure += 1;
    if (r.retorno === 1) cur.return += 1;
    if (r.isComplete) cur.general += 1;
    map.set(key, cur);
  });

  const result: ContractorStat[] = [];

  map.forEach((val, name) => {
    const depRate = val.total > 0 ? Number(((val.departure / val.total) * 100).toFixed(1)) : 0;
    const retRate = val.total > 0 ? Number(((val.return / val.total) * 100).toFixed(1)) : 0;
    const genRate = val.total > 0 ? Number(((val.general / val.total) * 100).toFixed(1)) : 0;
    const nonCompliances = val.total - val.general;

    result.push({
      name,
      totalInspections: val.total,
      departurePassed: val.departure,
      departureRate: depRate,
      returnPassed: val.return,
      returnRate: retRate,
      generalPassed: val.general,
      generalRate: genRate,
      nonCompliances
    });
  });

  // Sort by general compliance rate descending, then by total descending
  return result.sort((a, b) => b.generalRate - a.generalRate || b.totalInspections - a.totalInspections);
}

/**
 * Calculates vehicle ranking sorted by most non-compliances descending
 */
export function calculateVehicleRankings(records: NormalizedCheckListRecord[]): VehicleRanking[] {
  if (records.length === 0) return [];

  const map = new Map<string, {
    contractor: string;
    total: number;
    departure: number;
    return: number;
    general: number;
    drivers: Set<string>;
  }>();

  records.forEach((r) => {
    const plate = r.vehicle;
    if (!plate) return;

    const cur = map.get(plate) || {
      contractor: r.contratista,
      total: 0,
      departure: 0,
      return: 0,
      general: 0,
      drivers: new Set<string>()
    };

    cur.total += 1;
    if (r.salida === 1) cur.departure += 1;
    if (r.retorno === 1) cur.return += 1;
    if (r.isComplete) cur.general += 1;
    if (r.conductor && r.conductor !== 'SIN DATOS') {
      cur.drivers.add(r.conductor);
    }
    if (r.contratista && r.contratista !== 'Logisticos.co') {
      cur.contractor = r.contratista;
    }

    map.set(plate, cur);
  });

  const list: VehicleRanking[] = [];

  map.forEach((val, plate) => {
    const depRate = val.total > 0 ? Number(((val.departure / val.total) * 100).toFixed(1)) : 0;
    const retRate = val.total > 0 ? Number(((val.return / val.total) * 100).toFixed(1)) : 0;
    const genRate = val.total > 0 ? Number(((val.general / val.total) * 100).toFixed(1)) : 0;
    const nonCompliances = val.total - val.general;

    list.push({
      plate,
      contractor: val.contractor || 'Logisticos.co',
      totalInspections: val.total,
      departurePassed: val.departure,
      departureRate: depRate,
      returnPassed: val.return,
      returnRate: retRate,
      nonCompliances,
      generalPassed: val.general,
      generalRate: genRate,
      severityRating: getSemaphoreColor(genRate),
      primaryDrivers: Array.from(val.drivers)
    });
  });

  // Sort by nonCompliances descending (most failures first)
  return list.sort((a, b) => b.nonCompliances - a.nonCompliances || a.generalRate - b.generalRate);
}

/**
 * Calculates driver ranking sorted by most non-compliances descending
 */
export function calculateDriverRankings(records: NormalizedCheckListRecord[]): DriverRanking[] {
  if (records.length === 0) return [];

  const map = new Map<string, {
    vehicles: Set<string>;
    total: number;
    departure: number;
    return: number;
    general: number;
  }>();

  records.forEach((r) => {
    const name = r.conductor || 'SIN DATOS';
    const cur = map.get(name) || {
      vehicles: new Set<string>(),
      total: 0,
      departure: 0,
      return: 0,
      general: 0
    };

    cur.total += 1;
    if (r.salida === 1) cur.departure += 1;
    if (r.retorno === 1) cur.return += 1;
    if (r.isComplete) cur.general += 1;
    if (r.vehicle) cur.vehicles.add(r.vehicle);

    map.set(name, cur);
  });

  const list: DriverRanking[] = [];

  map.forEach((val, driverName) => {
    const depRate = val.total > 0 ? Number(((val.departure / val.total) * 100).toFixed(1)) : 0;
    const retRate = val.total > 0 ? Number(((val.return / val.total) * 100).toFixed(1)) : 0;
    const genRate = val.total > 0 ? Number(((val.general / val.total) * 100).toFixed(1)) : 0;
    const nonCompliances = val.total - val.general;

    let reincidenceLevel: 'Alta' | 'Media' | 'Baja' | 'Sin Incumplimientos' = 'Sin Incumplimientos';
    if (nonCompliances >= 5) {
      reincidenceLevel = 'Alta';
    } else if (nonCompliances >= 2) {
      reincidenceLevel = 'Media';
    } else if (nonCompliances === 1) {
      reincidenceLevel = 'Baja';
    }

    list.push({
      driverName,
      associatedVehicles: Array.from(val.vehicles),
      totalInspections: val.total,
      departurePassed: val.departure,
      departureRate: depRate,
      returnPassed: val.return,
      returnRate: retRate,
      nonCompliances,
      generalPassed: val.general,
      generalRate: genRate,
      reincidenceLevel,
      severityRating: getSemaphoreColor(genRate)
    });
  });

  // Sort by non-compliances descending
  return list.sort((a, b) => b.nonCompliances - a.nonCompliances || a.generalRate - b.generalRate);
}

/**
 * Generates automated executive intelligence & diagnostic narrative
 */
export function generateAutomatedInsight(
  kpis: KpiSummary,
  trendData: TrendDataPoint[],
  contractorStats: ContractorStat[],
  vehicleRankings: VehicleRanking[],
  driverRankings: DriverRanking[]
): AutomatedInsight {
  if (kpis.totalRecords === 0) {
    return {
      narrative: 'No hay registros disponibles para el período y filtros seleccionados.',
      worstDay: null,
      bestDay: null,
      worstContractor: null,
      worstVehicle: null,
      worstDriver: null,
      primaryWeakness: 'Equilibrado',
      weaknessGap: 0,
      trendDirection: 'stable',
      trendDelta: 0,
      criticalVehiclesCount: 0,
      recommendedActions: []
    };
  }

  // 1. Departure vs Return comparison
  const depRate = kpis.departurePercentage;
  const retRate = kpis.returnPercentage;
  const gap = Number(Math.abs(depRate - retRate).toFixed(1));
  let primaryWeakness: 'Retorno' | 'Salida' | 'Equilibrado' = 'Equilibrado';

  if (retRate < depRate - 0.5) {
    primaryWeakness = 'Retorno';
  } else if (depRate < retRate - 0.5) {
    primaryWeakness = 'Salida';
  }

  // 2. Best and worst days
  let worstDay: { label: string; rate: number } | null = null;
  let bestDay: { label: string; rate: number } | null = null;

  if (trendData.length > 0) {
    const validPoints = trendData.filter((p) => p.total >= 5);
    const pool = validPoints.length > 0 ? validPoints : trendData;
    const sortedByRate = [...pool].sort((a, b) => a.generalRate - b.generalRate);
    worstDay = { label: sortedByRate[0].label, rate: sortedByRate[0].generalRate };
    bestDay = { label: sortedByRate[sortedByRate.length - 1].label, rate: sortedByRate[sortedByRate.length - 1].generalRate };
  }

  // 3. Worst contractor
  let worstContractor: { name: string; rate: number; nonCompliances: number } | null = null;
  if (contractorStats.length > 0) {
    const sortedContractors = [...contractorStats].sort((a, b) => a.generalRate - b.generalRate);
    worstContractor = {
      name: sortedContractors[0].name,
      rate: sortedContractors[0].generalRate,
      nonCompliances: sortedContractors[0].nonCompliances
    };
  }

  // 4. Worst vehicle & worst driver
  let worstVehicle: { plate: string; nonCompliances: number; rate: number } | null = null;
  if (vehicleRankings.length > 0) {
    worstVehicle = {
      plate: vehicleRankings[0].plate,
      nonCompliances: vehicleRankings[0].nonCompliances,
      rate: vehicleRankings[0].generalRate
    };
  }

  let worstDriver: { name: string; nonCompliances: number; rate: number } | null = null;
  const namedDrivers = driverRankings.filter((d) => d.driverName !== 'SIN DATOS');
  if (namedDrivers.length > 0) {
    worstDriver = {
      name: namedDrivers[0].driverName,
      nonCompliances: namedDrivers[0].nonCompliances,
      rate: namedDrivers[0].generalRate
    };
  } else if (driverRankings.length > 0) {
    worstDriver = {
      name: driverRankings[0].driverName,
      nonCompliances: driverRankings[0].nonCompliances,
      rate: driverRankings[0].generalRate
    };
  }

  // 5. Trend vector (early vs late half of trend)
  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  let trendDelta = 0;
  if (trendData.length >= 2) {
    const mid = Math.floor(trendData.length / 2);
    const firstHalf = trendData.slice(0, mid);
    const secondHalf = trendData.slice(mid);

    const avgFirst = firstHalf.reduce((acc, c) => acc + c.generalRate, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((acc, c) => acc + c.generalRate, 0) / secondHalf.length;
    trendDelta = Number((avgSecond - avgFirst).toFixed(1));

    if (trendDelta >= 1.5) trendDirection = 'improving';
    else if (trendDelta <= -1.5) trendDirection = 'declining';
    else trendDirection = 'stable';
  }

  const criticalVehiclesCount = vehicleRankings.filter((v) => v.nonCompliances >= 3).length;

  // Build high-impact narrative
  let weaknessPhrase = '';
  if (primaryWeakness === 'Retorno') {
    weaknessPhrase = `El Check List de retorno presenta el menor cumplimiento (${retRate}%), ubicándose ${gap}% por debajo del Check List de salida (${depRate}%).`;
  } else if (primaryWeakness === 'Salida') {
    weaknessPhrase = `El Check List de salida presenta el menor cumplimiento (${depRate}%), ubicándose ${gap}% por debajo del Check List de retorno (${retRate}%).`;
  } else {
    weaknessPhrase = `Los Check List de salida (${depRate}%) y retorno (${retRate}%) mantienen un comportamiento simétrico y equilibrado.`;
  }

  let trendPhrase = '';
  if (trendDirection === 'improving') {
    trendPhrase = `La tendencia temporal muestra una recuperación positiva de +${trendDelta}% en el tramo reciente.`;
  } else if (trendDirection === 'declining') {
    trendPhrase = `Se detecta una caída de tendencia de ${trendDelta}% en los períodos más recientes, requiriendo intervención operativa inmediata.`;
  } else {
    trendPhrase = `La tendencia operativa se mantiene estable a lo largo del horizonte evaluado.`;
  }

  const narrative = `El cumplimiento general durante el período seleccionado fue del ${kpis.compliancePercentage}%, con un total de ${kpis.totalNonCompliances} registros con novedades (${kpis.criticalCount} críticos sin ninguna inspección y ${kpis.highSeverityCount} con inspección parcial). ${weaknessPhrase} ${trendPhrase} Se identifican ${criticalVehiclesCount} vehículos con incumplimientos recurrentes (${worstVehicle ? `caso más crítico: ${worstVehicle.plate} con ${worstVehicle.nonCompliances} novedades` : ''}).`;

  // Recommended actions
  const recommendedActions: string[] = [];
  if (primaryWeakness === 'Retorno') {
    recommendedActions.push('Reforzar el protocolo de cierre de turno en patios para asegurar que ningún vehículo concluya operación sin registrar el Check List de Retorno.');
  }
  if (primaryWeakness === 'Salida') {
    recommendedActions.push('Establecer bloqueo de despacho en garita si el conductor no presenta la validación del Check List de Salida completado.');
  }
  if (worstVehicle && worstVehicle.nonCompliances > 0) {
    recommendedActions.push(`Auditar de forma prioritaria el vehículo ${worstVehicle.plate} (${worstVehicle.nonCompliances} novedades acumuladas) y verificar asignación de operadores.`);
  }
  if (worstDriver && worstDriver.nonCompliances > 0 && worstDriver.name !== 'SIN DATOS') {
    recommendedActions.push(`Citar a retroalimentación de buenas prácticas operativas al conductor ${worstDriver.name} (${worstDriver.nonCompliances} novedades).`);
  }
  if (kpis.criticalCount > 0) {
    recommendedActions.push(`Investigar ${kpis.criticalCount} casos de alerta crítica donde no se registró ni salida ni retorno.`);
  }

  return {
    narrative,
    worstDay,
    bestDay,
    worstContractor,
    worstVehicle,
    worstDriver,
    primaryWeakness,
    weaknessGap: gap,
    trendDirection,
    trendDelta,
    criticalVehiclesCount,
    recommendedActions
  };
}

// =========================================================================
// PESTAÑA 1: PARSER Y SUMARIO DE CALIBRACION
// =========================================================================
export function parseCalibracionCsv(csvText: string): CalibracionRecord[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  const records: CalibracionRecord[] = [];

  parsed.data.forEach((row, idx) => {
    // Lookup keys accounting for possible trailing spaces
    const mes = String(row['MES'] || row['Mes'] || row['mes'] || '').trim().toUpperCase();
    const rawFecha = row['FECHA '] || row['FECHA'] || row['Fecha '] || row['Fecha'] || row['fecha'] || '';
    const semana = String(row['SEMANA '] || row['SEMANA'] || row['Semana '] || row['Semana'] || '').trim();
    const placa = String(row['PLACA'] || row['Placa'] || row['placa'] || '').trim().toUpperCase();
    const taller = String(row['TALLER '] || row['TALLER'] || row['Taller '] || row['Taller'] || '').trim();
    const fotoEvidenciaUrl = String(row['FOTO DE EVIDENCIA '] || row['FOTO DE EVIDENCIA'] || row['Foto de Evidencia'] || row['Foto'] || '').trim();
    const rawEstado = String(row['ESTADO'] || row['Estado'] || row['estado'] || '').trim().toUpperCase();
    const cd = String(row['CD'] || row['Cd'] || row['cd'] || 'GALAPA').trim().toUpperCase();
    const contratista = String(row['CONTRATISTA'] || row['Contratista'] || 'Logisticos.co').trim();

    if (!placa && !mes && !rawFecha) return;

    const dateParsed = parseAnyDateToIso(rawFecha);
    const estado = rawEstado.includes('COMPLET') ? 'COMPLETADO' : 'PENDIENTE';

    records.push({
      id: `calib-${idx}-${placa}`,
      mes: mes || 'SIN MES',
      fechaRaw: String(rawFecha),
      fechaIso: dateParsed.iso,
      fechaFormatted: dateParsed.formatted,
      semana: semana || 'N/A',
      placa: placa || 'SIN PLACA',
      placaLower: (placa || '').toLowerCase(),
      taller: taller || 'TALLER NO ASIGNADO',
      tallerLower: (taller || '').toLowerCase(),
      fotoEvidenciaUrl,
      estado,
      cd: cd || 'GALAPA',
      contratista: contratista || 'Logisticos.co',
      contratistaLower: (contratista || '').toLowerCase()
    });
  });

  return records;
}

export function calculateCalibracionSummary(records: CalibracionRecord[]): CalibracionSummary {
  const total = records.length;
  let completados = 0;
  let pendientes = 0;

  const mesMap = new Map<string, { completados: number; pendientes: number; total: number }>();
  const cdMap = new Map<string, { completados: number; pendientes: number; total: number }>();
  const tallerMap = new Map<string, { completados: number; pendientes: number; total: number }>();

  // Ordered list of months for standard timeline
  const MONTH_ORDER = ['FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO'];

  records.forEach((r) => {
    if (r.estado === 'COMPLETADO') {
      completados++;
    } else {
      pendientes++;
    }

    // Mes
    const m = r.mes || 'OTRO';
    if (!mesMap.has(m)) mesMap.set(m, { completados: 0, pendientes: 0, total: 0 });
    const mEntry = mesMap.get(m)!;
    mEntry.total++;
    if (r.estado === 'COMPLETADO') mEntry.completados++;
    else mEntry.pendientes++;

    // CD
    const c = r.cd || 'GALAPA';
    if (!cdMap.has(c)) cdMap.set(c, { completados: 0, pendientes: 0, total: 0 });
    const cEntry = cdMap.get(c)!;
    cEntry.total++;
    if (r.estado === 'COMPLETADO') cEntry.completados++;
    else cEntry.pendientes++;

    // Taller
    const t = r.taller || 'NO ASIGNADO';
    if (!tallerMap.has(t)) tallerMap.set(t, { completados: 0, pendientes: 0, total: 0 });
    const tEntry = tallerMap.get(t)!;
    tEntry.total++;
    if (r.estado === 'COMPLETADO') tEntry.completados++;
    else tEntry.pendientes++;
  });

  const pctCompletado = total > 0 ? Number(((completados / total) * 100).toFixed(1)) : 0;
  const pctPendiente = total > 0 ? Number(((pendientes / total) * 100).toFixed(1)) : 0;

  // Sort byMes based on natural month order
  const byMes = Array.from(mesMap.entries())
    .map(([mes, stat]) => ({ mes, ...stat }))
    .sort((a, b) => {
      const idxA = MONTH_ORDER.indexOf(a.mes);
      const idxB = MONTH_ORDER.indexOf(b.mes);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.mes.localeCompare(b.mes);
    });

  const byCd = Array.from(cdMap.entries())
    .map(([cd, stat]) => ({
      cd,
      ...stat,
      pctCompletado: stat.total > 0 ? Number(((stat.completados / stat.total) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.total - a.total);

  const byTaller = Array.from(tallerMap.entries())
    .map(([taller, stat]) => ({ taller, ...stat }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    completados,
    pendientes,
    pctCompletado,
    pctPendiente,
    byMes,
    byCd,
    byTaller
  };
}

// =========================================================================
// PESTAÑA 2: PARSER Y SUMARIO DE UTILIZACION
// =========================================================================
export function parseUtilizacionCsv(csvText: string): UtilizacionRecord[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  const records: UtilizacionRecord[] = [];

  parsed.data.forEach((row, idx) => {
    const rawFecha = row['Fecha'] || row['FECHA'] || row['fecha'] || '';
    if (!rawFecha) return;

    const viajes = Number(row['Cantidad de Viajes'] || row['cantidad de viajes'] || row['Viajes'] || 0);
    const flota = Number(row['cantidad de flota'] || row['Cantidad de flota'] || row['Flota'] || 0);

    // Read utlizacion with exact spelling
    let rawUtil = row['utlizacion'] || row['utilizacion'] || row['UTILIZACION'] || row['Utlizacion'] || 0;
    if (typeof rawUtil === 'string') {
      rawUtil = parseFloat(rawUtil.replace('%', '').replace(',', '.').trim());
    }
    let utilDecimal = Number(rawUtil) || 0;
    // If entered directly as 90 instead of 0.90
    if (utilDecimal > 2) {
      utilDecimal = utilDecimal / 100;
    }

    const dateParsed = parseAnyDateToIso(rawFecha);
    const utilPct = Number((utilDecimal * 100).toFixed(1));
    const isAnomaly = utilDecimal > 1.0;

    records.push({
      id: `util-${idx}-${dateParsed.iso}`,
      fechaRaw: String(rawFecha),
      fechaIso: dateParsed.iso,
      fechaFormatted: dateParsed.formatted,
      cantidadViajes: viajes,
      cantidadFlota: flota,
      utilizacion: utilDecimal,
      utilizacionPct: utilPct,
      isAnomaly
    });
  });

  // Sort chronologically
  return records.sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));
}

export function calculateUtilizacionSummary(records: UtilizacionRecord[]): UtilizacionSummary {
  if (records.length === 0) {
    return {
      promedioPct: 0,
      promedioViajes: 0,
      totalViajes: 0,
      promedioFlota: 0,
      maxDia: null,
      minDia: null,
      anomaliasCount: 0,
      anomalias: []
    };
  }

  let totalUtilPct = 0;
  let totalViajes = 0;
  let totalFlota = 0;
  const anomalias: UtilizacionRecord[] = [];

  let maxItem: UtilizacionRecord = records[0];
  let minItem: UtilizacionRecord = records[0];

  // We find max among normal values (or whole list)
  let maxNormalItem: UtilizacionRecord = records[0];

  records.forEach((r) => {
    totalUtilPct += r.utilizacionPct;
    totalViajes += r.cantidadViajes;
    totalFlota += r.cantidadFlota;

    if (r.isAnomaly) {
      anomalias.push(r);
    } else {
      if (r.utilizacionPct > maxNormalItem.utilizacionPct) {
        maxNormalItem = r;
      }
    }

    if (r.utilizacionPct > maxItem.utilizacionPct) {
      maxItem = r;
    }
    if (r.utilizacionPct < minItem.utilizacionPct) {
      minItem = r;
    }
  });

  const promedioPct = Number((totalUtilPct / records.length).toFixed(1));
  const promedioViajes = Number((totalViajes / records.length).toFixed(1));
  const promedioFlota = Number((totalFlota / records.length).toFixed(1));

  return {
    promedioPct,
    promedioViajes,
    totalViajes,
    promedioFlota,
    maxDia: {
      fechaFormatted: maxNormalItem.fechaFormatted || maxItem.fechaFormatted,
      fechaIso: maxNormalItem.fechaIso || maxItem.fechaIso,
      utilizacionPct: maxNormalItem.utilizacionPct || maxItem.utilizacionPct,
      viajes: maxNormalItem.cantidadViajes || maxItem.cantidadViajes
    },
    minDia: {
      fechaFormatted: minItem.fechaFormatted,
      fechaIso: minItem.fechaIso,
      utilizacionPct: minItem.utilizacionPct,
      viajes: minItem.cantidadViajes
    },
    anomaliasCount: anomalias.length,
    anomalias
  };
}

// =========================================================================
// PESTAÑA 3: PARSER Y SUMARIO DE DISPONIBILIDAD
// =========================================================================
export function parseDisponibilidadCsv(csvText: string): DisponibilidadRecord[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  const records: DisponibilidadRecord[] = [];

  parsed.data.forEach((row, idx) => {
    const rawFecha = row['FECHA 1'] || row['FECHA'] || row['Fecha'] || '';
    if (!rawFecha) return;

    const cd = String(row['CD 1'] || row['CD'] || 'GALAPA').trim();
    const contratista = String(row['CONTRATISTA 1'] || row['CONTRATISTA'] || 'Logisticos.co').trim();
    const vhIndisponibles = Number(row['VH INDISPONIBLES 1'] || row['VH INDISPONIBLES'] || 0);
    const vhsDisponibles = Number(row['VHS DISPONIBLES1'] || row['VHS DISPONIBLES'] || 0);
    const totalVh = Number(row['TOTAl VH1'] || row['TOTAL VH1'] || row['TOTAL VH'] || (vhIndisponibles + vhsDisponibles));

    let rawPromedio = row['%PROMEDIO1'] || row['%PROMEDIO'] || row['PROMEDIO'] || 0;
    if (typeof rawPromedio === 'string') {
      rawPromedio = parseFloat(rawPromedio.replace('%', '').replace(',', '.').trim());
    }
    let promedioDecimal = Number(rawPromedio) || 0;
    if (promedioDecimal > 2) promedioDecimal = promedioDecimal / 100;

    const semana = Number(row['SEMANA'] || row['Semana'] || 0);
    const dateParsed = parseAnyDateToIso(rawFecha);
    const promedioPct = Number((promedioDecimal * 100).toFixed(1));

    records.push({
      id: `disp-${idx}-${dateParsed.iso}`,
      fechaRaw: String(rawFecha),
      fechaIso: dateParsed.iso,
      fechaFormatted: dateParsed.formatted,
      cd: cd || 'GALAPA',
      contratista: contratista || 'Logisticos.co',
      vhIndisponibles,
      vhsDisponibles,
      totalVh,
      promedio: promedioDecimal,
      promedioPct,
      semana: semana || 1
    });
  });

  return records.sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));
}

export function calculateDisponibilidadSummary(records: DisponibilidadRecord[]): DisponibilidadSummary {
  if (records.length === 0) {
    return {
      promedioDisponibilidad: 0,
      promedioIndisponibles: 0,
      promedioDisponibles: 0,
      totalFlotaPromedio: 0,
      mejorSemana: null,
      peorSemana: null,
      bySemana: []
    };
  }

  let totalPct = 0;
  let totalIndisp = 0;
  let totalDisp = 0;
  let totalTotal = 0;

  const semanaMap = new Map<number, { sumPct: number; sumDisp: number; sumIndisp: number; count: number }>();

  records.forEach((r) => {
    totalPct += r.promedioPct;
    totalIndisp += r.vhIndisponibles;
    totalDisp += r.vhsDisponibles;
    totalTotal += r.totalVh;

    const sem = r.semana;
    if (!semanaMap.has(sem)) {
      semanaMap.set(sem, { sumPct: 0, sumDisp: 0, sumIndisp: 0, count: 0 });
    }
    const sEntry = semanaMap.get(sem)!;
    sEntry.sumPct += r.promedioPct;
    sEntry.sumDisp += r.vhsDisponibles;
    sEntry.sumIndisp += r.vhIndisponibles;
    sEntry.count++;
  });

  const bySemana = Array.from(semanaMap.entries())
    .map(([semana, stat]) => {
      const avgPct = Number((stat.sumPct / stat.count).toFixed(1));
      const dispAvg = Number((stat.sumDisp / stat.count).toFixed(1));
      const indispAvg = Number((stat.sumIndisp / stat.count).toFixed(1));
      return {
        semana,
        promedioPct: avgPct,
        disponiblesAvg: dispAvg,
        indisponiblesAvg: indispAvg,
        totalAvg: Number((dispAvg + indispAvg).toFixed(1))
      };
    })
    .sort((a, b) => a.semana - b.semana);

  let mejorSemana: { semana: number; promedioPct: number } | null = null;
  let peorSemana: { semana: number; promedioPct: number } | null = null;

  bySemana.forEach((s) => {
    if (!mejorSemana || s.promedioPct > mejorSemana.promedioPct) {
      mejorSemana = { semana: s.semana, promedioPct: s.promedioPct };
    }
    if (!peorSemana || s.promedioPct < peorSemana.promedioPct) {
      peorSemana = { semana: s.semana, promedioPct: s.promedioPct };
    }
  });

  return {
    promedioDisponibilidad: Number((totalPct / records.length).toFixed(1)),
    promedioIndisponibles: Number((totalIndisp / records.length).toFixed(1)),
    promedioDisponibles: Number((totalDisp / records.length).toFixed(1)),
    totalFlotaPromedio: Number((totalTotal / records.length).toFixed(1)),
    mejorSemana,
    peorSemana,
    bySemana
  };
}

// =========================================================================
// PESTAÑA 4: PARSER DE VEHICULOS (FLOTA MAESTRA)
// =========================================================================
export function parseVehiculosCsv(csvText: string): VehiculoRecord[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  const list: VehiculoRecord[] = [];
  const seen = new Set<string>();

  parsed.data.forEach((row) => {
    const placa = String(row['PLACA'] || row['Placa'] || row['placa'] || '').trim().toUpperCase();
    if (!placa || seen.has(placa)) return;
    seen.add(placa);

    const cd = String(row['CD'] || row['Cd'] || 'GALAPA').trim();
    const contratista = String(row['CONTRATISTA'] || row['Contratista'] || 'Logisticos.co').trim();

    list.push({
      placa,
      cd: cd || 'GALAPA',
      contratista: contratista || 'Logisticos.co'
    });
  });

  return list.sort((a, b) => a.placa.localeCompare(b.placa));
}

// =========================================================================
// PESTAÑA 5: PARSER Y SUMARIO DE LAVADOS
// =========================================================================
export function parseLavadosCsv(csvText: string): LavadoRecord[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  const records: LavadoRecord[] = [];

  parsed.data.forEach((row, idx) => {
    const id = String(row['ID_Reporte'] || row['ID'] || `lavado-${idx}`).trim();
    const mes = String(row['MES'] || row['Mes'] || '').trim().toUpperCase();
    const semana = String(row['SEMANA '] || row['SEMANA'] || row['Semana '] || row['Semana'] || '').trim();
    const rawFecha = row['Fecha'] || row['FECHA'] || row['fecha'] || '';
    const placa = String(row['Placa'] || row['PLACA'] || row['placa'] || '').trim().toUpperCase();
    const evidenciaInicialUrl = String(row['Evidencia Inicial'] || row['EVIDENCIA INICIAL'] || '').trim();
    const mapaTallerUrl = String(row['MAPA DE TALLER'] || row['Mapa de Taller'] || '').trim();
    
    // Normalization with trim to avoid duplicate groups like "VEHIPESA " vs "VEHIPESA"
    const taller = String(row['TALLER'] || row['Taller'] || 'VEHIPESA').trim().toUpperCase();
    const llave = String(row['llave'] || row['Llave'] || '').trim();
    const contratista = String(row['CONTATISTA'] || row['CONTRATISTA'] || row['Contratista'] || 'Logisticos.co').trim();

    if (!placa && !rawFecha && !mes) return;

    const dateParsed = parseAnyDateToIso(rawFecha);

    records.push({
      id: id || `lav-${idx}`,
      mes: mes || 'SIN MES',
      semana: semana || 'N/A',
      fechaRaw: String(rawFecha),
      fechaIso: dateParsed.iso,
      fechaFormatted: dateParsed.formatted,
      placa: placa || 'SIN PLACA',
      placaLower: (placa || '').toLowerCase(),
      evidenciaInicialUrl,
      mapaTallerUrl,
      taller: taller || 'VEHIPESA',
      tallerLower: (taller || '').toLowerCase(),
      llave,
      contratista: contratista || 'Logisticos.co'
    });
  });

  return records;
}

export function calculateLavadosSummary(records: LavadoRecord[]): LavadosSummary {
  const totalLavados = records.length;
  const mesMap = new Map<string, number>();
  const tallerMap = new Map<string, number>();

  const MONTH_ORDER = ['FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO'];

  records.forEach((r) => {
    const m = r.mes || 'OTRO';
    mesMap.set(m, (mesMap.get(m) || 0) + 1);

    const t = r.taller || 'VEHIPESA';
    tallerMap.set(t, (tallerMap.get(t) || 0) + 1);
  });

  const byMes = Array.from(mesMap.entries())
    .map(([mes, count]) => ({ mes, count }))
    .sort((a, b) => {
      const idxA = MONTH_ORDER.indexOf(a.mes);
      const idxB = MONTH_ORDER.indexOf(b.mes);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.mes.localeCompare(b.mes);
    });

  const byTaller = Array.from(tallerMap.entries())
    .map(([taller, count]) => ({
      taller,
      count,
      pct: totalLavados > 0 ? Number(((count / totalLavados) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const tallerMasUsado = byTaller.length > 0 ? byTaller[0] : null;
  const mesActualLavados = byMes.length > 0 ? byMes[byMes.length - 1].count : 0;

  return {
    totalLavados,
    mesActualLavados,
    tallerMasUsado,
    byMes,
    byTaller
  };
}

