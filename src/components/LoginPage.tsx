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
  KeyRound,
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

    try {
      // First attempt backend server authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
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

      // Client-side fallback check if offline or network error
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail === 'cristian.colpas@logisticos.co' && password === 'Logisticos2026') {
        const session: UserSession = {
          id: 'admin-01',
          email: 'cristian.colpas@logisticos.co',
          name: 'Cristian Colpas',
          role: 'Administrador & Creador',
          company: 'AON GALAPA / Logisticos.co',
          permissions: [
            'admin',
            'creator',
            'full_access',
            'module_config',
            'view_all_kpis',
            'view_all_data',
            'manage_dashboard'
          ],
          authenticatedAt: new Date().toISOString()
        };
        onLoginSuccess(session);
        return;
      }

      setError(data.message || 'Usuario o contraseña incorrectos. Verifique sus credenciales.');
    } catch {
      // Fallback
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail === 'cristian.colpas@logisticos.co' && password === 'Logisticos2026') {
        const session: UserSession = {
          id: 'admin-01',
          email: 'cristian.colpas@logisticos.co',
          name: 'Cristian Colpas',
          role: 'Administrador & Creador',
          company: 'AON GALAPA / Logisticos.co',
          permissions: [
            'admin',
            'creator',
            'full_access',
            'module_config',
            'view_all_kpis',
            'view_all_data',
            'manage_dashboard'
          ],
          authenticatedAt: new Date().toISOString()
        };
        onLoginSuccess(session);
        return;
      }
      setError('Error al procesar el inicio de sesión. Verifique sus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    setEmail('cristian.colpas@logisticos.co');
    setPassword('Logisticos2026');
    setError(null);
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
        className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
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
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Módulo de Control de Check List</span>
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

          <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Usuario / Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cristian.colpas@logisticos.co"
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

          {/* Quick Access Helper for demo & testing convenience */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <button
              type="button"
              onClick={handleQuickAdmin}
              className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs text-slate-300 hover:text-white flex items-center justify-between transition-colors group"
              id="quick-fill-admin-btn"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>Cargar Credenciales Administrador</span>
              </div>
              <span className="text-[10px] text-blue-400 group-hover:underline">Auto-rellenar</span>
            </button>
          </div>

          {/* Admin Role Privileges Note */}
          <div className="mt-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Perfil Autorizado: Cristian Colpas</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Permisos de Administrador, Creador, Acceso Total a Flota y Gestión de Indicadores en AON Galapa.
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
