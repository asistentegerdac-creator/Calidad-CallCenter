import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
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

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [callDetails, setCallDetails] = useState<{ [date: string]: any[] }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        alert('Por favor, sube un archivo con formato .xlsx o .xls');
        e.target.value = '';
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;
    try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const data: { [date: string]: { answered: number, unanswered: number } } = {};
        const details: { [date: string]: any[] } = {};
        
        rows.forEach((row, index) => {
            if (index === 0) return; // Skip header
            
            // row indices: Fecha(0), Hora(1), Destino(2), Estado(3), Duracion(4) -> based on request description
            // Wait, previously code said: Fecha(1), Hora(2), Destino(3), Estado(4), Duracion(5) as 1-based, 
            // Now rows are 0-based, so this matches: 
            // const fechaCell = row[0];
            // const destinoCell = row[2];
            // const estadoCell = row[7]; // Need to check exact column mapping as per previous code
            // The previous code had:
            // 52: const fechaCell = row.getCell(1).value?.toString();
            // ...
            // 69: // Column indices: Destino(4), Estado(8), Duracion(9)
            // Wait, the previous code had inconsistencies in column indices.
            // Row 1: Fecha(1), Hora(2), Destino(3), Estado(4), Duracion(5) -> line 52-56
            // But line 70-72 says: Destino(4), Estado(8), Duracion(9)
            // Let's stick to what was working for the user: Destino(column 4 -> index 3), Estado(column 8 -> index 7), Duracion(column 9 -> index 8)
            
            const fechaValue = row[0]?.toString();
            if (fechaValue) {
                const [fullDate, fullTime] = fechaValue.split(' ');
                let date = fullDate;
                const hora = fullTime ? fullTime.split(':').slice(0, 2).join(':') : '';
                
                if (date.includes('/')) {
                    const parts = date.split('/');
                    if (parts.length === 3) date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                
                const destinoValue = row[3]?.toString(); // Column 4
                const estadoValue = row[7]?.toString(); // Column 8
                const duracionValue = row[8]?.toString(); // Column 9

                if (!data[date]) { data[date] = { answered: 0, unanswered: 0 }; details[date] = []; }
                
                const isAnswered = estadoValue?.toUpperCase().includes('ANSWERED');
                if (isAnswered) data[date].answered++;
                else data[date].unanswered++;
                
                details[date].push({ fecha: date, hora: hora, destino: destinoValue, estado: isAnswered ? 'Contestada' : 'Sin contestar', duracion: duracionValue });
            }
        });
        setResults(data);
        setCallDetails(details);
        const comp = Object.keys(data).map(date => {
            const dashboardStat = dailyStats.find(s => s.date.includes(date));
            const fileStat = data[date];
            const dashAnswered = dashboardStat ? Number(dashboardStat.patients_called) : 0;
            const dashUnanswered = dashboardStat ? Number(dashboardStat.calls_unanswered) : 0;
            return {
                date,
                file: fileStat,
                dashboard: { answered: dashAnswered, unanswered: dashUnanswered },
                diffAnswered: dashAnswered - fileStat.answered,
                diffUnanswered: dashUnanswered - fileStat.unanswered,
                match: dashAnswered === fileStat.answered && dashUnanswered === fileStat.unanswered
            };
        });
        setComparison(comp);
    } catch (error) { console.error(error); alert('Error al procesar el archivo.'); }
  };

  const exportToExcel = () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Resumen');
    
    // Header for Summary
    sheet.columns = [
        { header: 'Fecha', key: 'date', width: 15 },
        { header: 'Cont (Excel)', key: 'ansEx', width: 15 },
        { header: 'Cont (Dash)', key: 'ansDash', width: 15 },
        { header: 'No Cont (Excel)', key: 'unansEx', width: 15 },
        { header: 'No Cont (Dash)', key: 'unansDash', width: 15 },
        { header: 'Dif. Cont', key: 'diffAns', width: 15 },
        { header: 'Dif. No Cont', key: 'diffUnans', width: 15 },
    ];
    
    // Formatting Summary Header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    
    comparison.forEach(c => {
        const row = sheet.addRow({ 
            date: c.date, 
            ansEx: c.file.answered, 
            ansDash: c.dashboard.answered, 
            unansEx: c.file.unanswered, 
            unansDash: c.dashboard.unanswered,
            diffAns: c.diffAnswered, 
            diffUnans: c.diffUnanswered 
        });
        
        // Add border to all cells
        row.eachCell((cell) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
    });

    // Detail Sheet
    const detailSheet = workbook.addWorksheet('Detalle');
    detailSheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Hora', key: 'hora', width: 15 },
        { header: 'Destino', key: 'destino', width: 20 },
        { header: 'Estado', key: 'estado', width: 20 },
        { header: 'Duración', key: 'duracion', width: 15 },
    ];
    
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    Object.entries(callDetails).forEach(([date, details]) => {
        details.forEach(d => {
            const row = detailSheet.addRow(d);
            row.eachCell((cell) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });
    });

    workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Reporte_Llamadas_Detallado.xlsx';
        a.click();
    });
  };

  if (!isUnlocked) {
    return (
      <div className="glass-card p-8 bg-white border border-slate-200 mt-8 rounded-2xl shadow-sm">
        <h4 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest">Acceso Monitor</h4>
        <form onSubmit={handlePasswordSubmit} className="flex gap-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded-xl px-4 py-2" placeholder="Ingrese contraseña" />
          <button type="submit" className="bg-slate-900 text-white rounded-xl px-6 py-2 font-black text-xs uppercase">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 bg-white border border-slate-200 mt-8 rounded-2xl shadow-sm">
      <h4 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest">Análisis de Llamadas Excel</h4>
      <div className="flex gap-4 items-center mb-6">
        <input type="file" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-900 file:text-white" />
        <button onClick={processFile} disabled={!selectedFile} className="bg-emerald-600 text-white rounded-xl px-6 py-2 font-black text-xs uppercase disabled:bg-slate-300">Procesar</button>
        <button onClick={exportToExcel} disabled={comparison.length === 0} className="bg-blue-600 text-white rounded-xl px-6 py-2 font-black text-xs uppercase disabled:bg-slate-300">Exportar Excel</button>
      </div>
      
      {comparison.length > 0 && (
        <div className="mt-8 overflow-x-auto border rounded-xl border-slate-100">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50">
              <tr className="text-slate-600 border-b border-slate-200">
                <th className="p-3 font-black uppercase">Fecha</th>
                <th className="p-3 font-black uppercase">Cont (Excel/Dash)</th>
                <th className="p-3 font-black uppercase">No Cont (Excel/Dash)</th>
                <th className="p-3 font-black uppercase">Dif Cont</th>
                <th className="p-3 font-black uppercase">Dif No Cont</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c, i) => (
                <React.Fragment key={i}>
                    <tr onClick={() => setExpandedDate(expandedDate === c.date ? null : c.date)} className="border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{c.date}</td>
                        <td className="p-3">{c.file.answered} / {c.dashboard.answered}</td>
                        <td className="p-3">{c.file.unanswered} / {c.dashboard.unanswered}</td>
                        <td className={`p-3 font-black ${c.diffAnswered !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{c.diffAnswered}</td>
                        <td className={`p-3 font-black ${c.diffUnanswered !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{c.diffUnanswered}</td>
                    </tr>
                    {expandedDate === c.date && (
                        <tr className="bg-slate-50"><td colSpan={5} className="p-4"><div className="text-xs font-bold text-slate-500 mb-2">Detalle: {c.date}</div><table className="w-full text-xs bg-white rounded-lg border"><thead><tr className="border-b"><th className="p-2">Hora</th><th className="p-2">Destino</th><th className="p-2">Estado</th><th className="p-2">Duración</th></tr></thead><tbody>{callDetails[c.date]?.map((d, j) => (<tr key={j} className="border-b"><td className="p-2">{d.hora}</td><td className="p-2">{d.destino}</td><td className="p-2">{d.estado}</td><td className="p-2">{d.duracion}</td></tr>))}</tbody></table></td></tr>
                    )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

