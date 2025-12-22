
import React, { useState, useMemo } from 'react';
import { Complaint, CallRecord, ComplaintStatus } from '../types';

interface ReportsProps {
  complaints: Complaint[];
  calls: CallRecord[];
}

export const Reports: React.FC<ReportsProps> = ({ complaints, calls }) => {
  const [reportType, setReportType] = useState<'daily' | 'range'>('daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredData = useMemo(() => {
    return complaints.filter(c => {
      if (reportType === 'daily') return c.date === startDate;
      return c.date >= startDate && c.date <= endDate;
    });
  }, [complaints, reportType, startDate, endDate]);

  const filteredCalls = useMemo(() => {
    return calls.filter(c => {
      if (reportType === 'daily') return c.date === startDate;
      return c.date >= startDate && c.date <= endDate;
    });
  }, [calls, reportType, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-12">
      {/* Configuración de Reporte */}
      <div className="bg-white p-12 rounded-[50px] shadow-2xl shadow-slate-200 border border-slate-100 no-print">
        <h3 className="text-3xl font-black text-slate-900 mb-10 tracking-tighter">Generador de Auditoría DAC</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-end">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parámetro Temporal</label>
            <div className="flex bg-slate-100 p-2 rounded-2xl">
              <button 
                onClick={() => setReportType('daily')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${reportType === 'daily' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}
              >
                Puntual
              </button>
              <button 
                onClick={() => setReportType('range')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${reportType === 'range' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}
              >
                Periodo
              </button>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{reportType === 'daily' ? 'Fecha Reporte' : 'Desde'}</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:border-blue-500" />
             </div>
             {reportType === 'range' && (
               <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:border-blue-500" />
               </div>
             )}
          </div>
          <button 
            onClick={handlePrint}
            className="bg-blue-600 text-white py-5 rounded-[22px] font-black uppercase tracking-widest shadow-2xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 text-xs"
          >
            🖨️ Generar Reporte PDF
          </button>
        </div>
      </div>

      {/* Vista de Impresión */}
      <div id="printable-report" className="print:block p-12 bg-white rounded-[50px] shadow-sm border border-slate-100 min-h-[800px]">
        <div className="flex justify-between items-center mb-16 border-b-2 border-slate-900 pb-10">
           <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Calidad DAC</h1>
              <p className="text-blue-600 font-bold uppercase tracking-[0.5em] text-[9px] mt-2 italic">Intelligence Center Operational Audit</p>
           </div>
           <div className="text-right">
              <p className="text-sm font-black text-slate-900">Fecha: {new Date().toLocaleDateString()}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Ref: {reportType.toUpperCase()}-AUDIT-LOG</p>
           </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-16">
           <div className="bg-slate-50 p-8 rounded-[35px] text-center border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Incidencias DAC</p>
              <p className="text-5xl font-black text-slate-900 tracking-tighter">{filteredData.length}</p>
           </div>
           <div className="bg-slate-50 p-8 rounded-[35px] text-center border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Casos Resueltos</p>
              <p className="text-5xl font-black text-green-600 tracking-tighter">{filteredData.filter(c => c.status === ComplaintStatus.RESUELTO).length}</p>
           </div>
           <div className="bg-slate-50 p-8 rounded-[35px] text-center border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Efectividad Contacto</p>
              <p className="text-5xl font-black text-blue-600 tracking-tighter">
                {filteredCalls.length ? ((filteredCalls.reduce((a,b)=>a+b.calledCount,0)/filteredCalls.reduce((a,b)=>a+b.totalPatients,0))*100).toFixed(0) : 0}%
              </p>
           </div>
        </div>

        <div className="space-y-10">
          <h4 className="text-2xl font-black text-slate-900 border-l-[12px] border-blue-600 pl-6 leading-none">Matriz de Incidencias Operativas</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                  <th className="px-6 py-6 rounded-tl-3xl">Timestamp</th>
                  <th className="px-6 py-6">Paciente</th>
                  <th className="px-6 py-6">Área / Especialidad</th>
                  <th className="px-6 py-6">Relato de Incidencia</th>
                  <th className="px-6 py-6 text-right rounded-tr-3xl">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map(c => (
                  <tr key={c.id} className="page-break-inside-avoid">
                    <td className="px-6 py-6 text-[10px] font-bold text-slate-400">{c.date}</td>
                    <td className="px-6 py-6 font-black text-slate-800 text-sm">{c.patientName}</td>
                    <td className="px-6 py-6">
                      <p className="text-[10px] font-black text-slate-800 uppercase">{c.area}</p>
                      <p className="text-[9px] text-blue-600 font-bold uppercase">{c.specialty}</p>
                    </td>
                    <td className="px-6 py-6 text-[11px] text-slate-500 max-w-xs leading-relaxed italic">"{c.description}"</td>
                    <td className="px-6 py-6 text-right">
                      <span className="inline-block px-4 py-1.5 bg-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[50px]">
              <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs">Procedimiento de Auditoría finalizado: Sin hallazgos registrados</p>
            </div>
          )}
        </div>

        <div className="mt-40 grid grid-cols-2 gap-24 no-print-flex">
           <div className="text-center">
              <div className="w-full border-t border-slate-900 pt-4">
                 <p className="font-black text-slate-900 uppercase text-[10px] tracking-[0.3em]">Certificación DAC</p>
                 <p className="text-[9px] text-slate-400 mt-1 uppercase">Responsable de Calidad</p>
              </div>
           </div>
           <div className="text-center">
              <div className="w-full border-t border-slate-900 pt-4">
                 <p className="font-black text-slate-900 uppercase text-[10px] tracking-[0.3em]">Visto Bueno Gerencial</p>
                 <p className="text-[9px] text-slate-400 mt-1 uppercase">Dirección Médica General</p>
              </div>
           </div>
        </div>
        
        <div className="mt-20 text-center opacity-30 text-[8px] font-bold uppercase tracking-[0.5em] hidden print:block">
           Este documento es una emisión oficial del sistema Calidad DAC. Queda prohibida su alteración.
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          aside { display: none !important; }
          header { display: none !important; }
          nav { display: none !important; }
          #printable-report { 
            border: none !important; 
            box-shadow: none !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important;
          }
          .page-break-inside-avoid { page-break-inside: avoid; }
          .no-print-flex { display: flex !important; }
        }
      `}</style>
    </div>
  );
};
