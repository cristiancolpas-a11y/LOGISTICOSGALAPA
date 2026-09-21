import { SafetyNovedadRecord, SafetySummary } from '../types';

export const DEFAULT_SAFETY_CATEGORIES = [
  'Cubre estribos',
  'Puntos de apoyo',
  'Sillas',
  'Cinturones de seguridad',
  'Capacidad de carga'
];

export function calculateSafetySummary(records: SafetyNovedadRecord[]): SafetySummary {
  const total = records.length;
  let pendientes = 0;
  let realizados = 0;

  const categoriasCount: Record<string, { total: number; pendientes: number; realizados: number }> = {};
  const placasCount: Record<string, { total: number; pendientes: number; realizados: number }> = {};

  records.forEach((r) => {
    const isPendiente = r.estado === 'PENDIENTE';
    if (isPendiente) pendientes++;
    else realizados++;

    // Categoría
    const cat = r.categoria || 'Sin Categoría';
    if (!categoriasCount[cat]) {
      categoriasCount[cat] = { total: 0, pendientes: 0, realizados: 0 };
    }
    categoriasCount[cat].total++;
    if (isPendiente) categoriasCount[cat].pendientes++;
    else categoriasCount[cat].realizados++;

    // Placa
    const pl = r.placa || 'SIN PLACA';
    if (!placasCount[pl]) {
      placasCount[pl] = { total: 0, pendientes: 0, realizados: 0 };
    }
    placasCount[pl].total++;
    if (isPendiente) placasCount[pl].pendientes++;
    else placasCount[pl].realizados++;
  });

  const porcentajeCierre = total > 0 ? Number(((realizados / total) * 100).toFixed(1)) : 0;

  return {
    total,
    pendientes,
    realizados,
    porcentajeCierre,
    categoriasCount,
    placasCount
  };
}

export function getAllCategories(records: SafetyNovedadRecord[]): string[] {
  const set = new Set<string>(DEFAULT_SAFETY_CATEGORIES);
  records.forEach((r) => {
    if (r.categoria && r.categoria.trim()) {
      set.add(r.categoria.trim());
    }
  });
  return Array.from(set).sort();
}

export function getAllPlates(records: SafetyNovedadRecord[], fleetPlates: string[] = []): string[] {
  const set = new Set<string>();
  records.forEach((r) => {
    if (r.placa) set.add(r.placa.trim().toUpperCase());
  });
  fleetPlates.forEach((p) => {
    const clean = p.replace(/^CO/, '').trim().toUpperCase();
    if (clean) set.add(clean);
  });
  return Array.from(set).sort();
}

export function filterSafetyRecords(
  records: SafetyNovedadRecord[],
  filters: {
    search: string;
    categoria: string;
    estado: 'ALL' | 'PENDIENTE' | 'REALIZADO';
    placa: string;
  }
): SafetyNovedadRecord[] {
  const query = filters.search.trim().toLowerCase();
  const cat = filters.categoria;
  const est = filters.estado;
  const pl = filters.placa.trim().toUpperCase();

  return records.filter((r) => {
    if (est !== 'ALL' && r.estado !== est) return false;
    if (cat && cat !== 'ALL' && r.categoria !== cat) return false;
    if (pl && pl !== 'ALL' && r.placa !== pl) return false;

    if (query) {
      const matchPlaca = r.placa.toLowerCase().includes(query);
      const matchCat = r.categoria.toLowerCase().includes(query);
      const matchNov = r.novedad.toLowerCase().includes(query);
      const matchFila = String(r.fila).includes(query);
      const matchId = r.id.toLowerCase().includes(query);
      return matchPlaca || matchCat || matchNov || matchFila || matchId;
    }

    return true;
  });
}
