import React, { useState } from 'react';
import {
  ClipboardCheck,
  Wrench,
  Gauge,
  CircleDot,
  FileText,
  Fuel,
  Activity,
  BarChart3,
  ChevronDown,
  Sparkles,
  Info
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule
}) => {
  const [flotaExpanded, setFlotaExpanded] = useState(true);
  const [showRoadmapModal, setShowRoadmapModal] = useState<string | null>(null);

  const fleetModules = [
    {
      id: 'check-list',
      name: 'Check List',
      icon: ClipboardCheck,
      badge: 'Operativo',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      active: true,
      description: 'Control y auditoría de inspecciones de salida y retorno'
    },
    {
      id: 'mantenimiento',
      name: 'Mantenimiento',
      icon: Wrench,
      badge: 'Próximamente',
      badgeColor: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
      active: false,
      description: 'Programación preventiva, correctiva y órdenes de taller'
    },
    {
      id: 'disponibilidad',
      name: 'Disponibilidad',
      icon: Gauge,
      badge: 'Próximamente',
      badgeColor: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
      active: false,
      description: 'Índice de disponibilidad mecánica y flota inoperativa'
    },
    {
      id: 'llantas',
      name: 'Llantas',
      icon: CircleDot,
      badge: 'Próximamente',
      badgeColor: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
      active: false,
      description: 'Seguimiento de profundidad de labrado, rotaciones y desgaste'
    },
    {
      id: 'documentacion',
      name: 'Documentación',
      icon: FileText,
      badge: 'Próximamente',
      badgeColor: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
      active: false,
      description: 'SOAT, RTM, pólizas y vencimientos regulatorios'
    },
    {
      id: 'combustible',
      name: 'Combustible',
      icon: Fuel,
      badge: 'Próximamente',
      badgeColor: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
      active: false,
      description: 'Rendimiento km/galón, cargas y anomalías de tanqueo'
    },
    {
      id: 'kilometraje',
      name: 'Kilometraje',
      icon: Activity,
      badge: 'Próximamente',
      badgeColor: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
      active: false,
      description: 'Odómetros, recorridos diarios y estimación de desgaste'
    },
    {
      id: 'indicadores',
      name: 'Indicadores',
      icon: BarChart3,
      badge: 'Próximamente',
      badgeColor: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
      active: false,
      description: 'Scorecards gerenciales consolidados de flota'
    }
  ];

  return (
    <>
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]" id="app-sidebar">
        {/* Navigation title */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Estructura Operativa</span>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
              v1.0
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto" id="sidebar-nav-modules">
          {/* Main Parent: FLOTA */}
          <div>
            <button
              onClick={() => setFlotaExpanded(!flotaExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              id="sidebar-flota-category-btn"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>FLOTA</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                  flotaExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {flotaExpanded && (
              <div className="mt-1 space-y-1 pl-2">
                {fleetModules.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeModule === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`sidebar-module-${item.id}`}
                      onClick={() => {
                        if (item.active) {
                          onSelectModule(item.id);
                        } else {
                          setShowRoadmapModal(item.name);
                        }
                      }}
                      className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                          : item.active
                          ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-white' : item.active ? 'text-blue-400' : 'text-slate-500'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modular Architecture Banner */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diseño Modular</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Plataforma escalable lista para conectar mantenimiento, combustible, llantas e indicadores.
              </p>
            </div>
          </div>
        </nav>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          <span>AON GALAPA Flota v1.0</span>
        </div>
      </aside>

      {/* Module Roadmap modal for placeholder items */}
      {showRoadmapModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Módulo: {showRoadmapModal}</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Este módulo se encuentra preparado en la arquitectura modular de AON GALAPA y se activará en la siguiente fase de integración de flota.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-800 text-[11px] text-blue-300 mb-4 border border-slate-700">
              Actualmente está activo y operativo el módulo <strong>Check List</strong> con sincronización en vivo.
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowRoadmapModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
