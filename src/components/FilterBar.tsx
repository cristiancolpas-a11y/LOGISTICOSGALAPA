import React from 'react';
import {
  Filter,
  RotateCcw,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  contractorOptions: string[];
  vehicleOptions: string[];
  driverOptions: string[];
  minDate: string;
  maxDate: string;
  totalFilteredRecords: number;
  totalAllRecords: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  contractorOptions,
  vehicleOptions,
  driverOptions,
  minDate,
  maxDate,
  totalFilteredRecords,
  totalAllRecords
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [localSearch, setLocalSearch] = React.useState(filters.searchQuery);
  const filtersRef = React.useRef(filters);
  const onFilterChangeRef = React.useRef(onFilterChange);

  React.useEffect(() => {
    filtersRef.current = filters;
    onFilterChangeRef.current = onFilterChange;
  });

  // Sync when external reset or filter change modifies searchQuery
  React.useEffect(() => {
    setLocalSearch(filters.searchQuery);
  }, [filters.searchQuery]);

  // Debounce search by 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filtersRef.current.searchQuery) {
        onFilterChangeRef.current({
          ...filtersRef.current,
          searchQuery: localSearch
        });
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [localSearch]);

  const handlePresetDate = (preset: FilterState['presetRange']) => {
    let start = '';
    let end = maxDate || new Date().toISOString().split('T')[0];

    if (preset === 'all') {
      start = minDate;
      end = maxDate;
    } else if (preset === 'today') {
      start = maxDate;
      end = maxDate;
    } else if (preset === 'last7') {
      const maxD = maxDate ? new Date(maxDate) : new Date();
      const past = new Date(maxD.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = past.toISOString().split('T')[0];
    } else if (preset === 'last30') {
      const maxD = maxDate ? new Date(maxDate) : new Date();
      const past = new Date(maxD.getTime() - 30 * 24 * 60 * 60 * 1000);
      start = past.toISOString().split('T')[0];
    } else if (preset === 'thisMonth') {
      if (maxDate) {
        const [y, m] = maxDate.split('-');
        start = `${y}-${m}-01`;
        end = maxDate;
      }
    }

    onFilterChange({
      ...filters,
      presetRange: preset,
      startDate: start,
      endDate: end
    });
  };

  const handleReset = () => {
    onFilterChange({
      startDate: minDate,
      endDate: maxDate,
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
  };

  const isFiltered =
    filters.presetRange !== 'all' ||
    filters.contractor !== 'all' ||
    filters.vehicle !== 'all' ||
    filters.driver !== 'all' ||
    filters.estado !== 'all' ||
    filters.salidaFilter !== 'all' ||
    filters.retornoFilter !== 'all' ||
    filters.severityFilter !== 'all' ||
    filters.searchQuery !== '';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl mb-6" id="filter-bar-container">
      {/* Header of filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Filtros Operativos</span>
            <span className="text-[11px] text-slate-400 ml-2">
              Mostrando <strong className="text-blue-400">{totalFilteredRecords.toLocaleString()}</strong> de{' '}
              <strong className="text-slate-300">{totalAllRecords.toLocaleString()}</strong> inspecciones
            </span>
          </div>
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handlePresetDate('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filters.presetRange === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Histórico Completo
          </button>
          <button
            onClick={() => handlePresetDate('last30')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filters.presetRange === 'last30'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Últimos 30 Días
          </button>
          <button
            onClick={() => handlePresetDate('last7')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filters.presetRange === 'last7'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Últimos 7 Días
          </button>
          <button
            onClick={() => handlePresetDate('thisMonth')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filters.presetRange === 'thisMonth'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Mes Actual
          </button>

          {isFiltered && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors ml-1"
              id="reset-filters-btn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            title="Expandir/Contraer Filtros"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable filter controls */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Fecha Inicial
            </label>
            <div className="relative">
              <input
                type="date"
                value={filters.startDate}
                min={minDate}
                max={maxDate}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    startDate: e.target.value,
                    presetRange: 'custom'
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Fecha Final
            </label>
            <div className="relative">
              <input
                type="date"
                value={filters.endDate}
                min={minDate}
                max={maxDate}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    endDate: e.target.value,
                    presetRange: 'custom'
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Contractor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Contratista
            </label>
            <select
              value={filters.contractor}
              onChange={(e) => onFilterChange({ ...filters, contractor: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los contratistas</option>
              {contractorOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Plate */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Vehículo / Placa
            </label>
            <select
              value={filters.vehicle}
              onChange={(e) => onFilterChange({ ...filters, vehicle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los vehículos ({vehicleOptions.length})</option>
              {vehicleOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Driver */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Conductor
            </label>
            <select
              value={filters.driver}
              onChange={(e) => onFilterChange({ ...filters, driver: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los conductores ({driverOptions.length})</option>
              {driverOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Estado / Cumplimiento */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Estado Check List
            </label>
            <select
              value={filters.estado}
              onChange={(e) => onFilterChange({ ...filters, estado: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="CUMPLIO">🟢 CUMPLIO (Salida + Retorno)</option>
              <option value="LE FALTO">🟠 LE FALTO (Salida o Retorno)</option>
              <option value="0">🔴 0 (Ninguno realizado)</option>
            </select>
          </div>

          {/* Salida Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Check List Salida
            </label>
            <select
              value={filters.salidaFilter}
              onChange={(e) => onFilterChange({ ...filters, salidaFilter: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas las salidas</option>
              <option value="1">Salida Realizada (1)</option>
              <option value="0">Salida Pendiente (0)</option>
            </select>
          </div>

          {/* Retorno Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Check List Retorno
            </label>
            <select
              value={filters.retornoFilter}
              onChange={(e) => onFilterChange({ ...filters, retornoFilter: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los retornos</option>
              <option value="1">Retorno Realizado (1)</option>
              <option value="0">Retorno Pendiente (0)</option>
            </select>
          </div>

          {/* Severity Classification */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Nivel de Severidad
            </label>
            <select
              value={filters.severityFilter}
              onChange={(e) => onFilterChange({ ...filters, severityFilter: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas las severidades</option>
              <option value="CRITICO">🔴 CRÍTICO (0/2)</option>
              <option value="ALTO">🟠 ALTO (1/2)</option>
              <option value="CUMPLIDO">🟢 CUMPLIDO (2/2)</option>
            </select>
          </div>

          {/* Trend Grouping */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Agrupación de Tendencia
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, trendGrouping: 'day' })}
                className={`py-1 text-center rounded-lg font-medium transition-all ${
                  filters.trendGrouping === 'day' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Día
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, trendGrouping: 'week' })}
                className={`py-1 text-center rounded-lg font-medium transition-all ${
                  filters.trendGrouping === 'week' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, trendGrouping: 'month' })}
                className={`py-1 text-center rounded-lg font-medium transition-all ${
                  filters.trendGrouping === 'month' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mes
              </button>
            </div>
          </div>

          {/* Instant Search Bar (2 cols) */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Búsqueda Rápida (Placa, Conductor, Fecha)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar por placa ej. COJTX917, conductor..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
