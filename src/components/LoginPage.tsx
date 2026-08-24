import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Truck,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserSession } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // First attempt backend server authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const session: UserSession = {
          ...data.user,
          authenticatedAt: new Date().toISOString()
        };
        onLoginSuccess(session);
        return;
      }

      // Client-side fallback check
      if (checkClientCredentials(cleanEmail, cleanPassword)) {
        return;
      }

      setError(data.message || 'Usuario o contraseña incorrectos. Verifique sus credenciales.');
    } catch {
      // Fallback in case backend is unreachable
      if (checkClientCredentials(cleanEmail, cleanPassword)) {
        return;
      }
      setError('Error al procesar el inicio de sesión. Verifique sus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkClientCredentials = (cleanEmail: string, cleanPassword: string): boolean => {
    // 1. Administrador General
    if (
      cleanEmail === 'administraciongalapa@logisticos.co' &&
      (cleanPassword === 'Superman10.' || cleanPassword === 'Superman10')
    ) {
      const session: UserSession = {
        id: 'admin-galapa',
        email: 'administraciongalapa@logisticos.co',
        name: 'Administración AON Galapa',
        role: 'Administrador General',
        company: 'AON GALAPA / Logisticos.co',
        permissions: [
          'admin',
          'creator',
          'full_access',
          'module_config',
          'view_all_kpis',
          'view_all_data',
          'manage_dashboard',
          'manage_users',
          'export_reports',
          'system_settings'
        ],
        authenticatedAt: new Date().toISOString()
      };
      onLoginSuccess(session);
      return true;
    }

    // 2. Control de Flota - Cristian Colpas
    if (
      cleanEmail === 'cristian.colpas@logisticos.co' &&
      (cleanPassword === 'Superman10.' || cleanPassword === 'Logisticos2026' || cleanPassword === 'Flota2026.' || cleanPassword === 'Flota2026')
    ) {
      const session: UserSession = {
        id: 'flota-01',
        email: 'cristian.colpas@logisticos.co',
        name: 'Cristian Colpas',
        role: 'Control Operativo de Flota',
        company: 'AON GALAPA / Logisticos.co',
        permissions: [
          'fleet_control',
          'view_all_kpis',
          'view_all_data',
          'view_salida',
          'view_retorno',
          'view_alerts',
          'export_reports'
        ],
        authenticatedAt: new Date().toISOString()
      };
      onLoginSuccess(session);
      return true;
    }

    // 3. Control de Flota - Leonardo Rodríguez
    if (
      cleanEmail === 'leonardo.rodriguez@logisticos.co' &&
      (cleanPassword === 'Superman10.' || cleanPassword === 'Logisticos2026' || cleanPassword === 'Flota2026.' || cleanPassword === 'Flota2026')
    ) {
      const session: UserSession = {
        id: 'flota-02',
        email: 'leonardo.rodriguez@logisticos.co',
        name: 'Leonardo Rodríguez',
        role: 'Control Operativo de Flota',
        company: 'AON GALAPA / Logisticos.co',
        permissions: [
          'fleet_control',
          'view_all_kpis',
          'view_all_data',
          'view_salida',
          'view_retorno',
          'view_alerts',
          'export_reports'
        ],
        authenticatedAt: new Date().toISOString()
      };
      onLoginSuccess(session);
      return true;
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        id="login-card-container"
      >
        {/* Card Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-800/40 to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 mb-4 ring-4 ring-blue-500/10">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            AON GALAPA
          </h1>
          <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase mt-1">
            Plataforma Integral de Control Operativo y Flota
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Seguro Restringido</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs"
              id="login-error-alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Acceso denegado</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="login-form" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Usuario / Correo Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre.apellido@logisticos.co"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  id="toggle-password-visibility-btn"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
              id="login-submit-button"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Por políticas de seguridad y confidencialidad, las credenciales no son almacenadas automáticamente. Ingrese su correo corporativo y contraseña autorizada.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer copyright */}
      <div className="mt-6 text-center text-xs text-slate-500 flex items-center gap-2">
        <span>© {new Date().getFullYear()} AON GALAPA</span>
        <span>•</span>
        <span>Logisticos.co</span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Seguridad Operativa
        </span>
      </div>
    </div>
  );
};

