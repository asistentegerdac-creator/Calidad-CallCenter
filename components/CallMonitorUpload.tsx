import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { DailyStat } from '../types';

interface Props { dailyStats: DailyStat[]; }

export const CallMonitorUpload: React.FC<Props> = ({ dailyStats }) => {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<{ [date: string]: { answered: number, unanswered: number } } | null>(null);
  const [comparison, setComparison] = useState<any[]>([]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'dac2026') {
      setIsUnlocked(true);
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check extension
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
        alert('Por favor, sube un archivo con formato .xlsx');
        return;
    }

    setFile(file);

    try {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        
        // Basic check for zip signature (PK) if possible, but exceljs will handle it.
        // If it fails, it's not a valid xlsx.
        await workbook.xlsx.load(arrayBuffer);
        
        if (workbook.worksheets.length === 0) {
            throw new Error('El archivo no contiene hojas de cálculo.');
        }

        const worksheet = workbook.worksheets[0];

        const data: { [date: string]: { answered: number, unanswered: number } } = {};
        
        // Assuming row 1 is header, data starts from row 2
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            // Based on screenshot, Fecha is column A (1), Estado is column H (8)
            const fechaCell = row.getCell(1).value;
            const estadoCell = row.getCell(8).value;
            
            console.log(`Row ${rowNumber}: Fecha=${fechaCell}, Estado=${estadoCell}`);

            const fecha = fechaCell?.toString();
            const estado = estadoCell?.toString();

            if (fecha) {
                // Assuming date is in format DD/MM/YYYY or similar, or YYYY-MM-DD
                // Let's try to be flexible. If it contains '/', it might be DD/MM/YYYY
                let date = fecha.split(' ')[0];
                if (date.includes('/')) {
                    const parts = date.split('/');
                    if (parts.length === 3) {
                        // Assume DD/MM/YYYY
                        date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
                
                if (!data[date]) data[date] = { answered: 0, unanswered: 0 };
                
                if (estado && estado.toUpperCase().includes('ANSWERED')) data[date].answered++;
                else if (estado && estado.toUpperCase().includes('NO ANSWER')) data[date].unanswered++;
            }
        });

        console.log("Parsed data:", data);
        setResults(data);

        // Compare
        const comp = Object.keys(data).map(date => {
            // Try to find a match by comparing formatted strings
            const dashboardStat = dailyStats.find(s => {
                const sDate = s.date.split('T')[0]; // Assuming ISO format YYYY-MM-DD
                return sDate === date || s.date.includes(date) || date.includes(sDate);
            });
            const fileStat = data[date];
            
            return {
                date,
                file: fileStat,
                dashboard: dashboardStat ? { answered: Number(dashboardStat.patients_called), unanswered: Number(dashboardStat.calls_unanswered) } : null,
                match: dashboardStat ? (fileStat.answered === Number(dashboardStat.patients_called) && fileStat.unanswered === Number(dashboardStat.calls_unanswered)) : null
            };
        });
        setComparison(comp);
    } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        alert('Error al leer el archivo Excel. Asegúrate de que sea un archivo .xlsx válido (no un CSV renombrado).');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="glass-card p-8 bg-white border border-slate-200 mt-8">
        <h4 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">Carga de Excel (Contraseña)</h4>
        <form onSubmit={handlePasswordSubmit} className="flex gap-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" placeholder="Contraseña..." />
          <button type="submit" className="bg-slate-900 text-white rounded-xl px-6 py-2 font-black text-xs uppercase">Desbloquear</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 bg-white border border-slate-200 mt-8">
      <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">Análisis de Llamadas Excel</h4>
      <input type="file" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-white hover:file:bg-slate-800" />
      
      {comparison.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="p-2 font-black uppercase">Fecha</th>
                <th className="p-2 font-black uppercase">Excel (Cont/NoCont)</th>
                <th className="p-2 font-black uppercase">Dash (Cont/NoCont)</th>
                <th className="p-2 font-black uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="p-2 font-bold">{c.date}</td>
                  <td className="p-2">{c.file.answered} / {c.file.unanswered}</td>
                  <td className="p-2">{c.dashboard ? `${c.dashboard.answered} / ${c.dashboard.unanswered}` : 'N/A'}</td>
                  <td className={`p-2 font-black ${c.match === true ? 'text-emerald-600' : c.match === false ? 'text-rose-600' : 'text-slate-400'}`}>
                    {c.match === true ? '✅ Coincide' : c.match === false ? '❌ Diferencia' : 'Sin Datos Dash'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
