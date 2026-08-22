import React, { useState } from 'react';
import {
  RefreshCw,
  Truck,
  ShieldCheck,
  ChevronRight,
  LogOut,
  User,
  Database,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  userSession: UserSession;
  lastUpdated: string;
  isRefreshing: boolean;
  onRefreshData: () => void;
  onLogout: () => void;
  activeModuleTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  userSession,
  lastUpdated,
  isRefreshing,
  onRefreshData,
  onLogout,
  activeModuleTitle = 'Check List'
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white" id="main-app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left section: Brand & Breadcrumb */}
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-white/10">
                <Truck className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold tracking-tight text-white block leading-tight">
                  AON GALAPA
                </span>
                <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase block">
                  Gestión de Flota
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 border-l border-slate-800 pl-4">
              <span className="hover:text-slate-200 cursor-pointer">AON Galapa</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="hover:text-slate-200 cursor-pointer">Flota</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                {activeModuleTitle}
              </span>
            </div>
          </div>

          {/* Right section: Sync indicator, Refresh button & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Google Sheets Connection Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Sheets en Vivo</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Last updated timestamp */}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Última actualización</p>
              <p className="text-xs font-semibold text-slate-200">{lastUpdated || 'Cargando...'}</p>
            </div>

            {/* Refresh Button */}
            <button
              id="refresh-data-btn"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                isRefreshing
                  ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/30 shadow-md shadow-blue-600/20 active:scale-95'
              }`}
              title="Actualizar datos desde Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">ACTUALIZAR DATOS</span>
              <span className="sm:hidden">↻</span>
            </button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                  {userSession.name.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-white leading-none">{userSession.name}</p>
                  <p className="text-[10px] text-blue-400 font-semibold leading-none mt-1">
                    {userSession.role}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  id="profile-dropdown-menu"
                >
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white">{userSession.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{userSession.email}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      {userSession.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowPermModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Ver Permisos y Rol</span>
                    </button>
                    <a
                      href="https://docs.google.com/spreadsheets/d/18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk/edit?gid=0#gid=0"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Abrir Google Sheet Origen</span>
                    </a>
                  </div>

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      id="logout-btn"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permisos de Usuario</h3>
                <p className="text-xs text-slate-400">{userSession.email}</p>
              </div>
            </div>

            <div className="space-y-2.5 my-4">
              {userSession.permissions.map((perm, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/70 px-3 py-2 rounded-lg border border-slate-700/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="capitalize">{perm.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPermModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
