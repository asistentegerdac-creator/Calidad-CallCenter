
import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props { complaints: Complaint[]; areas: string[]; }

export const Reports: React.FC<Props> = ({ complaints, areas }) => {
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const managers = useMemo(() => {
    const mSet = new Set(complaints.map(c => c.managerName).filter(Boolean));
    return Array.from(mSet);
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
    let csv = "ID_AUDITORIA,FECHA,PACIENTE,AREA_MEDICA,JEFE_RESPONSABLE,ESTADO,DESCRIPCION,SOLUCION\n";
    filtered.forEach(c => {
      csv += `${c.id},${c.date},${c.patientName},${c.area},${c.managerName},${c.status},"${c.description.replace(/"/g, '""')}","${(c.managementResponse || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `INFORME_DAC_EXCEL_${new Date().getTime()}.csv`;
    link.click();
  };

  const groupedByManager = useMemo(() => {
    const groups: any = {};
    filtered.forEach(c => {
      const jefe = c.managerName || 'Sin Jefe Asignado';
      if (!groups[jefe]) groups[jefe] = [];
      groups[jefe].push(c);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* PANEL DE FILTROS */}
      <div className="glass-card p-10 bg-white shadow-xl no-print">
        <h3 className="text-xl font-black mb-8 uppercase text-slate-900 tracking-widest flex items-center gap-3">
           <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm">🔍</span>
           Filtros de Gestión de Calidad DAC
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Por Jefatura</label>
            <select className="w-full bg-slate-50 border rounded-xl p-4 text-xs font-bold" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
              <option value="Todos">Todas las Jefaturas</option>
              {managers.map(m => <option key={m as string} value={m as string}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área Médica</label>
            <select className="w-full bg-slate-50 border rounded-xl p-4 text-xs font-bold" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas las Áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3 md:col-span-2">
            <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all">Generar PDF de Gestión</button>
            <button onClick={exportExcel} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all">Exportar a Excel</button>
          </div>
        </div>
      </div>

      {/* VISTA PREVIA DEL REPORTE (AGRUPADA POR JEFE) */}
      <div className="space-y-12 no-print">
         {Object.entries(groupedByManager).map(([manager, items]: any) => (
           <div key={manager} className="glass-card p-10 bg-white shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h4 className="text-xl font-black text-slate-900 uppercase">JEFATURA: {manager}</h4>
                 <span className="text-[10px] font-black bg-slate-100 px-4 py-2 rounded-xl uppercase">Registros: {items.length}</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-[11px] font-bold">
                    <thead className="text-slate-400 uppercase border-b border-slate-50">
                       <tr><th className="py-4">Paciente</th><th className="py-4">Área</th><th className="py-4">Estado</th><th className="py-4 text-right">Satisfacción</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {items.map((c: any) => (
                         <tr key={c.id}>
                           <td className="py-4">{c.patientName}</td>
                           <td className="py-4 text-amber-600">{c.area}</td>
                           <td className="py-4">
                              <span className={`px-2 py-1 rounded-md ${c.status === 'Resuelto' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{c.status}</span>
                           </td>
                           <td className="py-4 text-right">{c.satisfaction}/5 ★</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
         ))}
      </div>

      {/* VERSIÓN PARA IMPRESIÓN PDF PROFESIONAL */}
      <div className="print:block hidden bg-white p-16">
        <div className="border-b-8 border-slate-900 pb-12 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black tracking-tighter">DAC QUALITY SYSTEM</h1>
            <p className="text-amber-500 font-black text-xs uppercase tracking-[0.6em] mt-2">Hospital Management • Informe de Gestión de Calidad</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-black uppercase text-slate-900">Emisión: {new Date().toLocaleDateString()}</p>
             <p className="text-[10px] font-black uppercase text-slate-400 mt-1">Registros Auditados: {filtered.length}</p>
          </div>
        </div>

        {Object.entries(groupedByManager).map(([manager, items]: any) => (
          <div key={manager} className="mb-20 break-inside-avoid">
            <div className="bg-slate-100 p-8 rounded-[2.5rem] mb-10 flex justify-between items-center">
               <h2 className="text-3xl font-black uppercase tracking-tight">JEFATURA: {manager}</h2>
               <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-500">Casos del Departamento</span>
                  <p className="text-2xl font-black text-slate-900">{items.length}</p>
               </div>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-slate-900 text-[10px] font-black uppercase">
                  <th className="py-6 px-4">Paciente y Detalle</th>
                  <th className="py-6 px-4">Área Médica</th>
                  <th className="py-6 px-4">Estado Actual</th>
                  <th className="py-6 px-4 text-right">Nota Calidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((c: any) => (
                  <tr key={c.id}>
                    <td className="py-8 px-4 w-[40%]">
                       <p className="font-black text-sm uppercase text-slate-900">{c.patientName}</p>
                       <p className="text-[10px] text-slate-500 font-medium italic mt-2 leading-relaxed">"{c.description}"</p>
                       {c.managementResponse && (
                         <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <p className="text-[8px] font-black text-emerald-700 uppercase mb-1">Acción Correctiva:</p>
                            <p className="text-[10px] font-bold text-emerald-900">{c.managementResponse}</p>
                         </div>
                       )}
                    </td>
                    <td className="py-8 px-4 text-[11px] font-black uppercase text-slate-600">{c.area}</td>
                    <td className="py-8 px-4">
                       <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-full ${c.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                    </td>
                    <td className="py-8 px-4 text-right font-black text-slate-900 text-lg">{c.satisfaction}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        
        <div className="mt-32 pt-16 border-t-2 border-slate-100 flex justify-between items-center opacity-40">
           <div className="text-center">
              <div className="w-56 border-b-2 border-slate-900 mb-4"></div>
              <p className="text-[10px] font-black uppercase">Firma Dirección Médica</p>
           </div>
           <div className="text-center">
              <div className="w-56 border-b-2 border-slate-900 mb-4"></div>
              <p className="text-[10px] font-black uppercase">Firma Gestión de Calidad</p>
           </div>
        </div>
      </div>
    </div>
  );
};
