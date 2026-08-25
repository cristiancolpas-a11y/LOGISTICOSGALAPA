import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FilterBar } from './components/FilterBar';
import {
  NormalizedCheckListRecord,
  FilterState,
  UserSession,
  CalibracionRecord,
  CalibracionSummary,
  UtilizacionRecord,
  UtilizacionSummary,
  DisponibilidadRecord,
  DisponibilidadSummary,
  VehiculoRecord,
  LavadoRecord,
  LavadosSummary
} from './types';
import {
  parseCheckListCsv,
  applyFilters,
  calculateKpis,
  calculateTrendData,
  calculateContractorStats,
  calculateVehicleRankings,
  calculateDriverRankings,
  generateAutomatedInsight,
  parseCalibracionCsv,
  calculateCalibracionSummary,
  parseUtilizacionCsv,
  calculateUtilizacionSummary,
  parseDisponibilidadCsv,
  calculateDisponibilidadSummary,
  parseVehiculosCsv,
  parseLavadosCsv,
  calculateLavadosSummary,
  calculateFleetMasterCoverage
} from './utils/dataProcessor';
import { formatNowDateTimeEs } from './utils/dateUtils';
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  AlertTriangle,
  FileSpreadsheet,
  AlertCircle,
  Wrench,
  Activity,
  Gauge,
  Truck,
  Sparkles
} from 'lucide-react';

// Lazy loaded views for code splitting and faster initial bundle load
const ExecutiveDashboardView = React.lazy(() =>
  import('./components/views/ExecutiveDashboardView').then((m) => ({
    default: m.ExecutiveDashboardView
  }))
);
const SalidaTrackingView = React.lazy(() =>
  import('./components/views/SalidaTrackingView').then((m) => ({
    default: m.SalidaTrackingView
  }))
);
const RetornoTrackingView = React.lazy(() =>
  import('./components/views/RetornoTrackingView').then((m) => ({
    default: m.RetornoTrackingView
  }))
);
const AlertsExceptionsView = React.lazy(() =>
  import('./components/views/AlertsExceptionsView').then((m) => ({
    default: m.AlertsExceptionsView
  }))
);
const RawDatabaseView = React.lazy(() =>
  import('./components/views/RawDatabaseView').then((m) => ({
    default: m.RawDatabaseView
  }))
);
const CalibracionView = React.lazy(() =>
  import('./components/views/CalibracionView').then((m) => ({
    default: m.CalibracionView
  }))
);
const UtilizacionView = React.lazy(() =>
  import('./components/views/UtilizacionView').then((m) => ({
    default: m.UtilizacionView
  }))
);
const DisponibilidadView = React.lazy(() =>
  import('./components/views/DisponibilidadView').then((m) => ({
    default: m.DisponibilidadView
  }))
);
const VehiculosView = React.lazy(() =>
  import('./components/views/VehiculosView').then((m) => ({
    default: m.VehiculosView
  }))
);
const LavadosView = React.lazy(() =>
  import('./components/views/LavadosView').then((m) => ({
    default: m.LavadosView
  }))
);

const SESSION_STORAGE_KEY = 'aon_galapa_session_v1';
const GOOGLE_SHEET_ID = '18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk';

function getSheetUrl(sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

export default function App() {
  // 1. Authentication State
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load session from storage', e);
    }
    return null;
  });

  // 2. Navigation State
  const [activeModule, setActiveModule] = useState('check-list');
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'salida' | 'retorno' | 'alertas' | 'database'
  >('dashboard');

  // 3. Data States per Module
  // Check List
  const [allRecords, setAllRecords] = useState<NormalizedCheckListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Calibración
  const [calibracionRecords, setCalibracionRecords] = useState<CalibracionRecord[]>([]);
  const [isCalibracionLoading, setIsCalibracionLoading] = useState(false);
  const [calibracionUpdated, setCalibracionUpdated] = useState<string>('');

  // Utilización
  const [utilizacionRecords, setUtilizacionRecords] = useState<UtilizacionRecord[]>([]);
  const [isUtilizacionLoading, setIsUtilizacionLoading] = useState(false);
  const [utilizacionUpdated, setUtilizacionUpdated] = useState<string>('');

  // Disponibilidad
  const [disponibilidadRecords, setDisponibilidadRecords] = useState<DisponibilidadRecord[]>([]);
  const [isDisponibilidadLoading, setIsDisponibilidadLoading] = useState(false);
  const [disponibilidadUpdated, setDisponibilidadUpdated] = useState<string>('');

  // Vehículos
  const [vehiculosRecords, setVehiculosRecords] = useState<VehiculoRecord[]>([]);
  const [isVehiculosLoading, setIsVehiculosLoading] = useState(false);
  const [vehiculosUpdated, setVehiculosUpdated] = useState<string>('');

  // Lavados
  const [lavadosRecords, setLavadosRecords] = useState<LavadoRecord[]>([]);
  const [isLavadosLoading, setIsLavadosLoading] = useState(false);
  const [lavadosUpdated, setLavadosUpdated] = useState<string>('');

  // 4. Global Filter State for Check List
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    presetRange: 'all',
    trendGrouping: 'day',
    contractor: 'all',
    vehicle: 'all',
    driver: 'all',
    estado: 'all',
    salidaFilter: 'all',
    retornoFilter: 'all',
    severityFilter: 'all',
    searchQuery: ''
  });

  // Generic CSV Fetcher
  const fetchCsvData = async (sheetName: string, isManualRefresh = false): Promise<string> => {
    let csvContent = '';
    let serverFetched = false;

    try {
      const res = await fetch(
        `/api/sheet-data?sheet=${encodeURIComponent(sheetName)}${isManualRefresh ? '&refresh=true' : ''}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.csv) {
          csvContent = json.csv;
          serverFetched = true;
        }
      }
    } catch (err) {
      console.warn(`Proxy fetch failed for "${sheetName}", trying direct...`, err);
    }

    if (!serverFetched || !csvContent) {
      const directRes = await fetch(getSheetUrl(sheetName));
      if (!directRes.ok) {
        throw new Error(`HTTP ${directRes.status}: Error al obtener datos de "${sheetName}"`);
      }
      csvContent = await directRes.text();
    }

    return csvContent;
  };

  // Load Check List
  const loadCheckListData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setFetchError(null);

    try {
      const csv = await fetchCsvData('Check list', isManualRefresh);
      const parsed = parseCheckListCsv(csv);
      setAllRecords(parsed);
      setLastUpdated(formatNowDateTimeEs());
    } catch (err: any) {
      console.error('Error fetching check list data:', err);
      setFetchError(err?.message || 'Error al conectar con la hoja Check List.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load Calibración
  const loadCalibracionData = useCallback(async (isManualRefresh = false) => {
    setIsCalibracionLoading(true);
    try {
      const csv = await fetchCsvData('CALIBRACION', isManualRefresh);
      const parsed = parseCalibracionCsv(csv);
      setCalibracionRecords(parsed);
      setCalibracionUpdated(formatNowDateTimeEs());
    } catch (err: any) {
      console.error('Error fetching calibracion data:', err);
    } finally {
      setIsCalibracionLoading(false);
    }
  }, []);

  // Load Utilización
  const loadUtilizacionData = useCallback(async (isManualRefresh = false) => {
    setIsUtilizacionLoading(true);
    try {
      const csv = await fetchCsvData('UTILIZACION', isManualRefresh);
      const parsed = parseUtilizacionCsv(csv);
      setUtilizacionRecords(parsed);
      setUtilizacionUpdated(formatNowDateTimeEs());
    } catch (err: any) {
      console.error('Error fetching utilizacion data:', err);
    } finally {
      setIsUtilizacionLoading(false);
    }
  }, []);

  // Load Disponibilidad
  const loadDisponibilidadData = useCallback(async (isManualRefresh = false) => {
    setIsDisponibilidadLoading(true);
    try {
      const csv = await fetchCsvData('DISPONIBILIDAD', isManualRefresh);
      const parsed = parseDisponibilidadCsv(csv);
      setDisponibilidadRecords(parsed);
      setDisponibilidadUpdated(formatNowDateTimeEs());
    } catch (err: any) {
      console.error('Error fetching disponibilidad data:', err);
    } finally {
      setIsDisponibilidadLoading(false);
    }
  }, []);

  // Load Vehículos
  const loadVehiculosData = useCallback(async (isManualRefresh = false) => {
    setIsVehiculosLoading(true);
    try {
      const csv = await fetchCsvData('VEHICULOS', isManualRefresh);
      const parsed = parseVehiculosCsv(csv);
      setVehiculosRecords(parsed);
      setVehiculosUpdated(formatNowDateTimeEs());
    } catch (err: any) {
      console.error('Error fetching vehiculos data:', err);
    } finally {
      setIsVehiculosLoading(false);
    }
  }, []);

  // Load Lavados
  const loadLavadosData = useCallback(async (isManualRefresh = false) => {
    setIsLavadosLoading(true);
    try {
      const csv = await fetchCsvData('LAVADOS', isManualRefresh);
      const parsed = parseLavadosCsv(csv);
      setLavadosRecords(parsed);
      setLavadosUpdated(formatNowDateTimeEs());
    } catch (err: any) {
      console.error('Error fetching lavados data:', err);
    } finally {
      setIsLavadosLoading(false);
    }
  }, []);

  // Trigger data load on module change
  useEffect(() => {
    if (!userSession) return;

    if (activeModule === 'check-list' && allRecords.length === 0) {
      loadCheckListData(false);
    } else if (activeModule === 'calibracion' && calibracionRecords.length === 0) {
      loadCalibracionData(false);
    } else if (activeModule === 'utilizacion' && utilizacionRecords.length === 0) {
      loadUtilizacionData(false);
    } else if (activeModule === 'disponibilidad' && disponibilidadRecords.length === 0) {
      loadDisponibilidadData(false);
    } else if (activeModule === 'vehiculos' && vehiculosRecords.length === 0) {
      loadVehiculosData(false);
    } else if (activeModule === 'lavados' && lavadosRecords.length === 0) {
      loadLavadosData(false);
    }
  }, [
    userSession,
    activeModule,
    allRecords.length,
    calibracionRecords.length,
    utilizacionRecords.length,
    disponibilidadRecords.length,
    vehiculosRecords.length,
    lavadosRecords.length,
    loadCheckListData,
    loadCalibracionData,
    loadUtilizacionData,
    loadDisponibilidadData,
    loadVehiculosData,
    loadLavadosData
  ]);

  // Initial load: load Check List, VEHICULOS (fleet base), CALIBRACION and LAVADOS for unified 360 coverage
  useEffect(() => {
    if (userSession) {
      loadCheckListData(false);
      loadVehiculosData(false);
      loadCalibracionData(false);
      loadLavadosData(false);
    }
  }, [userSession, loadCheckListData, loadVehiculosData, loadCalibracionData, loadLavadosData]);

  // Login & Logout handlers
  const handleLoginSuccess = (session: UserSession) => {
    setUserSession(session);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to persist session', e);
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  };

  // Fleet Master Coverage (Central Source of Truth for Fleet Operations)
  const fleetMasterSummary = useMemo(() => {
    return calculateFleetMasterCoverage(
      vehiculosRecords,
      calibracionRecords,
      lavadosRecords,
      allRecords
    );
  }, [vehiculosRecords, calibracionRecords, lavadosRecords, allRecords]);

  // Derived summaries
  const calibracionSummary = useMemo(() => {
    return calculateCalibracionSummary(calibracionRecords);
  }, [calibracionRecords]);

  const utilizacionSummary = useMemo(() => {
    return calculateUtilizacionSummary(utilizacionRecords);
  }, [utilizacionRecords]);

  const disponibilidadSummary = useMemo(() => {
    return calculateDisponibilidadSummary(disponibilidadRecords);
  }, [disponibilidadRecords]);

  const lavadosSummary = useMemo(() => {
    return calculateLavadosSummary(lavadosRecords);
  }, [lavadosRecords]);

  // Check List Analytics
  const { minDate, maxDate, contractorOptions, vehicleOptions, driverOptions } = useMemo(() => {
    if (allRecords.length === 0) {
      return {
        minDate: '',
        maxDate: '',
        contractorOptions: [],
        vehicleOptions: [],
        driverOptions: []
      };
    }

    let minD = '';
    let maxD = '';
    const contractorSet = new Set<string>();
    const vehicleSet = new Set<string>();
    const driverSet = new Set<string>();

    for (let i = 0; i < allRecords.length; i++) {
      const r = allRecords[i];
      if (r.dateIso) {
        if (!minD || r.dateIso < minD) minD = r.dateIso;
        if (!maxD || r.dateIso > maxD) maxD = r.dateIso;
      }
      if (r.contratista) contractorSet.add(r.contratista);
      if (r.vehicle) vehicleSet.add(r.vehicle);
      if (r.conductor && r.conductor !== 'SIN DATOS' && r.conductor !== '#N/A') {
        driverSet.add(r.conductor);
      }
    }

    return {
      minDate: minD,
      maxDate: maxD,
      contractorOptions: Array.from(contractorSet).sort(),
      vehicleOptions: Array.from(vehicleSet).sort(),
      driverOptions: Array.from(driverSet).sort()
    };
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    return applyFilters(allRecords, filters);
  }, [allRecords, filters]);

  const kpis = useMemo(() => {
    return calculateKpis(filteredRecords);
  }, [filteredRecords]);

  const trendData = useMemo(() => {
    return calculateTrendData(filteredRecords, filters.trendGrouping);
  }, [filteredRecords, filters.trendGrouping]);

  const contractorStats = useMemo(() => {
    return calculateContractorStats(filteredRecords);
  }, [filteredRecords]);

  const vehicleRankings = useMemo(() => {
    return calculateVehicleRankings(filteredRecords);
  }, [filteredRecords]);

  const driverRankings = useMemo(() => {
    return calculateDriverRankings(filteredRecords);
  }, [filteredRecords]);

  const automatedInsight = useMemo(() => {
    return generateAutomatedInsight(
      kpis,
      trendData,
      contractorStats,
      vehicleRankings,
      driverRankings
    );
  }, [kpis, trendData, contractorStats, vehicleRankings, driverRankings]);

  // Active module title mapping
  const moduleTitleMap: Record<string, string> = {
    'check-list': 'Check List',
    calibracion: 'Calibración',
    utilizacion: 'Utilización',
    disponibilidad: 'Disponibilidad',
    vehiculos: 'Vehículos',
    lavados: 'Lavados'
  };

  const activeModuleTitle = moduleTitleMap[activeModule] || 'Gestión de Flota';

  // Global Refresh Handler according to active module
  const handleGlobalRefresh = () => {
    if (activeModule === 'check-list') loadCheckListData(true);
    else if (activeModule === 'calibracion') loadCalibracionData(true);
    else if (activeModule === 'utilizacion') loadUtilizacionData(true);
    else if (activeModule === 'disponibilidad') loadDisponibilidadData(true);
    else if (activeModule === 'vehiculos') loadVehiculosData(true);
    else if (activeModule === 'lavados') loadLavadosData(true);
  };

  if (!userSession) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* 1. Executive Top Header */}
      <Header
        userSession={userSession}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing || isCalibracionLoading || isUtilizacionLoading || isDisponibilidadLoading || isVehiculosLoading || isLavadosLoading}
        onRefreshData={handleGlobalRefresh}
        onLogout={handleLogout}
        activeModuleTitle={activeModuleTitle}
      />

      {/* 2. Main Body Container with Sidebar and Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Modular Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(id) => setActiveModule(id)}
        />

        {/* Dynamic Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" id="dashboard-main-content">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* MODULE 1: CHECK LIST */}
            {activeModule === 'check-list' && (
              <>
                {/* Title & Sub-tabs Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                      <span>CONTROL DE CHECK LIST DE FLOTA</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitoreo ejecutivo de cumplimiento de inspecciones de salida y retorno para AON Galapa
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto max-w-full">
                    <button
                      id="tab-dashboard-btn"
                      onClick={() => setActiveTab('dashboard')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'dashboard'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard Ejecutivo</span>
                    </button>

                    <button
                      id="tab-salida-btn"
                      onClick={() => setActiveTab('salida')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'salida'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Seguimiento Salida</span>
                    </button>

                    <button
                      id="tab-retorno-btn"
                      onClick={() => setActiveTab('retorno')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'retorno'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Seguimiento Retorno</span>
                    </button>

                    <button
                      id="tab-alertas-btn"
                      onClick={() => setActiveTab('alertas')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'alertas'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Alertas y Excepciones</span>
                    </button>

                    <button
                      id="tab-database-btn"
                      onClick={() => setActiveTab('database')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeTab === 'database'
                          ? 'bg-slate-700 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Base de Datos</span>
                    </button>
                  </div>
                </div>

                {/* Error banner */}
                {fetchError && (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-300">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">Error de Sincronización</strong>
                        <span>{fetchError}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => loadCheckListData(true)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shrink-0"
                    >
                      Reintentar
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                  <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                    <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">Cargando base de datos de Check List...</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Conectando en tiempo real con Google Sheets...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <FilterBar
                      filters={filters}
                      onFilterChange={(newFilters) => setFilters(newFilters)}
                      contractorOptions={contractorOptions}
                      vehicleOptions={vehicleOptions}
                      driverOptions={driverOptions}
                      minDate={minDate}
                      maxDate={maxDate}
                      totalFilteredRecords={filteredRecords.length}
                      totalAllRecords={allRecords.length}
                    />

                    <Suspense
                      fallback={
                        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 animate-pulse">
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-xs text-slate-400 font-medium">Cargando vista...</p>
                        </div>
                      }
                    >
                      {activeTab === 'dashboard' && (
                        <ExecutiveDashboardView
                          kpis={kpis}
                          trendData={trendData}
                          contractorStats={contractorStats}
                          vehicleRankings={vehicleRankings}
                          driverRankings={driverRankings}
                          currentGrouping={filters.trendGrouping}
                          onGroupingChange={(grp) =>
                            setFilters((prev) => ({ ...prev, trendGrouping: grp }))
                          }
                          fleetSummary={fleetMasterSummary}
                          onNavigateToView={(view) => setActiveModule(view)}
                        />
                      )}

                      {activeTab === 'salida' && (
                        <SalidaTrackingView records={filteredRecords} kpis={kpis} />
                      )}

                      {activeTab === 'retorno' && (
                        <RetornoTrackingView records={filteredRecords} kpis={kpis} />
                      )}

                      {activeTab === 'alertas' && (
                        <AlertsExceptionsView records={filteredRecords} kpis={kpis} />
                      )}

                      {activeTab === 'database' && (
                        <RawDatabaseView
                          records={filteredRecords}
                          totalRecordsCount={allRecords.length}
                        />
                      )}
                    </Suspense>
                  </>
                )}
              </>
            )}

            {/* MODULE 2: CALIBRACIÓN */}
            {activeModule === 'calibracion' && (
              <Suspense
                fallback={
                  <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Cargando módulo de Calibración...</p>
                  </div>
                }
              >
                <CalibracionView
                  records={calibracionRecords}
                  summary={calibracionSummary}
                  fleetRecords={vehiculosRecords}
                  fleetCoverage={fleetMasterSummary.calibracionCoverage}
                  unmatchedInfo={fleetMasterSummary.unmatchedCalibracion}
                  isLoading={isCalibracionLoading}
                  onRefresh={() => loadCalibracionData(true)}
                  lastUpdated={calibracionUpdated}
                />
              </Suspense>
            )}

            {/* MODULE 3: UTILIZACIÓN */}
            {activeModule === 'utilizacion' && (
              <Suspense
                fallback={
                  <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Cargando módulo de Utilización...</p>
                  </div>
                }
              >
                <UtilizacionView
                  records={utilizacionRecords}
                  summary={utilizacionSummary}
                  isLoading={isUtilizacionLoading}
                  onRefresh={() => loadUtilizacionData(true)}
                  lastUpdated={utilizacionUpdated}
                />
              </Suspense>
            )}

            {/* MODULE 4: DISPONIBILIDAD */}
            {activeModule === 'disponibilidad' && (
              <Suspense
                fallback={
                  <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Cargando módulo de Disponibilidad...</p>
                  </div>
                }
              >
                <DisponibilidadView
                  records={disponibilidadRecords}
                  summary={disponibilidadSummary}
                  isLoading={isDisponibilidadLoading}
                  onRefresh={() => loadDisponibilidadData(true)}
                  lastUpdated={disponibilidadUpdated}
                />
              </Suspense>
            )}

            {/* MODULE 5: VEHÍCULOS */}
            {activeModule === 'vehiculos' && (
              <Suspense
                fallback={
                  <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Cargando catálogo maestro de Vehículos...</p>
                  </div>
                }
              >
                <VehiculosView
                  records={vehiculosRecords}
                  fleetSummary={fleetMasterSummary}
                  isLoading={isVehiculosLoading}
                  onRefresh={() => loadVehiculosData(true)}
                  lastUpdated={vehiculosUpdated}
                />
              </Suspense>
            )}

            {/* MODULE 6: LAVADOS */}
            {activeModule === 'lavados' && (
              <Suspense
                fallback={
                  <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Cargando módulo de Lavados...</p>
                  </div>
                }
              >
                <LavadosView
                  records={lavadosRecords}
                  summary={lavadosSummary}
                  fleetRecords={vehiculosRecords}
                  fleetCoverage={fleetMasterSummary.lavadosCoverage}
                  unmatchedInfo={fleetMasterSummary.unmatchedLavados}
                  isLoading={isLavadosLoading}
                  onRefresh={() => loadLavadosData(true)}
                  lastUpdated={lavadosUpdated}
                />
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

