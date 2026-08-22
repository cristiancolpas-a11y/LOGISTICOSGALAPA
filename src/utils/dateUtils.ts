/**
 * Utilities for Excel date conversion, standard formatting, and date math.
 */

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

/**
 * Converts Excel serial date or string date to ISO string YYYY-MM-DD
 */
export function parseAnyDateToIso(input: any): { iso: string; formatted: string; timestamp: number } {
  if (input === null || input === undefined || input === '') {
    const fallback = new Date();
    return {
      iso: fallback.toISOString().split('T')[0],
      formatted: formatIsoToDisplay(fallback.toISOString().split('T')[0]),
      timestamp: fallback.getTime()
    };
  }

  const str = String(input).trim();

  // 1. Check if it is a numeric Excel serial date (e.g. 46085)
  const numeric = Number(str);
  if (!isNaN(numeric) && numeric > 20000 && numeric < 70000) {
    // Excel serial date formula (1900 system with leap year offset)
    const utcDays = Math.floor(numeric - 25569);
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    const iso = date.toISOString().split('T')[0];
    return {
      iso,
      formatted: formatIsoToDisplay(iso),
      timestamp: date.getTime()
    };
  }

  // 2. Check if it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const iso = str.slice(0, 10);
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return {
      iso,
      formatted: formatIsoToDisplay(iso),
      timestamp: date.getTime()
    };
  }

  // 3. Check if it's DD/MM/YYYY or DD-MM-YYYY
  const latinMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (latinMatch) {
    const day = latinMatch[1].padStart(2, '0');
    const month = latinMatch[2].padStart(2, '0');
    const year = latinMatch[3];
    const iso = `${year}-${month}-${day}`;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return {
      iso,
      formatted: `${day}/${month}/${year}`,
      timestamp: date.getTime()
    };
  }

  // Fallback try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const iso = parsed.toISOString().split('T')[0];
    return {
      iso,
      formatted: formatIsoToDisplay(iso),
      timestamp: parsed.getTime()
    };
  }

  const today = new Date();
  const isoToday = today.toISOString().split('T')[0];
  return {
    iso: isoToday,
    formatted: formatIsoToDisplay(isoToday),
    timestamp: today.getTime()
  };
}

export function formatIsoToDisplay(iso: string): string {
  if (!iso || !iso.includes('-')) return iso || '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export function getWeekNumber(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
}

export function getMonthNameEs(monthIndex1to12: number): string {
  return MONTH_NAMES_ES[monthIndex1to12 - 1] || `Mes ${monthIndex1to12}`;
}

export function getDayOfWeekEs(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return DAYS_ES[date.getUTCDay()] || '';
}

export function formatNowDateTimeEs(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const mins = pad(now.getMinutes());
  return `${day}/${month}/${year} ${hours}:${mins}`;
}
