import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { ExecutiveSummaryCard } from './components/ExecutiveSummaryCard';
import { SalidaVsRetornoChart } from './components/charts/SalidaVsRetornoChart';
import { TrendChart } from './components/charts/TrendChart';
import { ContractorChart } from './components/charts/ContractorChart';
import { VehicleRankingTable } from './components/tables/VehicleRankingTable';
import { DriverRankingTable } from './components/tables/DriverRankingTable';
import { SalidaTrackingView } from './components/views/SalidaTrackingView';
import { RetornoTrackingView } from './components/views/RetornoTrackingView';
import { AlertsExceptionsView } from './components/views/AlertsExceptionsView';
import { RawDatabaseView } from './components/views/RawDatabaseView';
import {
  NormalizedCheckListRecord,
  FilterState,
  UserSession
} from './types';
import {
  parseCheckListCsv,
  applyFilters,
  calculateKpis,
  calculateTrendData,
  calculateContractorStats,
  calculateVehicleRankings,
  calculateDriverRankings,
  generateAutomatedInsight
} from './utils/dataProcessor';
import { formatNowDateTimeEs } from './utils/dateUtils';
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const SESSION_STORAGE_KEY = 'aon_galapa_session_v1';
const DIRECT_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk/gviz/tq?tqx=out:csv&sheet=Check%20list`;

export default function App() {
  // 1. Authentication State (Strict Session-Only: Not remembered across browser restart)
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      // Clear any legacy localStorage to ensure strict security
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

  // 3. Raw and Normalized Data State
  const [allRecords, setAllRecords] = useState<NormalizedCheckListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 4. Global Filter State
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

  // Date Extents from raw data
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

    const sortedDates = [...allRecords]
      .map((r) => r.dateIso)
      .filter(Boolean)
      .sort();
    const minD = sortedDates[0] || '';
    const maxD = sortedDates[sortedDates.length - 1] || '';

    const contractors = Array.from(
      new Set(allRecords.map((r) => r.contratista).filter(Boolean))
    ).sort();
    const vehicles = Array.from(
      new Set(allRecords.map((r) => r.vehicle).filter(Boolean))
    ).sort();
    const drivers = Array.from(
      new Set(
        allRecords
          .map((r) => r.conductor)
          .filter((c) => c && c !== 'SIN DATOS' && c !== '#N/A')
      )
    ).sort();

    return {
      minDate: minD,
      maxDate: maxD,
      contractorOptions: contractors,
      vehicleOptions: vehicles,
      driverOptions: drivers
    };
  }, [allRecords]);

  // Function to load data from backend proxy or direct Google Sheets
  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      let csvContent = '';
      let serverFetched = false;

      // Try backend proxy first
      try {
        const res = await fetch(`/api/check-list-data${isManualRefresh ? '?refresh=true' : ''}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.csv) {
            csvContent = json.csv;
            serverFetched = true;
          }
        }
      } catch (err) {
        console.warn('Backend proxy fetch failed, attempting direct fetch...', err);
      }

      // Fallback: direct Google Sheets endpoint
      if (!serverFetched || !csvContent) {
        const directRes = await fetch(DIRECT_SHEET_CSV_URL);
        if (!directRes.ok) {
          throw new Error(`HTTP Error ${directRes.status}: No se pudo conectar a Google Sheets`);
        }
        csvContent = await directRes.text();
      }

      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('La hoja de cálculo retornó un archivo vacío.');
      }

      const parsed = parseCheckListCsv(csvContent);
      setAllRecords(parsed);
      setLastUpdated(formatNowDateTimeEs());
    } catch (err: any) {
      console.error('Error fetching sheet data:', err);
      setFetchError(
        err?.message ||
          'Error al cargar la información desde Google Sheets. Verifique la conexión a internet.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (userSession) {
      loadData(false);
    }
  }, [userSession, loadData]);

  // Login handler
  const handleLoginSuccess = (session: UserSession) => {
    setUserSession(session);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to persist session', e);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setUserSession(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  };

  // Filtered records based on active filters
  const filteredRecords = useMemo(() => {
    return applyFilters(allRecords, filters);
  }, [allRecords, filters]);

  // Computed KPIs and analytics for the filtered subset
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

  // If user is not authenticated, display executive login screen
  if (!userSession) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* 1. Executive Top Header */}
      <Header
        userSession={userSession}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefreshData={() => loadData(true)}
        onLogout={handleLogout}
        activeModuleTitle="Check List"
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
            {/* Title & Tab Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <span>CONTROL DE CHECK LIST DE FLOTA</span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitoreo ejecutivo de cumplimiento de inspecciones de salida y retorno para AON Galapa
                </p>
              </div>

              {/* Sub-tabs within Check List Module */}
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

            {/* Error banner if fetching failed */}
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
                  onClick={() => loadData(true)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shrink-0"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div>
                  <p className="text-sm font-bold text-white">Cargando base de datos de Check List...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Conectando en tiempo real con Google Sheets (hoja "Check list")...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Global Filter Bar (Affects all views) */}
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

                {/* VIEW 1: EXECUTIVE DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Top 5 KPIs */}
                    <KpiCards kpis={kpis} />

                    {/* AI / BI Automated Intelligence Narrative */}
                    <ExecutiveSummaryCard insights={automatedInsight} />

                    {/* Chart Row 1: Salida vs Retorno & Trend Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-5">
                        <SalidaVsRetornoChart kpis={kpis} />
                      </div>
                      <div className="lg:col-span-7">
                        <TrendChart
                          trendData={trendData}
                          currentGrouping={filters.trendGrouping}
                          onGroupingChange={(grp) =>
                            setFilters((prev) => ({ ...prev, trendGrouping: grp }))
                          }
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
                )}

                {/* VIEW 2: SALIDA TRACKING */}
                {activeTab === 'salida' && (
                  <div className="animate-in fade-in duration-200">
                    <SalidaTrackingView records={filteredRecords} kpis={kpis} />
                  </div>
                )}

                {/* VIEW 3: RETORNO TRACKING */}
                {activeTab === 'retorno' && (
                  <div className="animate-in fade-in duration-200">
                    <RetornoTrackingView records={filteredRecords} kpis={kpis} />
                  </div>
                )}

                {/* VIEW 4: ALERTS AND EXCEPTIONS */}
                {activeTab === 'alertas' && (
                  <div className="animate-in fade-in duration-200">
                    <AlertsExceptionsView records={filteredRecords} kpis={kpis} />
                  </div>
                )}

                {/* VIEW 5: RAW GOOGLE SHEETS DATABASE */}
                {activeTab === 'database' && (
                  <div className="animate-in fade-in duration-200">
                    <RawDatabaseView
                      records={filteredRecords}
                      totalRecordsCount={allRecords.length}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
