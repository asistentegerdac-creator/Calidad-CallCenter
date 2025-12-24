
import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; areas: string[]; }

export const Reports: React.FC<Props> = ({ complaints, areas }) => {
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const managers = useMemo(() => {
    const m = new Set(complaints.map(c => c.managerName).filter(Boolean));
    return Array.from(m);
  }, [complaints]);

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchManager = filterManager === 'Todos' ? true : c.managerName === filterManager;
      const matchArea = filterArea === 'Todas' ? true : c.area === filterArea;
      const matchStatus = filterStatus === 'Todos' ? true : c.status === filterStatus;
      return matchManager && matchArea && matchStatus;
    });
  }, [complaints, filterManager, filterArea, filterStatus]);

  const exportExcel = () => {
    let csv = "ID,Fecha,Paciente,Area,Jefe,Prioridad,Estado,Descripcion,Solucion\n";
    filtered.forEach(c => {
      csv += `${c.id},${c.date},${c.patientName},${c.area},${c.managerName},${c.priority},${c.status},"${c.description.replace(/"/g, '""')}","${(c.managementResponse || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DAC_INFORME_${new Date().getTime()}.csv`;
    link.click();
  };

  const groupedByManager = useMemo(() => {
    const groups: any = {};
    filtered.forEach(c => {
      const jefe = c.managerName || 'Sin Jefe';
      if (!groups[jefe]) groups[jefe] = [];
      groups[jefe].push(c);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="glass-card p-10 bg-white shadow-xl no-print">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 tracking-widest">Filtros de Auditoría Avanzada</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Por Jefatura</label>
            <select className="w-full bg-slate-50 border rounded-xl p-4 text-xs font-bold" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
              <option value="Todos">Todas las Jefaturas</option>
              {managers.map(m => <option key={m as string} value={m as string}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Área Médica</label>
            <select className="w-full bg-slate-50 border rounded-xl p-4 text-xs font-bold" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas las Áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3 md:col-span-2">
            <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg">Generar PDF Profesional</button>
            <button onClick={exportExcel} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg">Exportar Excel (CSV)</button>
          </div>
        </div>
      </div>

      <div className="print:block hidden bg-white p-16">
        <div className="border-b-8 border-slate-900 pb-12 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black tracking-tighter">DAC AUDIT REPORT</h1>
            <p className="text-amber-500 font-black text-xs uppercase tracking-[0.6em] mt-2">Hospital Management Systems • Control de Calidad</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-black uppercase text-slate-900">Fecha de Corte: {new Date().toLocaleDateString()}</p>
             <p className="text-[10px] font-black uppercase text-slate-400 mt-1">Total Registros Auditados: {filtered.length}</p>
          </div>
        </div>

        {Object.entries(groupedByManager).map(([manager, items]: any) => (
          <div key={manager} className="mb-20 break-inside-avoid">
            <div className="bg-slate-100 p-6 rounded-[2rem] mb-8 flex justify-between items-center">
               <h2 className="text-2xl font-black uppercase tracking-tight">JEFATURA: {manager}</h2>
               <span className="text-[10px] font-black bg-white px-4 py-2 rounded-xl border border-slate-200 uppercase">Casos Asignados: {items.length}</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase">
                  <th className="py-4 px-4">Área y Paciente</th>
                  <th className="py-4 px-4">Descripción de Incidencia</th>
                  <th className="py-4 px-4">Estado</th>
                  <th className="py-4 px-4 text-right">Satisfacción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c: any) => (
                  <tr key={c.id}>
                    <td className="py-8 px-4 w-1/4">
                       <p className="font-black text-xs uppercase text-slate-900">{c.patientName}</p>
                       <p className="text-[9px] font-bold text-amber-600 uppercase mt-1">{c.area}</p>
                       <p className="text-[8px] text-slate-400 mt-1">{c.id} • {c.date}</p>
                    </td>
                    <td className="py-8 px-4 w-1/2">
                       <p className="text-[10px] text-slate-800 font-medium leading-relaxed mb-4 italic">"{c.description}"</p>
                       {c.managementResponse && (
                         <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <p className="text-[8px] font-black text-emerald-700 uppercase mb-1">Solución Administrativa:</p>
                            <p className="text-[9px] font-bold text-emerald-900">{c.managementResponse}</p>
                         </div>
                       )}
                    </td>
                    <td className="py-8 px-4 w-[15%]">
                       <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${c.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                    </td>
                    <td className="py-8 px-4 text-right font-black text-slate-900">{c.satisfaction}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        
        <div className="mt-32 pt-16 border-t flex justify-between items-center opacity-40">
           <div className="text-center">
              <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
              <p className="text-[10px] font-black uppercase">Dirección Médica</p>
           </div>
           <div className="text-center">
              <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
              <p className="text-[10px] font-black uppercase">Auditoría de Calidad</p>
           </div>
        </div>
      </div>
    </div>
  );
};
