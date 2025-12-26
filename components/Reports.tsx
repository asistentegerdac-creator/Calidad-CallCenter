
import React, { useState, useMemo, useEffect } from 'react';
import { Complaint, ComplaintStatus, User } from '../types';

interface Props { 
  complaints: Complaint[]; 
  areas: string[]; 
  onUpdate: (id: string, s: ComplaintStatus, r: string, auditor: string) => void;
  onUpdateFull: (c: Complaint) => void;
  currentUser: User | null;
}

export const Reports: React.FC<Props> = ({ complaints, areas, onUpdate, onUpdateFull, currentUser }) => {
  const [filterManager, setFilterManager] = useState('Todos');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');

  // Estado para el modal de edición desde reportes
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [mgmtStatus, setMgmtStatus] = useState<ComplaintStatus>(ComplaintStatus.PENDIENTE);
  const [mgmtResponse, setMgmtResponse] = useState('');

  useEffect(() => {
    if (selected) {
      setMgmtStatus(selected.status);
      setMgmtResponse(selected.managementResponse || '');
    }
  }, [selected]);

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

  // EXPORTACIÓN A EXCEL MEJORADA (Estructura Gerencial)
  const exportExcel = () => {
    const headers = [
      "ESTADO",
      "PRIORIDAD",
      "ID EXPEDIENTE",
      "FECHA REPORTE",
      "PACIENTE",
      "AREA",
      "ESPECIALIDAD",
      "JEFE RESPONSABLE",
      "DESCRIPCION DEL RECLAMO",
      "ACCIONES CORRECTIVAS",
      "SATISFACCION (1-5)",
      "AUDITOR RESPONSABLE"
    ];

    // Ordenar por estado para que los pendientes aparezcan primero en el Excel
    const sortedForExcel = [...filtered].sort((a, b) => {
      const order: any = { 'Pendiente': 0, 'En Proceso': 1, 'Resuelto': 2 };
      return order[a.status] - order[b.status];
    });

    const rows = sortedForExcel.map(c => [
      c.status.toUpperCase(),
      c.priority.toUpperCase(),
      c.id,
      c.date,
      c.patientName.toUpperCase(),
      c.area.toUpperCase(),
      (c.specialty || 'N/A').toUpperCase(),
      (c.managerName || 'SIN ASIGNAR').toUpperCase(),
      `"${c.description.replace(/"/g, '""')}"`,
      `"${(c.managementResponse || 'SIN GESTIÓN AÚN').replace(/"/g, '""')}"`,
      c.satisfaction,
      (c.resolvedBy || 'PENDIENTE').toUpperCase()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `INFORME_GERENCIAL_DAC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Estadísticas para el reporte ejecutivo
  const stats = useMemo(() => {
    const total = filtered.length;
    const resueltos = filtered.filter(c => c.status === ComplaintStatus.RESUELTO).length;
    const pendientes = filtered.filter(c => c.status === ComplaintStatus.PENDIENTE).length;
    const proceso = filtered.filter(c => c.status === ComplaintStatus.PROCESO).length;
    const avgSatisfaction = total > 0 ? (filtered.reduce((a, b) => a + b.satisfaction, 0) / total).toFixed(1) : "0";
    
    return { total, resueltos, pendientes, proceso, avgSatisfaction };
  }, [filtered]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* PANEL DE FILTROS (Solo Pantalla) */}
      <div className="glass-card p-10 bg-white shadow-xl no-print border border-slate-100">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
               <span className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg">📊</span>
               Reportes e Informes DAC
            </h3>
            <div className="flex gap-4">
               <button onClick={exportExcel} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                  <span className="text-lg">Excel</span>
               </button>
               <button onClick={() => window.print()} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2">
                  <span className="text-lg">Imprimir PDF</span>
               </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Filtrar por Jefatura</label>
            <select className="w-full bg-slate-50 border rounded-xl p-4 text-xs font-bold outline-none" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
              <option value="Todos">Todos los Jefes</option>
              {managers.map(m => <option key={m as string} value={m as string}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Área Médica</label>
            <select className="w-full bg-slate-50 border rounded-xl p-4 text-xs font-bold outline-none" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="Todas">Todas las Áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Estado del Caso</label>
            <select className="w-full bg-slate-50 border rounded-xl p-4 text-xs font-bold outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos los Estados</option>
              {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* VISTA PREVIA INTERACTIVA (Solo Pantalla) */}
      <div className="space-y-8 no-print">
         {Object.entries(groupedByManager).length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed">
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay datos con los filtros seleccionados</p>
             </div>
         ) : (
            Object.entries(groupedByManager).map(([manager, items]: any) => (
              <div key={manager} className="glass-card bg-white p-8 border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                 <div className="flex justify-between items-center mb-6 bg-slate-50 -mx-8 -mt-8 px-8 py-4 border-b">
                    <h4 className="font-black text-slate-900 text-sm uppercase">JEFATURA: <span className="text-amber-500 ml-2">{manager}</span></h4>
                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black">{items.length} CASOS</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="text-[9px] font-black text-slate-400 uppercase border-b">
                             <th className="pb-4">Paciente</th>
                             <th className="pb-4">Área/Esp.</th>
                             <th className="pb-4">Estado</th>
                             <th className="pb-4 text-right">Satisfacción</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {items.map((c: any) => (
                            <tr 
                              key={c.id} 
                              className="text-xs hover:bg-slate-50/50 cursor-pointer transition-colors group" 
                              title={c.description} 
                              onClick={() => setSelected(c)}
                            >
                              <td className="py-4">
                                 <p className="font-bold text-slate-900 uppercase group-hover:text-amber-600 transition-colors">{c.patientName}</p>
                                 <p className="text-[9px] text-slate-400">{c.date}</p>
                              </td>
                              <td className="py-4">
                                 <p className="font-black text-amber-600 uppercase">{c.area}</p>
                                 <p className="text-[9px] text-slate-400 uppercase">{c.specialty}</p>
                              </td>
                              <td className="py-4">
                                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                                    c.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-700' :
                                    c.status === 'En Proceso' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                 }`}>
                                    {c.status}
                                 </span>
                              </td>
                              <td className="py-4 text-right font-black text-slate-400">
                                 {c.satisfaction} / 5 ★
                              </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            ))
         )}
      </div>

      {/* MODAL DE EDICIÓN RAPIDA DESDE REPORTES */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[500] animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl p-10 rounded-[2.5rem] shadow-2xl relative overflow-y-auto max-h-[90vh] border border-white/20">
              <button onClick={() => setSelected(null)} className="absolute top-6 right-6 text-2xl font-light text-slate-300 hover:text-rose-500 transition-colors">✕</button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Resolución Rápida</h3>
                <p className="text-amber-600 font-black text-[9px] uppercase tracking-[0.3em] mt-1">Reporte DAC: {selected.id}</p>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Relato Original</p>
                   <p className="text-[11px] font-semibold text-slate-700 italic leading-relaxed">"{selected.description}"</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Cambiar Estado</label>
                  <div className="flex gap-2">
                    {[ComplaintStatus.PENDIENTE, ComplaintStatus.PROCESO, ComplaintStatus.RESUELTO].map(s => (
                      <button 
                        key={s} 
                        type="button"
                        onClick={() => setMgmtStatus(s)} 
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mgmtStatus === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descargo / Solución</label>
                   <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs font-bold min-h-[120px] outline-none focus:border-amber-400 transition-all" 
                    value={mgmtResponse} 
                    onChange={(e) => setMgmtResponse(e.target.value)}
                    placeholder="Escriba las acciones tomadas..." 
                   />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    onUpdate(selected.id, mgmtStatus, mgmtResponse, currentUser?.name || 'Administrador');
                    setSelected(null);
                  }} 
                  className="w-full py-5 neo-warm-button rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all"
                >
                  GUARDAR CAMBIOS
                </button>
              </div>
           </div>
        </div>
      )}

      {/* DISEÑO PROFESIONAL PARA IMPRESIÓN PDF (Modificado para Gerencia) */}
      <div className="hidden print:block bg-white font-sans text-slate-900 p-0">
        <style>{`
          @media print {
            @page { size: auto; margin: 15mm; }
            .page-break { page-break-before: always; }
            .break-inside-avoid { break-inside: avoid; }
          }
        `}</style>
        
        {/* ENCABEZADO GERENCIAL */}
        <div className="border-b-8 border-slate-900 pb-10 mb-10 flex justify-between items-end">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-3xl font-black">DAC</div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900">INFORME GERENCIAL DE CALIDAD</h1>
              <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.5em] mt-2">SISTEMA HOSPITALARIO DAC CLOUD v8.0</p>
            </div>
          </div>
          <div className="text-right">
             <div className="mb-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Auditor Responsable</p>
                <p className="text-sm font-black text-slate-900">{currentUser?.name || 'ADMINISTRADOR MAESTRO'}</p>
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Fecha de Informe</p>
                <p className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
             </div>
          </div>
        </div>

        {/* RESUMEN EJECUTIVO (Executive Dashboard) */}
        <div className="mb-12">
           <h2 className="text-lg font-black uppercase tracking-widest border-l-4 border-amber-500 pl-4 mb-6">1. Resumen Ejecutivo de Operaciones</h2>
           <div className="grid grid-cols-4 gap-4">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Total Expedientes</p>
                 <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              </div>
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Casos Resueltos</p>
                 <p className="text-3xl font-black text-emerald-700">{stats.resueltos}</p>
              </div>
              <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl text-center">
                 <p className="text-[9px] font-black text-amber-600 uppercase mb-2">Pendientes / Proceso</p>
                 <p className="text-3xl font-black text-amber-700">{stats.pendientes + stats.proceso}</p>
              </div>
              <div className="p-6 bg-slate-900 text-white rounded-3xl text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Satisfacción Global</p>
                 <p className="text-3xl font-black text-white">{stats.avgSatisfaction} / 5</p>
              </div>
           </div>
        </div>

        {/* DESGLOSE DETALLADO POR JEFATURAS */}
        <div className="mb-12">
           <h2 className="text-lg font-black uppercase tracking-widest border-l-4 border-amber-500 pl-4 mb-8">2. Desglose Crítico por Jefaturas</h2>
           
           {Object.entries(groupedByManager).map(([manager, items]: any) => (
             <div key={manager} className="mb-10 break-inside-avoid">
                <div className="bg-slate-100 p-4 border border-slate-200 rounded-t-2xl flex justify-between items-center">
                   <h3 className="text-xs font-black uppercase text-slate-900">Responsable: {manager}</h3>
                   <span className="text-[9px] font-black text-slate-500">{items.length} Incidencias reportadas</span>
                </div>
                <table className="w-full border-collapse border border-slate-200 text-left rounded-b-2xl overflow-hidden">
                   <thead>
                      <tr className="bg-slate-50 border-b text-[8px] font-black uppercase text-slate-400">
                         <th className="p-4 w-1/4">Información Paciente</th>
                         <th className="p-4 w-1/2">Relato y Acciones Correctivas</th>
                         <th className="p-4 text-center">Estado</th>
                         <th className="p-4 text-right">Pts</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {items.map((c: any) => (
                        <tr key={c.id}>
                           <td className="p-4 align-top">
                              <p className="font-black text-[10px] text-slate-900 uppercase">{c.patientName}</p>
                              <p className="text-[8px] text-slate-500 font-bold mt-1 uppercase">ID: {c.id}</p>
                              <p className="text-[8px] text-amber-600 font-black mt-1 uppercase">{c.area}</p>
                              <p className="text-[8px] text-slate-400 mt-0.5">{c.date}</p>
                           </td>
                           <td className="p-4 align-top">
                              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 mb-3">
                                 <p className="text-[9px] text-slate-700 italic leading-relaxed">"{c.description}"</p>
                              </div>
                              {c.managementResponse ? (
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                   <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Resultado de la Gestión:</p>
                                   <p className="text-[9px] font-bold text-emerald-900 leading-tight">{c.managementResponse}</p>
                                </div>
                              ) : (
                                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 border-dashed">
                                   <p className="text-[8px] font-black text-rose-600 uppercase italic">Pendiente de descargo por Jefatura...</p>
                                </div>
                              )}
                           </td>
                           <td className="p-4 align-top text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                                 c.status === 'Resuelto' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                 c.status === 'En Proceso' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                 {c.status}
                              </span>
                              <p className="text-[7px] font-black text-slate-400 uppercase mt-2">Prioridad: {c.priority}</p>
                           </td>
                           <td className="p-4 align-top text-right">
                              <p className="text-sm font-black text-slate-900">{c.satisfaction}</p>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           ))}
        </div>

        {/* SECCIÓN DE FIRMAS Y VALIDEZ (Pie de Informe) */}
        <div className="mt-20 pt-16 border-t border-slate-200 flex justify-around items-end gap-20">
           <div className="flex-1 text-center">
              <div className="h-[1px] bg-slate-900 w-full mb-4"></div>
              <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">{currentUser?.name || 'ADMINISTRADOR'}</p>
              <p className="text-[8px] font-medium text-slate-400 uppercase mt-1">FIRMA AUDITOR DE CALIDAD</p>
           </div>
           <div className="flex-1 text-center">
              <div className="h-[1px] bg-slate-900 w-full mb-4"></div>
              <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">DIRECCIÓN MÉDICA / ADMINISTRATIVA</p>
              <p className="text-[8px] font-medium text-slate-400 uppercase mt-1">FIRMA Y SELLO DE APROBACIÓN</p>
           </div>
        </div>

        <div className="mt-12 text-center">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[1.5em]">FIN DEL DOCUMENTO • GENERADO POR DAC CLOUD</p>
           <p className="text-[7px] text-slate-200 mt-2 font-medium">Este informe es estrictamente confidencial y de uso interno para la Dirección de Calidad.</p>
        </div>
      </div>
    </div>
  );
};
