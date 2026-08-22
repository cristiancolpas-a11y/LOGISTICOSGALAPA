import React, { useState } from 'react';
import {
  Database,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Table,
  CheckCircle2,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { NormalizedCheckListRecord } from '../../types';

interface RawDatabaseViewProps {
  records: NormalizedCheckListRecord[];
  totalRecordsCount: number;
}

export const RawDatabaseView: React.FC<RawDatabaseViewProps> = ({
  records,
  totalRecordsCount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filtered = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.vehicle.toLowerCase().includes(q) ||
      r.conductor.toLowerCase().includes(q) ||
      r.contratista.toLowerCase().includes(q) ||
      r.dateFormatted.includes(q) ||
      r.rawDate.includes(q) ||
      r.estado.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportFullCsv = () => {
    const headers = [
      'llave',
      'Fecha',
      'vehiculo',
      'Salida',
      'Retorno',
      'contar2',
      'Estado',
      'CONTRATISTA',
      'CONDUCTOR'
    ];

    const rows = filtered.map((r) => [
      `"${r.id}"`,
      `"${r.rawDate}"`,
      `"${r.vehicle}"`,
      r.salida,
      r.retorno,
      r.contar2,
      `"${r.estado}"`,
      `"${r.contratista}"`,
      `"${r.conductor}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `check_list_aon_galapa_completo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4" id="raw-database-view">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                Base de Datos: Hoja "Check list"
              </h2>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-mono px-2 py-0.5 rounded-full border border-blue-500/20">
                Google Sheets Fuente Real
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Registros originales sin alteraciones de estructura ({totalRecordsCount.toLocaleString()} filas totales)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://docs.google.com/spreadsheets/d/18-2Tnc_Or8AVn8wqu-00hqMRPdq9hH3AORjuQ9P6Hsk/edit?gid=0#gid=0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Abrir en Google Sheets</span>
          </a>

          <button
            onClick={handleExportFullCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-xs text-slate-400">
          Mostrando <strong className="text-white">{filtered.length.toLocaleString()}</strong> de{' '}
          <strong className="text-slate-300">{records.length.toLocaleString()}</strong> registros filtrados
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar en cualquier columna (llave, fecha, placa, conductor)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-80"
          />
        </div>
      </div>

      {/* Raw Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs border-collapse font-mono" id="raw-google-sheets-table">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-300 font-bold uppercase tracking-wider bg-slate-950">
              <th className="py-3 px-3">#</th>
              <th className="py-3 px-3">llave</th>
              <th className="py-3 px-3">Fecha</th>
              <th className="py-3 px-3">Fecha (Formateada)</th>
              <th className="py-3 px-3">vehiculo</th>
              <th className="py-3 px-3 text-center">Salida</th>
              <th className="py-3 px-3 text-center">Retorno</th>
              <th className="py-3 px-3 text-center">contar2</th>
              <th className="py-3 px-3 text-center">Estado</th>
              <th className="py-3 px-3">CONTRATISTA</th>
              <th className="py-3 px-3">CONDUCTOR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500 text-xs font-sans">
                  No se encontraron filas que coincidan con el término de búsqueda.
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;

                return (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                      {globalIndex}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {row.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-semibold">
                      {row.rawDate}
                    </td>
                    <td className="py-2.5 px-3 text-blue-400 font-sans">
                      {row.dateFormatted}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {row.vehicle}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          row.salida === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {row.salida}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          row.retorno === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {row.retorno}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-200 font-bold">
                      {row.contar2}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          row.estado === 'CUMPLIO'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : row.estado === 'LE FALTO'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {row.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      {row.contratista}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-sans">
                      {row.conductor}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
        <span>
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filtered.length} filas)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
