import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Truck,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ChevronDown,
  ChevronUp,
  UserCheck
} from 'lucide-react';
import { UserSession } from '../types';
import { safeFetchJson } from '../utils/apiClient';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

interface FallbackUser {
  email: string;
  name: string;
  role: string;
  company: string;
  permissions: string[];
  passwords: string[];
}

const AUTHORIZED_USERS_LIST: FallbackUser[] = [
  {
    email: 'cristian.colpas@logisticos.co',
    name: 'Cristian Colpas',
    role: 'Control Operativo de Flota',
    company: 'AON GALAPA / Logisticos.co',
    permissions: ['fleet_control', 'view_all_kpis', 'view_all_data', 'view_salida', 'view_retorno', 'view_alerts', 'export_reports'],
    passwords: ['12345678', '12345678...', 'Batman1506.', '1506', 'Galapa2026*']
  },
  {
    email: 'leonardo.rodriguez@logisticos.co',
    name: 'Leonardo Rodríguez',
    role: 'Control Operativo de Flota',
    company: 'AON GALAPA / Logisticos.co',
    permissions: ['fleet_control', 'view_all_kpis', 'view_all_data', 'view_salida', 'view_retorno', 'view_alerts', 'export_reports'],
    passwords: ['12345678', '12345678...', '1718', '1506', 'Galapa2026*']
  },
  {
    email: 'administraciongalapa@logisticos.co',
    name: 'Administración AON Galapa',
    role: 'Administrador General',
    company: 'AON GALAPA / Logisticos.co',
    permissions: ['admin', 'creator', 'full_access', 'module_config', 'view_all_kpis', 'view_all_data', 'manage_dashboard', 'manage_users', 'export_reports', 'system_settings'],
    passwords: ['12345678', '12345678...', 'superman10.', '1506', 'Galapa2026*']
  }
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentialsPanel, setShowCredentialsPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const authenticateLocally = (cleanEmail: string, cleanPassword: string): boolean => {
    const matched = AUTHORIZED_USERS_LIST.find((u) => {
      const userEmail = u.email.toLowerCase();
      const userPrefix = userEmail.split('@')[0];
      const isEmailOrUserMatch =
        userEmail === cleanEmail ||
        userPrefix === cleanEmail ||
        (cleanEmail.includes('cristian') && userEmail.includes('cristian')) ||
        (cleanEmail.includes('colpas') && userEmail.includes('cristian')) ||
        (cleanEmail.includes('leonardo') && userEmail.includes('leonardo')) ||
        (cleanEmail.includes('rodriguez') && userEmail.includes('leonardo')) ||
        ((cleanEmail.includes('admin') || cleanEmail.includes('galapa')) && userEmail.includes('administracion'));

      const isPasswordMatch =
        u.passwords.includes(cleanPassword) ||
        cleanPassword === '12345678' ||
        cleanPassword === '12345678...' ||
        cleanPassword === '1506' ||
        cleanPassword === 'Galapa2026*' ||
        cleanPassword === 'Batman1506.' ||
        cleanPassword === 'superman10.' ||
        cleanPassword === '1718';

      return isEmailOrUserMatch && isPasswordMatch;
    });

    if (matched) {
      const session: UserSession = {
        id: matched.email,
        email: matched.email,
        name: matched.name,
        role: matched.role,
        company: matched.company,
        permissions: matched.permissions,
        authenticatedAt: new Date().toISOString()
      };
      onLoginSuccess(session);
      return true;
    }
    return false;
  };

  const executeLogin = async (targetEmail: string, targetPassword: string) => {
    setError(null);
    setIsLoading(true);

    const cleanEmail = targetEmail.trim().toLowerCase();
    const cleanPassword = targetPassword.trim();

    try {
      // 1. Intentar autenticación con el servidor backend
      const response = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      if (response.ok) {
        const data = response.data;
        if (data.success && data.user) {
          const session: UserSession = {
            ...data.user,
            authenticatedAt: new Date().toISOString()
          };
          onLoginSuccess(session);
          return;
        }
      }

      // Si el servidor rechazó con 401, verificar si cumple con el fallback local
      const successLocal = authenticateLocally(cleanEmail, cleanPassword);
      if (successLocal) return;

      const data = response.data || {};
      setError(data.message || 'Usuario o contraseña incorrectos. Clave activa: 12345678');
    } catch {
      // 2. Fallback resiliente sin conexión / servidor reiniciando
      const successLocal = authenticateLocally(cleanEmail, cleanPassword);
      if (successLocal) return;

      setError('Credenciales incorrectas. Verifique su usuario y contraseña (clave autorizada: 12345678).');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  const handleQuickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    executeLogin(userEmail, userPassword);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div
        className="w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 transition-all duration-500 ease-out"
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
            <div
              className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs transition-all duration-300"
              id="login-error-alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Acceso denegado</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Banner de acceso directo de 1 clic */}
          <div className="mb-5 p-3 rounded-xl bg-blue-950/40 border border-blue-800/50">
            <p className="text-[11px] font-semibold text-blue-300 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              Ingreso directo con 1 clic (Clave: 12345678):
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('cristian.colpas@logisticos.co', '12345678')}
                className="text-[11px] py-2 px-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-slate-200 border border-slate-700 hover:border-blue-500/50 text-center font-medium transition-all cursor-pointer"
                title="Ingresar como Cristian Colpas"
              >
                👤 Cristian
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('leonardo.rodriguez@logisticos.co', '12345678')}
                className="text-[11px] py-2 px-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-slate-200 border border-slate-700 hover:border-blue-500/50 text-center font-medium transition-all cursor-pointer"
                title="Ingresar como Leonardo Rodríguez"
              >
                👤 Leonardo
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('administraciongalapa@logisticos.co', '12345678')}
                className="text-[11px] py-2 px-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-slate-200 border border-slate-700 hover:border-blue-500/50 text-center font-medium transition-all cursor-pointer"
                title="Ingresar como Administrador"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="login-form" autoComplete="off">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Usuario / Correo Corporativo
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="text"
                  required
                  autoComplete="username"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cristian.colpas@logisticos.co"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Contraseña
                </label>
                <span className="text-[11px] text-blue-400 font-medium">Clave: 12345678</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
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
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 cursor-pointer"
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

          {/* Acordeón informativo de revisión de claves */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowCredentialsPanel(!showCredentialsPanel)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
              id="toggle-credentials-panel-btn"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Revisar usuarios y claves autorizadas
              </span>
              {showCredentialsPanel ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showCredentialsPanel && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs space-y-3 transition-all">
                <div className="pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400 text-[11px]">🔑 Clave Universal (Válida para todos):</span>
                  <div className="mt-1 flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="font-mono text-emerald-400 font-bold text-sm">12345678</span>
                    <span className="text-[10px] text-slate-500">Recomendada</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-slate-400 text-[11px] block">👥 Usuarios y claves registradas:</span>

                  {AUTHORIZED_USERS_LIST.map((user) => (
                    <div
                      key={user.email}
                      className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/70 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs">{user.name}</span>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(user.email, '12345678')}
                          className="text-[10px] bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white px-2 py-0.5 rounded transition-colors font-medium cursor-pointer"
                        >
                          Entrar
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</div>
                      <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1 items-center">
                        <span>Claves activas:</span>
                        <code className="text-emerald-400 font-mono bg-slate-950 px-1 py-0.5 rounded">12345678</code>
                        {user.passwords.slice(2, 3).map((p) => (
                          <code key={p} className="text-amber-400 font-mono bg-slate-950 px-1 py-0.5 rounded">{p}</code>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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


